from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import C2Profile, Operator, PayloadTypeC2Profile, PayloadType, Operation, C2ProfileParameters, C2ProfileParametersInstance
from urllib.parse import unquote_plus
import subprocess
import asyncio
from sanic_jwt.decorators import protected, inject_user
import shutil
import os
import json as js
import base64
from app.routes.routes import create_default_c2_for_operation

# this information is only valid for a single run of the server
running_profiles = []  # will have dicts of process information


# Get all the currently registered profiles
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['GET'])
@inject_user()
@protected()
async def get_all_c2profiles(request, user):
    #  this syntax is atrocious for getting a pretty version of the results from a many-to-many join table)
    all_profiles = await db_objects.execute(C2Profile.select())
    profiles = await db_objects.execute(PayloadTypeC2Profile.select(PayloadTypeC2Profile, C2Profile, PayloadType).join(C2Profile).switch(PayloadTypeC2Profile).join(PayloadType))
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
            operation = await db_objects.get(Operation, name=user['current_operation'])
            all_profiles = await db_objects.execute(C2Profile.select().where(C2Profile.operation == operation))
            profiles = await db_objects.execute(
                PayloadTypeC2Profile.select(PayloadTypeC2Profile, C2Profile, PayloadType).join(C2Profile).switch(
                    PayloadTypeC2Profile).join(PayloadType))
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
        payload_type = await db_objects.get(PayloadType, ptype=ptype)
        profiles = await db_objects.execute(PayloadTypeC2Profile.select().where(PayloadTypeC2Profile.payload_type == payload_type))
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
        if await db_objects.count(PayloadType.select().where(PayloadType.ptype == t.strip())) != 1:
            return json({'status': 'error', 'error': t + ' is not a valid PayloadType.'})
    try:
        op = await db_objects.get(Operator, username=data['operator'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'operator could not be found'})
    try:
        if user['current_operation'] != "":
            operation = await db_objects.get(Operation, name=user['current_operation'])
            profile = await db_objects.create(C2Profile, name=data['name'], description=data['description'], operator=op,
                                              operation=operation)
            # make the right directory structure
            os.makedirs("./app/c2_profiles/{}/{}".format(operation.name, data['name']), exist_ok=True)
            # now create the payloadtypec2profile entries
            for t in data['payload_types']:
                try:
                    payload_type = await db_objects.get(PayloadType, ptype=t.strip())
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
                code = request.files['upload_file'][0].body.decode('UTF-8')
                code_file = open("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, request.files['upload_file'][0].name),"w")
                code_file.write(code)
                code_file.close()
                for i in range(1, int(request.form.get('file_length'))):
                    code = request.files['upload_file_' + str(i)][0].body.decode('UTF-8')
                    code_file = open(
                        "./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name,
                                                      request.files['upload_file_' + str(i)][0].name),"w")
                    code_file.write(code)
                    code_file.close()
            elif 'code' in data and 'file_name' in data:
                # if the user is doing this through the API instead of UI, they can specify a file this way
                code = base64.b64decode(data['code'])
                code_file = open("./app/c2_profiles/{}/{}/{}".format(operation.name, profile.name, data['file_name']), 'w')
                code_file.write(code)
                code_file.close()
            status = {'status': 'success'}
            return json({**status, **profile_json})
        else:
            return json({'status': 'error', 'error': 'must be part of an active operation'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'Profile name already taken'})


