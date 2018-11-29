from app import apfell
from sanic.response import json
import subprocess
import sys
import asyncio
from sanic_jwt.decorators import protected, inject_user

# this is temporary, it will be stored in the database soon
web_servers = []  # will have dicts of {handle, port, directory}


# ------------ HOST FILE ------------------------
@apfell.route(apfell.config['API_BASE'] + "/attacks/host_directory", methods=['GET'])
@inject_user()
@protected()
async def get_all_web_servers(request, user):
    return json(web_servers)


@apfell.route(apfell.config['API_BASE'] + "/attacks/host_directory", methods=['POST'])
@inject_user()
@protected()
async def create_new_host_directory(request, user):
    # expects to get port, directory
    data = request.json
    if 'port' not in data:
        return json({'status': 'error',
                     'error': '"port" field is required'})
    if 'directory' not in data:
        return json({'status': 'error',
                     'error': '"directory" field is required'})
    null = open('/dev/null', 'w')
    try:
        p = subprocess.Popen(
            [sys.executable, '-m', 'http.server', str(data['port'])],
            cwd=data['directory'],
            stdout=null,
            stderr=null
        )
        await asyncio.sleep(1)
        # if we already had one of these port/directory combos in there, delete it so we can add the updated one
        for x in web_servers:
            if x['port'] == data['port']:
                web_servers.remove(x)
        web_servers.append({'port': data['port'],
                            'directory': data['directory'],
                            'process': p,
                            'status': 'running',
                            'creator': user['username']})
        return json({'status': 'success'})
    except Exception as e:
        print(e)
        return json({'status': 'error',
                     'error': 'failed to open port for web server'})


@apfell.route(apfell.config['API_BASE'] + "/attacks/host_directory/<port:int>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_host_directory(request, port, user):
    for server in web_servers:
        if server['port'] == str(port):
            server['process'].terminate()
            server['status'] = 'stopped'
            return json({'status': 'success'})
    return json({'status': 'error',
                 'error': 'hosing provider not found'})
