from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Credential
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort


@apfell.route(apfell.config['API_BASE'] + "/credentials/current_operation", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_current_operation_credentials(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if user['current_operation'] != "":
        try:
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user['current_operation'] )
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'Failed to get current operation'})
        query = await db_model.credential_query()
        creds = await db_objects.execute(query.where(Credential.operation == operation))
        return json({'status': 'success', 'credentials': [c.to_json() for c in creds]})
    else:
        return json({"status": 'error', 'error': "must be part of a current operation"})


@apfell.route(apfell.config['API_BASE'] + "/credentials", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_credential(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if user['current_operation'] != "":
        try:
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user['current_operation'])
            query = await db_model.operator_query()
            operator = await db_objects.get(query, username=user['username'])
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to get operation'})
        data = request.json
        return json(await create_credential_func(operator, operation, data))
    else:
        return json({"status": 'error', 'error': "must be part of a current operation"})


async def create_credential_func(operator, operation, data):
    types_list = ['plaintext', 'certificate', 'hash', 'key', 'ticket']
    if "type" not in data or data['type'] not in types_list:
        return {'status': 'error', 'error': 'type of credential is required'}
    if "domain" not in data or data['domain'] == "":
        return {'status': 'error', 'error': 'domain for the credential is required'}
    if "credential" not in data or data['credential'] == "":
        return {'status': 'error', 'error': 'credential is required'}
    if "user" not in data or data['user'] == "":
        return {'status': 'error', 'error': 'user is a required field'}
    if "task" not in data or data['task'] == "":
        try:
            # trying to prevent duplication of data in the database
            query = await db_model.credential_query()
            cred = await db_objects.get(query, type=data['type'], user=data['user'],
                                        domain=data['domain'], operation=operation,
                                        credential=data['credential'], operator=operator)
        except Exception as e:
            # we got here because the credential doesn't exist, so we need to create it
            cred = await db_objects.create(Credential, type=data['type'], user=data['user'],
                                           domain=data['domain'], operation=operation,
                                           credential=data['credential'], operator=operator)
    else:
        try:
            query = await db_model.task_query()
            task = await db_objects.get(query, id=data['task'])
        except Exception as e:
            print(e)
            return {"status": 'error', 'error': 'failed to find task'}
        try:
            query = await db_model.credential_query()
            cred = await db_objects.get(query, type=data['type'], user=data['user'], task=task,
                                        domain=data['domain'], operation=operation,
                                        credential=data['credential'], operator=operator)
        except Exception as e:
            # we got here because the credential doesn't exist, so we need to create it
            cred = await db_objects.create(Credential, type=data['type'], user=data['user'], task=task,
                                           domain=data['domain'], operation=operation,
                                           credential=data['credential'], operator=operator)
    return {'status': 'success', **cred.to_json()}


@apfell.route(apfell.config['API_BASE'] + "/credentials/<id:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_credential(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if user['current_operation'] != "":
        try:
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user['current_operation'])
            query = await db_model.credential_query()
            credential = await db_objects.get(query, id=id, operation=operation)
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to find that credential'})
        cred_json = credential.to_json()
        await db_objects.delete(credential)
        return json({'status': 'success', **cred_json})
    else:
        return json({'status': 'error', 'error': "must be part of a current operation"})