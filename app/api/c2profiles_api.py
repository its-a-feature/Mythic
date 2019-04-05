from app import apfell, db_objects
from sanic.response import json, file
from app.database_models.model import C2Profile, PayloadTypeC2Profile, PayloadType, C2ProfileParameters, FileMeta
from urllib.parse import unquote_plus
import glob
from sanic_jwt.decorators import protected, inject_user
import shutil
import os
import json as js
import base64
from typing import List
import asyncio
import app.database_models.model as db_model

# this information is only valid for a single run of the server
running_profiles = []  # will have dicts of process information


# Get all the currently registered profiles
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['GET'])
@inject_user()
@protected()
async def get_all_c2profiles(request, user):
    #  this syntax is atrocious for getting a pretty version of the results from a many-to-many join table)
    query = await db_model.c2profile_query()
    all_profiles = await db_objects.execute(query)
    query = await db_model.payloadtypec2profile_query()
    profiles = await db_objects.execute(query)
    results = []
    inter = {}
    for p in all_profiles:
        # only show profiles for operations the user is part of
        #   overall admins can see all operations
        if p.operation.name in user['operations'] or user['admin']:
            inter[p.name] = p.to_json()
            # create an empty array for ptypes that we'll populate in the next for loop
            inter[p.name]['ptype'] = []
    for p in profiles:
        if p.c2_profile.name in inter:
            inter[p.c2_profile.name]['ptype'].append(p.payload_type.ptype)
    for k in inter.keys():
        results.append(inter[k])
    return json(results)


# Get all profiles for the user's current operation
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/current_operation", methods=['GET'])
@inject_user()
@protected()
async def get_all_c2profiles_for_current_operation(request, user):
    if user['current_operation'] != "":
        try:
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user['current_operation'])
            query = await db_model.c2profile_query()
            all_profiles = await db_objects.execute(query.where(C2Profile.operation == operation))
            query = await db_model.payloadtypec2profile_query()
            profiles = await db_objects.execute(query)
            results = []
            inter = {}
            for p in all_profiles:
                inter[p.name] = p.to_json()
                inter[p.name]['ptype'] = [] # start to keep track of which payload types this profile supports
            for p in profiles:
                if p.c2_profile.operation == operation:
                    inter[p.c2_profile.name]['ptype'].append(p.payload_type.ptype)
            for k in inter.keys():  # make an array of dictionaries
                results.append(inter[k])
            return json(results)
        except Exception as e:
            print(e)
            return json([""])
    else:
        return json([""])


# Get all currently registered profiles that support a given payload type
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/type/<info:string>", methods=['GET'])
@inject_user()
@protected()
async def get_c2profiles_by_type(request, info, user):
    ptype = unquote_plus(info)
    try:
        profiles = await get_c2profiles_by_type_function(ptype, user, False)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get c2 profiles'})
    return json({'status': 'success', 'profile': profiles})


# Get all currently registered profiles that support a given payload type
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/current_operation/type/<info:string>", methods=['GET'])
@inject_user()
@protected()
async def get_c2profiles_by_type_in_current_operation(request, info, user):
    ptype = unquote_plus(info)
    if user['current_operation'] != "":
        try:
            profiles = await get_c2profiles_by_type_function(ptype, user, True)
            return json({'status': 'success', 'profiles': profiles})
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to get c2 profiles'})


# this function will be useful by other files, so make it easier to use
async def get_c2profiles_by_type_function(ptype, user_dict, use_current):
    try:
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=ptype)
        query = await db_model.payloadtypec2profile_query()
        profiles = await db_objects.execute(query.where(PayloadTypeC2Profile.payload_type == payload_type))
    except Exception as e:
        print(e)
        raise Exception
    if use_current:
        return [p.to_json() for p in profiles if p.c2_profile.operation.name == user_dict['current_operation']]
    else:
        return [p.to_json() for p in profiles if p.c2_profile.operation.name in user_dict['operations'] or user_dict['admin']]


