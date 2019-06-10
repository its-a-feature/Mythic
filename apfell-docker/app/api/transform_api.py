from app import apfell, db_objects
from sanic.response import json, file
from app.database_models.model import Transform, CommandTransform
from sanic_jwt.decorators import scoped, inject_user
from urllib.parse import unquote_plus
from app.api.rabbitmq_api import send_pt_rabbitmq_message
import datetime
import importlib, sys
import base64
import app.database_models.model as db_model
from sanic.exceptions import abort


@apfell.route(apfell.config['API_BASE'] + "/transforms/bytype/<ptype:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_transforms_by_type(request, ptype, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload type'})
    try:
        query = await db_model.transform_query()
        transforms = await db_objects.execute(query.where(Transform.payload_type == payloadtype).order_by(
            Transform.t_type, Transform.order
        ))
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the transforms'})
    return json({'status': 'success', 'transforms': [t.to_json() for t in transforms]})


@apfell.route(apfell.config['API_BASE'] + "/transforms/options", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_transforms_options(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    return json(await get_transforms_options_func())


async def get_transforms_options_func():
    # reload the transform data so we can provide updated information
    try:
        import app.api.transforms.utils
        importlib.reload(sys.modules['app.api.transforms.utils'])
    except Exception as e:
        print(e)
    from app.api.transforms.utils import TransformOperation
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def register_transform_for_ptype(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
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
    if int(data['order']) <= 0:
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_transform(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.transform_query()
        transform = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that transform'})
    transform_json = transform.to_json()
    await db_objects.delete(transform)
    return json({'status': "success", **transform_json})


@apfell.route(apfell.config['API_BASE'] + "/transforms/code/download", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def download_transform_code(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    return await file("./app/api/transforms/utils.py", filename="utils.py")


@apfell.route(apfell.config['API_BASE'] + "/transforms/code/view", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def view_transform_code(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        code = base64.b64encode(open('./app/api/transforms/utils.py', 'rb').read()).decode('utf-8')
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to read transforms file'})
    return json({'status': 'success', 'code': code})


@apfell.route(apfell.config['API_BASE'] + "/transforms/code/upload", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def upload_transform_code(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
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
        status = await update_all_pt_transform_code()
        return json(status)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to reload the transform modules'})


async def update_all_pt_transform_code():
    transform_code = open("./app/api/transforms/utils.py", 'rb').read()
    status = await send_pt_rabbitmq_message("*", "load_transform_code", base64.b64encode(transform_code).decode('utf-8'))
    return status


@apfell.route(apfell.config['API_BASE'] + "/transforms/<id:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_transform_for_ptype(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    try:
        query = await db_model.transform_query()
        transform = await db_objects.get(query, id=id)
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
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
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=ptype)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get payload type specified'}
    try:
        query = await db_model.transform_query()
        transforms = await db_objects.execute(query.where(
            (Transform.t_type == t_type) & (Transform.payload_type == payload_type)).order_by(Transform.order))
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get ' + ptype + ' transforms for ' + t_type}
    return {'status': 'success', 'transforms': [t.to_json() for t in transforms]}

###################### COMMAND TRANSFORMS SPECIFICALLY BELOW HERE #########################


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/<id:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_transforms_by_command(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
    except:
        return json({'status': 'error', 'error': "failed to find that command or current operation"})
    try:
        query = await db_model.commandtransform_query()
        transforms = await db_objects.execute(query.where(
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_commandtransforms_options(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    return json(await get_commandtransforms_options_func())


async def get_commandtransforms_options_func():
    try:
        import app.api.transforms.utils
        importlib.reload(sys.modules['app.api.transforms.utils'])
    except Exception as e:
        print(e)
    from app.api.transforms.utils import CommandTransformOperation
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def register_transform_for_command(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_commandtransform(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.commandtransform_query()
        transform = await db_objects.get(query, id=id, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that transform'})
    transform_json = transform.to_json()
    await db_objects.delete(transform)
    return json({'status': "success", **transform_json})


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/<id:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_transform_for_command(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.commandtransform_query()
        transform = await db_objects.get(query, id=id, operation=operation)
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
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
        query = await db_model.command_query()
        command = await db_objects.get(query, id=command_id)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=operation_name)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get payload type specified'}
    try:
        query = await db_model.commandtransform_query()
        transforms = await db_objects.execute(query.where(
            (CommandTransform.command == command) & (CommandTransform.operation == operation)).order_by(CommandTransform.order))
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get transforms for ' + command_id}
    return {'status': 'success', 'transforms': [t.to_json() for t in transforms]}