from app import apfell, db_objects
from sanic.response import json, file
from app.database_models.model import Operator, Payload, C2Profile, C2ProfileParameters, C2ProfileParametersInstance, PayloadType, Operation, PayloadCommand, Command, FileMeta
import pathlib
from sanic_jwt.decorators import protected, inject_user
import os
from urllib.parse import unquote_plus
import base64
import importlib, sys
from app.api.transform_api import get_transforms_func
import uuid
import shutil
import glob


@apfell.route(apfell.config['API_BASE'] + "/payloads/", methods=['GET'])
@inject_user()
@protected()
async def get_all_payloads(request, user):
    if user['admin']:
        payloads = await db_objects.execute(Payload.select())
        return json([p.to_json() for p in payloads])
    else:
        return json({"status": "error", 'error': 'Must be an admin to see all payloads'})


@apfell.route(apfell.config['API_BASE'] + "/payloads/current_operation", methods=['GET'])
@inject_user()
@protected()
async def get_all_payloads_current_operation(request, user):
    if user['current_operation'] != "":
        operation = await db_objects.get(Operation, name=user['current_operation'])
        payloads = await db_objects.execute(Payload.select().where(Payload.operation == operation))
        return json([p.to_json() for p in payloads])
    else:
        return json({"status": "error", 'error': 'must be part of a current operation'})


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
        payload.deleted = True
        await db_objects.update(payload)
        if from_disk == 1 and os.path.exists(payload.location):
            try:
                os.remove(payload.location)
            except Exception as e:
                print(e)
        # if we started hosting this payload as a file in our database, we need to remove that as well
        file_metas = await db_objects.execute(FileMeta.select().where(FileMeta.path == payload.location))
        for fm in file_metas:
            await db_objects.delete(fm)
        success = {'status': 'success'}
        return json({**success, **payload.to_json()})
    except Exception as e:
        print(e)
        return json({'status':'error', 'error': 'failed to delete payload'})


