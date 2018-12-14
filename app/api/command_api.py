from app import apfell, db_objects
from sanic.response import json, file, text
from app.database_models.model import Operator, PayloadType, Command, CommandParameters
from sanic_jwt.decorators import protected, inject_user
from urllib.parse import unquote_plus
import json as js
import base64


# commands aren't inherent to an operation, they're unique to a payloadtype
@apfell.route(apfell.config['API_BASE'] + "/commands/", methods=['GET'])
@inject_user()
@protected()
async def get_all_commands(request, user):
    all_commands = []
    commands = await db_objects.execute(Command.select().order_by(Command.id))
    for cmd in commands:
        params = await db_objects.execute(CommandParameters.select().where(CommandParameters.command == cmd).order_by(CommandParameters.id))
        all_commands.append({**cmd.to_json(), "params": [p.to_json() for p in params]})
    return json(all_commands)


# Get information about a specific command, including its code, if it exists (used in checking before creating a new command)
@apfell.route(apfell.config['API_BASE'] + "/commands/<ptype:string>/check/<cmd:string>", methods=['GET'])
@inject_user()
@protected()
async def check_command(request, user, ptype, cmd):
    status = {'status': 'success'}
    try:
        payload_type = await db_objects.get(PayloadType, ptype=ptype)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get payload type'})
    try:
        command = await db_objects.get(Command, cmd=cmd, payload_type=payload_type)
        params = await db_objects.execute(CommandParameters.select().where(CommandParameters.command == command))
        status = {**status, **command.to_json(), "params": [p.to_json() for p in params]}
    except Exception as e:
        # the command doesn't exist yet, which is good
        pass
    # now check to see if the file exists
    try:
        file = open("./app/payloads/{}/{}".format(payload_type.ptype, cmd), 'rb')
        encoded = base64.b64encode(file.read()).decode("UTF-8")
        status = {**status, 'code': encoded}
    except Exception as e:
        # file didn't exist so just continue on
        pass
    return json(status)


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>", methods=['DELETE'])
@inject_user()
@protected()
async def remove_command(request, user, id):
    try:
        command = await db_objects.get(Command, id=id)
        params = await db_objects.execute(CommandParameters.select().where(CommandParameters.command == command))
        for p in params:
            await db_objects.delete(p, recursive=True)
        await db_objects.delete(command, recursive=True)
        return json({'status': 'success', **command.to_json()})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': str(e)})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/code/<resp_type:string>", methods=['GET'])
