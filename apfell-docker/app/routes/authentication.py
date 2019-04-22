from sanic_jwt import exceptions
from app import db_objects, links
from app.database_models.model import Operation, OperatorOperation
from app.database_models.model import operator_query, operation_query, operatoroperation_query
import datetime
import json

refresh_tokens = {}  # having this not persist past reboot of the server and forcing re-auth is perfectly fine


# defaults to /auth
async def authenticate(request):
    username = request.json.get("username", None)
    password = request.json.get("password", None)
    if not username or not password:
        raise exceptions.AuthenticationFailed("Must supply both username and password")
    try:
        query = await operator_query()
        user = await db_objects.get(query, username=username)
        print("in authenticate, the user: " + str(user))
        #user = await db_objects.get(Operator, username=username)
    except Exception as e:
        print("invalid username")
        raise exceptions.AuthenticationFailed("Incorrect username or password")
    if not user.active:
        raise exceptions.AuthenticationFailed("Account is deactivated")
    if await user.check_password(password):
        try:
            user.last_login = datetime.datetime.now()
            await db_objects.update(user)
            # now we have successful authentication, return appropriately
            print("success authentication")
            return {'user_id': user.id, 'username': user.username}
        except Exception as e:
            print("failed to update user in authenticate")
            raise exceptions.AuthenticationFailed("Failed to authenticate")
    else:
        print("invalid password")
        raise exceptions.AuthenticationFailed("Incorrect username or password")


# defaults to /me
async def retrieve_user(request, payload, *args, **kwargs):
    user_id = None
    if payload:
        user_id = payload.get('user_id', None)
    try:
        if user_id is None or user_id not in refresh_tokens:
            raise exceptions.AuthenticationFailed("Invalid auth token or your refresh token is gone. Login again")
        query = await operator_query()
        user = await db_objects.get(query, id=user_id)
        user_json = user.to_json()
        query = await operatoroperation_query()
        operationmap = await db_objects.execute(query.where(OperatorOperation.operator == user))
        operations = []
        for operation in operationmap:
            op = operation.operation
            operations.append(op.name)
        query = await operation_query()
        admin_operations = await db_objects.execute(query.where(Operation.admin == user))
        admin_ops = []
        for op in admin_operations:
            admin_ops.append(op.name)
        if user_json['current_operation'] != "" and user_json['current_operation'] != 'null':
            links['current_operation'] = user.current_operation.name
        else:
            links['current_operation'] = ""
            user_json['current_operation'] = ""
        user_json['ui_config'] = json.loads(user_json['ui_config'])
        return {**user_json, "user_id": user.id, "operations": operations, "admin_operations": admin_ops}
    except exceptions.AuthenticationFailed as e:
        raise e
    except Exception as e:
        print(e)
        raise exceptions.AuthenticationFailed("Delete your cookies")


async def add_scopes_to_payload(user, *args, **kwargs):
    # return an array of scopes
    scopes = []
    try:
        query = await operator_query()
        user = await db_objects.get(query, id=user['user_id'])
    except Exception as e:
        print(e)
        return []
    try:
        query = await operatoroperation_query()
        operationsmap = await db_objects.execute(query.where(OperatorOperation.operator == user))
        if user.admin:
            scopes.append('admin')
        for map in operationsmap:
            # map is an OperatorOperation object that points to an operator and operation
            # need to get that corresponding operation's name to add to our scope list
            scopes.append(map.operation.name)
        return scopes
    except Exception as e:
        print(e)
        return []


async def store_refresh_token(user_id, refresh_token, *args, **kwargs):
    refresh_tokens[user_id] = refresh_token
    return


async def retrieve_refresh_token(request, user_id, *args, **kwargs):
    # print("requested refresh token for: " + str(user_id))
    if user_id in refresh_tokens:
        return refresh_tokens[user_id]
    return None


async def invalidate_refresh_token(user_id):
    del refresh_tokens[user_id]