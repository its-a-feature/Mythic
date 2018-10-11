from app import apfell, db_objects
from sanic.response import json, file, text
from app.database_models.model import Operator, PayloadType, Command
from sanic_jwt.decorators import protected, inject_user
from urllib.parse import unquote_plus
import json as js
import base64


# commands aren't inherent to an operation, they're unique to a payloadtype
@apfell.route(apfell.config['API_BASE'] + "/commands/", methods=['GET'])
@inject_user()
@protected()
async def get_all_commands(request, user):
    commands = await db_objects.execute(Command.select())
    return json([c.to_json() for c in commands])


@apfell.route(apfell.config['API_BASE'] + "/commands/<ptype:string>/<cmd:string>", methods=['GET'])
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
        status = {**status, **command.to_json()}
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
    if resp_type == "file":
        return file("./app/payloads/{}/{}".format(command.payload_type.ptype, command.cmd))
    else:
        rsp_file = open("./app/payloads/{}/{}".format(command.payload_type.ptype, command.cmd), 'rb').read()
        encoded = base64.b64encode(rsp_file).decode("UTF-8")
        return text(encoded)


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>", methods=['PUT'])
@inject_user()
@protected()
async def update_command(request, user, id):
    try:
        command = await db_objects.get(Command, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get command'})
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    resp = await update_command_func(data, user, command)
    if request.files and resp['status'] == "success":
        cmd_code = request.files['upload_file'][0].body.decode('UTF-8')
        cmd_file = open("./app/payloads/{}/{}".format(resp['payload_type'], resp['cmd']), "w")
        # cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    return json(resp)


async def update_command_func(data, user, command):
    if "description" in data:
        command.description = data['description']
    if "needs_admin" in data:
        command.needs_admin = data['needs_admin']
    if "help_cmd" in data:
        command.help_cmd = data['help_cmd']
    if "code" in data:
        cmd_file = open("./app/payloads/{}/{}".format(command.payload_type.ptype, command.cmd), "wb")
        cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    try:
        await db_objects.update(command)
        return {'status': 'success', **command.to_json()}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to update command'}


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
        cmd_code = request.files['upload_file'][0].body.decode('UTF-8')
        cmd_file = open("./app/payloads/{}/{}".format(resp['payload_type'], resp['cmd']), "w")
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
                    await db_objects.create(Command, payload_type=payload_type, operator=operator,
                                            cmd=command['cmd'], description=command['description'],
                                            help_cmd=command['help_cmd'], needs_admin=command['needs_admin'])
                except Exception as e:
                    cmd_error_list.append(str(e))
            # give the status of that command addition
            if len(cmd_error_list) == 0:
                payload_cmd_error_list.append(["success"])
            else:
                payload_cmd_error_list.append(cmd_error_list)
        # now roll all of these sucess or error lists up for the payload
        error_list.append({type['name']: payload_cmd_error_list})
    return json(error_list)