@inject_user()
@protected()
async def get_command_code(request, user, id, resp_type):
    resp_type = unquote_plus(resp_type)
    try:
        command = await db_objects.get(Command, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    try:
        if resp_type == "file":
            return file("./app/payloads/{}/{}".format(command.payload_type.ptype, command.cmd))
        else:
            rsp_file = open("./app/payloads/{}/{}".format(command.payload_type.ptype, command.cmd), 'rb').read()
            encoded = base64.b64encode(rsp_file).decode("UTF-8")
            return text(encoded)
    except Exception as e:
        print(e)
        return text("")


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>", methods=['PUT'])
@inject_user()
@protected()
async def update_command(request, user, id):
    updated_command = False
    try:
        command = await db_objects.get(Command, id=id)
        operator = await db_objects.get(Operator, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    if "description" in data and data['description'] != command.description:
        command.description = data['description']
        updated_command = True
    if "needs_admin" in data and data['needs_admin'] != command.needs_admin:
        command.needs_admin = data['needs_admin']
        updated_command = True
    if "help_cmd" in data and data['help_cmd'] != command.help_cmd:
        command.help_cmd = data['help_cmd']
        updated_command = True
    if request.files:
        updated_command = True
        cmd_code = request.files['upload_file'][0].body
        cmd_file = open("./app/payloads/{}/{}".format(command.payload_type.ptype, command.cmd), "wb")
        # cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    elif "code" in data:
        updated_command = True
        cmd_file = open("./app/payloads/{}/{}".format(command.payload_type.ptype, command.cmd), "wb")
        cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    command.operator = operator
    if updated_command:
        async with db_objects.atomic():
            command = await db_objects.get(Command, id=command.id)
            command.version = command.version + 1
            await db_objects.update(command)
            print("updated command")
    return json({'status': 'success', **command.to_json()})


# anybody can create a command for now, maybe just admins in the future?
@apfell.route(apfell.config['API_BASE'] + "/commands/", methods=['POST'])
@inject_user()
@protected()
async def create_command(request, user):
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    resp = await create_command_func(data, user)
    if request.files and resp['status'] == "success":
        cmd_code = request.files['upload_file'][0].body
        cmd_file = open("./app/payloads/{}/{}".format(resp['payload_type'], resp['cmd']), "wb")
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
    if "cmd" not in data:
        return {'status': 'error', 'error': '"cmd" is a required field'}
    if "payload_type" not in data:
        return {'status': 'error', 'error': '"payload_type" is a required field'}
    if "code" not in data:
        return {'status': 'error', 'error': '"code" is a required field'}
    # now we know all the fields exist
    try:
        operator = await db_objects.get(Operator, username=user['username'])
        payload_type = await db_objects.get(PayloadType, ptype=data['payload_type'])
        command = await db_objects.create(Command, needs_admin=data['needs_admin'], help_cmd=data['help_cmd'],
                                          description=data['description'], cmd=data['cmd'],
                                          payload_type=payload_type, operator=operator)
        cmd_file = open("./app/payloads/{}/{}".format(payload_type.ptype, command.cmd), "wb")
        cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
        status = {'status': 'success'}
        cmd_json = command.to_json()
        return {**status, **cmd_json}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to create command: ' + str(e)}


# get a JSON dump of all the commands for a payload type that can be used to import later if needed
@apfell.route(apfell.config['API_BASE'] + "/commands/<ptype:string>/export", methods=['GET'])
@inject_user()
@protected()
async def export_command_list(request, user, ptype):
    payload_type = unquote_plus(ptype)
    try:
        payload_ptype = await db_objects.get(PayloadType, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'unable to find that payload type'})
    cmdlist = []
    try:
        commands = await db_objects.execute(Command.select().where(Command.payload_type == payload_ptype))
        for c in commands:
            cmd_json = c.to_json()
            del cmd_json['id']
            del cmd_json['creation_time']
            del cmd_json['operator']
            del cmd_json['payload_type']
            params = await db_objects.execute(CommandParameters.select().where(CommandParameters.command == c))
            params_list = []
            for p in params:
                p_json = p.to_json()
                del p_json['id']
                del p_json['command']
                del p_json['cmd']
                del p_json['operator']
                params_list.append(p_json)
            cmd_json['parameters'] = params_list
            cmdlist.append(cmd_json)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get commands for that payload type'})
    return json({"payload_types": [{"name": payload_type, "commands": cmdlist}]})


# import a JSON dump of commands for a payloadtype instead of doing one at a time
@apfell.route(apfell.config['API_BASE'] + "/commands/import", methods=['POST'])
@inject_user()
@protected()
async def import_command_list(request, user):
    # The format for this will be the same as the default_commands.json file or what you get from the export function
    # This allows you to import commands across a set of different payload types at once
    if(request.files):
        try:
            #print("uploading:{}".format(request.files['upload_file'][0].name))
            data = js.loads(request.files['upload_file'][0].body.decode('UTF-8'))
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to parse file'})
        #print(data)
    else:
        try:
            data = request.json
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to parse JSON'})
    try:
        operator = await db_objects.get(Operator, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get operator information'})
    if "payload_types" not in data:
        return json({'status': 'error', 'error': 'must start with "payload_types"'})
    error_list = []
    for type in data['payload_types']:
        try:
            payload_type = await db_objects.get(PayloadType, ptype=type['name'])
        except Exception as e:
            error_list.append({type['name']: 'failed to find this payloadtype'})
            continue  # get the next type in the list and hope for better results
        # we found the payload type, now try to add the commands
        payload_cmd_error_list = []
        for command in type['commands']:
            cmd_error_list = []
            if "cmd" not in command:
                cmd_error_list.append("Missing required parameter: cmd")
            if "description" not in command:
                cmd_error_list.append("Missing required parameter: description")
            if "help_cmd" not in command:
                cmd_error_list.append("Missing required parameter: help")
            if "needs_admin" not in command:
                cmd_error_list.append("Missing required parameter: needs_admin")
            if len(cmd_error_list) == 0:
                # now actually try to add the command
                try:
                    cmdobj, created = await db_objects.get_or_create(Command, payload_type=payload_type, operator=operator,
                                            cmd=command['cmd'], description=command['description'],
                                            help_cmd=command['help_cmd'], needs_admin=command['needs_admin'])
                    if "parameters" in command:
                        for param in command['parameters']:
                            try:
                                param, created = await db_objects.get_or_create(CommandParameters, **param, command=cmdobj,
                                                                         operator=operator)
                            except Exception as e:
                                print(e)
                except Exception as e:
                    cmd_error_list.append(str(e))
            # give the status of that command addition
            if len(cmd_error_list) == 0:
                payload_cmd_error_list.append(["success"])
            else:
                payload_cmd_error_list.append(cmd_error_list)
        # now roll all of these success or error lists up for the payload
        error_list.append({type['name']: payload_cmd_error_list})
    return json(error_list)


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/parameters", methods=['POST'])
@inject_user()
@protected()
async def create_command_parameter(request, user, id):
    try:
        operator = await db_objects.get(Operator, username=user['username'])
        command = await db_objects.get(Command, id=id)
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
    if data['type'] == "ChoiceMultiple" and 'choices' not in data:
        return json({'status': 'error', 'error': "\"choices\" is required if type is \"ChoiceMultiple\""})
    if 'hint' not in data:
        data['hint'] = ""
    try:
        param, created = await db_objects.get_or_create(CommandParameters, **data, command=command, operator=operator)
        async with db_objects.atomic():
            command = await db_objects.get(Command, id=id)
            command.version = command.version + 1
            await db_objects.update(command)
            print("created command param")
        return json({'status': 'success', **param.to_json(), 'new_cmd_version': command.version})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to create parameter' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/parameters/<pid:int>", methods=['PUT'])
@inject_user()
@protected()
async def update_command_parameter(request, user, cid, pid):
    updated_a_field = False
    try:
        operator = await db_objects.get(Operator, username=user['username'])
        command = await db_objects.get(Command, id=cid)
        parameter = await db_objects.get(CommandParameters, id=pid, command=command)
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
        elif data['type'] == "ChoiceMultiple" and data['choices'] != parameter.choices:
            parameter.choices = data['choices'] if 'choices' in data else ""
            updated_a_field = True
    parameter.operator = operator
    # update the command since we just updated a parameter to it
    if updated_a_field:
        print("updated: " + parameter.name)
        async with db_objects.atomic():
            command = await db_objects.get(Command, id=cid)
            command.version = command.version + 1
            await db_objects.update(command)
        await db_objects.update(parameter)
    return json({'status': 'success', **parameter.to_json(), 'new_cmd_version': command.version})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/parameters/<pid:int>", methods=['DELETE'])
@inject_user()
@protected()
async def remove_command_parameter(request, user, cid, pid):
    try:
        command = await db_objects.get(Command, id=cid)
        parameter = await db_objects.get(CommandParameters, id=pid, command=command)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find command or parameter'})
    p_json = parameter.to_json()
    await db_objects.delete(parameter)
    # update the command since we just updated a parameter to it
    async with db_objects.atomic():
        command = await db_objects.get(Command, id=cid)
        command.version = command.version + 1
        print("deleted param")
        await db_objects.update(command)
    return json({'status': 'success', **p_json, 'new_cmd_version': command.version})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/parameters/", methods=['GET'])
@inject_user()
@protected()
async def get_all_parameters_for_command(request, user, id):
    try:
        command = await db_objects.get(Command, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    params = await db_objects.execute(CommandParameters.select().where(CommandParameters.command == command))
    return json([p.to_json() for p in params])