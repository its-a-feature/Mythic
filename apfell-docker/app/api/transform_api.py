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
import json as js


@apfell.route(apfell.config['API_BASE'] + "/transform_code/<id:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_transform_code(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.transformcode_query()
        transform = await db_objects.get(query, id=id)
        return json({'status': 'success', 'transform': transform.to_json()})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find that transform code object'})


@apfell.route(apfell.config['API_BASE'] + "/transform_code/<id:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_transform_code(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.transformcode_query()
        transform = await db_objects.get(query, id=id)
        data = request.json
        if 'code' in data:
            transform.code = data['code']
        if 'name' in data:
            transform.name = data['name']
        if 'parameter_type' in data:
            transform.parameter_type = data['parameter_type']
        if 'description' in data:
            transform.description = data['description']
        if 'is_command_code' in data:
            transform.is_command_code = data['is_command_code']
        await db_objects.update(transform)
        resp = await write_transforms_to_file()
        if resp['status'] == 'success':
            resp2 = await update_all_pt_transform_code()
            if resp2['status'] == 'success':
                return json({'status': 'success', 'transform': transform.to_json()})
            else:
                return json({'status': 'error', 'error': 'Failed to send transforms to docker containers: ' + resp2['error']})
        else:
            return json({'status': 'error', 'error': 'Failed to write transforms to disk: ' + resp['error']})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find that transform code object'})


@apfell.route(apfell.config['API_BASE'] + "/transform_code", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def new_transform_code(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        data = request.json
        if 'code' not in data:
            data['code'] = ""
        if 'name' not in data or data['name'] == "":
            return json({'status': 'error', 'error': 'A function name must be supplied'})
        if 'parameter_type' not in data:
            data['parameter_type'] = "None"
        if 'description' not in data:
            data['description'] = ""
        if 'is_command_code' not in data:
            data['is_command_code'] = False
        transform = await db_objects.create(db_model.TransformCode, code=data['code'], operator=operator,
                                            name=data['name'], parameter_type=data['parameter_type'],
                                            description=data['description'], is_command_code=data['is_command_code'])
        resp = await write_transforms_to_file()
        if resp['status'] == 'success':
            resp2 = await update_all_pt_transform_code()
            if resp2['status'] == 'success':
                return json({'status': 'success', 'transform': transform.to_json()})
            else:
                return json(
                    {'status': 'error', 'error': 'Failed to send transforms to docker containers: ' + resp2['error']})
        else:
            return json({'status': 'error', 'error': 'Failed to write transforms to disk: ' + resp['error']})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to create that transform: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/transform_code/<id:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_transform_code(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.transformcode_query()
        transform = await db_objects.get(query, id=id)
        transform_json = transform.to_json()
        # need to also delete any transform mappings for create/load transforms that might exist
        await db_objects.delete(transform, recursive=True)
        resp = await write_transforms_to_file()
        if resp['status'] == 'success':
            resp2 = await update_all_pt_transform_code()
            if resp2['status'] == 'success':
                return json({'status': 'success', 'transform': transform_json})
            else:
                return json(
                    {'status': 'error', 'error': 'Failed to send transforms to docker containers: ' + resp2['error']})
        else:
            return json({'status': 'error', 'error': 'Failed to write transforms to disk: ' + resp['error']})
    except Exception as e:
        print(str(e))
        return json({'status': 'error', 'error': 'failed to find that transform code object: ' + str(e)})


async def write_transforms_to_file():
    try:
        query = await db_model.transformcode_query()
        commands = await db_objects.execute(query.where(db_model.TransformCode.is_command_code == True))
        create_and_load = await db_objects.execute(query.where(db_model.TransformCode.is_command_code == False))
        final_code = open("./app/api/transforms/transforms.py", "w")
        command_template = open("./app/api/transforms/command_transform_class.py", "r")
        create_and_load_template = open("./app/api/transforms/create_and_load_transform_class.py", "r")
        final_code.write(command_template.read())
        command_template.close()
        for c in commands:
            code = base64.b64decode(c.code).decode()
            for line in code.split("\n"):
                final_code.write("    {}\n".format(line))
        final_code.write("\n")
        final_code.write(create_and_load_template.read())
        create_and_load_template.close()
        for c in create_and_load:
            code = base64.b64decode(c.code).decode()
            for line in code.split("\n"):
                final_code.write("    {}\n".format(line))
        final_code.close()
        return {'status': 'success'}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'Failed to create transforms.py file from transforms: ' + str(e)}


async def update_all_pt_transform_code():
    try:
        transform_code = open("./app/api/transforms/transforms.py", 'rb').read()
        status = await send_pt_rabbitmq_message("*", "load_transform_code", base64.b64encode(transform_code).decode('utf-8'), "")
        return status
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to read or send transform code: ' + str(e)}


@apfell.route(apfell.config['API_BASE'] + "/transform_code/export/create_and_load", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def export_create_and_load_transform_code(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.transformcode_query()
        transforms = await db_objects.execute(query.where(db_model.TransformCode.is_command_code == False))
        return json({'status': 'success', 'transforms': js.dumps([t.to_json() for t in transforms], indent=1)})
    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to export code: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/transform_code/export/command", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def export_command_transform_code(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.transformcode_query()
        transforms = await db_objects.execute(query.where(db_model.TransformCode.is_command_code == True))
        return json({'status': 'success', 'transforms': js.dumps([t.to_json() for t in transforms], indent=1)})
    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to export code: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/transform_code/import", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def import_create_and_load_transform_code(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.transformcode_query()
        if request.files:
            code = js.loads(request.files['upload_file'][0].body)
        else:
            input_data = request.json
            if "code" in input_data:
                code = js.loads(base64.b64decode(input_data["code"]))
            else:
                return json({'status': 'error', 'error': 'code must be supplied in base64 or via a form'})
        failed_imports = []
        operatorquery = await db_model.operator_query()
        operator = await db_objects.get(operatorquery, username=user['username'])
        for data in code:
            # script is base64 encoded
            if 'code' not in data:
                data['error'] = "transform code must be supplied"
                failed_imports.append(data)
                continue
            try:
                transform = await db_objects.get(query, name=data['name'])
                data['error'] = "Transform already exists with that name"
                failed_imports.append(data)
                continue
            except Exception as e:
                # failed to find that transform, so it's good to create it
                transform = await db_objects.create(db_model.TransformCode, name=data['name'], code=data['code'],
                                                    parameter_type=data['parameter_type'], description=data['description'],
                                                    is_command_code=data['is_command_code'], operator=operator)
        resp = await write_transforms_to_file()
        if resp['status'] == 'success':
            resp2 = await update_all_pt_transform_code()
            if resp2['status'] == 'success':
                if len(failed_imports) == 0:
                    return json({'status': 'success'})
                else:
                    return json({'status': 'error', 'error': 'Some of the transforms were not successfully imported.',
                                 'transforms': js.dumps(failed_imports, indent=2)})
            else:
                return json(
                    {'status': 'error', 'error': 'Failed to send transforms to docker containers: ' + resp2['error']})
        else:
            return json({'status': 'error', 'error': 'Failed to write transforms to disk: ' + resp['error']})

    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to export code: ' + str(e)})


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
        query = await db_model.transformcode_query()
        transforms = await db_objects.execute(query.where(db_model.TransformCode.is_command_code == False))
        return {'status': 'success', 'transforms': [t.to_json() for t in transforms]}
    except Exception as e:
        return {'status': 'error', 'error': 'Failed to get type hints: ' + str(e)}


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
    data = request.json
    # check for right parameters
    if "transform" not in data or data['transform'] is None:
        return json({'status': 'error', 'error': 'problem with \"transform\" parameter'})
    if "parameter" not in data or data['parameter'] is None:
        data['parameter'] = ""
    if "t_type" not in data or data['t_type'] is None:
        return json({'status': 'error', 'error': 'Must specify a type for this transform (\"load\" or \"create\"'})
    if "order" not in data or data['order'] is None:
        return json({'status': 'error', 'error': 'Must provide an order to this transform'})
    try:
        if int(data['order']) <= 0:
            return json({'status': 'error', 'error': 'Order must be positive'})
    except Exception as e:
        return json({'status': 'error', 'error': 'Order must be an integer'})
    if 'description' not in data:
        data['description'] = ""
    try:
        query = await db_model.transformcode_query()
        transform_code = await db_objects.get(query, id=data['transform'])
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find that transform code: ' + str(e)})
    try:
        transform = await db_objects.create(Transform, transform=transform_code, parameter=data['parameter'],
                                            t_type=data['t_type'], order=data['order'], operator=operator,
                                            payload_type=payloadtype, description=data['description'])
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
    if 'transform' in data:
        try:
            query = await db_model.transformcode_query()
            transform_code = await db_objects.get(query, id=data['transform'])
            transform.transform = transform_code
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to find that transform: ' + str(e)})
    if "t_type" in data:
        transform.t_type = data['t_type']
    if "order" in data and int(data['order']) <= 0:
        return json({'status': 'error', 'error': "can't have order <= 0"})
    if "parameter" in data:
        transform.parameter = data['parameter']
    if "order" in data:
        transform.order = int(data['order'])
    if "description" in data:
        transform.description = data['description']
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


async def get_payload_transforms(payload):
    try:
        query = await db_model.transforminstance_query()
        transforms = await db_objects.execute(query.where(db_model.TransformInstance.payload == payload).order_by(db_model.TransformInstance.order))
        return {'status': 'success', 'transforms': [t.to_json() for t in transforms]}
    except Exception as e:
        return {'status': 'error', 'error': 'failed to get transforms for payload'}


# ##################### COMMAND TRANSFORMS SPECIFICALLY BELOW HERE #########################


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/<id:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_transforms_by_command(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
    except:
        return json({'status': 'error', 'error': "failed to find that command or current operation"})
    try:
        query = await db_model.commandtransform_query()
        transforms = await db_objects.execute(query.where(
            (CommandTransform.command == command)
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
        query = await db_model.transformcode_query()
        transforms = await db_objects.execute(query.where(db_model.TransformCode.is_command_code == True))
        return {'status': 'success', 'methods': [t.to_json() for t in transforms]}
    except Exception as e:
        return {'status': 'error', 'error': 'failed to get command transforms: ' + str(e)}


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
    data = request.json
    #print(data)
    # check for right parameters
    if "transform" not in data or data['transform'] is None:
        return json({'status': 'error', 'error': 'problem with \"name\" parameter'})
    if "parameter" not in data or data['parameter'] is None:
        data['parameter'] = ""
    if "order" not in data or data['order'] is None:
        return json({'status': 'error', 'error': 'Must provide an order to this transform'})
    try:
        if int(data['order']) <= 0:
            return json({'status': 'error', 'error': 'Order must be a positive integer'})
    except Exception as e:
        return json({'status': 'error', 'error': '"order" must be an integer greater than 0'})
    if 'active' not in data:
        data['active'] = True
    try:
        query = await db_model.transformcode_query()
        tranform_code = await db_objects.get(query, id=data['transform'])
        transform = await db_objects.create(CommandTransform, parameter=data['parameter'],
                                            order=data['order'], operator=operator, command=command, operation=operation,
                                            active=data['active'], transform=tranform_code)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({'status': 'error', 'error': 'failed to create transform: ' + str(e)})
    return json({'status': 'success', **transform.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/transforms/bycommand/<id:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_commandtransform(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.commandtransform_query()
        transform = await db_objects.get(query, id=id)
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
        query = await db_model.commandtransform_query()
        transform = await db_objects.get(query, id=id)
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find transform'})
    if "transform" in data:
        try:
            query = await db_model.transformcode_query()
            transform_code = await db_objects.get(query, id=data['transform'])
            transform.transform = transform_code
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to find that transform code'})
    try:
        if "order" in data and int(data['order']) <= 0:
            return json({'status': 'error', 'error': "can't have order <= 0"})
    except Exception as e:
        return json({'status': 'error', 'error': 'order must be an integer'})
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
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get payload type specified'}
    try:
        query = await db_model.commandtransform_query()
        transforms = await db_objects.execute(query.where(
            (CommandTransform.command == command)).order_by(CommandTransform.order))
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get transforms for ' + command_id}
    return {'status': 'success', 'transforms': [t.to_json() for t in transforms]}