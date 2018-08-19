from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import C2Profile, Operator
from urllib.parse import unquote_plus
import subprocess
import sys
import asyncio

# this information is only valid for a single run of the server
running_profiles = []  # will have dicts of process information

# Get all the currently registered profiles
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['GET'])
async def get_all_c2profiles(request):
    profiles = await db_objects.execute(C2Profile.select())
    return json([p.to_json() for p in profiles])


# Get all currently registered profiles that support a given payload type
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['GET'])
async def get_c2profiles_by_type(request, info):
    ptype = unquote_plus(info)
    try:
        profiles = await get_c2profiles_by_type_function(ptype)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get c2 profiles'})
    return json(profiles)


# this function will be useful by other files, so make it easier to use
async def get_c2profiles_by_type_function(ptype):
    try:
        profiles = await db_objects.execute(C2Profile.select())
    except Exception as e:
        print(e)
        raise Exception
    return [p.to_json() for p in profiles if ptype in p.payload_types]


# Register a new profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/", methods=['POST'])
async def register_new_c2profile(request):
    data = request.json
    if 'name' not in data or data['name'] is "":
        return json({'status':'error', 'error':'name is required'})
    if 'description' not in data:
        data['description'] = ""
    if 'operator' not in data:
        return json({'status': 'error', 'error': 'operator that created this profile is required'})
    if 'payload_types' not in data:
        return json({'status': 'error', 'error': 'payload_types is required information'})
    try:
        op = await db_objects.get(Operator, username=data['operator'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'operator could not be found'})
    try:
        profile = await db_objects.create(C2Profile, name=data['name'], description=data['description'], operator=op, payload_types=str(data['payload_types']))
        return json({'status': 'success'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'Profile name already taken'})


# Update a current profile
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>", methods=['PUT'])
async def update_c2profile(request, info):
    name = unquote_plus(info)
    data = request.json
    try:
        profile = await db_objects.get(C2Profile, name=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 Profile'})
    try:
        if 'description' in data:
            profile.description = data['description']
        if 'payload_types' in data:
            profile.payload_types = str(data['payload_types'])
        await db_objects.update(profile)
        success = {'status': 'success'}
        updated_json = profile.to_json()
        return json({**success, **updated_json})  # this merges the two dictionaries together
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to update C2 Profile'})


# Start/stop running a profile's server side code
@apfell.route(apfell.config['API_BASE'] + "/c2profiles/<info:string>/<command:string>", methods=['GET'])
async def start_stop_c2profile(request, info, command):
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
async def delete_c2profile(request, info):
    try:
        info = unquote_plus(info)
        profile = await db_objects.get(C2Profile, name=info)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find C2 profile'})
    try:
        await db_objects.delete(profile)
        success = {'status': 'success'}
        updated_json = profile.to_json()
        return json({**success, **updated_json})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to delete c2 profile'})