# Register a new profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['POST'])
@inject_user()
@protected()
async def register_new_c2profile(request, user):
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    #print(data)
    # also takes in an array of 'name', 'key' values to aid in payload creation, not a requirement though
    data['operator'] = user['username']
    if 'name' not in data or data['name'] is "" or data['name'] is None:
        return json({'status': 'error', 'error': 'name is required'})
    if 'description' not in data:
        data['description'] = ""
    if 'payload_types' not in data or data['payload_types'] is None:
        return json({'status': 'error', 'error': 'payload_types is required information'})
    # we need to 1. make sure these are all valid payload types, and 2. create payloadtypec2profile entries as well
    for t in data['payload_types']:
        # this should be an array we can iterate over
        query = await db_model.payloadtype_query()
        if await db_objects.count(query.where(PayloadType.ptype == t.strip())) != 1:
            return json({'status': 'error', 'error': t + ' is not a valid PayloadType.'})
    try:
        query = await db_model.operator_query()
        op = await db_objects.get(query, username=data['operator'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'operator could not be found'})
    try:
        if user['current_operation'] != "":
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user['current_operation'])
            profile = await db_objects.create(C2Profile, name=data['name'], description=data['description'], operator=op,
                                              operation=operation)
            # make the right directory structure
            os.makedirs("./app/c2_profiles/{}/{}".format(operation.name, data['name']), exist_ok=True)
            # now create the payloadtypec2profile entries
            for t in data['payload_types']:
                try:
                    query = await db_model.payloadtype_query()
                    payload_type = await db_objects.get(query, ptype=t.strip())
                except Exception as e:
                    print(e)
                    return json({'status': 'error', 'error': 'failed to find payload type: ' + t})
                await db_objects.create(PayloadTypeC2Profile, payload_type=payload_type, c2_profile=profile)
                os.makedirs("./app/c2_profiles/{}/{}/{}".format(operation.name, data['name'], payload_type.ptype), exist_ok=True)
            # now create the c2profileparameters entries so we can generate the right form to fill out
            if 'c2profileparameters' in data:
                for params in data['c2profileparameters']:
                    if not 'hint' in params:
                        params['hint'] = ""
                    await db_objects.create(C2ProfileParameters, c2_profile=profile, key=params['key'], name=params['name'], hint=params['hint'])
            profile_json = profile.to_json()
            # Now that the profile is created and registered, write the server code files to the appropriate directory
            if request.files:
                code = request.files['upload_file'][0].body
                code_file = open("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, request.files['upload_file'][0].name),"wb")
                code_file.write(code)
                code_file.close()
                for i in range(1, int(request.form.get('file_length'))):
                    code = request.files['upload_file_' + str(i)][0].body
                    code_file = open(
                        "./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name,
                                                      request.files['upload_file_' + str(i)][0].name),"wb")
                    code_file.write(code)
                    code_file.close()
            elif 'code' in data and 'file_name' in data:
                # if the user is doing this through the API instead of UI, they can specify a file this way
                code = base64.b64decode(data['code'])
                code_file = open("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, data['file_name']), 'wb')
                code_file.write(code)
                code_file.close()
            status = {'status': 'success'}
            return json({**status, **profile_json})
        else:
            return json({'status': 'error', 'error': 'must be part of an active operation'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'Profile name already taken'})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/upload", methods=['POST'])
@inject_user()
@protected()
async def upload_c2_profile_payload_type_code(request, info, user):
    c2profile = unquote_plus(info)
    # we either get a file from the browser or somebody uploads it via a base64 encoded "code" field
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=c2profile, operation=operation)
        query = await db_model.payloadtypec2profile_query()
        registered_ptypes = await db_objects.execute(query.where(PayloadTypeC2Profile.c2_profile == profile))
        ptypes = [p.payload_type.ptype for p in registered_ptypes]  # just get an array of all the names
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find profile or operation'})
    if "payload_type" not in data:
        return json({'status': 'error', 'error': 'must associate this code with a specific payload type'})
    if data['payload_type'] not in ptypes and data['payload_type'] != "":
        return json({'status': 'error', 'error': 'trying to upload code for a payload time not registered with this c2 profile'})
    try:
        if data['payload_type'] == "":
            data['payload_type'] = "."  # don't change directories and we'll still be in the main c2_profile directory
        if not os.path.exists("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, data['payload_type'])):
            os.mkdir("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, data['payload_type']))
        if "code" in data and "file_name" in data:
            # get a base64 blob of the code and the filename to save it as in the right directory
            code = base64.b64decode(data['code'])
            code_file = open("./app/c2_profiles/{}/{}/{}/{}".format(operation.name, profile.name, data['payload_type'], data['file_name']), 'wb')
            code_file.write(code)
            code_file.close()
        elif request.files:
            code = request.files['upload_file'][0].body
            code_file = open(
                "./app/c2_profiles/{}/{}/{}/{}".format(operation.name, profile.name, data['payload_type'], request.files['upload_file'][0].name), "wb")
            code_file.write(code)
            code_file.close()
            for i in range(1, int(request.form.get('file_length'))):
                code = request.files['upload_file_' + str(i)][0].body
                code_file = open(
                    "./app/c2_profiles/{}/{}/{}/{}".format(operation.name, profile.name,data['payload_type'],
                                                        request.files['upload_file_' + str(i)][0].name), "wb")
                code_file.write(code)
                code_file.close()
        return json({'status': 'success', **profile.to_json()})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to write code to file: ' + str(e)})


# Update a current profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['PUT'])
@inject_user()
@protected()
async def update_c2profile(request, info, user):
    name = unquote_plus(info)
    data = request.json
    payload_types = []
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        if 'description' in data:
            profile.description = data['description']
        if 'payload_types' in data:
            # We need to update the mapping in PayloadTypeC2Profile accordingly
            # We need to see which ones were there before, and either add or delete accordingly
            query = await db_model.payloadtypec2profile_query()
            mapping = await db_objects.execute(query.where(PayloadTypeC2Profile.c2_profile == profile))
            # For each payload type, make sure it's real, and that it's in the mapping
            for m in mapping:
                query = await db_model.payloadtype_query()
                map = await db_objects.get(query, id=m.payload_type)
                if map.ptype in data['payload_types']:
                    # something we say this c2 profile supports is already listed, so remove it from our list to process
                    del data['payload_types'][data['payload_types'].index(map.ptype)]  # remove it from the array
                    payload_types.append(map.ptype)
                else:
                    # now that we don't have the mapping, we also need to remove the files on the server
                    shutil.rmtree("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, map.ptype))
                    # it was in our mapping, now it's not, so remove it from the database mapping
                    await db_objects.delete(m)
            # if there's anyting left in data['payload_types'], it means we need to add it to the database
            for m in data['payload_types']:
                query = await db_model.payloadtype_query()
                if await db_objects.count(query.where(PayloadType.ptype == m.strip())) != 1:
                    return json({'status': 'error',
                                 'error': m + ' is not a valid PayloadType. Perhaps you need to register it first?'})
                query = await db_model.payloadtype_query()
                payload = await db_objects.get(query, ptype=m.strip())
                if not os.path.exists("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, payload.ptype)):
                    os.mkdir("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, payload.ptype))
                await db_objects.create(PayloadTypeC2Profile, c2_profile=profile, payload_type=payload)
                payload_types.append(m.strip())
        success = {'status': 'success'}
        updated_json = profile.to_json()
        return json({**success, **updated_json, 'payload_types': payload_types})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to update C2 Profile'})


# Start running a profile's server side code
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/start", methods=['GET'])
@inject_user()
@protected()
async def start_c2profile(request, info, user):
    name = unquote_plus(info)
    if name == "default":
        return json({'status': 'error', 'error': 'cannot do start/stop on default c2 profiles'})
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
        if profile.operation.name not in user['operations']:
            return json({'status': 'error', 'error': 'must be part of the operation to start/stop the profile'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        # run profiles with just /bin/bash, so they should be set up appropriately
        path = os.path.abspath('./app/c2_profiles/{}/{}/{}_server'.format(operation.name, name, name))
        os.chmod(path, mode=0o777)
        p = await asyncio.create_subprocess_exec(path, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT, cwd='./app/c2_profiles/{}/{}'.format(operation.name, name))
        output = ""
        try:
            for i in range(10):
                line = await asyncio.wait_for(p.stdout.readline(), 1)
                if line:
                    output += line.decode('utf-8')
        except asyncio.TimeoutError:
            pass
        if p.returncode is not None:
            # this means our process already exited
            return json({'status': 'error', 'error': "Process failed to execute:\n" + output})
        else:
            # if it was already in our dictionary of information, just remove it so we can add in the new data
            for x in running_profiles:
                if x['id'] == profile.id:
                    running_profiles.remove(x)
                    break
            running_profiles.append({'id': profile.id,
                                     'name': name,
                                     'process': p,
                                     'status': 'running'})
            profile.running = True
            await db_objects.update(profile)
            return json({'status': 'success', **profile.to_json(), 'output': output})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to start profile. ' + str(e)})


# Start running a profile's server side code
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/stop", methods=['GET'])
@inject_user()
@protected()
async def stop_c2profile(request, info, user):
    name = unquote_plus(info)
    if name == "default":
        return json({'status': 'error', 'error': 'cannot do start/stop on default c2 profiles'})
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find operation'})
    #  if we had running profiles and they weren't stopped before shutdown, this should still be fine
    return json(await stop_c2profile_func(name, operation))


async def stop_c2profile_func(profile_name, operation):
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=profile_name, operation=operation)
    except Exception as e:
        return {'status': 'error', 'error': 'failed to find c2 profile in database'}
    for x in running_profiles:
        if x['id'] == profile.id:
            try:
                x['process'].terminate()
            except Exception as e:
                pass  # it was probably already dead anyway for some reason
            x['status'] = 'stopped'
            profile.running = False
            await db_objects.update(profile)
            return {'status': 'success', **profile.to_json()}
    return {'status': 'error', 'error': 'failed to find profile'}


# Return the current intput and output of the c2 profile for the user
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/status", methods=['GET'])
@inject_user()
@protected()
async def status_c2profile(request, info, user):
    name = unquote_plus(info)
    if name == "default":
        return json({'status': 'error', 'error': 'check main server logs for that info'})
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    #  if we had running profiles and they weren't stopped before shutdown, this should still be fine
    output = ""
    for x in running_profiles:
        if x['id'] == profile.id:
            output = ""
            try:
                for i in range(10):
                    line = await asyncio.wait_for(x['process'].stdout.readline(), 1)
                    if line:
                        output += line.decode('utf-8')
            except Exception as e:
                return json({'status': 'success', 'output': output})
            if output == "":
                return json({'status': 'error', 'error': "profile not running"})
    return json({'status': 'success', 'output': output})


# Get c2 profile files listing for the user
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/files", methods=['GET'])
@inject_user()
@protected()
async def get_file_list_for_c2profiles(request, info, user):
    name = unquote_plus(info)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        path = "./app/c2_profiles/{}/{}/".format(operation.name, profile.name)
        files = []
        for (dirpath, dirnames, filenames) in os.walk(path):
            files.append({"folder": dirpath, "dirnames": dirnames, "filenames": filenames})
        return json({'status': 'success', 'files': files})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed getting files: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/files/delete", methods=['POST'])
@inject_user()
@protected()
async def remove_file_for_c2profiles(request, info, user):
    name = unquote_plus(info)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        data = request.json
        path = os.path.abspath("./app/c2_profiles/{}/{}/".format(operation.name, profile.name))
        attempted_path = os.path.abspath(data['folder'] + "/" + data['file'])
        if path in attempted_path:
            os.remove(attempted_path)
            return json({'status': 'success', 'folder': data['folder'], 'file': data['file']})
        return json({'status': 'error', 'error': 'failed to find file'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed finding the file: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/files/download", methods=['GET'])
@inject_user()
@protected()
async def download_file_for_c2profiles(request, info, user):
    name = unquote_plus(info)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        data = dict(folder=request.raw_args['folder'], file=request.raw_args['file'])
        path = os.path.abspath("./app/c2_profiles/{}/{}/".format(operation.name, profile.name))
        attempted_path = os.path.abspath(data['folder'] + "/" + data['file'])
        if path in attempted_path:
            return await file(attempted_path, filename=data['file'])
        return json({'status': 'success', 'folder': data['folder'], 'file': data['file']})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed finding the file: ' + str(e)})


# Delete a profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_c2profile(request, info, user):
    try:
        info = unquote_plus(info)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=info, operation=operation)
        query = await db_model.c2profileparameters_query()
        parameters = await db_objects.execute(query.where(C2ProfileParameters.c2_profile == profile))
        query = await db_model.payloadtypec2profile_query()
        ptypec2profile = await db_objects.execute(query.where(PayloadTypeC2Profile.c2_profile == profile))
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 profile'})
    try:
        # we will do this recursively because there can't be payloadtypec2profile mappings if the profile doesn't exist
        for p in parameters:
            await db_objects.delete(p, recursive=True)
        for p in ptypec2profile:
            await db_objects.delete(p, recursive=True)
        await db_objects.delete(profile, recursive=True)
        # remove it from disk
        try:
            shutil.rmtree("./app/c2_profiles/{}/{}".format(operation.name, info))
        except:
            pass
        success = {'status': 'success'}
        updated_json = profile.to_json()
        return json({**success, **updated_json})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to delete c2 profile'})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/parameters/", methods=['GET'])
@inject_user()
@protected()
async def get_c2profile_parameters(request, info, user):
    name = unquote_plus(info)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find the c2 profile'})
    try:
        query = await db_model.c2profileparameters_query()
        parameters = await db_objects.execute(query.where(C2ProfileParameters.c2_profile == profile))
        param_list = []
        for p in parameters:
            p_json = p.to_json()
            if p_json['key'] == 'AESPSK':
                p_json['hint'] = operation.AESPSK
            param_list.append(p_json)
        return json({'status': 'success', 'c2profileparameters': param_list})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get c2 profile parameters'})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/parameters/<id:int>", methods=['PUT'])
@inject_user()
@protected()
async def edit_c2profile_parameters(request, info, user, id):
    data = request.json
    name = unquote_plus(info)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find the c2 profile'})
    try:
        query = await db_model.c2profileparameters_query()
        c2_profile_parameter = await db_objects.get(query, id=id)
        if 'name' in data:
            c2_profile_parameter.name = data['name']
        if 'key' in data:
            c2_profile_parameter.key = data['key']
        if 'hint' in data:
            c2_profile_parameter.hint = data['hint']
        await db_objects.update(c2_profile_parameter)
        return json({'status': 'success', **c2_profile_parameter.to_json()})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to update c2 profile parameters'})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/parameters", methods=['POST'])
@inject_user()
@protected()
async def create_c2profile_parameters(request, info, user):
    data = request.json
    name = unquote_plus(info)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find the c2 profile'})
    try:
        if 'name' not in data:
            return json({'status': 'error', 'error': '"name" is a required parameter'})
        if 'key' not in data:
            return json({'status': 'error', 'error': '"key" is a required parameter'})
        if 'hint' not in data:
            data['hint'] = ""
        c2_profile_param = await db_objects.create(C2ProfileParameters, c2_profile=profile, name=data['name'], key=data['key'], hint=data['hint'])
        return json({'status': 'success', **c2_profile_param.to_json()})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': str(e)})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/parameters/<id:int>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_c2profile_parameter(request, info, id, user):
    name = unquote_plus(info)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the c2 profile'})
    try:
        query = await db_model.c2profileparameters_query()
        parameter = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find the c2 profile parameter'})
    try:
        parameter_json = parameter.to_json()
        await db_objects.delete(parameter, recursive=True)
        return json({'status': 'success', **parameter_json})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': str(e)})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/create_instance/", methods=['POST'])
@inject_user()
@protected()
async def create_c2profile_instance_replace_values(request, user):
    data = request.json
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=data['c2_profile'], operation=operation)
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=data['ptype'])
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the c2 profile'})
    try:
        base_c2 = open('./app/c2_profiles/{}/{}/{}/{}{}'.format(operation.name, profile.name, payload_type.ptype,
                                                                profile.name, payload_type.file_extension))
    except Exception as e:
        return json({'status': 'error', 'error': str(e)})
    query = await db_model.c2profileparameters_query()
    params = await db_objects.execute(query.where(C2ProfileParameters.c2_profile == profile))
    c2_code = base_c2.read()
    base_c2.close()
    for p in params:
        c2_code = c2_code.replace(p.key, data[p.name])

    # now that we've replaced the parameters in the file contents, we need to write it out somewhere and register it
    path = "./app/files/{}/profile_instances/".format(operation.name)
    if not os.path.exists(path):
        os.mkdir(path)
    save_path = path + profile.name
    count = 1
    tmp_path = save_path +  str(payload_type.file_extension)
    while os.path.exists(tmp_path):
        tmp_path = save_path + str(count) + str(payload_type.file_extension)
        count += 1
    save_path = tmp_path

    profile_code = open(save_path, "w")
    profile_code.write(c2_code)
    profile_code.close()

    file_meta = await db_objects.create(FileMeta, total_chunks=1, chunks_received=1, complete=True, operation=operation,
                                        operator=operator, path=save_path)
    return json({'status': 'success', **file_meta.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/export/<info:string>", methods=['GET'])
@inject_user()
@protected()
async def export_c2_profile(request, user, info):
    try:
        info = unquote_plus(info)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=info, operation=operation)
    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to find profile'})
    c2_profile = {"name": profile.name, "description": profile.description}
    query = await db_model.c2profileparameters_query()
    params = await db_objects.execute(query.where(C2ProfileParameters.c2_profile == profile))
    params_list = []
    for p in params:
        params_list.append({"name": p.name, "key": p.key, "hint": p.hint})
    c2_profile['params'] = params_list
    path = "./app/c2_profiles/{}/{}/*".format(operation.name, profile.name)
    file_list = []
    for c2_file in glob.iglob(path, recursive=False):
        if os.path.isfile(c2_file):
            c2_profile_file = open(c2_file, 'rb')
            file_dict = {"name": c2_file.split("/")[-1], "data": base64.b64encode(c2_profile_file.read()).decode('utf-8')}
            file_list.append(file_dict)
            c2_profile_file.close()
    c2_profile['files'] = file_list
    return json(c2_profile)


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/import", methods=['POST'])
@inject_user()
@protected()
async def import_c2_profile(request, user):
    if request.files:
        try:
            data = js.loads(request.files['upload_file'][0].body)
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
    return json(await import_c2_profile_func(data, operation, operator))


async def import_c2_profile_func(data, operation, operator):
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=data['name'], operation=operation)
        profile.operator = operator
        profile.description = data['description']
        await db_objects.update(profile)
    except Exception as e:
        # this means the profile doesn't exit yet, so we need to create it
        profile = await db_objects.create(C2Profile, name=data['name'], operation=operation, operator=operator,
                                          description=data['description'])
    # now make sure the appropriate directories exist
    try:
        os.makedirs("./app/c2_profiles/{}/{}".format(operation.name, profile.name), exist_ok=True)
    except Exception as e:
        return {'status': 'error', 'error': 'failed to get or create profile: ' + str(e)}
    for param in data['params']:
        try:
            query = await db_model.c2profileparameters_query()
            c2_profile_param = await db_objects.get(query, name=param['name'], c2_profile=profile)
            c2_profile_param.key = param['key']
            c2_profile_param.hint = param['hint']
            await db_objects.update(c2_profile_param)
        except Exception as e:
            await db_objects.create(C2ProfileParameters, c2_profile=profile, name=param['name'], key=param['key'], hint=param['hint'])
    try:
        for c2_file in data['files']:
            c2_profile_file = open("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, c2_file['name']), 'wb')
            c2_profile_data = base64.b64decode(c2_file['data'])
            c2_profile_file.write(c2_profile_data)
            c2_profile_file.close()
    except Exception as e:
        return {'status': 'error', 'error': 'failed to write files: ' + str(e)}
    for ptype in data['payload_types']:
        try:
            query = await db_model.payloadtype_query()
            payload_type = await db_objects.get(query, ptype=ptype)
            await db_objects.get_or_create(PayloadTypeC2Profile, payload_type=payload_type, c2_profile=profile)
        except Exception as e:
            # payload type doesn't exist, so skip it and move on
            continue
    return {'status': 'success'}


# this is called when a new operation is created so we can staff it with the default c2 profiles as needed
async def register_default_profile_operation(operator, operation):
    try:
        file = open('./app/templates/default_c2_db_info.json', 'r')
        c2_data = js.load(file)  # this is a lot of data and might take a hot second to load
        for p in c2_data['profiles']:
            # be sure the profile is stopped if it was running before we reset it
            if p['name'] != "default":
                await stop_c2profile_func(p['name'], operation)
            print("Creating profile files for: " + p['name'])
            if os.path.exists("./app/c2_profiles/{}/{}".format(operation.name, p['name'])):
                shutil.rmtree("./app/c2_profiles/{}/{}".format(operation.name, p['name']))
            else:
                try:
                    os.makedirs("./app/c2_profiles/{}/".format(operation.name), exist_ok=True)
                except:
                    print("failed to make c2 directory")
            shutil.copytree("./app/default_files/c2_profiles/{}".format(p['name']),
                            "./app/c2_profiles/{}/{}".format(operation.name, p['name']))
            await import_c2_profile_func(p, operation, operator)
        return {'status': 'success'}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': str(e)}


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/reset", methods=['GET'])
@inject_user()
@protected()
async def import_c2_profile(request, user):
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
    except Exception as e:
        return json({'status': 'error', 'error': 'no current operation'})
    return json(await register_default_profile_operation(operator, operation))