async def register_new_payload_func(data, user):
    if user['current_operation'] == "":
        return {'status': 'error', 'error': "must be in an active operation"}
    if 'payload_type' not in data:
        return {'status': 'error', 'error': '"payload_type" field is required'}
    if 'c2_profile' not in data:
        return {'status': 'error', 'error': '"c2_profile" field is required'}
    # the other parameters are based on the payload_type, c2_profile, or other payloads
    try:
        operator = await db_objects.get(Operator, username=user['username'])
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get operator or operation when registering payload'}
    # we want to track the parent callbacks of new callbacks if possible

    try:
        c2_profile = await db_objects.get(C2Profile, name=data['c2_profile'], operation=operation)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get c2 profile when registering payload'}
    try:
        payload_type = await db_objects.get(PayloadType, ptype=data['payload_type'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get payload type when registering payload'}
    tag = data['tag'] if 'tag' in data else ""
    # if the type of payload is a wrapper, then it doesn't have any commands associated with it
    # otherwise, get all of the commands and make sure they're valid
    if not payload_type.wrapper:
        db_commands = {}
        if 'commands' not in data or data['commands'] is None:
            return {'status': 'error', 'error': '"commands" field is required, select some on the right-hand side'}
        for cmd in data['commands']:
            try:
                db_commands[cmd] = await db_objects.get(Command, cmd=cmd, payload_type=payload_type)
            except Exception as e:
                return {'status': 'error', 'error': 'failed to get command {}'.format(cmd)}
    if payload_type.wrapper:
        data['wrapper'] = True
    else:
        data['wrapper'] = False
    uuid = await generate_uuid()
    if 'location' in data:
        full_filename = os.path.basename(data['location'])
        filename = ".".join(full_filename.split(".")[:-1]) if "." in full_filename else full_filename
        extension = full_filename.split(".")[-1] if "." in full_filename else ""
        save_path = "./app/payloads/operations/{}/{}".format(user['current_operation'], filename)
        tmp_path = save_path + "." + str(extension) if "." in full_filename else save_path
        count = 1
        while os.path.exists(tmp_path):
            # a file with that name already exists, so we need to start adding numbers until we get a unique location
            tmp_path = save_path + str(count) + "." + str(extension) if "." in full_filename else save_path + str(count)
            count += 1
        location = tmp_path
    else:
        file_extension = payload_type.file_extension
        if "." not in file_extension and file_extension != "":
            file_extension = "." + file_extension
        location = "./app/payloads/operations/{}/{}{}".format(user['current_operation'], uuid, file_extension)
    # Register payload
    if not payload_type.wrapper:
        payload, create = await db_objects.create_or_get(Payload, operator=operator, payload_type=payload_type,
                                                         tag=tag, location=location, c2_profile=c2_profile,
                                                         uuid=uuid, operation=operation)
        if create:
            for cmd in db_commands:
                try:
                    await db_objects.create(PayloadCommand, payload=payload, command=db_commands[cmd], version=db_commands[cmd].version)
                except Exception as e:
                    print(e)
                    # this should delete any PayloadCommands that managed to get created before the error
                    await db_objects.delete(payload, recursive=True)
                    return json({'status': 'error', 'error': "Failed to create payloadcommand: " + str(e)})
    else:
        # this means we're looking at making a wrapped payload, so make sure we can find the right payload
        try:
            wrapped_payload = await db_objects.get(Payload, uuid=data['wrapped_payload'], operation=operation)
        except Exception as e:
            print(e)
            return {'status': 'error', 'error': 'failed to find the wrapped payload specified in our current operation'}
        payload, create = await db_objects.get_or_create(Payload, operator=operator, payload_type=payload_type,
                                                         tag=tag, location=location, c2_profile=c2_profile,
                                                         uuid=uuid, operation=operation, wrapped_payload=wrapped_payload)
    # Get all of the c2 profile parameters and create their instantiations
    db_c2_profile_parameters = await db_objects.execute(C2ProfileParameters.select().where(C2ProfileParameters.c2_profile == c2_profile))
    for param in db_c2_profile_parameters:
        # find the matching data in the data['c2_profile_parameters']
        try:
            await db_objects.create(C2ProfileParametersInstance, c2_profile_parameters=param, value=data['c2_profile_parameters'][param.name], payload=payload)
        except Exception as e:
            print(e)
            # remove our payload that we managed to create
            await db_objects.delete(payload, recursive=True)
            return {'status': 'error', 'error': 'failed to create parameter instance: ' + str(e)}
    return {'status': 'success', **payload.to_json()}


async def generate_uuid():
    return str(uuid.uuid4())


async def write_payload(uuid, user):
    # for projects that need compiling, we should copy all of the necessary files to a temp location
    #  do our stamping and compiling, save off the one final file to the rightful destination
    #  then delete the temp files. They will be in a temp folder identified by the payload's UUID which should be unique
    try:
        payload = await db_objects.get(Payload, uuid=uuid)
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get payload db object to write to disk'}
    try:
        if payload.payload_type.file_extension:
            extension = payload.payload_type.file_extension
        else:
            extension = ""
        working_path = "./app/payloads/operations/{}/{}".format(operation.name, payload.uuid)
        # copy the payload type's files there
        shutil.copytree("./app/payloads/{}/payload/".format(payload.payload_type.ptype), working_path)
        # now we will work with the files from our temp directory
        # make sure the path and everything exists for where the final payload will go, create it if it doesn't exist
        payload_directory = os.path.dirname(payload.location)
        pathlib.Path(payload_directory).mkdir(parents=True, exist_ok=True)

        # wrappers won't necessarily have a c2 profile associated with them
        c2_path = './app/c2_profiles/{}/{}/{}/{}{}'.format(payload.operation.name,
                                                                    payload.c2_profile.name,
                                                                    payload.payload_type.ptype,
                                                                    payload.c2_profile.name,
                                                                    extension)
        try:
            base_c2 = open(c2_path, 'r')
        except Exception as e:
            # if the wrapper doesn't have a c2 profile, that's ok
            if payload.payload_type.wrapper:
                pass
            # if the normal profile doesn't though, that's an issue, raise the exception
            else:
                raise e

    except Exception as e:
        print(e)
        shutil.rmtree(working_path)
        return {'status': 'error', 'error': 'failed to open all needed files. ' + str(e)}
    # if we didn't actually find C2PROFILEHERE in the main code, we are probably looking at a multi-file project
    #   in that case, keep track so that we can copy the file over to our temp directory, fill it out, and compile
    wrote_c2_inline = False
    # we will loop over all the files in the temp directory as we attempt to write out our information
    # this will help multi file projects as well as ones where maybe code and headers need to be in different files
    for base_file in glob.iglob(working_path + "/*", recursive=False):
        base = open(base_file, 'r')
        # write to the new file, then copy it over when we're done
        custom = open(working_path + "/" + payload.uuid, 'w')  # make sure our temp file won't exist
        for line in base:
            if "C2PROFILE_HERE" in line and base_c2:
                # this means we need to write out the c2 profile and all parameters here
                await write_c2(custom, base_c2, payload)
                wrote_c2_inline = True
            elif 'C2PROFILE_NAME_HERE' in line:
                # optional directive to insert the name of the c2 profile
                replaced_line = line.replace("C2PROFILE_NAME_HERE", payload.c2_profile.name)
                custom.write(replaced_line)
            elif 'UUID_HERE' in line:
                replaced_line = line.replace("UUID_HERE", uuid)
                custom.write(replaced_line)
            elif 'COMMANDS_HERE' in line:
                # go through all the commands and write them to the payload
                try:
                    commands = await db_objects.execute(PayloadCommand.select().where(PayloadCommand.payload == payload))
                    for command in commands:
                        # try to open up the corresponding command file
                        cmd_file = open('./app/payloads/{}/commands/{}'.format(payload.payload_type.ptype, command.command.cmd), 'r')
                        # we will write everything from the beginning to COMMAND_ENDS_HERE
                        for cmdline in cmd_file:
                            if 'COMMAND_ENDS_HERE' not in cmdline:
                                custom.write(cmdline)
                            else:
                                break  # stop once we find 'COMMAND_ENDS_HERE'
                        cmd_file.close()
                except Exception as e:
                    print(e)
                    return {'status': 'error', 'error': 'failed to get and write commands to payload on disk'}
            elif 'COMMAND_COUNT_HERE' in line:
                count = await db_objects.count(PayloadCommand.select().where(PayloadCommand.payload == payload))
                replaced_line = line.replace('COMMAND_COUNT_HERE', str(count))
                custom.write(replaced_line)
            elif 'COMMAND_STRING_LIST_HERE' in line:
                commands = await db_objects.execute(PayloadCommand.select().where(PayloadCommand.payload == payload))
                cmdlist = ','.join([str('"' + cmd.command.cmd + '"') for cmd in commands])
                replaced_line = line.replace('COMMAND_STRING_LIST_HERE', cmdlist)
                custom.write(replaced_line)
            elif 'COMMAND_RAW_LIST_HERE' in line:
                commands = await db_objects.execute(PayloadCommand.select().where(PayloadCommand.payload == payload))
                cmdlist = ','.join([cmd.command.cmd for cmd in commands])
                replaced_line = line.replace('COMMAND_RAW_LIST_HERE', cmdlist)
                custom.write(replaced_line)
            elif 'COMMAND_HEADERS_HERE' in line:
                # go through all the commands and write them to the payload
                try:
                    commands = await db_objects.execute(
                        PayloadCommand.select().where(PayloadCommand.payload == payload))
                    for command in commands:
                        # try to open up the corresponding command file
                        cmd_file = open(
                            './app/payloads/{}/commands/{}'.format(payload.payload_type.ptype, command.command.cmd), 'r')
                        found_headers = False
                        for cmdline in cmd_file:
                            if found_headers:
                                custom.write(cmdline)
                            elif 'COMMAND_ENDS_HERE' in cmdline:
                                found_headers = True
                        #custom.write(cmd_file.read())
                        cmd_file.close()
                except Exception as e:
                    print(e)
                    return {'status': 'error', 'error': 'failed to get and write commands to payload on disk'}
            elif 'WRAPPEDPAYLOADHERE' in line and payload.payload_type.wrapper:
                # first we need to do the proper encoding, then we write it do the appropriate spot
                wrapped_payload = open(payload.wrapped_payload.location, 'rb').read()
                # eventually give a choice of how to encode, for now though, always base64 encode
                #if payload.payload_type.wrapped_encoding_type == "base64":
                wrapped_payload = base64.b64encode(wrapped_payload).decode("UTF-8")
                replaced_line = line.replace("WRAPPEDPAYLOADHERE", str(wrapped_payload))
                custom.write(replaced_line)
            else:
                custom.write(line)
        base.close()
        custom.close()
        os.remove(base_file)
        os.rename(working_path + "/" + payload.uuid, base_file)
    try:
        base_c2.close()
    except Exception as e:
        print(e)
        pass
    custom.close()
    if not wrote_c2_inline:
        # we didn't write the c2 information into the main file, so it's in another file, copy it over and fill it out
        for file in glob.glob(r'./app/c2_profiles/{}/{}/{}/*'.format(payload.operation.name, payload.c2_profile.name, payload.payload_type.ptype)):
            # once we copy a file over, try to replace some c2 params in it
            try:
                base_c2 = open(file, 'r')
                base_c2_new = open(working_path + "/{}".format(file.split("/")[-1]), 'w')
            except Exception as e:
                shutil.rmtree(working_path)
                return {'status': 'error', 'error': 'failed to open c2 code'}
            await write_c2(base_c2_new, base_c2, payload)
            base_c2.close()
            base_c2_new.close()

    # now that it's written to disk, we need to potentially do some compilation or extra transforms
    try:
        import app.api.transforms.utils
        importlib.reload(sys.modules['app.api.transforms.utils'])
    except Exception as e:
        print(e)
    from app.api.transforms.utils import TransformOperation
    transform = TransformOperation(working_dir=working_path)
    transform_request = await get_transforms_func(payload.payload_type.ptype, "create")
    if transform_request['status'] == "success":
        transform_list = transform_request['transforms']
        # do step 0, prior_output = path of our newly written file
        transform_output = os.path.abspath(working_path) + "/"
        for t in transform_list:
            try:
                transform_output = await getattr(transform, t['name'])(payload, transform_output, t['parameter'])
            except Exception as e:
                print(e)
                shutil.rmtree(working_path)
                return {'status': 'error', 'error': 'failed to apply transform {}, with message: {}'.format(
                    t['name'], str(e)
                )}
        try:
            if transform_output != payload.location:
                # this means we ended up with a final file in a location other than what we specified
                if transform_output == os.path.abspath(working_path) + "/":
                    transform_output += payload.payload_type.ptype + extension
                shutil.copy(transform_output, payload.location)
                shutil.rmtree(working_path)
            return {'status': 'success', 'path': payload.location}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    try:
        shutil.copy(working_path + "/" + payload.uuid, payload.location)
        shutil.rmtree(working_path)
        return {'status': 'success', 'path': payload.location}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}


@apfell.route(apfell.config['API_BASE'] + "/payloads/create", methods=['POST'])
@inject_user()
@protected()
async def create_payload(request, user):
    data = request.json
    if 'tag' not in data:
        data['tag'] = data['payload_type'] + " payload created by " + user['username']
    # first we need to register the payload
    rsp = await register_new_payload_func(data, user)
    if rsp['status'] == "success":
        # now that it's registered, write the file, if we fail out here then we need to delete the db object
        payload = await db_objects.get(Payload, uuid=rsp['uuid'])
        create_rsp = await write_payload(payload.uuid, user)
        if create_rsp['status'] == "success":
                return json({'status': 'success', 'execute_help': payload.payload_type.execute_help,
                             'filename': payload.location.split("/")[-1]})
        else:
            await db_objects.delete(payload, recursive=True)
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
@apfell.route(apfell.config['API_BASE'] + "/payloads/download/<uuid:string>", methods=['GET'])
@inject_user()
@protected()
async def get_payload(request, uuid, user):
    # return a blob of the requested payload
    # the pload string will be the uuid of a payload registered in the system
    try:
        payload = await db_objects.get(Payload, uuid=uuid)
    except Exception as e:
        return json({'status': 'error', 'error': 'payload not found'})
    if payload.operation.name in user['operations']:
        try:
            return await file(payload.location, filename=payload.location.split("/")[-1])
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to open payload'})
    else:
        return json({'status': 'error', 'error': 'you\'re not part of the right operation'})


@apfell.route(apfell.config['API_BASE'] + "/payloads/bytype/<ptype:string>", methods=['GET'])
@inject_user()
@protected()
async def get_payloads_by_type(request, ptype, user):
    payload_type = unquote_plus(ptype)
    try:
        payloadtype = await db_objects.get(PayloadType, ptype=payload_type)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find payload type'})
    if user['current_operation'] != "":
        operation = await db_objects.get(Operation, name=user['current_operation'])
    else:
        return json({'status': 'error', 'error': 'must be part of an active operation'})
    payloads = await db_objects.execute(Payload.select().where((Payload.operation == operation) & (Payload.payload_type == payloadtype)))
    payloads_json = [p.to_json() for p in payloads]
    return json({'status': 'success', "payloads": payloads_json})


@apfell.route(apfell.config['API_BASE'] + "/payloads/<uuid:string>", methods=['GET'])
@inject_user()
@protected()
async def get_one_payload_info(request, uuid, user):
    try:
        payload = await db_objects.get(Payload, uuid=uuid)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload'})
    if payload.operation.name in user['operations']:
        payloadcommands = await db_objects.execute(PayloadCommand.select().where(PayloadCommand.payload == payload))
        commands = [{"cmd": c.command.cmd, "version": c.version, "apfell_version": c.command.version} for c in payloadcommands]
        # now we need to get the c2 profile parameters as well
        c2_profile_params = await db_objects.execute(C2ProfileParametersInstance.select().where(C2ProfileParametersInstance.payload == payload))
        params = [p.to_json() for p in c2_profile_params]
        return json({'status': 'success', **payload.to_json(), "commands": commands, "c2_profile_parameters_instance": params})
    else:
        return json({'status': 'error', 'error': 'you need to be part of the right operation to see this'})
