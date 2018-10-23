from app import apfell, db_objects
from sanic.response import json, text
from app.database_models.model import Operator, Payload, Callback, C2Profile, C2ProfileParameters, C2ProfileParametersInstance, PayloadType, Operation, PayloadCommand, Command
from app.api.task_api import add_task_to_callback_func
import pathlib
from sanic_jwt.decorators import protected, inject_user
from app.crypto import create_uuid
import os
import asyncio


@apfell.route(apfell.config['API_BASE'] + "/payloads/", methods=['GET'])
@inject_user()
@protected()
async def get_all_payloads(request, user):
    payloads = await db_objects.execute(Payload.select())
    return json([p.to_json() for p in payloads])


@apfell.route(apfell.config['API_BASE'] + "/payloads/current_operation", methods=['GET'])
@inject_user()
@protected()
async def get_all_payloads(request, user):
    if user['current_operation'] != "":
        operation = await db_objects.get(Operation, name=user['current_operation'])
        payloads = await db_objects.execute(Payload.select().where(Payload.operation == operation))
        return json([p.to_json() for p in payloads])


@apfell.route(apfell.config['API_BASE'] + "/payloads/<puuid:string>/<from_disk:int>", methods=['DELETE'])
@inject_user()
@protected()
async def remove_payload(request, puuid, user, from_disk):
    try:
        payload = await db_objects.get(Payload, uuid=puuid)
    except Exception as e:
        print(e)
        return json({'status':'error', 'error': 'specified payload does not exist'})
    try:
        updated_payload = payload.to_json()
        await db_objects.delete(payload, recursive=True)
        if from_disk == 1 and os.path.exists(updated_payload['location']):
            try:
                os.remove(updated_payload['location'])
            except Exception as e:
                print(e)
        success = {'status': 'success'}
        return json({**success, **updated_payload})
    except Exception as e:
        print(e)
        return json({'status':'error', 'error': 'failed to delete payload'})


