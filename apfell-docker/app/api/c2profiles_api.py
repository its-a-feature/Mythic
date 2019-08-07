from app import apfell, db_objects
from sanic.response import json, file
from app.database_models.model import C2Profile, PayloadTypeC2Profile, PayloadType, C2ProfileParameters, FileMeta, C2ProfileParametersInstance
from urllib.parse import unquote_plus
from sanic_jwt.decorators import scoped, inject_user
import shutil
import os
import json as js
import base64
import app.database_models.model as db_model
from app.api.rabbitmq_api import send_c2_rabbitmq_message
from sanic.exceptions import abort


# Get all the currently registered profiles
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_c2profiles(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    #  this syntax is atrocious for getting a pretty version of the results from a many-to-many join table)
    query = await db_model.c2profile_query()
    all_profiles = await db_objects.execute(query)
    query = await db_model.payloadtypec2profile_query()
    profiles = await db_objects.execute(query)
    results = []
    inter = {}
    for p in all_profiles:
        inter[p.name] = p.to_json()
        # create an empty array for ptypes that we'll populate in the next for loop
        inter[p.name]['ptype'] = []
    for p in profiles:
        if p.c2_profile.name in inter:
            inter[p.c2_profile.name]['ptype'].append(p.payload_type.ptype)
    for k in inter.keys():
        results.append(inter[k])
    return json(results)


# Get all currently registered profiles that support a given payload type
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/type/<info:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_c2profiles_by_type(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    ptype = unquote_plus(info)
    try:
        profiles = await get_c2profiles_by_type_function(ptype, user)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get c2 profiles'})
    return json({'status': 'success', 'profile': profiles})


# Get all currently registered profiles that support a given payload type
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/current_operation/type/<info:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_c2profiles_by_type_in_current_operation(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    ptype = unquote_plus(info)
    try:
        profiles = await get_c2profiles_by_type_function(ptype, user)
        return json({'status': 'success', 'profiles': profiles})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get c2 profiles'})


# this function will be useful by other files, so make it easier to use
async def get_c2profiles_by_type_function(ptype, user_dict):
    try:
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=ptype)
        query = await db_model.payloadtypec2profile_query()
        profiles = await db_objects.execute(query.where(PayloadTypeC2Profile.payload_type == payload_type))
    except Exception as e:
        print(e)
        raise Exception
    return [p.to_json() for p in profiles]


# Register a new profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def register_new_c2profile(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
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
        return json({'status': 'error', 'error': 'must select some payload types'})
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
        status = {'status': 'success'}
        profile = await db_objects.create(C2Profile, name=data['name'], description=data['description'], operator=op)
        # make the right directory structure
        os.makedirs("./app/c2_profiles/{}".format(data['name']), exist_ok=True)
        # now create the payloadtypec2profile entries
        for t in data['payload_types']:
            try:
                query = await db_model.payloadtype_query()
                payload_type = await db_objects.get(query, ptype=t.strip())
                await db_objects.create(PayloadTypeC2Profile, payload_type=payload_type, c2_profile=profile)
                os.makedirs("./app/c2_profiles/{}/{}".format(data['name'], payload_type.ptype), exist_ok=True)
            except Exception as e:
                print('failed to find payload type: ' + t)
                status['status'] = 'error'
                status['error'] = status['error'] + 'failed to find payload type: ' + t if 'error' in status else 'failed to find payload type: ' + t
                continue

        # now create the c2profileparameters entries so we can generate the right form to fill out
        if 'c2profileparameters' in data:
            for params in data['c2profileparameters']:
                if not 'hint' in params:
                    params['hint'] = ""
                await db_objects.create(C2ProfileParameters, c2_profile=profile, key=params['key'], name=params['name'], hint=params['hint'])
        profile_json = profile.to_json()
        return json({**status, **profile_json})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'Profile name already taken'})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/upload", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def upload_c2_profile_payload_type_code(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    c2profile = unquote_plus(info)
    # we either get a file from the browser or somebody uploads it via a base64 encoded "code" field
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=c2profile)
        query = await db_model.payloadtypec2profile_query()
        registered_ptypes = await db_objects.execute(query.where(PayloadTypeC2Profile.c2_profile == profile))
        ptypes = [p.payload_type.ptype for p in registered_ptypes]  # just get an array of all the names
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find profile or operation'})
    if "payload_type" not in data:
        return json({'status': 'error', 'error': 'must associate this code with a specific payload type'})
    if data['payload_type'] not in ptypes and data['payload_type'] != "":
        return json({'status': 'error', 'error': 'trying to upload code for a payload type not registered with this c2 profile'})
    try:
        if data['payload_type'] != "":
            if not os.path.exists("./app/c2_profiles/{}/{}".format(profile.name, data['payload_type'])):
                os.mkdir("./app/c2_profiles/{}/{}".format(profile.name, data['payload_type']))
        if "code" in data and "file_name" in data:
            # get a base64 blob of the code and the filename to save it as in the right directory
            code = base64.b64decode(data['code'])
            if data['payload_type'] == "":
                # looking to upload code to the container
                status = await send_c2_rabbitmq_message(profile.name, "writefile", js.dumps({"file_path": data['file_name'], "data": data['code']}))
            else:
                code_file = open("./app/c2_profiles/{}/{}/{}".format(profile.name, data['payload_type'], data['file_name']), 'wb')
                code_file.write(code)
                code_file.close()
        elif request.files:
            code = request.files['upload_file'][0].body
            if data['payload_type'] == "":
                status = await send_c2_rabbitmq_message(profile.name, "writefile", js.dumps(
                    {"file_path": request.files['upload_file'][0].name, "data": base64.b64encode(code).decode('utf-8')}))
            else:
                code_file = open(
                    "./app/c2_profiles/{}/{}/{}".format(profile.name, data['payload_type'], request.files['upload_file'][0].name), "wb")
                code_file.write(code)
                code_file.close()
            for i in range(1, int(request.form.get('file_length'))):
                code = request.files['upload_file_' + str(i)][0].body
                if data['payload_type'] == "":
                    status = await send_c2_rabbitmq_message(profile.name, "writefile", js.dumps(
                        {"file_path": request.files['upload_file_' + str(i)][0].name, "data": base64.b64encode(code).decode('utf-8')}))
                else:
                    code_file = open(
                        "./app/c2_profiles/{}/{}/{}".format(profile.name,data['payload_type'],
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_c2profile(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    data = request.json
    payload_types = []
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        if 'description' in data:
            profile.description = data['description']
        if 'container_running' in data:
            profile.container_running = data['container_running']
        await db_objects.update(profile)
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
                    # don't default remove files for now because people might just accidentally unselect a payload type
                    # TODO make this a configurable option to delete from disk
                    # shutil.rmtree("./app/c2_profiles/{}/{}".format(profile.name, map.ptype))
                    # it was in our mapping, now it's not, so remove it from the database mapping
                    await db_objects.delete(m)
            # if there's anything left in data['payload_types'], it means we need to add it to the database
            for m in data['payload_types']:
                query = await db_model.payloadtype_query()
                if await db_objects.count(query.where(PayloadType.ptype == m.strip())) != 1:
                    return json({'status': 'error',
                                 'error': m + ' is not a valid PayloadType. Perhaps you need to register it first?'})
                query = await db_model.payloadtype_query()
                payload = await db_objects.get(query, ptype=m.strip())
                if not os.path.exists("./app/c2_profiles/{}/{}".format(profile.name, payload.ptype)):
                    os.mkdir("./app/c2_profiles/{}/{}".format(profile.name, payload.ptype))
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def start_c2profile(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    if name == "default":
        return json({'status': 'error', 'error': 'cannot do start/stop on default c2 profiles'})
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    status = await send_c2_rabbitmq_message(profile.name, "start", "")
    return json(status)


# Start running a profile's server side code
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/stop", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def stop_c2profile(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    if name == "default":
        return json({'status': 'error', 'error': 'cannot do start/stop on default c2 profiles'})
    #  if we had running profiles and they weren't stopped before shutdown, this should still be fine
    return json(await stop_c2profile_func(name))


async def stop_c2profile_func(profile_name):
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=profile_name)
    except Exception as e:
        return {'status': 'error', 'error': 'failed to find c2 profile in database'}
    status = await send_c2_rabbitmq_message(profile_name, "stop", "")
    return json(status)


# Return the current input and output of the c2 profile for the user
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/status", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def status_c2profile(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    if name == "default":
        return json({'status': 'error', 'error': 'check main server logs for that info'})
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    # we want to send a rabbitmq message and wait for a response via websocket
    status = await send_c2_rabbitmq_message(profile.name, "status", "")
    return json(status)


# Get c2 profile files listing for the user
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/files", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_file_list_for_c2profiles(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        path = "./app/c2_profiles/{}/".format(profile.name)
        files = []
        for (dirpath, dirnames, filenames) in os.walk(path):
            if dirpath != path:
                files.append({"folder": dirpath, "dirnames": dirnames, "filenames": filenames})
        return json({'status': 'success', 'files': files})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed getting files: ' + str(e)})


# Get c2 profile files listing for the user
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/container_files", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_container_file_list_for_c2profiles(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        status = await send_c2_rabbitmq_message(profile.name, "listfiles", "")
        return json(status)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed getting files: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/files/delete", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_file_for_c2profiles(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        data = request.json
        path = os.path.abspath("./app/c2_profiles/{}/".format(profile.name))
        attempted_path = os.path.abspath(data['folder'] + "/" + data['file'])
        if path in attempted_path:
            os.remove(attempted_path)
            return json({'status': 'success', 'folder': data['folder'], 'file': data['file']})
        return json({'status': 'error', 'error': 'failed to find file'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed finding the file: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/files/container_delete", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_container_file_for_c2profiles(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        data = request.json
        status = await send_c2_rabbitmq_message(profile.name, "removefile", js.dumps(data))
        return json(status)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed finding the file: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/files/download", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def download_file_for_c2profiles(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        data = dict(folder=request.raw_args['folder'], file=request.raw_args['file'])
        path = os.path.abspath("./app/c2_profiles/{}/".format(profile.name))
        attempted_path = os.path.abspath(data['folder'] + "/" + data['file'])
        if path in attempted_path:
            return await file(attempted_path, filename=data['file'])
        return json({'status': 'success', 'folder': data['folder'], 'file': data['file']})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed finding the file: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/files/container_download", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def download_container_file_for_c2profiles(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        data = dict(folder=request.raw_args['folder'], file=request.raw_args['file'])
        status = await send_c2_rabbitmq_message(profile.name, "getfile", js.dumps(data))
        return json(status)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed finding the file: ' + str(e)})


# Delete a profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_c2profile(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        info = unquote_plus(info)
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=info)
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
            shutil.rmtree("./app/c2_profiles/{}".format(info))
        except:
            pass
        success = {'status': 'success'}
        updated_json = profile.to_json()
        return json({**success, **updated_json})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to delete c2 profile'})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/parameters/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_c2profile_parameters(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def edit_c2profile_parameters(request, info, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_c2profile_parameters(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_c2profile_parameter(request, info, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
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

# ---------- CREATE INSTANCE OF C2 PROFILE CODE ---------------
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/create_instance/", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_c2profile_instance_replace_values(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=data['c2_profile'])
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=data['ptype'])
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the c2 profile'})
    try:
        base_c2 = open('./app/c2_profiles/{}/{}/{}{}'.format(profile.name, payload_type.ptype,
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

# ------------- SAVE C2 PROFILE PARAMETER INSTANCES FUNCTIONS -------------------
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/parameter_instances/", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def save_c2profile_parameter_value_instance(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)  # name of the c2 profile
    data = request.json  # all of the name,value pairs instances we want to save
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the c2 profile'})
    if 'instance_name' not in data or data['instance_name'] == "":
        return json({'status': 'error', 'error': 'must supply an instance name for these values'})
    query = await db_model.c2profileparameters_query()
    params = await db_objects.execute(query.where(C2ProfileParameters.c2_profile == profile))
    created_params = []
    for p in params:
        try:
            created = await db_objects.create(C2ProfileParametersInstance, c2_profile_parameters=p,
                                              instance_name=data['instance_name'],
                                              value=data[p.name],
                                              operation=operation)
            created_params.append(created)
        except Exception as e:
            for c in created_params:
                await db_objects.delete(c)
            return json({'status': 'error', 'error': 'failed to create a parameter value: ' + str(e)})
    return json({'status': 'success'})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/parameter_instances/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_c2profile_parameter_value_instances(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the current operation'})
    query = await db_model.c2profileparametersinstance_query()
    params = await db_objects.execute(query.where(C2ProfileParametersInstance.operation == operation))
    instances = {}
    for p in params:
        if p.instance_name not in instances:
            instances[p.instance_name] = []
        instances[p.instance_name].append(p.to_json())
    return json({'status': 'success', 'instances': instances})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/parameter_instances/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_specific_c2profile_parameter_value_instances(request, info, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(info)  # name of the c2 profile
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the c2 profile'})
    query = await db_model.c2profileparametersinstance_query()
    params = await db_objects.execute(query.where(C2ProfileParametersInstance.operation == operation))
    instances = {}
    for p in params:
        if p.c2_profile_parameters.c2_profile.name == name:
            if p.instance_name not in instances:
                instances[p.instance_name] = []
            instances[p.instance_name].append(p.to_json())
    return json({'status': 'success', 'instances': instances})


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/parameter_instances/<instance_name:string>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_c2profile_parameter_value_instance(request, instance_name, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    name = unquote_plus(instance_name)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.c2profileparametersinstance_query()
        params = await db_objects.execute(query.where( (C2ProfileParametersInstance.instance_name ==name) &
                                                       (C2ProfileParametersInstance.operation == operation) &
                                                       (C2ProfileParametersInstance.payload == None)))
        for p in params:
            await db_objects.delete(p)
        return json({'status': 'success'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get the c2 profile'})


# ------------- EXPORT C2 PROFILE FUNCTION --------------------
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/export/<info:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def export_c2_profile(request, user, info):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        info = unquote_plus(info)
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=info)
    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to find profile'})
    c2_profile = {"name": profile.name, "description": profile.description}
    query = await db_model.c2profileparameters_query()
    params = await db_objects.execute(query.where(C2ProfileParameters.c2_profile == profile))
    params_list = []
    for p in params:
        params_list.append({"name": p.name, "key": p.key, "hint": p.hint})
    c2_profile['params'] = params_list
    c2_profile['payload_types'] = []
    query = await db_model.payloadtypec2profile_query()
    mappings = await db_objects.execute(query.where(PayloadTypeC2Profile.c2_profile == profile))
    for m in mappings:
        c2_profile['payload_types'].append(m.payload_type.ptype)
    return json(c2_profile)

# ----------- IMPORT C2 PROFILE FUNCTION ------------------------
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/import", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def import_c2_profile(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
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
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get operator information'})
    return json(await import_c2_profile_func(data, operator))


async def import_c2_profile_func(data, operator):
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=data['name'])
        profile.operator = operator
        profile.description = data['description']
        await db_objects.update(profile)
    except Exception as e:
        # this means the profile doesn't exit yet, so we need to create it
        profile = await db_objects.create(C2Profile, name=data['name'], operator=operator,
                                          description=data['description'])
        print("Created new c2 profile: {}".format(data['name']))
    # now make sure the appropriate directories exist
    try:
        os.makedirs("./app/c2_profiles/{}".format(profile.name), exist_ok=True)
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
        print("Associated new params for profile: {}-{}".format(param['name'], data['name']))
    for ptype in data['payload_types']:
        try:
            query = await db_model.payloadtype_query()
            payload_type = await db_objects.get(query, ptype=ptype)
            try:
                await db_objects.get(PayloadTypeC2Profile, payload_type=payload_type, c2_profile=profile)
            except Exception as e:
                await db_objects.create(PayloadTypeC2Profile, payload_type=payload_type, c2_profile=profile)
        except Exception as e:
            # payload type doesn't exist, so skip it and move on
            continue
        print("Associated new payload types for profile: {}-{}".format(ptype, data['name']))
    return {'status': 'success', **profile.to_json()}


# this is called when a new operation is created so we can staff it with the default c2 profiles as needed
async def register_default_profile_operation(operator):
    try:
        file = open('./app/templates/default_c2_db_info.json', 'r')
        c2_data = js.load(file)  # this is a lot of data and might take a hot second to load
        for p in c2_data['profiles']:
            print("Creating profile agent files for: " + p['name'])
            if os.path.exists("./app/c2_profiles/{}".format(p['name'])):
                shutil.rmtree("./app/c2_profiles/{}".format(p['name']))
            shutil.copytree("./app/default_files/c2_profiles/{}".format(p['name']),
                            "./app/c2_profiles/{}".format(p['name']))
            # remove all mapped c2 profile payload types
            query = await db_model.payloadtypec2profile_query()
            mappings = await db_objects.execute(query.switch(C2Profile).where(C2Profile.name == p['name']))
            for m in mappings:
                print("removing {}".format(m.payload_type.ptype))
                await db_objects.delete(m)
            await import_c2_profile_func(p, operator)
        return {'status': 'success'}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': str(e)}


@apfell.route(apfell.config['API_BASE'] + "/c2profiles/reset", methods=['GET'])
@inject_user()
@scoped('auth:user')
async def reset_c2_profile(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
    except Exception as e:
        return json({'status': 'error', 'error': 'no current operation'})
    return json(await register_default_profile_operation(operator))
