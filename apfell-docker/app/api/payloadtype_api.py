from app import apfell, db_objects
from sanic.response import json, file
from app.database_models.model import PayloadType, Command, CommandParameters, CommandTransform, ATTACKCommand, PayloadTypeC2Profile, Transform, ArtifactTemplate
from sanic_jwt.decorators import scoped, inject_user
from urllib.parse import unquote_plus
import os
from shutil import rmtree
import json as js
import glob
import base64, datetime
import app.database_models.model as db_model
from app.api.rabbitmq_api import send_pt_rabbitmq_message
from sanic.exceptions import abort


# payloadtypes aren't inherent to an operation
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_payloadtypes(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    query = await db_model.payloadtype_query()
    payloads = await db_objects.execute(query)
    return json([p.to_json() for p in payloads])


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_payloadtype(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find payload type'})
    return json({'status': 'success', **payloadtype.to_json()})


# anybody can create a payload type for now, maybe just admins in the future?
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_payloadtype(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # this needs to know the name of the type, everything else is done for you
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    try:
        if "ptype" not in data:
            return json({'status': 'error', 'error': '"ptype" is a required field and must be unique'})
        if "file_extension" not in data:
            data["file_extension"] = ""
        elif "." not in data['file_extension'] and data['file_extension'] != "":
            data['file_extension'] = "." + data['file_extension']
        if 'wrapper' not in data:
            data['wrapper'] = False
        if "command_template" not in data:
            data['command_template'] = ""
        if 'supported_os' not in data:
            return json({'status': 'error', 'error': 'must specify "supported_os" list'})
        if 'execute_help' not in data:
            data['execute_help'] = ""
        if 'external' not in data:
            data['external'] = False
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        data['ptype'] = data['ptype'].replace(" ", "_")
        if data['wrapper']:
            if "wrapped_payload_type" not in data:
                return json({'status': 'error', 'error': '"wrapped_payload_type" is required for a wraper type payload'})
            try:
                query = await db_model.payloadtype_query()
                wrapped_payload_type = await db_objects.get(query, ptype=data['wrapped_payload_type'])
            except Exception as e:
                print(e)
                return json({'status': 'error', 'error': "failed to find that wrapped payload type"})
            payloadtype = await db_objects.create(PayloadType, ptype=data['ptype'], operator=operator,
                                                  file_extension=data['file_extension'],
                                                  wrapper=data['wrapper'],
                                                  wrapped_payload_type=wrapped_payload_type,
                                                  supported_os=",".join(data['supported_os']),
                                                  execute_help=data['execute_help'],
                                                  external=data['external'])
        else:
            payloadtype = await db_objects.create(PayloadType, ptype=data['ptype'], operator=operator,
                                                  file_extension=data['file_extension'],
                                                  wrapper=data['wrapper'], command_template=data['command_template'],
                                                  supported_os=",".join(data['supported_os']),
                                                  execute_help=data['execute_help'],
                                                  external=data['external'])
        os.mkdir("./app/payloads/{}".format(payloadtype.ptype))  # make the directory structure
        os.mkdir("./app/payloads/{}/payload".format(payloadtype.ptype))  # make the directory structure
        os.mkdir("./app/payloads/{}/commands".format(payloadtype.ptype))  # make the directory structure
        if request.files:
            code = request.files['upload_file'][0].body
            code_file = open("./app/payloads/{}/payload/{}".format(payloadtype.ptype, request.files['upload_file'][0].name), "wb")
            code_file.write(code)
            code_file.close()
            for i in range(1, int(request.form.get('file_length'))):
                code = request.files['upload_file_' + str(i)][0].body
                code_file = open("./app/payloads/{}/payload/{}".format(payloadtype.ptype, request.files['upload_file_' + str(i)][0].name),
                                 "wb")
                code_file.write(code)
                code_file.close()
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to create new payload type: ' + str(e)})
    status = {'status': 'success'}
    ptype_json = payloadtype.to_json()
    # make sure a file exists in the right location with the right name
    if not os.path.exists("./app/payloads/{}/payload/{}{}".format(payloadtype.ptype, payloadtype.ptype, payloadtype.file_extension)):
        file = open("./app/payloads/{}/payload/{}{}".format(payloadtype.ptype, payloadtype.ptype, payloadtype.file_extension), 'wb')
        file.close()
    return json({**status, **ptype_json})


# anybody can create a payload type for now, maybe just admins in the future?
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_payloadtype(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    try:
        payload_type = unquote_plus(ptype)
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': "failed to find that payload type"})
    query = await db_model.operator_query()
    operator = await db_objects.get(query, username=user['username'])
    if user['admin'] or payloadtype.operator == operator:
        if 'file_extension' in data:
            if "." not in data['file_extension'] and data['file_extension'] != "":
                payloadtype.file_extension = "." + data['file_extension']
            else:
                payloadtype.file_extension = data['file_extension']
        if 'wrapper' in data:
            payloadtype.wrapper = data['wrapper']
        if 'wrapped_payload_type' in data:
            try:
                query = await db_model.payloadtype_query()
                wrapped_payload_type = await db_objects.get(query, ptype=data['wrapped_payload_type'])
            except Exception as e:
                print(e)
                return json({'status': 'error', 'error': "failed to find that wrapped payload type"})
            payloadtype.wrapped_payload_type = wrapped_payload_type
        if 'command_template' in data:
            payloadtype.command_template = data['command_template']
        if 'supported_os' in data:
            payloadtype.supported_os = ",".join(data['supported_os'])
        if 'execute_help' in data:
            payloadtype.execute_help = data['execute_help']
        if 'external' in data:
            payloadtype.external = data['external']
        if 'container_running' in data:
            payloadtype.container_running = data['container_running']
        await db_objects.update(payloadtype)
        if request.files:
            code = request.files['upload_file'][0].body
            code_file = open("./app/payloads/{}/payload/{}".format(payloadtype.ptype, request.files['upload_file'][0].name), "wb")
            code_file.write(code)
            code_file.close()
            for i in range(1, int(request.form.get('file_length'))):
                code = request.files['upload_file_' + str(i)][0].body
                code_file = open("./app/payloads/{}/payload/{}".format(payloadtype.ptype, request.files['upload_file_' + str(i)][0].name),
                                 "wb")
                code_file.write(code)
                code_file.close()
        return json({'status': 'success', **payloadtype.to_json()})
    else:
        return json({'status': 'error', 'error': "must be an admin or the creator of the type to edit it"})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/upload", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def upload_payload_code(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload'})
    if request.files:
        code = request.files['upload_file'][0].body
        code_file = open("./app/payloads/{}/payload/{}".format(payloadtype.ptype, request.files['upload_file'][0].name),
                         "wb")
        code_file.write(code)
        code_file.close()
        for i in range(1, int(request.form.get('file_length'))):
            code = request.files['upload_file_' + str(i)][0].body
            code_file = open(
                "./app/payloads/{}/payload/{}".format(payloadtype.ptype, request.files['upload_file_' + str(i)][0].name),
                "wb")
            code_file.write(code)
            code_file.close()
        return json({'status': 'success'})
    else:
        return json({'status': 'error', 'error': 'nothing to upload...'})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/container_upload", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def upload_payload_container_code(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload'})
    if request.files:
        code = request.files['upload_file'][0].body
        status = await send_pt_rabbitmq_message(payload_type, "writefile",
                                                base64.b64encode(
                                                    js.dumps(
                                                        {"file_path": request.files['upload_file'][0].name,
                                                         "data": base64.b64encode(code).decode('utf-8')}).encode()
                                                ).decode('utf-8'))
        for i in range(1, int(request.form.get('file_length'))):
            code = request.files['upload_file_' + str(i)][0].body
            status = await send_pt_rabbitmq_message(payload_type, "writefile",
                                                    base64.b64encode(
                                                        js.dumps(
                                                            {"file_path": request.files['upload_file_' + str(i)][0].name,
                                                             "data": base64.b64encode(code).decode('utf-8')}).encode()
                                                    ).decode('utf-8'))
        return json({'status': 'success'})
    else:
        return json({'status': 'error', 'error': 'nothing to upload...'})


# payloadtypes aren't inherent to an operation
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/<fromDisk:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_one_payloadtype(request, user, ptype, fromDisk):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find payload type'})
    query = await db_model.operator_query()
    operator = await db_objects.get(query, username=user['username'])
    if payloadtype.operator == operator or user['admin']:
        # only delete a payload type if you created it or if you're an admin
        try:
            payloadtype_json = payloadtype.to_json()
            await db_objects.delete(payloadtype, recursive=True)
            if fromDisk == 1:
                # this means we should delete the corresponding folder from disk as well
                try:
                    rmtree("./app/payloads/{}".format(payloadtype_json['ptype']))
                except Exception as e:
                    print("Directory didn't exist")
            return json({'status': 'success', **payloadtype_json})
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to delete payloadtype. ' + str(e)})
    else:
        return json({'status': 'error', 'error': 'you must be admin or the creator of the payload type to delete it'})


# get all the commands associated with a specitic payload_type
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/commands", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_commands_for_payloadtype(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get payload type'})
    query = await db_model.command_query()
    commands = await db_objects.execute(query.where(Command.payload_type == payloadtype).order_by(Command.cmd))
    all_commands = []
    for cmd in commands:
        query = await db_model.commandparameters_query()
        params = await db_objects.execute(query.where(CommandParameters.command == cmd))
        query = await db_model.commandtransform_query()
        transforms = await db_objects.execute(query.where(CommandTransform.command == cmd))
        all_commands.append({**cmd.to_json(), "params": [p.to_json() for p in params], "transforms": [t.to_json() for t in transforms]})
    status = {'status': 'success'}
    return json({**status, 'commands': all_commands})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/files", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def list_uploaded_files_for_payloadtype(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get payload type'})
    try:
        path = "./app/payloads/{}/payload/".format(payload_type)
        files = []
        for (dirpath, dirnames, filenames) in os.walk(path):
            files.append({"folder": dirpath, "dirnames": dirnames, "filenames": filenames})
        return json({'status': 'success', 'files': files})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed getting files: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/container_files", methods=['GET'])
@inject_user()
@scoped('auth:user')
async def list_uploaded_container_files_for_payloadtype(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # apitoken for this won't help much since it's rabbitmq based
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get payload type'})
    try:
        status = await send_pt_rabbitmq_message(payload_type, "listfiles", "")
        return json(status)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed getting files: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/files/delete", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_uploaded_files_for_payloadtype(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get payload type'})
    try:
        data = request.json
        path = os.path.abspath("/app/payloads/{}/payload/".format(payload_type))
        attempted_path = os.path.abspath(data['folder'] + "/" + data['file'])
        if path in attempted_path:
            os.remove(attempted_path)
            return json({'status': 'success', 'folder': data['folder'], 'file': data['file']})
        return json({'status': 'error', 'error': 'failed to find file'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed getting files: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/files/container_delete", methods=['POST'])
@inject_user()
@scoped('auth:user')
async def remove_uploaded_container_files_for_payloadtype(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # apitoken access for this won't help since it's rabbitmq based
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get payload type'})
    try:
        data = request.json
        status = await send_pt_rabbitmq_message(payload_type, "removefile",
                                                base64.b64encode(js.dumps({
                                                    "folder": data['folder'],
                                                    "file": data['file']
                                                }).encode()).decode('utf-8'))
        return json(status)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed sending message: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/files/download", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def download_file_for_payloadtype(request, ptype, user):
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
        data = dict(folder=request.raw_args['folder'], file=request.raw_args['file'])
        path = os.path.abspath("/app/payloads/{}/payload/".format(payload_type))
        attempted_path = os.path.abspath(data['folder'] + "/" + data['file'])
        if path in attempted_path:
            return await file(attempted_path, filename=data['file'])
        return json({'status': 'success', 'folder': data['folder'], 'file': data['file']})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed finding the file: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/files/container_download", methods=['GET'])
@inject_user()
@scoped('auth:user')
async def download_container_file_for_payloadtype(request, ptype, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # apitoken access for this own't help since it's rabbitmq based
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload type'})
    try:
        data = dict(folder=request.raw_args['folder'], file=request.raw_args['file'])
        status = await send_pt_rabbitmq_message(payload_type, "getfile",
                                                base64.b64encode(js.dumps(data).encode()).decode('utf-8'))
        return json(status)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed sending the message: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/export", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def export_command_list(request, user, ptype):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payload_ptype = await db_objects.get(query, ptype=payload_type)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'unable to find that payload type'})
    cmdlist = []
    try:
        payloadtype_json = payload_ptype.to_json()
        del payloadtype_json['id']
        del payloadtype_json['operator']
        del payloadtype_json['creation_time']
        payloadtype_json['files'] = []
        if not payload_ptype.external:
            for file in glob.iglob("./app/payloads/{}/payload/*".format(payload_type)):
                payload_file = open(file, 'rb')
                file_dict = {file.split("/")[-1]: base64.b64encode(payload_file.read()).decode('utf-8')}
                payloadtype_json['files'].append(file_dict)
        query = await db_model.command_query()
        commands = await db_objects.execute(query.where(Command.payload_type == payload_ptype))
        for c in commands:
            cmd_json = c.to_json()
            del cmd_json['id']
            del cmd_json['creation_time']
            del cmd_json['operator']
            del cmd_json['payload_type']
            query = await db_model.commandparameters_query()
            params = await db_objects.execute(query.where(CommandParameters.command == c))
            params_list = []
            for p in params:
                p_json = p.to_json()
                del p_json['id']
                del p_json['command']
                del p_json['cmd']
                del p_json['operator']
                del p_json['payload_type']
                params_list.append(p_json)
            cmd_json['parameters'] = params_list
            query = await db_model.attackcommand_query()
            attacks = await db_objects.execute(query.where(ATTACKCommand.command == c))
            attack_list = []
            for a in attacks:
                a_json = a.to_json()
                del a_json['command']
                del a_json['command_id']
                del a_json['id']
                attack_list.append(a_json)
            cmd_json['attack'] = attack_list
            query = await db_model.artifacttemplate_query()
            artifacts = await db_objects.execute(query.where( (ArtifactTemplate.command == c) & (ArtifactTemplate.deleted == False)))
            artifact_list = []
            for a in artifacts:
                a_json = {"command_parameter": a.command_parameter.name if a.command_parameter else "null", "artifact": a.artifact.name,
                          "artifact_string": a.artifact_string, "replace_string": a.replace_string}
                artifact_list.append(a_json)
            cmd_json['artifacts'] = artifact_list
            try:
                cmd_file = open("./app/payloads/{}/commands/{}".format(payload_type, c.cmd), 'rb')
                cmd_json['file'] = base64.b64encode(cmd_file.read()).decode('utf-8')
            except Exception as e:
                pass
            cmdlist.append(cmd_json)
        # get all the c2 profiles we can that match up with this payload type for the current operation
        query = await db_model.payloadtypec2profile_query()
        profiles = await db_objects.execute(query.where(PayloadTypeC2Profile.payload_type == payload_ptype))
        profiles_dict = {}
        for p in profiles:
            files = []
            if not payload_ptype.external:
                for profile_file in glob.iglob("./app/c2_profiles/{}/{}/*".format(p.c2_profile.name, payload_type)):
                    file_contents = open(profile_file, 'rb')
                    file_dict = {profile_file.split("/")[-1]: base64.b64encode(file_contents.read()).decode('utf-8')}
                    files.append(file_dict)
                profiles_dict[p.c2_profile.name] = files
        payloadtype_json['c2_profiles'] = profiles_dict
        # get all of the module load transformations
        query = await db_model.transform_query()
        load_transforms = await db_objects.execute(query.where(
            (Transform.t_type == "load") & (Transform.payload_type == payload_ptype) ))
        load_transforms_list = []
        for lt in load_transforms:
            lt_json = lt.to_json()
            del lt_json['payload_type']
            del lt_json['operator']
            del lt_json['timestamp']
            del lt_json['t_type']
            del lt_json['id']
            load_transforms_list.append(lt_json)
        payloadtype_json['load_transforms'] = load_transforms_list
        # get all of the payload creation transformations
        query = await db_model.transform_query()
        create_transforms = await db_objects.execute(query.where(
            (Transform.t_type == "create") & (Transform.payload_type == payload_ptype)))
        create_transforms_list = []
        for ct in create_transforms:
            ct_json = ct.to_json()
            del ct_json['payload_type']
            del ct_json['operator']
            del ct_json['timestamp']
            del ct_json['t_type']
            del ct_json['id']
            create_transforms_list.append(ct_json)
        payloadtype_json['create_transforms'] = create_transforms_list
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get information for that payload type: ' + str(e)})
    return json({"payload_types": [{**payloadtype_json, "commands": cmdlist}]})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/import", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def import_payloadtype_and_commands(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # The format for this will be the same as the default_commands.json file or what you get from the export function
    # This allows you to import commands across a set of different payload types at once
    if request.files:
        try:
            data = js.loads(request.files['upload_file'][0].body.decode('UTF-8'))
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to parse file'})
    else:
        try:
            data = request.json
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to parse JSON'})
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get operator information'})
    if "payload_types" not in data:
        return json({'status': 'error', 'error': 'must start with "payload_types"'})
    error_list = []
    # we will need to loop over this twice, once doing non-wrapper payload types, another to do the wrapper types
    # this ensures that wrapped types have a chance to have their corresponding payload type already created
    nonwrapped = [ptype for ptype in data['payload_types'] if not ptype['wrapper']]
    wrapped = [ptype for ptype in data['payload_types'] if ptype['wrapper']]
    for ptype in nonwrapped:
        error_list.append(await import_payload_type_func(ptype, operator, operation))
    for ptype in wrapped:
        error_list.append(await import_payload_type_func(ptype, operator, operation))
    return json(error_list)


async def import_payload_type_func(ptype, operator, operation):
    if ptype['wrapper']:
        try:
            query = await db_model.payloadtype_query()
            wrapped_payloadtype = await db_objects.get(query, ptype=ptype['wrapped_payload_type'])
        except Exception as e:
            return {ptype['ptype']: 'failed to find wrapped payload type'}
        try:
            query = await db_model.payloadtype_query()
            payload_type= await db_objects.get(query, ptype=ptype['ptype'],
                                                                   wrapped_payload_type=wrapped_payloadtype)
        except Exception as e:
            # this means we need to create it
            if 'external' not in ptype:
                ptype['external'] = False
            payload_type = await db_objects.create(PayloadType, ptype=ptype['ptype'], wrapped_payload_type=wrapped_payloadtype,
                                                   operator=operator, wrapper=True, command_template=ptype['command_template'],
                                                   supported_os=ptype['supported_os'], file_extension=ptype['file_extension'],
                                                   execute_help=ptype['execute_help'], external=ptype['external'])

    else:
        try:
            query = await db_model.payloadtype_query()
            payload_type = await db_objects.get(query, ptype=ptype['ptype'])
        except Exception as e:
            if 'external' not in ptype:
                ptype['external'] = False
            payload_type = await db_objects.create(PayloadType, ptype=ptype['ptype'],
                                                               operator=operator, wrapper=False,
                                                               command_template=ptype['command_template'],
                                                               supported_os=ptype['supported_os'],
                                                               file_extension=ptype['file_extension'],
                                                               execute_help=ptype['execute_help'],
                                                               external=ptype['external'])

    payload_type.operator = operator
    payload_type.creation_time = datetime.datetime.utcnow()
    await db_objects.update(payload_type)
    # now to process all of the files associated with the payload type
    #    make all of the necessary folders for us first
    os.makedirs("./app/payloads/{}".format(payload_type.ptype), exist_ok=True)  # make the directory structure
    os.makedirs("./app/payloads/{}/payload".format(payload_type.ptype), exist_ok=True)  # make the directory structure
    os.makedirs("./app/payloads/{}/commands".format(payload_type.ptype), exist_ok=True)  # make the directory structure
    for payload_file in ptype['files']:
        for file_name in payload_file:  # {"filename.extension": "base64 blob"}
            ptype_file = open("./app/payloads/{}/payload/{}".format(payload_type.ptype, file_name), 'wb')
            ptype_content = base64.b64decode(payload_file[file_name])
            ptype_file.write(ptype_content)
            ptype_file.close()
    # now to process the transforms
    for lt in ptype['load_transforms']:
        try:
            query = await db_model.transform_query()
            cmd_lt = await db_objects.get(query, payload_type=payload_type, t_type="load",
                                          order=lt['order'])
            cmd_lt.name = lt['name']
            cmd_lt.parameter = lt['parameter']
            cmd_lt.operator = operator
            await db_objects.update(cmd_lt)
        except:
            await db_objects.create(Transform, payload_type=payload_type, t_type="load", operator=operator,
                                    **lt)
    for ct in ptype['create_transforms']:
        try:
            query = await db_model.transform_query()
            cmd_ct = await db_objects.get(query, payload_type=payload_type, t_type="create",
                                          order=ct['order'])
            cmd_ct.name = ct['name']
            cmd_ct.parameter = ct['parameter']
            cmd_ct.operator = operator
            await db_objects.update(cmd_ct)
        except:
            await db_objects.create(Transform, payload_type=payload_type, t_type="create", operator=operator,
                                    **ct)
    # now that we have the payload type, start processing the commands and their parts
    for cmd in ptype['commands']:
        if 'is_exit' not in cmd:
            cmd['is_exit'] = False
        elif cmd['is_exit'] is True:
            # this is trying to say it is the exit command for this payload type
            # there can only be one for a given payload type though, so check. if one exists, change it
            query = await db_model.command_query()
            try:
                exit_command = await db_objects.get(query.where( (Command.is_exit == True) & (Command.payload_type == payload_type)))
                # one is already set, so set it to false
                exit_command.is_exit = False
                await db_objects.update(exit_command)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
        try:
            query = await db_model.command_query()
            command = await db_objects.get(query, cmd=cmd['cmd'], payload_type=payload_type)
            command.description = cmd['description']
            command.needs_admin = cmd['needs_admin']
            command.version = cmd['version']
            command.help_cmd = cmd['help_cmd']
            command.is_exit = cmd['is_exit']
            command.operator = operator
            await db_objects.update(command)
        except Exception as e:  # this means that the command doesn't already exist
            command = await db_objects.create(Command, cmd=cmd['cmd'], payload_type=payload_type,
                                           description=cmd['description'], version=cmd['version'],
                                           needs_admin=cmd['needs_admin'], help_cmd=cmd['help_cmd'],
                                           operator=operator, is_exit=cmd['is_exit'])
        # now to process the parameters
        for param in cmd['parameters']:
            try:
                query = await db_model.commandparameters_query()
                cmd_param = await db_objects.get(query, command=command, name=param['name'])
                cmd_param.type = param['type']
                cmd_param.hint = param['hint']
                cmd_param.choices = param['choices']
                cmd_param.required = param['required']
                cmd_param.operator = operator
                await db_objects.update(cmd_param)
            except:  # param doesn't exist yet, so create it
                await db_objects.create(CommandParameters, command=command, operator=operator, **param)

        # now to process the att&cks
        for attack in cmd['attack']:
            query = await db_model.attack_query()
            attck = await db_objects.get(query, t_num=attack['t_num'])
            query = await db_model.attackcommand_query()
            try:
                await db_objects.get(query, command=command, attack=attck)
            except Exception as e:
                # we got here so it doesn't exist, so create it and move on
                await db_objects.create(ATTACKCommand, command=command, attack=attck)
        # now to process the artifacts
        for at in cmd['artifacts']:
            try:
                query = await db_model.artifact_query()
                artifact = await db_objects.get(query, name=at['artifact'])
                artifact_template = await db_objects.create(ArtifactTemplate, command=command, artifact=artifact,
                                                            artifact_string=at['artifact_string'],
                                                            replace_string=at['replace_string'])
                if at['command_parameter'] is not None and at['command_parameter'] != "null":
                    query = await db_model.commandparameters_query()
                    command_parameter = await db_objects.get(query, command=command, name=at['command_parameter'])
                    artifact_template.command_parameter = command_parameter
                    await db_objects.update(artifact_template)
            except:
                print("failed to import artifact template due to missing base artifact")
        # now process the command file
        if 'file' in cmd:
            cmd_file = open("./app/payloads/{}/commands/{}".format(ptype['ptype'], cmd['cmd']), 'wb')
            cmd_file_data = base64.b64decode(cmd['file'])
            cmd_file.write(cmd_file_data)
            cmd_file.close()
        # now to process the c2 profiles
    if len(ptype['c2_profiles']) > 0:
        for c2_profile_name in ptype['c2_profiles']:  # {"default": [{"default.h": "base64"}, {"default.c": "base64"} ]}, {"RESTful Patchtrhough": []}
            # make sure this c2 profile exists for this operation first
            try:
                query = await db_model.c2profile_query()
                c2_profile = await db_objects.get(query, name=c2_profile_name)
            except Exception as e:
                continue  # just try to get the next c2_profile
            # now deal with the files
            for c2_file in ptype['c2_profiles'][c2_profile_name]:  # list of files
                # associate the new payload type with this C2 profile and create directory as needed
                query = await db_model.payloadtypec2profile_query()
                try:
                    await db_objects.get(query, payload_type=payload_type, c2_profile=c2_profile)
                except Exception as e:
                    # it doesn't exist, so we create it
                    await db_objects.create(PayloadTypeC2Profile, payload_type=payload_type, c2_profile=c2_profile)
                os.makedirs("./app/c2_profiles/{}/{}".format(c2_profile_name, ptype['ptype']), exist_ok=True)
                for c2_file_name in c2_file:
                    ptype_file = open("./app/c2_profiles/{}/{}/{}".format( c2_profile_name, ptype['ptype'], c2_file_name), 'wb')
                    ptype_content = base64.b64decode(c2_file[c2_file_name])
                    ptype_file.write(ptype_content)
                    ptype_file.close()
    return {ptype['ptype']: 'success'}