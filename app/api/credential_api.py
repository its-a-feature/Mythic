from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operator, Credential, Operation, Task
from sanic_jwt.decorators import protected, inject_user


@apfell.route(apfell.config['API_BASE'] + "/credentials/current_operation", methods=['GET'])
@inject_user()
@protected()
async def get_current_operation_credentials(request, user):
    if user['current_operation'] != "":
        try:
            operation = await db_objects.get(Operation, name=user['current_operation'] )
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'Failed to get current operation'})
        creds = await db_objects.execute(Credential.select().where(Credential.operation == operation))
        return json({'status': 'success', 'credentials': [c.to_json() for c in creds]})
    else:
        return json({"status": 'error', 'error': "must be part of a current operation"})


@apfell.route(apfell.config['API_BASE'] + "/credentials", methods=['POST'])
@inject_user()
@protected()
async def create_credential(request, user):
    if user['current_operation'] != "":
        try:
            operation = await db_objects.get(Operation, name=user['current_operation'])
            operator = await db_objects.get(Operator, username=user['username'])
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to get operation'})
        data = request.json
        types_list = ['plaintext', 'certificate', 'hash', 'key']
        if "type" not in data or data['type'] not in types_list:
            return json({'status': 'error', 'error': 'type of credential is required'})
        if "domain" not in data or data['domain'] == "":
            return json({'status': 'error', 'error': 'domain for the credential is required'})
        if "credential" not in data or data['credential'] == "":
            return json({'status': 'error', 'error': 'credential is required'})
        if "user" not in data or data['user'] == "":
            return json({'status': 'error', 'error': 'user is a required field'})
        if "task" not in data or data['task'] == "":
            cred, create = await db_objects.get_or_create(Credential, type=data['type'], user=data['user'],
                                                          domain=data['domain'], operation=operation,
                                                          credential=data['credential'], operator=operator)
        else:
            try:
                task = await db_objects.get(Task, id=data['task'])
            except Exception as e:
                print(e)
                return json({"status": 'error', 'error': 'failed to find task'})
            cred, create = await db_objects.get_or_create(Credential, type=data['type'], user=data['user'], task=task,
                                                          domain=data['domain'], operation=operation,
                                                          credential=data['credential'], operator=operator)
        return json({'status': 'success', **cred.to_json()})
    else:
        return json({"status": 'error', 'error': "must be part of a current operation"})


@apfell.route(apfell.config['API_BASE'] + "/credentials/<id:int>", methods=['DELETE'])
@inject_user()
@protected()
async def remove_credential(request, user, id):
    if user['current_operation'] != "":
        try:
            operation = await db_objects.get(Operation, name=user['current_operation'])
            credential = await db_objects.get(Credential, id=id, operation=operation)
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to find that credential'})
        cred_json = credential.to_json()
        await db_objects.delete(credential)
        return json({'status': 'success', **cred_json})
    else:
        return json({'status': 'error', 'error': "must be part of a current operation"})