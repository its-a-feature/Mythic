from app import apfell
from sanic.response import json
import subprocess
import sys
from time import sleep

# this is temporary, it will be stored in the database soon
web_servers = []  # will have dicts of {handle, port, directory}


# ------------ HOST FILE ------------------------
@apfell.route("/api/v1.0/attacks/host_file", methods=['GET'])
async def get_all_web_servers(request):
    return json(web_servers)


@apfell.route("/api/v1.0/attacks/host_file", methods=['POST'])
async def create_new_host_file(request):
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
        # if we try to open the same port twice, this will fail
        p = subprocess.Popen(
            [sys.executable, '-m', 'http.server', str(data['port'])],
            cwd=data['directory'],
            stdout=null,
            stderr=null
        )
        sleep(1)
        # if we already had one of these port/directory combos in there, delete it so we can add the updated one
        for x in web_servers:
            if x['port'] == data['port'] and x['directory'] == data['directory']:
                web_servers.remove(x)
        web_servers.append({'port': data['port'],
                            'directory': data['directory'],
                            'process': p,
                            'status': 'running',
                            'encryption': False})
        return json({'status': 'success'})
    except Exception as e:
        print(e)
        return json({'status': 'error',
                     'error': 'failed to open port for web server'})


@apfell.route("/api/v1.0/attacks/host_file/<port:int>", methods=['DELETE'])
async def delete_host_file(request, port):
    for server in web_servers:
        if server['port'] == str(port):
            server['process'].terminate()
            server['status'] = 'stopped'
            return json({'status': 'success'})
    return json({'status': 'error',
                 'error': 'hosing provider not found'})
