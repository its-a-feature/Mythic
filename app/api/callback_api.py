from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Callback, Operator, Payload
from sanic import response
from sanic.exceptions import abort


# ---------- CALLBACKS ---------------------------
@apfell.route("/api/v1.0/callbacks/", methods=['GET'])
async def get_all_callbacks(request):
    callbacks = Callback.select()
    return json([c.to_json() for c in callbacks])


@apfell.route("/api/v1.0/callbacks/", methods=['POST'])
async def create_callback(request):
    data = request.json
    print(data)
    if not 'user' in data:
        return json({'status': 'error',
                     'error': 'User required'})
    if not 'host' in data:
        return json({'status': 'error',
                     'error': 'Host required'})
    if not 'pid' in data:
        return json({'status': 'error',
                     'error': 'PID required'})
    if not 'ip' in data:
        return json({'status': 'error',
                     'error': 'IP required'})
    if not 'uuid' in data:
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
                                      ip=data['ip'], payload_type=payload.payload_type,
                                      description=payload.tag, operator=payload.operator,
                                      registered_payload=payload, pcallback=pcallback)
    except Exception as e:
        print(e)
        return json({'status': 'error',
                     'error': 'Failed to create callback',
                     'msg': str(e)})

    return response.json({'status': 'success', 'id': cal.id}, status=201)


@apfell.route("/api/v1.0/callbacks/<id:int>", methods=['GET'])
async def get_one_callback(request, id):
    try:
        cal = await db_objects.get(Callback, id=id)
        return json(cal)
    except:
        return abort(404)


@apfell.route("/api/v1.0/callbacks/<id:int>", methods=['PUT'])
async def update_callback(request, id):
    data = request.json
    try:
        cal = await db_objects.get(Callback, id=id)
        if 'description' in data:
            cal.description = data['description']
        if 'operator' in data:
            op = await db_objects.get(Operator, username=data['operator'])
            cal.operator = op
        if 'active' in data:
            if data['active'] == "false":
                cal.active = False
            elif data['active'] == "true":
                cal.active = True
        await db_objects.update(cal)
        return json({'status': 'success'})
    except:
        return abort(404)


@apfell.route("/api/v1.0/callbacks/<id:int>", methods=['DELETE'])
async def remove_callback(request, id):
    try:
        cal = await db_objects.get(Callback, id=id)
        cal.active = False
        await db_objects.update(cal)
        return json({'status': 'success'})
    except:
        return abort(404)

