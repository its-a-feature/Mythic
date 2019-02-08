from app import apfell, db_objects
from sanic.response import json, file
from app.database_models.model import PayloadType, Transform, Operator, Command, Operation, CommandTransform
from sanic_jwt.decorators import protected, inject_user
from urllib.parse import unquote_plus
from app.api.transforms.utils import TransformOperation, CommandTransformOperation
import datetime
import importlib, sys
import base64


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
        typehint = str(hint[1])
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
        return json({'status': 'error', 'error': 'Order must be positive'})
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


@apfell.route(apfell.config['API_BASE'] + "/transforms/code/download", methods=['GET'])
@inject_user()
@protected()
async def download_transform_code(request, user):
    return await file("./app/api/transforms/utils.py", filename="utils.py")


@apfell.route(apfell.config['API_BASE'] + "/transforms/code/view", methods=['GET'])
@inject_user()
@protected()
async def view_transform_code(request, user):
    try:
        code = base64.b64encode(open('./app/api/transforms/utils.py', 'rb').read()).decode('utf-8')
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to read transforms file'})
    return json({'status': 'success', 'code': code})


@apfell.route(apfell.config['API_BASE'] + "/transforms/code/upload", methods=['POST'])
@inject_user()
@protected()
async def upload_c2_profile_payload_type_code(request, user):
    # upload a new transforms file to our server and reload the transforms code
    try:
        data = request.json
    except Exception as e:
        data = {}
    if request.files:
        try:
            code = request.files['upload_file'][0].body
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to get uploaded code: ' + str(e)})

    elif 'code' in data:
        try:
            code = base64.b64decode(data['code'])
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to get code from data '})
    else:
        return json({'status': 'error', 'error': 'must actually upload files'})
    try:
        new_utils = open("./app/api/transforms/utils.py", 'wb')
        new_utils.write(code)
        new_utils.close()
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to write to disk: ' + str(e)})
    try:
        try:
            import app.api.transforms.utils
            importlib.reload(sys.modules['app.api.transforms.utils'])
        except Exception as e:
            print(e)
        from app.api.transforms.utils import CommandTransformOperation, TransformOperation
        return json({'status': 'success'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to reload the transform modules'})


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

###################### COMMAND TRANSFORMS SPECIFICALLY BELOW HERE #########################


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/<id:int>", methods=['GET'])
@inject_user()
@protected()
async def get_transforms_by_command(request, id, user):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        command = await db_objects.get(Command, id=id)
    except:
        return json({'status': 'error', 'error': "failed to find that command or current operation"})
    try:
        transforms = await db_objects.execute(CommandTransform.select().where(
            (CommandTransform.command == command) & (CommandTransform.operation == operation)
        ).order_by(
            CommandTransform.order
        ))
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the transforms'})
    return json({'status': 'success', 'transforms': [t.to_json() for t in transforms]})


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/options", methods=['GET'])
@inject_user()
@protected()
async def get_commandtransforms_options(request, user):
    return json(await get_commandtransforms_options_func())


async def get_commandtransforms_options_func():
    t = CommandTransformOperation()
    method_list = {func: await get_command_type_hints(getattr(t, func).__annotations__) for func in dir(t) if
                   callable(getattr(t, func)) and not func.startswith("__")}
    return method_list


async def get_command_type_hints(func):
    # we don't want information about the payload or parameter inputs, because that's the same for all of them
    # we really care about the input and output so we can make sure they match up
    hints = {"return": "unknown", "parameter": "unknown"}
    for hint in func.items():
        name = hint[0]
        typehint = str(hint[1])
        if name is not 'task_params':
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
                    hints[name] = typehint
    return hints


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/<id:int>", methods=['POST'])
@inject_user()
@protected()
async def register_transform_for_command(request, user, id):
    try:
        command = await db_objects.get(Command, id=id)
        operator = await db_objects.get(Operator, username=user['username'])
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find command, operation, or current operator'})
    possible_transforms = await get_commandtransforms_options_func()
    data = request.json
    # check for right parameters
    if "name" not in data or data['name'] is None or data['name'] not in possible_transforms:
        return json({'status': 'error', 'error': 'problem with \"name\" parameter'})
    if "parameter" not in data or data['parameter'] is None:
        data['parameter'] = ""
    if "order" not in data or data['order'] is None:
        return json({'status': 'error', 'error': 'Must provide an order to this transform'})
    if data['order'] <= 0:
        return json({'status': 'error', 'error': 'Order must be positive'})
    if 'active' not in data:
        data['active'] = True
    try:
        transform = await db_objects.create(CommandTransform, name=data['name'], parameter=data['parameter'],
                                            order=data['order'], operator=operator, command=command, operation=operation,
                                            active=data['active'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to create transform'})
    return json({'status': 'success', **transform.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/<id:int>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_commandtransform(request, user, id):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        transform = await db_objects.get(CommandTransform, id=id, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that transform'})
    transform_json = transform.to_json()
    await db_objects.delete(transform)
    return json({'status': "success", **transform_json})


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/<id:int>", methods=['PUT'])
@inject_user()
@protected()
async def update_transform_for_command(request, user, id):
    data = request.json
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        transform = await db_objects.get(CommandTransform, id=id, operation=operation)
        operator = await db_objects.get(Operator, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find transform'})
    possible_transforms = await get_commandtransforms_options_func()
    if "name" in data and data['name'] in possible_transforms:
        transform.name = data['name']
    if "order" in data and int(data['order']) <= 0:
        return json({'status': 'error', 'error': "can't have order <= 0"})
    if "parameter" in data:
        transform.parameter = data['parameter']
    if "order" in data:
        transform.order = int(data['order'])
    if "active" in data:
        transform.active = data['active']
    transform.operator = operator
    transform.timestamp = datetime.datetime.utcnow()
    await db_objects.update(transform)
    return json({'status': 'success', **transform.to_json()})


async def get_commandtransforms_func(command_id, operation_name):
    try:
        command = await db_objects.get(Command, id=command_id)
        operation = await db_objects.get(Operation, name=operation_name)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get payload type specified'}
    try:
        transforms = await db_objects.execute(CommandTransform.select().where(
            (CommandTransform.command == command) & (CommandTransform.operation == operation)).order_by(CommandTransform.order))
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get transforms for ' + command_id}
    return {'status': 'success', 'transforms': [t.to_json() for t in transforms]}