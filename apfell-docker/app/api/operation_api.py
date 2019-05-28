from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operation, OperatorOperation
from urllib.parse import unquote_plus
from sanic_jwt.decorators import scoped, inject_user
from sanic.exceptions import abort
import os
import shutil
from app.crypto import create_key_AES256
import app.database_models.model as db_model


@apfell.route(apfell.config['API_BASE'] + "/operations/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_operations(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # we already get this information populated as part of our user authentication
    output = []
    if user['admin']:
        query = await db_model.operation_query()
        db_ops = await db_objects.execute(query)
        operations = [o.name for o in db_ops]
    else:
        operations = user['operations']
    for op in operations:
        # for each operation you're a member of, get all members and the admin name
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=op)
        data = operation.to_json()
        data['members'] = [data['admin']]
        query = await db_model.operatoroperation_query()
        operationmap = await db_objects.execute(query.where(OperatorOperation.operation == operation))
        for map in operationmap:
            o = map.operator
            if o.username not in data['members']:
                data['members'].append(o.username)
        output.append(data)
    return json(output)


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_operation(request, user, op):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # get information about a single operation
    # first confirm that this authenticated user as permission to view the op
    #   side effect is that we confirm if the op is real or not
    op = unquote_plus(op)
    if op in user['operations']:
        # get all users associated with that operation and the admin
        operators = []
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=op)
        query = await db_model.operatoroperation_query()
        operatorsmap = await db_objects.execute(query.where(OperatorOperation.operation == operation))
        for operator in operatorsmap:
            o = operator.operator
            operators.append(o.username)
        status = {'status': 'success'}
        return json({**operation.to_json(), "members": operators, **status})
    else:
        return json({"status": 'error', 'error': 'failed to find operation or not authorized'})


@apfell.route(apfell.config['API_BASE'] + "/operations", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_operation(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
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
            query = await db_model.operator_query()
            admin_operator = await db_objects.get(query, username=data['admin'])
        except Exception as e:
            return json({'status': 'error', 'error': 'admin operator does not exist'})
        try:
            AESPSK =await create_key_AES256()
            operation = await db_objects.create(Operation, name=data['name'], admin=admin_operator,
                                                AESPSK=AESPSK)
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to create operation, is the name unique?'})
        if 'members' not in data or data['members'] is None:
            data['members'] = [data['admin']]
        elif data['admin'] not in data['members']:
            data['members'].append(data['admin'])
        status = await add_user_to_operation_func(operation, data['members'])
        if status['status'] == 'success':
            if not os.path.exists("./app/payloads/operations/{}".format(data['name'])):
                os.makedirs("./app/payloads/operations/{}".format(data['name']), exist_ok=True)
            return json({'status': 'success', **operation.to_json(), 'members': data['members']})
        else:
            await db_objects.delete(operation, recursive=True)
            return json({'status': 'error', 'error': status['error']})
    else:
        return json({'status': 'error', 'error': 'must be admin to create new operations'})


async def add_user_to_operation_func(operation, users):
    # this take an operation object and a list of users (string) and adds them to the operation
    for operator in users:
        try:
            query = await db_model.operator_query()
            op = await db_objects.get(query, username=operator)
        except Exception as e:
            return {'status': 'error', 'error': 'failed to find user'}
        try:
            map = await db_objects.create(OperatorOperation, operator=op, operation=operation)
        except Exception as e:
            return {'status': 'error', 'error': 'failed to add user to operation'}
    return {'status': 'success'}


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_operation(request, user, op):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # this can change the name (assuming it's still unique), ['name']
    # this can change the admin user assuming the person submitting is the current admin or overall admin ['admin']
    # this can change the users ['add_users'], ['remove_users']
    op = unquote_plus(op)
    if op in user['admin_operations'] or user['admin']:
        data = request.json
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=op)
        if not operation.complete:
            if 'admin' in data:
                try:
                    query = await db_model.operator_query()
                    new_admin = await db_objects.get(query, username=data['admin'])
                    operation.admin = new_admin
                    await db_objects.update(operation)
                except Exception as e:
                    return json({'status': 'error', 'error': 'failed to update the admin'})
            if 'add_users' in data:
                for new_member in data['add_users']:
                    try:
                        query = await db_model.operator_query()
                        operator = await db_objects.get(query, username=new_member)
                        map = await db_objects.create(OperatorOperation, operator=operator, operation=operation)
                    except Exception as e:
                        return json({'status': 'error', 'error': 'failed to add user {} to the operation'.format(new_member)})
            if 'remove_users' in data:
                for old_member in data['remove_users']:
                    try:
                        query = await db_model.operator_query()
                        operator = await db_objects.get(query, username=old_member)
                        query = await db_model.operatoroperation_query()
                        operatoroperation = await db_objects.get(query, operator=operator, operation=operation)
                        # if this operation is set as that user's current_operation, nullify it
                        if operator.current_operation == operation:
                            operator.current_operation = None
                            await db_objects.update(operator)
                        await db_objects.delete(operatoroperation)
                    except Exception as e:
                        print("got exception: " + str(e))
                        return json({'status': 'error', 'error': 'failed to remove: ' + old_member + "\nAdded: " + str(data['add_users'])})
            all_users = []
            query = await db_model.operatoroperation_query()
            current_members = await db_objects.execute(query.where(OperatorOperation.operation == operation))
            for mem in current_members:
                member = mem.operator
                all_users.append(member.username)
            if 'complete' in data:
                operation.complete = data['complete']
                await db_objects.update(operation)
            return json({'status': 'success', 'operators': all_users, **operation.to_json()})
        else:
            return json({'status': 'error', 'error': 'operation is complete and cannot be modified'})
    else:
        return json({'status': 'error', 'error': 'not authorized to make the change'})


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_operation(request, user, op):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # only the admin of an operation or an overall admin can delete an operation
    op = unquote_plus(op)
    if op in user['admin_operations'] or user['admin']:
        try:
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=op)
            # Need to go through and delete all the things that relate to this operation, then delete the operation
            # callbacks, payloads, profiles, mappings (operatoroperation, payloadtypec2profile), tasks, responses
            await db_objects.delete(operation, recursive=True)
            try:
                # delete the operation's files (downloads, uploads, and screenshots)
                shutil.rmtree("./app/files/{}".format(operation.name))
            except Exception as e:
                pass
            try:
                # delete the operation's created payload files
                shutil.rmtree("./app/payloads/operations/{}".format(operation.name))
            except Exception as e:
                pass
            return json({'status': 'success', **operation.to_json()})
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to delete operation'})
    return json({'status': 'error', 'error': 'Not authorized to delete the operation'})
