from app import apfell, db_objects
from sanic.response import json, file, text
from app.database_models.model import Operator, PayloadType, Command, CommandParameters, CommandTransform, ATTACKCommand, ATTACK, ArtifactTemplate, Artifact
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
        attacks = await db_objects.execute(ATTACKCommand.select().where(ATTACKCommand.command == command))
        status = {**status, **command.to_json(), "params": [p.to_json() for p in params], "attack": [a.to_json() for a in attacks]}
    except Exception as e:
        # the command doesn't exist yet, which is good
        pass
    # now check to see if the file exists
    try:
        file = open("./app/payloads/{}/commands/{}".format(payload_type.ptype, cmd), 'rb')
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
        transforms = await db_objects.execute(CommandTransform.select().where(CommandTransform.command == command))
        for t in transforms:
            await db_objects.delete(t, recursive=True)
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
            return file("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd))
        else:
            rsp_file = open("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd), 'rb').read()
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
        cmd_file = open("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd), "wb")
        # cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    elif "code" in data:
        updated_command = True
        cmd_file = open("./app/payloads/{}/commands/{}".format(command.payload_type.ptype, command.cmd), "wb")
        cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
        cmd_file.close()
    command.operator = operator
    await db_objects.update(command)
    if updated_command:
        async with db_objects.atomic():
            command = await db_objects.get(Command, id=command.id)
            command.version = command.version + 1
            await db_objects.update(command)
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
        cmd_file = open("./app/payloads/{}/commands/{}".format(resp['payload_type'], resp['cmd']), "wb")
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
        cmd_file = open("./app/payloads/{}/commands/{}".format(payload_type.ptype, command.cmd), "wb")
        cmd_code = base64.b64decode(data['code'])
        cmd_file.write(cmd_code)
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


# ################# COMMAND ATT&CK ROUTES ############################

@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/mitreattack/", methods=['GET'])
@inject_user()
@protected()
async def get_all_attack_mappings_for_command(request, user, id):
    try:
        command = await db_objects.get(Command, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    attacks = await db_objects.execute(ATTACKCommand.select().where(ATTACKCommand.command == command))
    return json({'status': 'success', 'attack': [a.to_json() for a in attacks]})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/mitreattack/<t_num:string>", methods=['DELETE'])
@inject_user()
@protected()
async def remove_attack_mapping_for_command(request, user, id, t_num):
    try:
        command = await db_objects.get(Command, id=id)
        attack = await db_objects.get(ATTACK, t_num=t_num)
        attackcommand = await db_objects.get(ATTACKCommand, command=command, attack=attack)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    await db_objects.delete(attackcommand)
    return json({'status': 'success', 't_num': attack.t_num, 'command_id': command.id})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/mitreattack/<t_num:string>", methods=['POST'])
@inject_user()
@protected()
async def create_attack_mappings_for_command(request, user, id, t_num):
    try:
        command = await db_objects.get(Command, id=id)
        attack = await db_objects.get(ATTACK, t_num=t_num)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    attackcommand, created = await db_objects.get_or_create(ATTACKCommand, attack=attack, command=command)
    return json({'status': 'success', **attackcommand.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/commands/<id:int>/mitreattack/<t_num:string>", methods=['PUT'])
@inject_user()
@protected()
async def adjust_attack_mappings_for_command(request, user, id, t_num):
    data = request.json
    try:
        command = await db_objects.get(Command, id=id)
        newattack = await db_objects.get(ATTACK, t_num=t_num)
        attackcommand = await db_objects.get(ATTACKCommand, id=data['id'], command=command)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    attackcommand.attack = newattack
    await db_objects.update(attackcommand)
    return json({'status': 'success', **attackcommand.to_json()})


# ############# COMMAND ARTIFACT TEMPLATE ROUTES #######################

@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/artifact_templates", methods=['POST'])
@inject_user()
@protected()
async def create_artifact_template_for_command(request, user, cid):
    data = request.json
    if "artifact" not in data:
        return json({'status': 'error', 'error': '"artifact" is a required element'})
    try:
        command = await db_objects.get(Command, id=cid)
        artifact = await db_objects.get(Artifact, id=data['artifact'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command or artifact'})

    if "command_parameter" in data and data['command_parameter'] != -1:
        try:
            command_parameter = await db_objects.get(CommandParameters, id=data['command_parameter'])
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
@protected()
async def update_artifact_template_for_command(request, user, cid, aid):
    try:
        command = await db_objects.get(Command, id=cid)
        artifact = await db_objects.get(ArtifactTemplate, id=aid, command=command)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command or artifact'})
    data = request.json
    if "command_parameter" in data and data['command_parameter'] != 'null':
        try:
            command_parameter = await db_objects.get(CommandParameters, id=data['command_parameter'])
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
@protected()
async def get_artifact_templates_for_command(request, user, cid):
    try:
        command = await db_objects.get(Command, id=cid)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command'})
    try:
        artifacts = await db_objects.execute(ArtifactTemplate.select().where(ArtifactTemplate.command == command))
    except:
        return json({'status': 'error', 'error': 'Failed to get artifact templates for command'})
    return json({'status': 'success', 'artifacts': [a.to_json() for a in artifacts]})


@apfell.route(apfell.config['API_BASE'] + "/commands/<cid:int>/artifact_templates/<aid:int>", methods=['DELETE'])
@inject_user()
@protected()
async def update_artifact_template_for_command(request, user, cid, aid):
    try:
        command = await db_objects.get(Command, id=cid)
        artifact = await db_objects.get(ArtifactTemplate, id=aid, command=command)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that command or artifact'})
    try:
        artifact_json = artifact.to_json()
        await db_objects.delete(artifact, recursive=True)
        return json({'status': 'success', **artifact_json})
    except:
        return json({'status': 'error', 'error': 'failed to delete artifact template'})