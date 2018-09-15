from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operator, Operation, OperatorOperation
from urllib.parse import unquote_plus
from sanic_jwt.decorators import protected, inject_user


@apfell.route(apfell.config['API_BASE'] + "/operations/", methods=['GET'])
@inject_user()
@protected()
async def get_all_operations(request, user):
    # we already get this information populated as part of our user authentication
    return json({"operations": user['operations'], "admin_operations": user['admin_operations']})


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
            admin_operator = await db_objects.get(Operator, username=data['name'])
        except Exception as e:
            return json({'status': 'error', 'error': 'admin operator does not exist'})
        try:
            operation = await db_objects.create(Operation, name=data['name'], admin=admin_operator)
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to create operation, is the name unique?'})
        if 'users' in data:
            status = await add_user_to_operation_func(operation, data['users'])
            if status['status'] == 'success':
                return json({'status': 'success', **operation.to_json(), 'users': status['users']})
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
        return json({'status': 'success', 'operators': all_users, **operation.to_json()})
    else:
        return json({'status': 'error', 'error': 'not authorized to make the change'})