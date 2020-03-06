from app import apfell, db_objects
from sanic.response import json, file
from app.database_models.model import Payload, C2ProfileParameters, C2ProfileParametersInstance, PayloadCommand, FileMeta
import pathlib
from sanic_jwt.decorators import scoped, inject_user
import os
from urllib.parse import unquote_plus
import base64
import sys
from app.api.transform_api import get_payload_transforms
import uuid
import shutil
import glob
import app.database_models.model as db_model
from app.api.rabbitmq_api import send_pt_rabbitmq_message
import json as js
from datetime import datetime, timedelta
from sanic.exceptions import abort


@apfell.route(apfell.config['API_BASE'] + "/payloads/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_payloads(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if user['admin']:
        query = await db_model.payload_query()
        payloads = await db_objects.execute(query)
        return json([p.to_json() for p in payloads])
    else:
        return json({"status": "error", 'error': 'Must be an admin to see all payloads'})


@apfell.route(apfell.config['API_BASE'] + "/payloads/current_operation", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_payloads_current_operation(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if user['current_operation'] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.payload_query()
        payloads = await db_objects.execute(query.where(Payload.operation == operation))
        return json([p.to_json() for p in payloads])
    else:
        return json({"status": "error", 'error': 'must be part of a current operation'})


@apfell.route(apfell.config['API_BASE'] + "/payloads/<puuid:string>/<from_disk:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_payload(request, puuid, user, from_disk):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        return json(await remove_payload_func(puuid, from_disk, operation))
    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to find operation'})


async def remove_payload_func(uuid, from_disk, operation):
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid, operation=operation)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status': 'error', 'error': 'specified payload does not exist'}
    try:
        payload.deleted = True
        if os.path.exists(payload.hosted_path):
            try:
                os.remove(payload.hosted_path)
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        await db_objects.update(payload)
        if from_disk == 1 and os.path.exists(payload.location):
            try:
                os.remove(payload.location)
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        # if we started hosting this payload as a file in our database, we need to remove that as well
        query = await db_model.filemeta_query()
        file_metas = await db_objects.execute(query.where(FileMeta.path == payload.location))
        for fm in file_metas:
            await db_objects.delete(fm)
        success = {'status': 'success'}
        return {**success, **payload.to_json()}
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status':'error', 'error': 'failed to delete payload: ' + uuid}


@apfell.route(apfell.config['API_BASE'] + "/payloads/delete_bulk", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_multiple_payload(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        data = request.json
        errors = {}
        successes = {}
        for pload in data['payloads']:
            status = await remove_payload_func(pload['uuid'], pload['from_disk'], operation)
            if status['status'] == "error":
                errors[pload['uuid']] = status['error']
            else:
                successes[pload['uuid']] = 'success'
        if len(errors) == 0:
            return json({'status': 'success', 'successes': successes})
        else:
            return json({'status': 'error', 'errors': errors, 'successes': successes})
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({'status': 'error', 'error': 'Failed to get operation', 'errors': {}, 'successes': {}})


async def register_new_payload_func(data, user):
    delete_elements = []  # keep track of elements to delete if we error out in the process
    if user['current_operation'] == "":
        return {'status': 'error', 'error': "must be in an active operation"}
    if 'payload_type' not in data:
        return {'status': 'error', 'error': '"payload_type" field is required'}
    if 'c2_profiles' not in data:
        return {'status': 'error', 'error': '"c2_profiles" field is required'}
    # the other parameters are based on the payload_type, c2_profile, or other payloads
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status': 'error', 'error': 'failed to get operator or operation when registering payload'}
    # we want to track the parent callbacks of new callbacks if possible

    try:
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=data['payload_type'])
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status': 'error', 'error': 'failed to get payload type when registering payload'}
    tag = data['tag'] if 'tag' in data else ""
    # if the type of payload is a wrapper, then it doesn't have any commands associated with it
    # otherwise, get all of the commands and make sure they're valid
    if not payload_type.wrapper:
        db_commands = {}
        if 'commands' not in data or data['commands'] is None:
            data['commands'] = []
        for cmd in data['commands']:
            try:
                query = await db_model.command_query()
                db_commands[cmd] = await db_objects.get(query, cmd=cmd, payload_type=payload_type)
            except Exception as e:
                return {'status': 'error', 'error': 'failed to get command {}'.format(cmd)}
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
    if 'build_container' not in data:
        data['build_container'] = payload_type.ptype
    if not payload_type.wrapper:
        payload = await db_objects.create(Payload, operator=operator, payload_type=payload_type,
                                          tag=tag, location=location,
                                          uuid=uuid, operation=operation,
                                          build_container=data['build_container'])
        delete_elements.append(payload)
        await db_objects.create(db_model.OperationEventLog, operator=operator, operation=operation,
                                message="Apfell: New payload {} with UUID {} and tag: {}".format(payload_type.ptype,
                                                                                                    payload.uuid,
                                                                                                    payload.tag))

        for cmd in db_commands:
            try:
                pc = await db_objects.create(PayloadCommand, payload=payload, command=db_commands[cmd], version=db_commands[cmd].version)
                delete_elements.append(pc)
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                # this should delete any PayloadCommands that managed to get created before the error
                for e in delete_elements:
                    await db_objects.delete(e)
                return {'status': 'error', 'error': "Failed to create payloadcommand: " + str(e)}
    else:
        # this means we're looking at making a wrapped payload, so make sure we can find the right payload
        try:
            query = await db_model.payload_query()
            wrapped_payload = await db_objects.get(query, uuid=data['wrapped_payload'], operation=operation)
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            for e in delete_elements:
                await db_objects.delete(e)
            return {'status': 'error', 'error': 'failed to find the wrapped payload specified in our current operation'}
        payload = await db_objects.create(Payload, operator=operator, payload_type=payload_type,
                                       tag=tag, location=location,
                                       uuid=uuid, operation=operation, wrapped_payload=wrapped_payload)
        delete_elements.append(payload)
        await db_objects.create(db_model.OperationEventLog, operator=operator, operation=operation,
                                message="Apfell: New payload {} with UUID {} and tag: {}".format(
                                    payload_type.ptype, payload.uuid, payload.tag))
    # go through each c2 profile and creating payload/c2 mappings and instantiate their parameters
    # Get all of the c2 profile parameters and create their instantiations
    for p in data['c2_profiles']:
        try:
            query = await db_model.c2profile_query()
            c2_profile = await db_objects.get(query, name=p['c2_profile'])
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            for e in delete_elements:
                await db_objects.delete(e)
            return {'status': 'error', 'error': 'failed to get c2 profile when registering payload'}
        query = await db_model.c2profileparameters_query()
        db_c2_profile_parameters = await db_objects.execute(query.where(C2ProfileParameters.c2_profile == c2_profile))
        for param in db_c2_profile_parameters:
            # find the matching data in the data['c2_profile_parameters']
            try:
                c2p = await db_objects.create(C2ProfileParametersInstance, c2_profile_parameters=param,
                                              value=p['c2_profile_parameters'][param.key], payload=payload,
                                              c2_profile=c2_profile)
                delete_elements.append(c2p)
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                # remove our payload that we managed to create
                for e in delete_elements:
                    await db_objects.delete(e)
                return {'status': 'error', 'error': 'failed to create parameter instance: ' + str(e)}
        try:
            payload_c2 = await db_objects.create(db_model.PayloadC2Profiles, payload=payload, c2_profile=c2_profile)
            delete_elements.append(payload_c2)
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            # remove our payload that we managed to create
            for e in delete_elements:
                await db_objects.delete(e)
            return {'status': 'error', 'error': 'failed to create parameter instance: ' + str(e)}
    # Get all of the transform parameters if any and create their instantiations
    if data['transforms']:
        query = await db_model.transformcode_query()
        for t in data['transforms']:
            transform = await db_objects.get(query, name=t['transform'])
            await db_objects.create(db_model.TransformInstance, transform=transform, order=t['order'], payload=payload,
                                    t_type=t['t_type'], parameter=t['parameter'])
    try:
        os.makedirs(pathlib.Path(payload.location).parent, exist_ok=True)
        pathlib.Path(payload.location).touch()
    except Exception as e:
        return {'status': 'error', 'error': 'failed to touch file on disk'}
    return {'status': 'success', **payload.to_json()}


async def generate_uuid():
    return str(uuid.uuid4())


async def local_copytree(src, dst):
    names = os.listdir(src)
    #os.makedirs(dst, exist_ok=True)
    pathlib.Path(dst).mkdir(parents=True, exist_ok=True)
    errors = []
    for name in names:
        srcname = os.path.join(src, name)
        dstname = os.path.join(dst, name)
        try:
            shutil.copytree(srcname, dstname)
        except OSError as why:
            try:
                shutil.copy2(srcname, dstname)
            except OSError as why2:
                errors.append((srcname, dstname, str(why2)))
        # catch the Error from the recursive copytree so that we can
        # continue with other files
        except Exception as err:
            errors.extend(err.args[0])
        try:
            shutil.copystat(src, dst)
        except Exception as e:
            errors.append(e.args[0])
    if len(errors):
        print(errors)
        raise Exception(str(errors))


async def write_payload(uuid, user, data):
    # for projects that need compiling, we should copy all of the necessary files to a temp location
    #  do our stamping and compiling, save off the one final file to the rightful destination
    #  then delete the temp files. They will be in a temp folder identified by the payload's UUID which should be unique
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status': 'error', 'error': 'failed to get payload db object to write to disk'}
    try:
        working_path = "./app/payloads/operations/{}/{}".format(operation.name, payload.uuid)
        # copy the payload type's files there
        await local_copytree("./app/payloads/{}/payload/".format(payload.payload_type.ptype), working_path)
        # now we will work with the files from our temp directory
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        try:
            shutil.rmtree(working_path)
        except Exception as err:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(err))
            pass
        return {'status': 'error', 'error': 'failed to copy over all needed files. ' + str(e)}
    wrote_commands_inline = False
    wrote_c2_inline = False
    # we will loop over all the files in the temp directory as we attempt to write out our information
    # this will help multi file projects as well as ones where maybe code and headers need to be in different files
    # this iterates over all payload files in the working path
    for base_file in glob.iglob(working_path + "/**", recursive=True):
        try:
            # print("base_file: " + base_file)
            # print("is folder: " + str(os.path.isdir(base_file)))
            if os.path.isdir(base_file):
                continue
            base = open(base_file, 'r')
            # print("payload file: " + base_file)
            # write to the new file, then copy it over when we're done
            custom = open(base_file + payload.uuid, 'w')  # make sure our temp file won't exist
            for line in base:
                # search for any of our payload_type-based pre-processing commands
                if "C2PROFILE_HERE" in line:
                    # this means we need to write out the c2 profile and all parameters here
                    try:
                        wrote_c2_inline = True
                        await write_c2_inline(custom, payload)
                    except Exception as e:
                        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                        shutil.rmtree(working_path)
                        return {'status': 'error',
                                'error': 'failed to get and write C2 profiles to payload on disk: ' + str(e)}
                elif 'UUID_HERE' in line:
                    replaced_line = line.replace("UUID_HERE", uuid)
                    custom.write(replaced_line)
                elif 'COMMANDS_HERE' in line:
                    # go through all the commands and write them to the payload
                    wrote_commands_inline = True
                    try:
                        query = await db_model.payloadcommand_query()
                        commands = await db_objects.execute(query.where(PayloadCommand.payload == payload))
                        for command in commands:
                            # try to open up the corresponding command file
                            try:
                                cmd_file = open('./app/payloads/{}/commands/{}/{}.{}'.format(
                                    payload.payload_type.ptype, command.command.cmd,
                                    command.command.cmd, payload.payload_type.file_extension), 'r')
                                # we will write everything from the beginning to COMMAND_ENDS_HERE
                                for cmdline in cmd_file:
                                    if 'COMMAND_ENDS_HERE' not in cmdline:
                                        custom.write(cmdline)
                                    else:
                                        break  # stop once we find 'COMMAND_ENDS_HERE'
                                cmd_file.close()
                            except Exception as e:
                                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                                print("Failed to read command: " + command.command.cmd)
                                raise e  # stop, propagate out
                    except Exception as e:
                        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                        shutil.rmtree(working_path)
                        return {'status': 'error', 'error': 'failed to get and write commands to payload on disk: ' + str(e)}
                elif 'COMMAND_COUNT_HERE' in line:
                    count = await db_objects.count(PayloadCommand.select().where(PayloadCommand.payload == payload))
                    replaced_line = line.replace('COMMAND_COUNT_HERE', str(count))
                    custom.write(replaced_line)
                elif 'COMMAND_STRING_LIST_HERE' in line:
                    query = await db_model.payloadcommand_query()
                    commands = await db_objects.execute(query.where(PayloadCommand.payload == payload))
                    cmdlist = ','.join([str('"' + cmd.command.cmd + '"') for cmd in commands])
                    replaced_line = line.replace('COMMAND_STRING_LIST_HERE', cmdlist)
                    custom.write(replaced_line)
                elif 'COMMAND_RAW_LIST_HERE' in line:
                    query = await db_model.payloadcommand_query()
                    commands = await db_objects.execute(query.where(PayloadCommand.payload == payload))
                    cmdlist = ','.join([cmd.command.cmd for cmd in commands])
                    replaced_line = line.replace('COMMAND_RAW_LIST_HERE', cmdlist)
                    custom.write(replaced_line)
                elif 'COMMAND_HEADERS_HERE' in line:
                    # go through all the commands and write them to the payload
                    try:
                        query = await db_model.payloadcommand_query()
                        commands = await db_objects.execute(query.where(PayloadCommand.payload == payload))
                        for command in commands:
                            # try to open up the corresponding command file
                            try:
                                cmd_file = open(
                                    './app/payloads/{}/commands/{}/{}.{}'.format(payload.payload_type.ptype,
                                                                                 command.command.cmd,
                                                                                 command.command.cmd,
                                                                                 payload.payload_type.file_extension), 'r')
                                found_headers = False
                                for cmdline in cmd_file:
                                    if found_headers:
                                        custom.write(cmdline)
                                    elif 'COMMAND_ENDS_HERE' in cmdline:
                                        found_headers = True
                                cmd_file.close()
                            except Exception as e:
                                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                                print("Failed to read command: " + command.command.cmd)
                                raise e
                    except Exception as e:
                        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                        shutil.rmtree(working_path)
                        return {'status': 'error', 'error': 'failed to get and write commands to payload on disk: ' + str(e)}
                elif 'WRAPPED_PAYLOAD_HERE' in line and payload.payload_type.wrapper:
                    # first we need to do the proper encoding, then we write it do the appropriate spot
                    wrapped_payload = open(payload.wrapped_payload.location, 'rb').read()
                    # eventually give a choice of how to encode, for now though, always base64 encode
                    #if payload.payload_type.wrapped_encoding_type == "base64":
                    wrapped_payload = base64.b64encode(wrapped_payload).decode("UTF-8")
                    replaced_line = line.replace("WRAPPED_PAYLOAD_HERE", str(wrapped_payload))
                    custom.write(replaced_line)
                else:
                    custom.write(line)
            base.close()
            custom.close()
            os.remove(base_file)
            os.rename(base_file + payload.uuid, base_file)
        except Exception as e:
            # we likely got a binary file that can't be parsed like this, so move on
            custom.close()
            os.remove(base_file + payload.uuid)
            print("Tried to read lines of a binary file, moving to the next file: " + str(e))
    try:
        custom.close()
    except Exception as e:
        pass
    # if we didn't write the commands anywhere, then it's needed in its current separate files, copy them over
    if not wrote_commands_inline:
        query = await db_model.payloadcommand_query()
        commands = await db_objects.execute(query.where(PayloadCommand.payload == payload))
        for command in commands:
            try:
                # copy the payload type's files there
                await local_copytree('./app/payloads/{}/commands/{}'.format(payload.payload_type.ptype, command.command.cmd),
                                     working_path + "/{}".format(command.command.cmd))
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                shutil.rmtree(working_path)
                return {'status': 'error', 'error': 'failed to get and write commands to payload on disk: ' + str(e)}
    if not wrote_c2_inline:
        # we didn't write c2 inline into the file, so we need to copy it over
        try:
            await write_c2(working_path, payload)
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            shutil.rmtree(working_path)
            return {"status": "error", 'error': 'Failed to write c2 files to temporary folder: ' + str(e)}
    # transform_request = await get_transforms_func(payload.payload_type.ptype, "create")
    transform_request = await get_payload_transforms(payload)
    if transform_request['status'] == "success":
        transform_list = transform_request['transforms']
        # now we have a temporary location with everything we need
        # zip it all up and save it
        if not payload.payload_type.container_running:
            return {"status": "error", 'error': 'build container not running'}
        if payload.payload_type.last_heartbeat < datetime.utcnow() + timedelta(seconds=-30):
            query = await db_model.payloadtype_query()
            payload_type = await db_objects.get(query, ptype=payload.payload_type.ptype)
            payload_type.container_running = False
            await db_objects.update(payload_type)
            shutil.rmtree(working_path)
            return {"status": "error", 'error': 'build container not running, no heartbeat in over 30 seconds'}
        shutil.make_archive("./app/payloads/operations/{}/{}".format(operation.name, payload.uuid), 'zip', working_path)
        file_data = open("./app/payloads/operations/{}/{}".format(operation.name, payload.uuid) + ".zip", 'rb').read()
        result = await send_pt_rabbitmq_message(payload.payload_type.ptype,
                                                "create_payload_with_code.{}".format(payload.uuid),
                                                base64.b64encode(
                                                    js.dumps(
                                                        {"zip": base64.b64encode(file_data).decode('utf-8'),
                                                         "transforms": transform_list,
                                                         "extension": payload.payload_type.file_extension}
                                                    ).encode()
                                                ).decode('utf-8'))
        shutil.rmtree(working_path)
        os.remove("./app/payloads/operations/{}/{}".format(operation.name, payload.uuid) + ".zip")
        return {**result, "uuid": payload.uuid}
    else:
        return {'status': 'error', 'error': 'failed to query for transforms'}


@apfell.route(apfell.config['API_BASE'] + "/payloads/create", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_payload(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    return json(await(create_payload_func(data, user)))


async def create_payload_func(data, user):
    if 'tag' not in data:
        data['tag'] = data['payload_type'] + " payload created by " + user['username']
    # first we need to register the payload
    rsp = await register_new_payload_func(data, user)
    if rsp['status'] == "success":
        # now that it's registered, write the file, if we fail out here then we need to delete the db object
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=rsp['uuid'])
        if payload.payload_type.external is False:
            create_rsp = await write_payload(payload.uuid, user, data)
            if create_rsp['status'] == "success":
                return {'status': 'success',
                             'uuid': rsp['uuid']}
            else:
                await db_objects.delete(payload, recursive=True)
                return {'status': 'error', 'error': create_rsp['error']}
        else:
            payload.build_phase = "success"
            payload.build_message = "Created externally, not hosted in Apfell"
            await db_objects.update(payload)
            return {'status': 'success', 'uuid': rsp['uuid']}
    else:
        print(rsp['error'])
        return {'status': 'error', 'error': rsp['error']}


async def write_c2_inline(custom, payload):
    # get all of the c2 profiles associated with this payload
    # print("in write_c2_inline")
    query = await db_model.payloadc2profiles_query()
    payloadc2profiles = await db_objects.execute(query.where(db_model.PayloadC2Profiles.payload == payload))
    for pc2p in payloadc2profiles:
        # for each profile, we need to get all of the parameters and supplied values for just that profile
        # print("Going through profile: " + pc2p.c2_profile.name)
        param_dict = {}
        query = await db_model.c2profileparametersinstance_query()
        c2_param_instances = await db_objects.execute(query.where(
            (C2ProfileParametersInstance.payload == payload) & (C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
        ))
        # save all the variables off to a dictionary for easy looping
        for instance in c2_param_instances:
            # print("looping through params")
            param = instance.c2_profile_parameters
            param_dict[param.key] = instance.value
        # loop through all of that c2 profile's files,
        # replacing the variables along the way and writing out to the new payload
        # print(param_dict)
        for base_file in glob.iglob('./app/c2_profiles/{}/{}/'.format(pc2p.c2_profile.name, payload.payload_type.ptype) + "/**", recursive=True):
            if os.path.isdir(base_file):
                continue
            c2_code = open(base_file).read()
            try:
                for key, val in param_dict.items():
                    c2_code = c2_code.replace(key, val)
                custom.write(c2_code)
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                raise e
    return {'status': 'success'}


async def write_c2(working_path, payload):
    # get all of the c2 profiles associated with this payload
    query = await db_model.payloadc2profiles_query()
    payloadc2profiles = await db_objects.execute(query.where(db_model.PayloadC2Profiles.payload == payload))
    for pc2p in payloadc2profiles:
        # for each profile, we need to get all of the parameters and supplied values for just that profile
        param_dict = {}
        query = await db_model.c2profileparametersinstance_query()
        c2_param_instances = await db_objects.execute(query.where(
            (C2ProfileParametersInstance.payload == payload) & (C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
        ))
        # save all the variables off to a dictionary for easy looping
        for instance in c2_param_instances:
            param = instance.c2_profile_parameters
            param_dict[param.key] = instance.value
        # loop through all of that c2 profile's files,
        # replacing the variables along the way and writing out to the new payload
        for base_file in glob.iglob(
                './app/c2_profiles/{}/{}/'.format(pc2p.c2_profile.name, payload.payload_type.ptype) + "/**",
                recursive=True):
            relative_file = base_file.replace('./app/c2_profiles/{}/{}/'.format(pc2p.c2_profile.name, payload.payload_type.ptype), "")
            if os.path.isdir(base_file):
                # make this directory in our working_path
                os.makedirs(working_path + "/" + relative_file, exist_ok=True)
                continue
            else:
                os.makedirs(working_path + "/" + os.path.dirname(relative_file), exist_ok=True)
            c2_code = open(base_file).read()
            try:
                for key, val in param_dict.items():
                    c2_code = c2_code.replace(key, val)
                custom = open(working_path + "/" + relative_file, 'w')
                custom.write(c2_code)
                custom.close()
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                raise e
    return {'status': 'success'}


async def write_c2_based_on_callback_loaded_c2(working_path, callback):
    query = await db_model.callbackc2profiles_query()
    callbackc2profiles = await db_objects.execute(query.where(db_model.CallbackC2Profiles.callback == callback))
    for pc2p in callbackc2profiles:
        # for each profile, we need to get all of the parameters and supplied values for just that profile
        param_dict = {}
        query = await db_model.c2profileparametersinstance_query()
        c2_param_instances = await db_objects.execute(query.where(
            (C2ProfileParametersInstance.callback == callback) & (
                        C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
        ))
        # save all the variables off to a dictionary for easy looping
        for instance in c2_param_instances:
            param = instance.c2_profile_parameters
            param_dict[param.key] = instance.value
        # loop through all of that c2 profile's files,
        # replacing the variables along the way and writing out to the new payload
        for base_file in glob.iglob(
                './app/c2_profiles/{}/{}/'.format(pc2p.c2_profile.name, callback.registered_payload.payload_type.ptype) + "/**",
                recursive=True):
            relative_file = base_file.replace(
                './app/c2_profiles/{}/{}/'.format(pc2p.c2_profile.name, callback.registered_payload.payload_type.ptype), "")
            if os.path.isdir(base_file):
                # make this directory in our working_path
                os.makedirs(working_path + "/" + relative_file, exist_ok=True)
                continue
            else:
                os.makedirs(working_path + "/" + os.path.dirname(relative_file), exist_ok=True)
            c2_code = open(base_file).read()
            try:
                for key, val in param_dict.items():
                    c2_code = c2_code.replace(key, val)
                custom = open(working_path + "/" + relative_file, 'w')
                custom.write(c2_code)
                custom.close()
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                raise e
    return {'status': 'success'}


# needs to not be protected so the implant can call back and get a copy of an agent to run
@apfell.route(apfell.config['API_BASE'] + "/payloads/download/<uuid:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_payload(request, uuid, user):
    # return a blob of the requested payload
    # the pload string will be the uuid of a payload registered in the system
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_payloads_by_type(request, ptype, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find payload type'})
    if user['current_operation'] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    else:
        return json({'status': 'error', 'error': 'must be part of an active operation'})
    query = await db_model.payload_query()
    payloads = await db_objects.execute(query.where((Payload.operation == operation) & (Payload.payload_type == payloadtype)))
    payloads_json = [p.to_json() for p in payloads]
    return json({'status': 'success', "payloads": payloads_json})


@apfell.route(apfell.config['API_BASE'] + "/payloads/<uuid:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_payload_info(request, uuid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload'})
    if payload.operation.name in user['operations']:
        query = await db_model.payloadcommand_query()
        payloadcommands = await db_objects.execute(query.where(PayloadCommand.payload == payload))
        commands = [{"cmd": c.command.cmd, "version": c.version, "apfell_version": c.command.version} for c in payloadcommands]
        # now we need to get the c2 profile parameters as well
        c2_profiles_data = {}
        query = await db_model.payloadc2profiles_query()
        c2profiles = await db_objects.execute(query.where(db_model.PayloadC2Profiles.payload == payload))
        for c2p in c2profiles:
            query = await db_model.c2profileparametersinstance_query()
            c2_profile_params = await db_objects.execute(query.where(
                (C2ProfileParametersInstance.payload == payload) &
                (C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
            ))
            params = [p.to_json() for p in c2_profile_params]
            c2_profiles_data[c2p.c2_profile.name] = params
        query = await db_model.transforminstance_query()
        create_transforms = await db_objects.execute(query.where(db_model.TransformInstance.payload == payload).order_by(db_model.TransformInstance.order))
        transforms = [t.to_json() for t in create_transforms]
        return json({'status': 'success', **payload.to_json(),
                     "commands": commands,
                     "c2_profiles": c2_profiles_data,
                     "create_transforms": transforms})
    else:
        return json({'status': 'error', 'error': 'you need to be part of the right operation to see this'})


@apfell.route(apfell.config['API_BASE'] + "/payloads/<uuid:string>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def edit_one_payload(request, uuid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload'})
    try:
        if payload.operation.name in user['operations']:
            data = request.json
            if "callback_alert" in data:
                payload.callback_alert = data['callback_alert']
                await db_objects.update(payload)
                return json({'status': 'success'})
        else:
            return json({'status': 'error', 'error': 'you need to be part of the right operation to see this'})
    except Exception as e:
        return json({'status': 'error', 'error': str(e)})