async def register_new_payload_func(data, user):
    if data['current_operation'] == "":
        return {'status': 'error', 'error': "must be in an active operation"}
    if 'payload_type' not in data:
        return {'status': 'error', 'error': '"payload_type" field is required'}
    if 'c2_profile' not in data:
        return {'status': 'error', 'error': '"c2_profile" field is required'}
    if 'commands' not in data:
        return {'status': 'error', 'error': '"commands" field is required'}
    # the other parameters are based on the payload_type, c2_profile, or other payloads
    try:
        operator = await db_objects.get(Operator, username=data['operator'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get operator when registering payload'}
    # we want to track the parent callbacks of new callbacks if possible
    pcallback = None
    if 'pcallback' in data:
        try:
            pcallback = await db_objects.get(Callback, id=data['pcallback'])
        except Exception as e:
            print(e)
            return {'status': 'error', 'error': 'failed to find parent callback'}
    try:
        c2_profile = await db_objects.get(C2Profile, name=data['c2_profile'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get c2 profile when registering payload'}
    try:
        payload_type = await db_objects.get(PayloadType, ptype=data['payload_type'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get payload type when registering payload'}
    tag = data['tag'] if 'tag' in data else ""
    operation = await db_objects.get(Operation, name=data['current_operation'])
    # Get all of the commands and make sure they're valid
    db_commands = {}
    for cmd in data['commands']:
        try:
            db_commands[cmd] = await db_objects.get(Command, cmd=cmd, payload_type=payload_type)
        except Exception as e:
            return {'status': 'error', 'error': 'failed to get command {}'.format(cmd)}
    # Generate the UUID - this will involve going through to read key-value pairs for c2 and payload_type parameters
    uuid = await generate_uuid(data, user, tag)
    file_extension = "." + payload_type.file_extension if payload_type.file_extension != "" else ""
    location = data['location'] if 'location' in data else "./app/payloads/operations/{}/{}{}".format(
        user['current_operation'],uuid, file_extension)
    # Register payload
    payload, create = await db_objects.create_or_get(Payload, operator=operator, payload_type=payload_type,
                                                     tag=tag, pcallback=pcallback, location=location, c2_profile=c2_profile,
                                                     uuid=uuid, operation=operation)
    if create:
        for cmd in db_commands:
            await db_objects.create(PayloadCommand, payload=payload, command=db_commands[cmd])
        # Get all of the c2 profile parameters and create their instantiations
        db_c2_profile_parameters = await db_objects.execute(C2ProfileParameters.select().where(C2ProfileParameters.c2_profile == c2_profile))
        for param in db_c2_profile_parameters:
            # find the matching data in the data['c2_profile_parameters']
            try:

                await db_objects.create(C2ProfileParametersInstance, c2_profile_parameters=param, value=data['c2_profile_parameters'][param.name], payload=payload)
            except Exception as e:
                return {'status': 'error', 'error': 'failed to create parameter instance'}
    return {'status': 'success', **payload.to_json()}


async def generate_uuid(data, user, tag):
    string = tag + user['username'] + data['payload_type'] + data['c2_profile'] + user['current_operation'] + \
             str(data['commands'])
    # now add in the key-value pairs for the c2 profile parameters
    for key,value in data['c2_profile_parameters'].items():
        string += key + value
    # now add in the key-value pairs for the payload type parameters
    # now finally call the function to create the uuid
    return await create_uuid(string)


async def write_payload(uuid, user):
    try:
        payload = await db_objects.get(Payload, uuid=uuid)
    except Exception as e:
        return {'status': 'error', 'error': 'failed to get payload db object to write to disk'}
    try:
        if payload.payload_type.file_extension:
            extension = "." + str(payload.payload_type.file_extension)
        else:
            extension = ""
        base = open('./app/payloads/{}/{}{}'.format(payload.payload_type.ptype,
                                                    payload.payload_type.ptype, extension))
        payload_directory = os.path.dirname(payload.location)
        pathlib.Path(payload_directory).mkdir(parents=True, exist_ok=True)
        custom = open(payload.location, 'w')
        base_c2 = open('./app/c2_profiles/{}/{}/{}/{}{}'.format(payload.operation.name,
                                                                payload.c2_profile.name,
                                                                payload.payload_type.ptype,
                                                                payload.c2_profile.name,
                                                                extension))
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to opan all needed files'}
    for line in base:
        if "C2Profile" in line:
            # this means we need to write out the c2 profile and all parameters here
            await write_c2(custom, base_c2, payload)
        # this will eventually be write_ptype_params like above, but not yet
        elif 'XXXX' in line:
            custom.write('this.uuid = "' + uuid + '";\n')
        elif 'COMMAND DECLARATIONS AND IMPLEMENTATIONS' in line:
            # go through all the commands and write them to the payload
            try:
                commands = await db_objects.execute(PayloadCommand.select().where(PayloadCommand.payload == payload))
                for command in commands:
                    # try to open up the corresponding command file
                    cmd_file = open('./app/payloads/{}/{}'.format(payload.payload_type.ptype, command.command.cmd))
                    custom.write(cmd_file.read())
                    cmd_file.close()
            except Exception as e:
                print(e)
                return {'status': 'error', 'error': 'failed to get and write commands to payload on disk'}
        else:
            custom.write(line)
    base.close()
    base_c2.close()
    custom.close()
    # now that it's written to disk, we need to potentially do some compilation or extra command
    if payload.payload_type.compile_command != "":
        cmd = ["/bin/bash"] + payload.payload_type.compile_command.split(" ")
        p = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE )
        stdout, stderr = await p.communicate()
        return {'status': 'success', 'path': payload.location, 'stdout': str(stdout.decode()), 'stderr': str(stderr.decode())}
    return {'status': 'success', 'path': payload.location}


@apfell.route(apfell.config['API_BASE'] + "/payloads/create", methods=['POST'])
@inject_user()
@protected()
async def create_payload(request, user):
    data = request.json
    data['operator'] = user['username']
    data['current_operation'] = user['current_operation']
    if 'payload' in data:
        try:
            old_payload = await db_objects.get(Payload, uuid=data['payload'])
            db_commands = await db_objects.execute(PayloadCommand.select().where(PayloadCommand.payload == old_payload))
            commands = [c.command.cmd for c in db_commands]
            data['payload_type'] = old_payload.payload_type.ptype
            data['c2_profile'] = old_payload.c2_profile.name
            data['commands'] = commands
            # we need to set the key-value pairs for the c2 profile parameters
            final_c2_params = {}
            c2_params = await db_objects.execute(C2ProfileParametersInstance.select().where(C2ProfileParametersInstance.payload == old_payload))
            for param in c2_params:
                final_c2_params[param.c2_profile_parameters.name] = param.value
            data['c2_profile_parameters'] = final_c2_params
            if 'tag' not in data:
                data['tag'] = old_payload.tag
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to get old payload values'})
    if 'tag' not in data:
        if 'task' in data:
            if data['pcallback']:
                data['tag'] = user['username'] + " using " + data['command'] + " from callback " + data['pcallback']
            else:
                data['tag'] = user['username'] + " created using " + data['command']
        else:
            data['tag'] = data['payload_type'] + " payload created by " + user['username']
    # first we need to register the payload
    rsp = await register_new_payload_func(data, user)
    if rsp['status'] == "success":
        # now that it's registered, write the file
        create_rsp = await write_payload(rsp['uuid'], user)
        if create_rsp['status'] == "success":
            # if this was a task, we need to now issue the task to use this payload
            if 'task' in data:
                task = {'command': data['command'], 'params': data['params'] + " " + rsp['payload_type'] + " " + rsp['uuid'],
                        'operator': user['username']}
                task_status = await add_task_to_callback_func(task, data['pcallback'], user)
                return json(task_status)
            else:
                return json({'status': 'success'})
        else:
            return json({'status': 'error', 'error': create_rsp['error']})
    else:
        print(rsp['error'])
        return json({'status': 'error', 'error': rsp['error']})


async def write_c2(custom, base_c2, payload):
    # we need to write out base_C2 content to the custom file
    # but we also need to replace all parameter values as we see them
    # first get all of the parameter instances
    try:
        param_dict = {}
        c2_param_instances = await db_objects.execute(C2ProfileParametersInstance.select().where(C2ProfileParametersInstance.payload == payload))
        for instance in c2_param_instances:
            param = await db_objects.get(C2ProfileParameters, id=instance.c2_profile_parameters)
            param_dict[param.key] = instance.value
        c2_code = base_c2.read()
        for key,val in param_dict.items():
            c2_code = c2_code.replace(key, val)
        custom.write(c2_code)
        return {'status': 'success'}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to write c2'}


# needs to not be protected so the implant can call back and get a copy of an agent to run
@apfell.route(apfell.config['API_BASE'] + "/payloads/get/<pload:string>", methods=['GET'])
async def get_payload(request, pload):
    # return a blob of the requested payload
    # the pload string will be the uuid of a payload registered in the system
    try:
        payload = await db_objects.get(Payload, uuid=pload)
    except Exception as e:
        return json({'status': 'error', 'error': 'payload not found'})
    try:
        print(payload.location)
        with open(payload.location, 'r') as f:
            base_data = f.read()
        # b64_data = str(base64.b64encode(str.encode(base_data)))
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to open payload'})
    return text(base_data)  # just return raw data
