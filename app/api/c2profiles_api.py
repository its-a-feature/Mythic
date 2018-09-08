from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import C2Profile, Operator, PayloadTypeC2Profile, PayloadType, Operation
from urllib.parse import unquote_plus
import subprocess
import sys
import asyncio
from sanic_jwt.decorators import protected, inject_user

# this information is only valid for a single run of the server
running_profiles = []  # will have dicts of process information


# Get all the currently registered profiles
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['GET'])
@inject_user()
@protected()
async def get_all_c2profiles(request, user):
    #  this syntax is atrocious for getting a pretty version of the results from a many-to-many join table
    print(user)
    all_profiles = await db_objects.execute(C2Profile.select())
    profiles = await db_objects.execute(PayloadTypeC2Profile.select(PayloadTypeC2Profile, C2Profile, PayloadType).join(C2Profile).switch(PayloadTypeC2Profile).join(PayloadType))
    results = []
    inter = {}
    for p in all_profiles:
        # only show profiles for operations the user is part of
        #   overall admins can see all operations
        if p.operation in user['operations'] or user['admin']:
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
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['GET'])
@inject_user()
@protected()
async def get_c2profiles_by_type(request, info, user):
    ptype = unquote_plus(info)
    try:
        profiles = await get_c2profiles_by_type_function(ptype, user)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get c2 profiles'})
    return json(profiles)


# this function will be useful by other files, so make it easier to use
async def get_c2profiles_by_type_function(ptype, user_dict):
    try:
        payload_type = await db_objects.get(PayloadType, ptype=ptype)
        profiles = await db_objects.execute(PayloadTypeC2Profile.select().where(PayloadTypeC2Profile.payload_type == payload_type))
    except Exception as e:
        print(e)
        raise Exception
    return [p.to_json() for p in profiles if p.c2_profile.operation in user_dict['operations'] or user_dict['admin']]


# Register a new profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['POST'])
@inject_user()
@protected()
async def register_new_c2profile(request, user):
    data = request.json
    #print(data)
    data['operator'] = user['username']
    if 'name' not in data or data['name'] is "":
        return json({'status': 'error', 'error': 'name is required'})
    if 'description' not in data:
        data['description'] = ""
    if 'payload_types' not in data:
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
        # TODO update this to incorporate information about a specific operation to tie this new profile to
        operation = await db_objects.get(Operation, name='default')
        profile = await db_objects.create(C2Profile, name=data['name'], description=data['description'], operator=op,
                                          operation=operation)
        # now create the payloadtypec2profile entries
        for t in data['payload_types']:
            payload_type = await db_objects.get(PayloadType, ptype=t.strip())
            await db_objects.create(PayloadTypeC2Profile, payload_type=payload_type, c2_profile=profile)
        profile_json = profile.to_json()
        status = {'status': 'success'}
        return json({**status, **profile_json})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'Profile name already taken'})


# Update a current profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['PUT'])
@inject_user()
@protected()
async def update_c2profile(request, info, user):
    name = unquote_plus(info)
    data = request.json
    payload_types = []
    try:
        # TODO make sure the user has appropriate access to the c2_profile by checking operations scopes
        profile = await db_objects.get(C2Profile, name=name)
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


# Start/stop running a profile's server side code
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/<command:string>", methods=['GET'])
@inject_user()
@protected()
async def start_stop_c2profile(request, info, command, user):
    name = unquote_plus(info)
    command = unquote_plus(command)
    if name == "default":
        return json({'status': 'error', 'error': 'cannot do start/stop on default c2 profiles'})
    try:
        profile = await db_objects.get(C2Profile, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    if command == 'stop':
        #  if we had running profiles and they weren't stopped before shutdown, this should still be fine
        for x in running_profiles:
            if x['name'] == name:
                x['process'].terminate()
                x['status'] = 'stopped'
        profile.running = False
        await db_objects.update(profile)
        return json({'status': 'success'})
    elif command == 'start':
        null = open('/dev/null', 'w')
        try:
            p = subprocess.Popen(
                [sys.executable, '\"./app/c2_profiles/' + name + "/" + name + "_server.py\""],
                cwd='\"./app/c2_profiles/' + name + "/\"",
                stdout=null,
                stderr=null
            )
            await asyncio.sleep(1)  # let the process start
            for x in running_profiles:
                if x['name'] == name:
                    running_profiles.remove(x)
                    break
            running_profiles.append({'name': name,
                                     'process': p,
                                     'status': 'running'})
            profile.running = True
            await db_objects.update(profile)
            return json({'status': 'success'})
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to start profile.'})
    else:
        return json({'status': 'error', 'error': 'command not known'})


# Delete a profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_c2profile(request, info, user):
    try:
        info = unquote_plus(info)
        profile = await db_objects.get(C2Profile, name=info)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 profile'})
    try:
        # we will do this recursively because there can't be payloadtypec2profile mappings if the profile doesn't exist
        await db_objects.delete(profile, recursive=True)
        success = {'status': 'success'}
        updated_json = profile.to_json()
        return json({**success, **updated_json})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to delete c2 profile'})