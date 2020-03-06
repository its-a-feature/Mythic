from app import apfell, db_objects
from sanic.response import json, file, text
from app.database_models.model import Command, CommandParameters, CommandTransform, ATTACKCommand, ArtifactTemplate
from sanic_jwt.decorators import scoped, inject_user
from urllib.parse import unquote_plus
import json as js
import base64
import app.database_models.model as db_model
from sanic.exceptions import abort
import os
import shutil


# commands aren't inherent to an operation, they're unique to a payloadtype
@apfell.route(apfell.config['API_BASE'] + "/commands/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_commands(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    all_commands = []
    query = await db_model.command_query()
    commands = await db_objects.execute(query.where(Command.deleted == False).order_by(Command.id))
    for cmd in commands:
        query = await db_model.commandparameters_query()
        params = await db_objects.execute(query.where(CommandParameters.command == cmd).order_by(CommandParameters.id))
        all_commands.append({**cmd.to_json(), "params": [p.to_json() for p in params]})
    return json(all_commands)


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/files/delete", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_uploaded_files_for_command(request, user, cid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    try:
        data = request.json
        path = os.path.abspath("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd))
        if data['folder'] == "" or data['folder'] is None:
            data['folder'] = "."
        attempted_path = os.path.abspath(path + "/" + data['folder'] + "/" + data['file'])
        if path in attempted_path:
            os.remove(attempted_path)
            if data['folder'] == ".":
                data['folder'] = ""
            return json({'status': 'success', 'folder': data['folder'], 'file': data['file']})
        return json({'status': 'error', 'error': 'failed to find file'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed getting files: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/files/download", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def download_files_for_command(request, user, cid):
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    try:
        data = request.json
        if 'file' not in data:
            return json({'status': 'error', 'error': 'failed to get file parameter'})
        if 'folder' not in data:
            data['folder'] = "."
        path = os.path.abspath("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd))
        if data['folder'] == "" or data['folder'] is None:
            data['folder'] = "."
        attempted_path = os.path.abspath(path + "/" + data['folder'] + "/" + data['file'])
        if path in attempted_path:
            code = open(attempted_path, 'rb')
            encoded = base64.b64encode(code.read()).decode("UTF-8")
            return json({"status": "success", "file": encoded})
        return json({'status': 'error', 'error': 'failed to read file'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed finding the file: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/files/add_folder", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def add_folder_for_command(request, user, cid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
        data = request.json
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    try:
        command_path = os.path.abspath("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd))
        if data['folder'] == "" or data['folder'] is None:
            data['folder'] = "."
        path = command_path + "/" + data['folder'] + "/" + data['sub_folder']
        path_abs = os.path.abspath(path)
        if command_path in path_abs:
            os.mkdir(path_abs)
            return json({'status': 'success', 'folder': data['sub_folder']})
        else:
            return json({'status': 'error', 'error': 'trying to create a folder outside your payload type'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed creating folder: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/files/remove_folder", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_folder_for_command(request, user, cid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
        data = request.json
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    try:
        command_path = os.path.abspath("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd))
        command_path = os.path.abspath(command_path)
        path = command_path + "/" + data['folder']
        path = os.path.abspath(path)
        if command_path in path and command_path != path:
            os.rmdir(path)
            return json({'status': 'success', 'folder': path})
        else:
            return json({'status': 'error', 'error': 'trying to remove a folder outside your command or one that isn\'t empty'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to remove folder: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/upload", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def upload_file_for_command(request, user, cid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    base_path = os.path.abspath("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd))
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    try:
        path = base_path + "/" + data['folder'] if 'folder' in data else base_path
        path = os.path.abspath(path)
        if base_path in path:
            base_path = path
    except Exception as e:
        pass
    uploaded_files = []
    if request.files:
        code = request.files['upload_file'][0].body
        code_file = open(base_path + "/{}".format(request.files['upload_file'][0].name), "wb")
        code_file.write(code)
        code_file.close()
        uploaded_files.append(request.files['upload_file'][0].name)
        for i in range(1, int(request.form.get('file_length'))):
            code = request.files['upload_file_' + str(i)][0].body
            code_file = open(
                base_path + "/{}".format(request.files['upload_file_' + str(i)][0].name), "wb")
            code_file.write(code)
            code_file.close()
            uploaded_files.append(request.files['upload_file_' + str(i)][0].name)
        async with db_objects.atomic():
            query = await db_model.command_query()
            command = await db_objects.get(query, id=cid)
            command.version = command.version + 1
            await db_objects.update(command)
        return json({'status': 'success', 'files': uploaded_files})
    elif 'code' in data and 'file' in data:
        code_file = open(base_path + "/{}".format(data['file']), "wb")
        code_file.write(base64.b64decode(data['code']))
        code_file.close()
        async with db_objects.atomic():
            query = await db_model.command_query()
            command = await db_objects.get(query, id=cid)
            command.version = command.version + 1
            await db_objects.update(command)
        return json({'status': 'success'})
    else:
        return json({'status': 'error', 'error': 'nothing to upload...'})


# Get information about a specific command, including its code, if it exists (used in checking before creating a new command)
@apfell.route(apfell.config['API_BASE'] + "/commands/<ptype:string>/check/<cmd:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def check_command(request, user, ptype, cmd):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    status = {'status': 'success'}
    ptype = unquote_plus(ptype)
    cmd = unquote_plus(cmd)
    try:
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=ptype)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get payload type'})
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, cmd=cmd, payload_type=payload_type, deleted=False)
        query = await db_model.commandparameters_query()
        params = await db_objects.execute(query.where(CommandParameters.command == command))
        query = await db_model.attackcommand_query()
        attacks = await db_objects.execute(query.where(ATTACKCommand.command == command))
        query = await db_model.artifacttemplate_query()
        artifacts = await db_objects.execute(query.where( (ArtifactTemplate.command == command) & (ArtifactTemplate.deleted == False)))
        query = await db_model.commandtransform_query()
        transforms = await db_objects.execute(query.where(CommandTransform.command == command))
        status = {**status, **command.to_json(), "params": [p.to_json() for p in params],
                  "attack": [a.to_json() for a in attacks],
                  "artifacts": [a.to_json() for a in artifacts], 'transforms': [t.to_json() for t in transforms]}
    except Exception as e:
        # the command doesn't exist yet, which is good
        status = {"status": "error"}
        pass
    # now check to see if the file exists
    try:
        path = "./app/payloads/{}/commands/{}".format(ptype, cmd)
        files = []
        for (dirpath, dirnames, filenames) in os.walk(path):
            files.append({"folder": dirpath.replace(path, ""), "dirnames": dirnames, "filenames": filenames})
        status = {**status, 'files': files}
    except Exception as e:
        # file didn't exist so just continue on
        pass
    return json(status)


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_command(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
        cmd_json = command.to_json()
        query = await db_model.commandparameters_query()
        params = await db_objects.execute(query.where(CommandParameters.command == command))
        for p in params:
            await db_objects.delete(p, recursive=True)
        query = await db_model.commandtransform_query()
        transforms = await db_objects.execute(query.where(CommandTransform.command == command))
        for t in transforms:
            await db_objects.delete(t)
        command.deleted = True
        command.cmd = command.cmd + " (deleted " + str(command.id) + ")"
        await db_objects.update(command)
        try:
            shutil.rmtree("./app/payloads/{}/commands/{}".format(cmd_json['payload_type'], cmd_json['cmd']))
        except Exception as e:
            pass
        return json({'status': 'success', **cmd_json})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': str(e)})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_command(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    updated_command = False
    try:
        cmdquery = await db_model.command_query()
        command = await db_objects.get(cmdquery, id=id)
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    if 'cmd' in data and data['cmd'] != command.cmd:
        # this means we're trying to change the name of the command
        try:
            matching_command = await db_objects.get(cmdquery, cmd=data['cmd'], payload_type=command.payload_type)
            return json({'status': 'error', 'error': 'command by that name already exists'})
        except Exception as e:
            # it doesn't exist, so we can change it
            # now update the file system representation
            if os.path.exists("./app/payloads/{}/commands/{}/{}{}".format(command.payload_type.ptype, command.cmd, command.cmd,
                                                                          "." + command.payload_type.file_extension if command.payload_type.file_extension != "" else "")):
                os.rename("./app/payloads/{}/commands/{}/{}{}".format(command.payload_type.ptype, command.cmd, command.cmd,
                                                                          "." + command.payload_type.file_extension if command.payload_type.file_extension != "" else ""),
                          "./app/payloads/{}/commands/{}/{}{}".format(command.payload_type.ptype, command.cmd,
                                                                      data['cmd'],
                                                                      "." + command.payload_type.file_extension if command.payload_type.file_extension != "" else "")
                          )
            os.rename("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd),
                      "./app/payloads/{}/commands/{}".format(command.payload_type.ptype, data['cmd'])
                      )
            command.cmd = data['cmd']
    if "description" in data and data['description'] != command.description:
        command.description = data['description']
    if "needs_admin" in data and data['needs_admin'] != command.needs_admin:
        command.needs_admin = data['needs_admin']
    if "help_cmd" in data and data['help_cmd'] != command.help_cmd:
        command.help_cmd = data['help_cmd']
    if "is_exit" in data and data['is_exit'] is True:
        query = await db_model.command_query()
        try:
            exit_commands = await db_objects.execute(
                query.where((Command.is_exit == True) & (Command.payload_type == command.payload_type) & (Command.deleted == False)))
            # one is already set, so set it to false
            for e in exit_commands:
                e.is_exit = False
                await db_objects.update(e)
            command.is_exit = True
        except Exception as e:
            # one doesn't exist, so let this one be set
            print(str(e))
    if 'is_file_browse' in data and data['is_file_browse'] is True:
        if 'file_browse_parameters' not in data:
            data['file_browse_parameters'] = "*"
        query = await db_model.command_query()
        try:
            file_commands = await db_objects.execute(
                query.where((Command.is_file_browse == True) & (Command.payload_type == command.payload_type) & (Command.deleted == False)))
            # one is already set, so set it to false
            for e in file_commands:
                e.is_file_browse = False
                e.file_browse_parameters = ""
                await db_objects.update(e)
            command.is_file_browse = True
            command.file_browse_parameters = data['file_browse_parameters']
        except Exception as e:
            # one doesn't exist, so let this one be set
            print(str(e))
    elif data['is_file_browse'] is False and command.is_file_browse:
        command.is_file_browse = False
        command.file_browse_parameters = ""
        await db_objects.update(command)
    if 'is_process_list' in data and data['is_process_list'] is True:
        if 'process_list_parameters' not in data:
            data['process_list_parameters'] = ""
        query = await db_model.command_query()
        try:
            file_commands = await db_objects.execute(
                query.where((Command.is_process_list == True) & (Command.payload_type == command.payload_type) & (Command.deleted == False)))
            # one is already set, so set it to false
            for e in file_commands:
                e.is_process_list = False
                e.process_list_parameters = ""
                await db_objects.update(e)
            command.is_process_list = True
            command.process_list_parameters = data['process_list_parameters']
        except Exception as e:
            # one doesn't exist, so let this one be set
            print(str(e))
    elif data['is_process_list'] is False and command.is_process_list:
        command.is_process_list = False
        command.process_list_parameters = ""
        await db_objects.update(command)
    if 'is_download_file' in data and data['is_download_file'] is True:
        if 'download_file_parameters' not in data:
            data['download_file_parameters'] = "*"
        query = await db_model.command_query()
        try:
            file_commands = await db_objects.execute(
                query.where((Command.is_download_file == True) & (Command.payload_type == command.payload_type) & (Command.deleted == False)))
            # one is already set, so set it to false
            for e in file_commands:
                e.is_download_file = False
                e.download_file_parameters = ""
                await db_objects.update(e)
            command.is_download_file = True
            command.download_file_parameters = data['download_file_parameters']
        except Exception as e:
            # one doesn't exist, so let this one be set
            print(str(e))
    elif data['is_download_file'] is False and command.is_download_file:
        command.is_download_file = False
        command.download_file_parameters = ""
        await db_objects.update(command)
    if 'is_remove_file' in data and data['is_remove_file'] is True:
        if 'remove_file_parameters' not in data:
            data['remove_file_parameters'] = "*"
        query = await db_model.command_query()
        try:
            file_commands = await db_objects.execute(
                query.where((Command.is_remove_file == True) & (Command.payload_type == command.payload_type) & (Command.deleted == False)))
            # one is already set, so set it to false
            for e in file_commands:
                e.is_remove_file = False
                e.remove_file_parameters = ""
                await db_objects.update(e)
            command.is_remove_file = True
            command.remove_file_parameters = data['remove_file_parameters']
        except Exception as e:
            # one doesn't exist, so let this one be set
            print(str(e))
    elif data['is_remove_file'] is False and command.is_remove_file:
        command.is_remove_file = False
        command.remove_file_parameters = ""
        await db_objects.update(command)
    if 'is_agent_generator' in data:
        command.is_agent_generator = data['is_agent_generator']
        await db_objects.update(command)
    if request.files and not command.payload_type.external:
        updated_command = True
        cmd_code = request.files['upload_file'][0].body
        cmd_file = open("./app/payloads/{}/commands/{}/{}".format(command.payload_type.ptype, command.cmd, request.files['upload_file'][0].name), "wb")
        # cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    elif "code" in data and not command.payload_type.external:
        updated_command = True
        cmd_file = open("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd), "wb")
        cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    command.operator = operator
    await db_objects.update(command)
    if updated_command:
        async with db_objects.atomic():
            query = await db_model.command_query()
            command = await db_objects.get(query, id=command.id)
            command.version = command.version + 1
            await db_objects.update(command)
    return json({'status': 'success', **command.to_json()})


# anybody can create a command for now, maybe just admins in the future?
@apfell.route(apfell.config['API_BASE'] + "/commands/", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_command(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    resp = await create_command_func(data, user)
    if request.files and resp['status'] == "success":
        os.makedirs("./app/payloads/{}/commands/{}".format(resp['payload_type'], resp['cmd']), exist_ok=True)
        cmd_code = request.files['upload_file'][0].body
        cmd_file = open("./app/payloads/{}/commands/{}/{}".format(resp['payload_type'], resp['cmd'], request.files['upload_file'][0].name), "wb")
        # cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    return json(resp)


# register a new command/payloadtype pairing in the database for use in operations
#   commands must be registered for them to be issued down to an implant
#   Need some way of incorporating the code aspect into this, into the base payload as well
#     the function code and switching statement code must live somewhere so that it can be stamped in if requested...
#   stamp the different functions into payloads as you create them, need to define what all that entails
#   Need a way to sync some "state" with any given agent (means need ability to load/unload functionality while running)
#   Base implant (payloadtypes) might need a load/unload function as a requirement...
#     Can stamp in some set of commands at creation time, but always modifiable at run-time
#     This information needs to be captured in what a payload consists of (what functions it includes)
#     Callback then also will already record load/unload commands of functions
async def create_command_func(data, user):
    if "needs_admin" not in data:
        return {'status': 'error', 'error': '"needs_admin" is a required field'}
    if "help_cmd" not in data:
        return {'status': 'error', 'error': '"help_cmd" is a required field'}
    if "description" not in data:
        return {'status': 'error', 'error': '"description" is a required field'}
    if "cmd" not in data or data['cmd'] == "" or data['cmd'] is None:
        return {'status': 'error', 'error': '"cmd" is a required field'}
    if "payload_type" not in data:
        return {'status': 'error', 'error': '"payload_type" is a required field'}
    if "is_exit" not in data:
        return {'status': 'error', 'error': '"is_exit" is a required field'}
    # now we know all the fields exist
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=data['payload_type'])
        if data['is_exit'] is True:
            query = await db_model.command_query()
            try:
                exit_command = await db_objects.execute(query.where( (Command.is_exit == True) & (Command.payload_type == payload_type) & (Command.deleted == False)))
                # one is already set, so set it to false
                for e in exit_command:
                    e.is_exit = False
                    await db_objects.update(e)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
        command = await db_objects.create(Command, needs_admin=data['needs_admin'], help_cmd=data['help_cmd'],
                                          description=data['description'], cmd=data['cmd'],
                                          payload_type=payload_type, operator=operator, is_exit=data['is_exit'])
        if 'is_file_browse' in data and data['is_file_browse'] is True:
            query = await db_model.command_query()
            try:
                file_command = await db_objects.execute(query.where( (Command.is_file_browse == True) & (Command.payload_type == payload_type) & (Command.deleted == False)))
                # one is already set, so set it to false
                for e in file_command:
                    e.is_file_browse = False
                    e.file_browse_parameters = ""
                    await db_objects.update(e)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
            command.is_file_browse = True
            command.file_browse_parameters = data['file_browse_parameters'] if 'file_browse_parameters' in data else "*"
            await db_objects.update(command)
        if 'is_process_list' in data and data['is_process_list'] is True:
            query = await db_model.command_query()
            try:
                list_command = await db_objects.execute(query.where( (Command.is_process_list == True) & (Command.payload_type == payload_type) & (Command.deleted == False)))
                # one is already set, so set it to false
                for e in list_command:
                    e.is_process_list = False
                    e.process_list_parameters = ""
                    await db_objects.update(e)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
            command.is_process_list = True
            command.process_list_parameters = data['process_list_parameters'] if 'process_list_parameters' in data else ""
            await db_objects.update(command)
        if 'is_download_file' in data and data['is_download_file'] is True:
            query = await db_model.command_query()
            try:
                download_command = await db_objects.execute(query.where( (Command.is_download_file == True) & (Command.payload_type == payload_type) & (Command.deleted == False)))
                # one is already set, so set it to false
                for e in download_command:
                    e.is_download_file = False
                    e.download_file_parameters = ""
                    await db_objects.update(e)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
            command.is_download_file = True
            command.download_file_parameters = data['download_file_parameters'] if 'download_file_parameters' in data else "*"
            await db_objects.update(command)
        if 'is_remove_file' in data and data['is_remove_file'] is True:
            query = await db_model.command_query()
            try:
                remove_commands = await db_objects.execute(query.where( (Command.is_remove_file == True) & (Command.payload_type == payload_type) & (Command.deleted == False)))
                # one is already set, so set it to false
                for e in remove_commands:
                    e.is_remove_file = False
                    e.remove_file_parameters = ""
                    await db_objects.update(e)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
            command.is_remove_file = True
            command.remove_file_parameters = data['remove_file_parameters'] if 'remove_file_parameters' in data else "*"
            await db_objects.update(command)
        if 'is_agent_generator' in data and data['is_agent_generator'] is True:
            command.is_agent_generator = True
            await db_objects.update(command)
        if 'code' in data:
            data['code'] = base64.b64decode(data['code']).decode()
        if not payload_type.external and 'code' in data and data['code'].rstrip() != "":
            dir_path = os.path.abspath("./app/payloads/{}/commands/{}".format(payload_type.ptype,command.cmd))
            base_path = os.path.abspath("./app/payloads/{}/commands/".format(payload_type.ptype))
            if base_path in dir_path:
                os.makedirs("./app/payloads/{}/commands/{}".format(payload_type.ptype,command.cmd), exist_ok=True)
                cmd_file = open("./app/payloads/{}/commands/{}/{}.{}".format(
                    payload_type.ptype, command.cmd, command.cmd, payload_type.file_extension), "w")
                cmd_file.write(data['code'])
                cmd_file.close()
        status = {'status': 'success'}
        cmd_json = command.to_json()
        return {**status, **cmd_json}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to create command: ' + str(e)}


# ################## COMMAND PARAMETER ROUTES #######################

@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/parameters", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_command_parameter(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find command'})
    data = request.json
    if "name" not in data:
        return json({'status': 'error', 'error': '"name" is required'})
    if 'type' not in data:
        return json({'status': 'error', 'error': '"type" is a required parameter'})
    if 'required' not in data:
        return json({'status': 'error', 'error': '"required" is a required parameter'})
    if data['type'] == "String" and 'hint' not in data:
        return json({'status': 'error', 'error': "\"hint\" required if type is \"String\""})
    if data['type'] == "Choice" and 'choices' not in data:
        return json({'status': 'error', 'error': "\"choices\" is required if type is \"Choice\""})
    if data['type'] == "ChooseMultiple" and 'choices' not in data:
        return json({'status': 'error', 'error': "\"choices\" is required if type is \"ChooseMultiple\""})
    if 'hint' not in data:
        data['hint'] = ""
    try:
        query = await db_model.commandparameters_query()
        try:
            param = await db_objects.get(query, **data, command=command, operator=operator)
        except Exception as e:
            param = await db_objects.create(CommandParameters, **data, command=command, operator=operator)
        async with db_objects.atomic():
            query = await db_model.command_query()
            command = await db_objects.get(query, id=id)
            command.version = command.version + 1
            await db_objects.update(command)
        return json({'status': 'success', **param.to_json(), 'new_cmd_version': command.version})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to create parameter' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/parameters/<pid:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_command_parameter(request, user, cid, pid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    updated_a_field = False
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
        query = await db_model.commandparameters_query()
        parameter = await db_objects.get(query, id=pid, command=command)
    except Exception as e:
        print(e)
        return json({"status": 'error', 'error': 'failed to find command or parameter'})
    data = request.json
    if "name" in data and data['name'] != parameter.name:
        try:
            parameter.name = data['name']
            parameter.operator = operator
            await db_objects.update(parameter)
            updated_a_field = True
        except Exception as e:
            print(e)
            return json({"status": 'error', 'error': 'parameter name must be unique across a command'})
    if "required" in data and data['required'] != parameter.required:
        parameter.required = data['required']
        updated_a_field = True
    if data['type']:
        if data['type'] != parameter.type:
            parameter.type = data['type']
            updated_a_field = True
        if data['type'] == "String" and data['hint'] != parameter.hint:
            parameter.hint = data['hint'] if 'hint' in data else ""
            updated_a_field = True
        elif data['type'] == "Choice" and data['choices'] != parameter.choices:
            parameter.choices = data['choices'] if 'choices' in data else ""
            updated_a_field = True
        elif data['type'] == "ChooseMultiple" and data['choices'] != parameter.choices:
            parameter.choices = data['choices'] if 'choices' in data else ""
            updated_a_field = True
    parameter.operator = operator
    # update the command since we just updated a parameter to it
    if updated_a_field:
        async with db_objects.atomic():
            query = await db_model.command_query()
            command = await db_objects.get(query, id=cid)
            command.version = command.version + 1
            await db_objects.update(command)
        await db_objects.update(parameter)
    return json({'status': 'success', **parameter.to_json(), 'new_cmd_version': command.version})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/parameters/<pid:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_command_parameter(request, user, cid, pid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
        query = await db_model.commandparameters_query()
        parameter = await db_objects.get(query, id=pid, command=command)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find command or parameter'})
    p_json = parameter.to_json()
    await db_objects.delete(parameter)
    # update the command since we just updated a parameter to it
    async with db_objects.atomic():
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
        command.version = command.version + 1
        await db_objects.update(command)
    return json({'status': 'success', **p_json, 'new_cmd_version': command.version})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/parameters/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_parameters_for_command(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    query = await db_model.commandparameters_query()
    params = await db_objects.execute(query.where(CommandParameters.command == command))
    return json([p.to_json() for p in params])


# ################# COMMAND ATT&CK ROUTES ############################

@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/mitreattack/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_attack_mappings_for_command(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    query = await db_model.attackcommand_query()
    attacks = await db_objects.execute(query.where(ATTACKCommand.command == command))
    return json({'status': 'success', 'attack': [a.to_json() for a in attacks]})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/mitreattack/<t_num:string>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_attack_mapping_for_command(request, user, id, t_num):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
        query = await db_model.attack_query()
        attack = await db_objects.get(query, t_num=t_num)
        query = await db_model.attackcommand_query()
        attackcommand = await db_objects.get(query, command=command, attack=attack)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    await db_objects.delete(attackcommand)
    return json({'status': 'success', 't_num': attack.t_num, 'command_id': command.id})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/mitreattack/<t_num:string>", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_attack_mappings_for_command(request, user, id, t_num):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
        query = await db_model.attack_query()
        attack = await db_objects.get(query, t_num=t_num)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    try:
        query = await db_model.attackcommand_query()
        attackcommand = await db_objects.get(query, attack=attack, command=command)
    except Exception as e:
        attackcommand = await db_objects.create(ATTACKCommand, attack=attack, command=command)
    return json({'status': 'success', **attackcommand.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/mitreattack/<t_num:string>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def adjust_attack_mappings_for_command(request, user, id, t_num):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
        query = await db_model.attack_query()
        newattack = await db_objects.get(query, t_num=t_num)
        query = await db_model.attackcommand_query()
        attackcommand = await db_objects.get(query, id=data['id'], command=command)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    attackcommand.attack = newattack
    await db_objects.update(attackcommand)
    return json({'status': 'success', **attackcommand.to_json()})


# ############# COMMAND ARTIFACT TEMPLATE ROUTES #######################

@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/artifact_templates", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_artifact_template_for_command(request, user, cid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    if "artifact" not in data:
        return json({'status': 'error', 'error': '"artifact" is a required element'})
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
        query = await db_model.artifact_query()
        artifact = await db_objects.get(query, id=data['artifact'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command or artifact'})

    if "command_parameter" in data and data['command_parameter'] != -1:
        try:
            query = await db_model.commandparameters_query()
            command_parameter = await db_objects.get(query, id=data['command_parameter'])
        except:
            return json({'status': 'error', 'error': 'failed to find command parameter'})
    else:
        command_parameter = None
    if "artifact_string" not in data:
        return json({'status': 'error', 'error': '"artifact_string" is a required parameter'})
    if "replace_string" not in data:
        data['replace_string'] = ""
    try:
        artifact_template = await db_objects.create(ArtifactTemplate, command=command, artifact=artifact,
                                                    artifact_string=data['artifact_string'],
                                                    replace_string=data['replace_string'])
        if command_parameter:
            artifact_template.command_parameter = command_parameter
            await db_objects.update(artifact_template)
    except:
        return json({'status': 'error', 'error': 'Failed to create artifact template for command'})
    return json({'status': 'success', **artifact_template.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/artifact_templates/<aid:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_artifact_template_for_command(request, user, cid, aid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
        query = await db_model.artifacttemplate_query()
        artifact = await db_objects.get(query, id=aid, command=command)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command or artifact'})
    data = request.json
    if "command_parameter" in data and data['command_parameter'] != 'null':
        try:
            query = await db_model.commandparameters_query()
            command_parameter = await db_objects.get(query, id=data['command_parameter'])
            artifact.command_parameter = command_parameter
        except:
            return json({'status': 'error', 'error': 'failed to find command parameter'})
    if "artifact_string" in data:
        artifact.artifact_string = data['artifact_string']
    if "replace_string" in data:
        artifact.replace_string = data['replace_string']
    try:
        await db_objects.update(artifact)
    except:
        return json({'status': 'error', 'error': 'Failed to update artifact template for command'})
    return json({'status': 'success', **artifact.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/artifact_templates", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_artifact_templates_for_command(request, user, cid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    try:
        query = await db_model.artifacttemplate_query()
        artifacts = await db_objects.execute(query.where( (ArtifactTemplate.command == command) & (ArtifactTemplate.deleted == False)))
    except:
        return json({'status': 'error', 'error': 'Failed to get artifact templates for command'})
    return json({'status': 'success', 'artifacts': [a.to_json() for a in artifacts]})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/artifact_templates/<aid:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_artifact_template_for_command(request, user, cid, aid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=cid)
        query = await db_model.artifacttemplate_query()
        artifact = await db_objects.get(query, id=aid, command=command)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command or artifact'})
    try:
        artifact.deleted = True
        await db_objects.update(artifact)
        return json({'status': 'success', **artifact.to_json()})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to delete artifact template'})