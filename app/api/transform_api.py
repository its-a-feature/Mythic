from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import PayloadType, Transform, Operator
from sanic_jwt.decorators import protected, inject_user
from urllib.parse import unquote_plus
from app.api.utils import TransformOperation
import datetime


@apfell.route(apfell.config['API_BASE'] + "/transforms/bytype/<ptype:string>", methods=['GET'])
@inject_user()
@protected()
async def get_transforms_by_type(request, ptype, user):
    payload_type = unquote_plus(ptype)
    try:
        payloadtype = await db_objects.get(PayloadType, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload type'})
    try:
        transforms = await db_objects.execute(Transform.select().where(Transform.payload_type == payloadtype).order_by(
            Transform.t_type, Transform.order
        ))
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the transforms'})
    return json({'status': 'success', 'transforms': [t.to_json() for t in transforms]})


@apfell.route(apfell.config['API_BASE'] + "/transforms/options", methods=['GET'])
@inject_user()
@protected()
async def get_transforms_options(request, user):
    return json(await get_transforms_options_func())


async def get_transforms_options_func():
    t = TransformOperation()
    method_list = {func: await get_type_hints(getattr(t, func).__annotations__) for func in dir(t) if
                   callable(getattr(t, func)) and not func.startswith("__")}
    return method_list


async def get_type_hints(func):
    # we don't want information about the payload or parameter inputs, because that's the same for all of them
    # we really care about the input and output so we can make sure they match up
    hints = {"return": "unknown", "prior_output": "unknown"}
    for hint in func.items():
        name = hint[0]
        #print(name)
        typehint = str(hint[1])
        #print(typehint)
        if name is not 'payload':
            # fix up the typehint a bit
            if "class" in typehint:
                typehint = typehint.split(" ")[1][1:-2]
            elif "typing" in typehint:
                typehint = typehint[7:]  # cut out "typing."
            elif "NewType" in typehint:
                typehint = hint[1].__name__  # function NewType.<locals>.new_type
            # if the parameter is typehinted to None then don't provide the option to give a parameter
            if typehint != 'None':
                # hide the unique names besides "parameter" that people can give
                if name is not "return" and name is not "prior_output":
                    hints["parameter"] = name + ":" + typehint
                else:
                    hints[name] = typehint
    return hints


@apfell.route(apfell.config['API_BASE'] + "/transforms/bytype/<ptype:string>", methods=['POST'])
@inject_user()
@protected()
async def register_transform_for_ptype(request, user, ptype):
    payload_type = unquote_plus(ptype)
    try:
        payloadtype = await db_objects.get(PayloadType, ptype=payload_type)
        operator = await db_objects.get(Operator, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload type'})
    possible_transforms = await get_transforms_options_func()
    data = request.json
    # check for right parameters
    if "name" not in data or data['name'] is None or data['name'] not in possible_transforms:
        return json({'status': 'error', 'error': 'problem with \"name\" parameter'})
    if "parameter" not in data or data['parameter'] is None:
        data['parameter'] = ""
    if "t_type" not in data or data['t_type'] is None:
        return json({'status': 'error', 'error': 'Must specify a type for this transform (\"load\" or \"create\"'})
    if "order" not in data or data['order'] is None:
        return json({'status': 'error', 'error': 'Must provide an order to this transform'})
    if data['order'] <= 0:
        return json({'status': 'error', 'error': 'Order must be postive'})
    try:
        transform = await db_objects.create(Transform, name=data['name'], parameter=data['parameter'],
                                            t_type=data['t_type'], order=data['order'], operator=operator,
                                            payload_type=payloadtype)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to create transform'})
    return json({'status': 'success', **transform.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/transforms/<id:int>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_transform(request, user, id):
    try:
        transform = await db_objects.get(Transform, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that transform'})
    transform_json = transform.to_json()
    await db_objects.delete(transform)
    return json({'status': "success", **transform_json})


@apfell.route(apfell.config['API_BASE'] + "/transforms/<id:int>", methods=['PUT'])
@inject_user()
@protected()
async def update_transform_for_ptype(request, user, id):
    data = request.json
    try:
        transform = await db_objects.get(Transform, id=id)
        operator = await db_objects.get(Operator, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find transform'})
    possible_transforms = await get_transforms_options_func()
    if "name" in data and data['name'] in possible_transforms:
        transform.name = data['name']
    if "t_type" in data:
        transform.t_type = data['t_type']
    if "order" in data and int(data['order']) <= 0:
        return json({'status': 'error', 'error': "can't have order <= 0"})
    if "parameter" in data:
        transform.parameter = data['parameter']
    if "order" in data:
        transform.order = int(data['order'])
    transform.operator = operator
    transform.timestamp = datetime.datetime.utcnow()
    await db_objects.update(transform)
    return json({'status': 'success', **transform.to_json()})


async def get_transforms_func(ptype, t_type):
    try:
        payload_type = await db_objects.get(PayloadType, ptype=ptype)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get payload type specified'}
    try:
        transforms = await db_objects.execute(Transform.select().where(
            (Transform.t_type == t_type) & (Transform.payload_type == payload_type)).order_by(Transform.order))
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get ' + ptype + ' transforms for ' + t_type}
    return {'status': 'success', 'transforms': [t.to_json() for t in transforms]}