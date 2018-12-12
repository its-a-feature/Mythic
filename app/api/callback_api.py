from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Callback, Operator, Payload, Operation, Task, Response
from sanic import response
from datetime import datetime
from sanic_jwt.decorators import protected, inject_user


@apfell.route(apfell.config['API_BASE'] + "/callbacks/", methods=['GET'])
@inject_user()
@protected()
async def get_all_callbacks(request, user):
    if user['current_operation'] != "":
        operation = await db_objects.get(Operation, name=user['current_operation'])
        callbacks = await db_objects.execute(Callback.select().where(Callback.operation == operation))
        return json([c.to_json() for c in callbacks])
    else:
        return json([])


# this one is specifically not @protect or @inject_user because our callback needs to be able to access this
#   and we don't know when the callback will actually happen, so we don't want the JWT to be timed out
@apfell.route(apfell.config['API_BASE'] + "/callbacks/", methods=['POST'])
async def create_callback(request):
    data = request.json
    if 'user' not in data:
        return json({'status': 'error',
                     'error': 'User required'})
    if 'host' not in data:
        return json({'status': 'error',
                     'error': 'Host required'})
    if 'pid' not in data:
        return json({'status': 'error',
                     'error': 'PID required'})
    if 'ip' not in data:
        return json({'status': 'error',
                     'error': 'IP required'})
    if 'uuid' not in data:
        return json({'status': 'error',
                     'error': 'uuid required'})
    # Get the corresponding Payload object based on the uuid
    try:
        payload = await db_objects.get(Payload, uuid=data['uuid'])
        # now that we have a uuid and payload, we should check if there's a matching parent callback
        if payload.pcallback:
            pcallback = await db_objects.get(Callback, id=payload.pcallback)
        else:
            pcallback = None
    except Exception as e:
        print(e)
        return json({'status': 'error',
                     'error': 'Failed to find payload',
                     'msg': str(e)})
    try:
        cal = await db_objects.create(Callback, user=data['user'], host=data['host'], pid=data['pid'],
                                      ip=data['ip'], description=payload.tag, operator=payload.operator,
                                      registered_payload=payload, pcallback=pcallback, operation=payload.operation)
        if 'encryption_type' in data:
            cal.encryption_type = data['encryption_type']
        if 'decryption_key' in data:
            cal.decryption_key = data['decryption_key']
        if 'encryption_key' in data:
            cal.encryption_key = data['encryption_key']
        await db_objects.update(cal)
    except Exception as e:
        print(e)
        return json({'status': 'error',
                     'error': 'Failed to create callback',
                     'msg': str(e)})
    cal_json = cal.to_json()
    status = {'status': 'success'}
    return response.json({**status, **cal_json}, status=201)


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>", methods=['GET'])
@inject_user()
@protected()
async def get_one_callback(request, id, user):
    try:
        cal = await db_objects.get(Callback, id=id)
        return json(cal.to_json())
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get callback'}, 404)


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>", methods=['PUT'])
@inject_user()
@protected()
async def update_callback(request, id, user):
    data = request.json
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        cal = await db_objects.get(Callback, id=id, operation=operation)
        if 'description' in data:
            cal.description = data['description']
        if 'active' in data:
            if data['active'] == 'true':
                cal.active = True
            elif data['active'] == 'false':
                cal.active = False
        if 'encryption_type' in data:
            cal.encryption_type = data['encryption_type']
        if 'encryption_key' in data:
            cal.encryption_key = data['encryption_key']
        if 'decryption_key' in data:
            cal.decryption_key = data['decryption_key']
        if 'parent' in data:
            try:
                if data['parent'] == -1:
                    # this means to remove the current parent
                    cal.pcallback = None
                else:
                    parent = await db_objects.get(Callback, id=data['parent'], operation=operation)
                    if parent.id == cal.id:
                        return json({'status': 'error', 'error': 'cannot set parent = child'})
                    cal.pcallback = parent
            except Exception as e:
                return json({'status': 'error', 'error': "failed to set parent callback: " + str(e)})
        await db_objects.update(cal)
        success = {'status': 'success'}
        updated_cal = cal.to_json()
        return json({**success, **updated_cal})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to update callback: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>", methods=['DELETE'])
@inject_user()
@protected()
async def remove_callback(request, id, user):
    try:
        cal = await db_objects.get(Callback, id=id)
        if user['admin'] or cal.operation.name in user['operations']:
            cal.active = False
            await db_objects.update(cal)
            success = {'status': 'success'}
            deleted_cal = cal.to_json()
            return json({**success, **deleted_cal})
        else:
            return json({'status': 'error', 'error': 'must be an admin or part of that operation to mark it as no longer active'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': "failed to delete callback: " + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>/all_tasking", methods=['GET'])
@inject_user()
@protected()
async def callbacks_get_all_tasking(request, user, id):
    # Get all of the tasks and responses so far for the specified agent
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        callback = await db_objects.get(Callback, id=id, operation=operation)
        cb_json = callback.to_json()
        cb_json['tasks'] = []
        tasks = await db_objects.execute(Task.select().where(Task.callback == callback).order_by(Task.id))
        for t in tasks:
            responses = await db_objects.execute(Response.select().where(Response.task == t).order_by(Response.id))
            rs = []
            for r in responses:
                rs.append(r.to_json())
            cb_json['tasks'].append({**t.to_json(), "responses": rs})
        return json({'status': 'success', **cb_json})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': str(e)})


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>/keys", methods=['GET'])
@inject_user()
@protected()
async def get_callback_keys(request, user, id):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        callback = await db_objects.get(Callback, id=id, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find callback'})
    encryption_type = callback.encryption_type if callback.encryption_type else ""
    decryption_key = callback.decryption_key if callback.decryption_key else ""
    encryption_key = callback.encryption_key if callback.encryption_key else ""
    return json({'status': 'success', 'encryption_type': encryption_type, 'decryption_key': decryption_key,
                 'encryption_key': encryption_key})