# this is called when a new operation is created so we can staff it with the default c2 profiles as needed
async def register_default_profile_operation(user_dict, operation_name):
    try:
        operator = await db_objects.get(Operator, username=user_dict['username'])
        operation = await db_objects.get(Operation, name=operation_name)
        #TODO make this dynamic instead of manual, but it won't change often
        payload_type = await db_objects.get(PayloadType, ptype="apfell-jxa")
        # now that we registered everything, copy the default code to the new operation directory
        # we will recursively copy all of the default c2 profiles over in case there's more than one in the future
        profiles = await create_default_c2_for_operation(operation, operator, [payload_type])
        for p in profiles:
            if os.path.exists("./app/c2_profiles/{}/{}".format(operation_name, p.name)):
                shutil.rmtree("./app/c2_profiles/{}/{}".format(operation_name, p.name))
            shutil.copytree("./app/c2_profiles/default/{}".format(p.name),
                            "./app/c2_profiles/{}/{}".format(operation_name, p.name))
        status = {'status': 'success'}
        return{**status}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': str(e)}


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
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=c2profile, operation=operation)
        registered_ptypes = await db_objects.execute(PayloadTypeC2Profile.select().where(PayloadTypeC2Profile.c2_profile == profile))
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
        if "code" in data and "file_name" in data:
            # get a base64 blob of the code and the filename to save it as in the right directory
            code = base64.b64decode(data['code'])
            code_file = open("./app/c2_profiles/{}/{}/{}/{}".format(operation.name, profile.name, data['payload_type'], data['file_name']), 'w')
            code_file.write(code)
            code_file.close()
        elif request.files:
            code = request.files['upload_file'][0].body.decode('UTF-8')
            code_file = open(
                "./app/c2_profiles/{}/{}/{}/{}".format(operation.name, profile.name, data['payload_type'],request.files['upload_file'][0].name),"w")
            code_file.write(code)
            code_file.close()
            for i in range(1, int(request.form.get('file_length'))):
                code = request.files['upload_file_' + str(i)][0].body.decode('UTF-8')
                code_file = open(
                    "./app/c2_profiles/{}/{}/{}/{}".format(operation.name, profile.name,data['payload_type'],
                                                        request.files['upload_file_' + str(i)][0].name), "w")
                code_file.write(code)
                code_file.close()
        return json({'status': 'success'})
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
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        if 'description' in data:
            profile.description = data['description']
        if 'payload_types' in data:
            # We need to update the mapping in PayloadTypeC2Profile accordingly
            # We need to see which ones were there before, and either add or delete accordingly
            mapping = await db_objects.execute(PayloadTypeC2Profile.select().where(PayloadTypeC2Profile.c2_profile == profile))
            # For each payload type, make sure it's real, and that it's in the mapping
            for m in mapping:
                map = await db_objects.get(PayloadType, id=m.payload_type)
                if map.ptype in data['payload_types']:
                    # something we say this c2 profile supports is already listed, so remove it from our list to process
                    del data['payload_types'][data['payload_types'].index(map.ptype)]  # remove it from the array
                    payload_types.append(map.ptype)
                else:
                    # it was in our mapping, now it's not, so remove it from the database mapping
                    await db_objects.delete(m)
            # if there's anyting left in data['payload_types'], it means we need to add it to the database
            for m in data['payload_types']:
                if await db_objects.count(PayloadType.select().where(PayloadType.ptype == m.strip())) != 1:
                    return json({'status': 'error',
                                 'error': m + ' is not a valid PayloadType. Perhaps you need to register it first?'})
                payload = await db_objects.get(PayloadType, ptype=m.strip())
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
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=name, operation=operation)
        if profile.operation.name not in user['operations']:
            return json({'status': 'error', 'error': 'must be part of the operation to start/stop the profile'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    null = open('/dev/null', 'w')
    try:
        # run profiles with just /bin/bash, so they should be set up appropriately
        path = os.path.abspath('./app/c2_profiles/{}/{}/{}_server'.format(operation.name, name, name))
        os.chmod(path, mode=0o777)
        p = subprocess.Popen(
            [path, '&'],
            cwd='./app/c2_profiles/{}/{}/'.format(operation.name, name),
            stdout=null,
            stderr=null,
            stdin=null
        )
        await asyncio.sleep(1)  # let the process start
        # if it was already in our dictionary of information, just remove it so we can add in the new data
        for x in running_profiles:
            if x['name'] == name:
                running_profiles.remove(x)
                break
        running_profiles.append({'name': name,
                                 'process': p,
                                 'status': 'running'})
        profile.running = True
        await db_objects.update(profile)
        return json({'status': 'success', **profile.to_json()})
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
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    #  if we had running profiles and they weren't stopped before shutdown, this should still be fine
    for x in running_profiles:
        if x['name'] == name:
            x['process'].terminate()
            x['status'] = 'stopped'
    profile.running = False
    await db_objects.update(profile)
    return json({'status': 'success', **profile.to_json()})


# Delete a profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_c2profile(request, info, user):
    try:
        info = unquote_plus(info)
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=info, operation=operation)
        parameters = await db_objects.execute(C2ProfileParameters.select().where(C2ProfileParameters.c2_profile == profile))
        ptypec2profile = await db_objects.execute(PayloadTypeC2Profile.select().where(PayloadTypeC2Profile.c2_profile == profile))
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
        shutil.rmtree("./app/c2_profiles/{}/{}".format(operation.name, info))
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
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find the c2 profile'})
    try:
        parameters = await db_objects.execute(C2ProfileParameters.select().where(C2ProfileParameters.c2_profile == profile))
        parameters_json = [p.to_json() for p in parameters]
        return json({'status': 'success', 'c2profileparameters': parameters_json})
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
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find the c2 profile'})
    try:
        c2_profile_parameter = await db_objects.get(C2ProfileParameters, id=id)
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
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=name, operation=operation)
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
        operation = await db_objects.get(Operation, name=user['current_operation'])
        profile = await db_objects.get(C2Profile, name=name, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the c2 profile'})
    try:
        parameter = await db_objects.get(C2ProfileParameters, id=id)
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
