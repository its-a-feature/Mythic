from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operator
from sanic import response
from app import crypto
from urllib.parse import unquote_plus
from sanic_jwt.decorators import inject_user
from sanic_jwt import scoped
import app.database_models.model as db_model
from sanic.exceptions import abort


@apfell.route(apfell.config['API_BASE'] + "/operators/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_operators(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    query = await db_model.operator_query()
    ops = await db_objects.execute(query)
    return json([p.to_json() for p in ops])


@apfell.route(apfell.config['API_BASE'] + "/operators/", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_operator(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    if 'username' not in data:
        return json({'status': 'error',
                     'error': '"username" field is required'})
    if not isinstance(data['username'], str) or not len(data['username']):
        return json({'status': 'error',
                     'error': '"username" must be string with at least one character'})
    password = await crypto.hash_SHA512(data['password'])
    admin = False  # cannot create a user initially as admin
    # we need to create a new user
    try:
        user = await db_objects.create(Operator, username=data['username'], password=password, admin=admin)
        # default_operation = await db_objects.get(Operation, name="default")
        # now add the new user to the default operation
        # await db_objects.create(OperatorOperation, operator=user, operation=default_operation)
        success = {'status': 'success'}
        new_user = user.to_json()
        return response.json({**success, **new_user})
    except:
        return json({'status': 'error',
                     'error': 'failed to add user'})


@apfell.route(apfell.config['API_BASE'] + "/operators/<name:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_operator(request, name, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(name)
    try:
        query = await db_model.operator_query()
        op = await db_objects.get(query, username=name)
        return json({'status': 'success', **op.to_json()})
    except:
        print("Failed to get operator")
        return json({'status': 'error', 'error': 'failed to get operator'})


@apfell.route(apfell.config['API_BASE'] + "/operators/config/<name:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_config_item(request, name, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(name)
    try:
        if name == "light":
            return json({'status': 'success', 'config': Operator.light_config})
        elif name == "dark":
            return json({'status': 'success', 'config': Operator.dark_config})
        else:
            return json({'status': 'error', 'error': 'config not found'})
    except Exception as e:
        return json({'status': 'error', 'error': 'error getting configs'})


@apfell.route(apfell.config['API_BASE'] + "/operators/<name:string>", methods=["PUT"])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_operator(request, name, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(name)
    if name != user['username'] and not user['admin']:
        # you can't change the name of somebody else unless you're admin
        return json({'status': 'error', 'error': 'not authorized to change that user\'s information'})
    try:
        query = await db_model.operator_query()
        op = await db_objects.get(query, username=name)
        data = request.json
        if 'password' in data:
            op.password = await crypto.hash_SHA512(data['password'])
        if 'admin' in data and user['admin']:  # only a current admin can make somebody an admin
            op.admin = data['admin']
        if 'active' in data:  # this way you can deactivate accounts without deleting them
            op.active = data['active']
        if 'current_operation' in data:
            if data['current_operation'] in user['operations']:
                query = await db_model.operation_query()
                current_op = await db_objects.get(query, name=data['current_operation'])
                op.current_operation = current_op
        if 'ui_config' in data:
            if data['ui_config'] == "default":
                op.ui_config = op.default_config
            elif data['ui_config'] == "dark":
                op.ui_config = op.default_specter_config
            else:
                op.ui_config = data['ui_config']
        if 'username' in data:
            op.username = data['username']
        try:
            await db_objects.update(op)
            success = {'status': 'success'}
        except Exception as e:
            return json({'status': 'error', 'error': "failed to update operator: " + str(e)})
        updated_operator = op.to_json()
        return json({**success, **updated_operator})
    except:
        return json({'status': 'error', 'error': 'failed to update operator'})


@apfell.route(apfell.config['API_BASE'] + "/operators/<name:string>", methods=["DELETE"])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_operator(request, name, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(name)
    if name != user['username'] and not user['admin']:
        return json({'status': 'error', 'error': 'cannot delete anybody but yourself unless you\'re admin'})
    try:
        if name == "apfell_admin":
            return json({'status': 'error', 'error': 'cannot delete apfell_admin'})
        query = await db_model.operator_query()
        op = await db_objects.get(query, username=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find operator'})
    try:
        updated_operator = {'username': str(op.username)}
        await db_objects.delete(op, recursive=True)
        success = {'status': 'success'}
        return json({**success, **updated_operator})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to delete operator. Potentially linked to operational objects?'})
