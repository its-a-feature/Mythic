from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operator, Operation, OperatorOperation
from urllib.parse import unquote_plus
from sanic_jwt.decorators import protected, inject_user
from app.api.c2profiles_api import register_default_profile_operation


@apfell.route(apfell.config['API_BASE'] + "/operations/", methods=['GET'])
@inject_user()
@protected()
async def get_all_operations(request, user):
    # we already get this information populated as part of our user authentication
    output = []
    for op in user['operations']:
        data = {}
        # for each operation you're a member of, get all members and the admin name
        operation = await db_objects.get(Operation, name=op)
        data['admin'] = operation.admin.username
        data['members'] = [data['admin']]
        operationmap = await db_objects.execute(OperatorOperation.select().where(OperatorOperation.operation == operation))
        for map in operationmap:
            o = await db_objects.get(Operator, id=map.operator)
            if o.username not in data['members']:
                data['members'].append(o.username)
        data['name'] = op
        data['complete'] = operation.complete
        output.append(data)
    return json(output)


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['GET'])
@inject_user()
@protected()
async def get_one_operation(request, user, op):
    # get information about a single operation
    # first confirm that this authenticated user as permission to view the op
    #   side effect is that we confirm if the op is real or not
    op = unquote_plus(op)
    if op in user['operations']:
        # get all users associated with that operation and the admin
        operators = []
        operation = await db_objects.get(Operation, name=op)
        operatorsmap = await db_objects.execute(OperatorOperation.select().where(OperatorOperation.operation == operation))
        for operator in operatorsmap:
            o = await db_objects.get(Operator, id=operator.operator)
            operators.append(o.username)
        status = {'status': 'success'}
        return json({**operation.to_json(), "operators": operators, **status})
    else:
        return json({"status": 'error', 'error': 'failed to find operation or not authorized'})


@apfell.route(apfell.config['API_BASE'] + "/operations", methods=['POST'])
@inject_user()
@protected()
async def create_operation(request, user):
    # this will create a new operation (must be admin to do this)
    # needs a unique operation name, a user that will be admin
    # optionally, include a list of users that will be part of the operation
    if user['admin']:
        data = request.json
        if 'name' not in data:
            return json({'status': 'error', 'error': '"name" is a required parameter'})
        if 'admin' not in data:
            return json({'status': 'error', 'error': '"admin" operator name is a required parameter'})
        try:
            admin_operator = await db_objects.get(Operator, username=data['admin'])
        except Exception as e:
            return json({'status': 'error', 'error': 'admin operator does not exist'})
        try:
            operation = await db_objects.create(Operation, name=data['name'], admin=admin_operator)
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to create operation, is the name unique?'})
        if 'members' not in data:
            data['members'] = [data['admin']]
        elif data['name'] not in data['members']:
            data['members'].append(data['admin'])
        status = await add_user_to_operation_func(operation, data['members'])
        if status['status'] == 'success':
            # we need to make the default c2_profile for this operation
            default_status = await register_default_profile_operation(user, data['name'])
            if default_status['status'] == "success":
                return json({'status': 'success', **operation.to_json(), 'members': data['members']})
            else:
                return json(default_status)
        else:
            return json({'status': 'error', 'error': status['error']})
    else:
        return json({'status': 'error', 'error': 'must be admin to create new operations'})


async def add_user_to_operation_func(operation, users):
    # this take an operation object and a list of users (string) and adds them to the operation
    for operator in users:
        try:
            op = await db_objects.get(Operator, username=operator)
        except Exception as e:
            return {'status': 'error', 'error': 'failed to find user'}
        try:
            map = await db_objects.create(OperatorOperation, operator=op, operation=operation)
        except Exception as e:
            return {'status': 'error', 'error': 'failed to add user to operation'}
    return {'status': 'success'}


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['PUT'])
@inject_user()
@protected()
async def update_operation(request, user, op):
    # this can change the name (assuming it's still unique), ['name']
    # this can change the admin user assuming the person submitting is the current admin or overall admin ['admin']
    # this can change the users ['add_users'], ['remove_users']
    op = unquote_plus(op)
    if op in user['admin_operations'] or user['admin']:
        data = request.json
        operation = await db_objects.get(Operation, name=op)
        if not operation.complete:
            if 'name' in data:
                try:
                    operation.name = data['name']
                    await db_objects.update(operation)
                except Exception as e:
                    return json({'status': 'error', 'error': 'failed to update operation name. Is it unique?'})
            if 'admin' in data:
                try:
                    new_admin = await db_objects.get(Operator, username=data['admin'])
                    operation.admin = new_admin
                    await db_objects.update(operation)
                except Exception as e:
                    return json({'status': 'error', 'error': 'failed to update the admin'})
            if 'add_users' in data:
                for new_member in data['add_users']:
                    try:
                        operator = await db_objects.get(Operator, username=new_member)
                        map = await db_objects.create(OperatorOperation, operator=operator, operation=operation)
                    except Exception as e:
                        return json({'status': 'error', 'error': 'failed to add user to the operation'})
            if 'remove_users' in data:
                for old_member in data['remove_users']:
                    try:
                        operator = await db_objects.get(Operator, username=old_member)
                        operatoroperation = await db_objects.get(OperatorOperation, operator=operator, operation=operation)
                        await db_objects.delete(operatoroperation)
                    except Exception as e:
                        return json({'status': 'error', 'error': 'failed to remove user from operation. Were they a member?'})
            all_users = []
            current_members = await db_objects.execute(OperatorOperation.select().where(OperatorOperation.operation == operation))
            for mem in current_members:
                member = await db_objects.get(Operator, id=mem.operator)
                all_users.append(member.username)
            if 'complete' in data:
                operation.complete = data['complete']
                await db_objects.update(operation)
            return json({'status': 'success', 'operators': all_users, **operation.to_json(), 'old_name': op})
        else:
            return json({'status': 'error', 'error': 'operation is complete and cannot be modified'})
    else:
        return json({'status': 'error', 'error': 'not authorized to make the change'})


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_operation(request, user, op):
    # only the admin of an operation or an overall admin can delete an operation
    op = unquote_plus(op)
    if op in user['admin_operations'] or user['admin']:
        try:
            operation = await db_objects.get(Operation, name=op)
            # Need to go through and delete all the things that relate to this operation, then delete the operation
            # callbacks, payloads, profiles, mappings (operatoroperation, payloadtypec2profile), tasks, responses
            await db_objects.delete(operation, recursive=True)
            return json({'status': 'success', **operation.to_json()})
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to delete operation'})
    return json({'status': 'error', 'error': 'Not authorized to delete the operation'})