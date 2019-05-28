from app import apfell
from sanic.response import json
import asyncio
from sanic_jwt.decorators import scoped, inject_user
from sanic.exceptions import abort

# this is temporary, it will be stored in the database soon
web_servers = []  # will have dicts of {handle, port, directory}


# ------------ HOST FILE ------------------------
@apfell.route(apfell.config['API_BASE'] + "/services/host_directory", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_web_servers(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    return json(web_servers)


@apfell.route(apfell.config['API_BASE'] + "/services/host_directory", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_new_host_directory(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # expects to get port, directory
    data = request.json
    if 'port' not in data:
        return json({'status': 'error',
                     'error': '"port" field is required'})
    if 'directory' not in data:
        return json({'status': 'error',
                     'error': '"directory" field is required'})
    try:
        p = await asyncio.create_subprocess_exec("python3", "-m", "http.server", str(data['port']),
                                                 stdout=asyncio.subprocess.PIPE,
                                                 stderr=asyncio.subprocess.PIPE,
                                                 cwd=data['directory'])
        output = ""
        try:
            for i in range(40):
                line = await asyncio.wait_for(p.stderr.readline(), 1)
                if line:
                    output += line.decode('utf-8')
        except asyncio.TimeoutError:
            pass
        await asyncio.sleep(1)
        if p.returncode is not None:
            # this means our process already exited, so something happened
            return json({'status': 'error', 'error': "Process failed to execute:\n" + output})
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
                     'error': 'failed to start webserver: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/services/host_directory/<port:int>/stop", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def stop_host_directory(request, port, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    for server in web_servers:
        if server['port'] == str(port):
            try:
                server['process'].terminate()
                server['status'] = 'stopped'
                return json({'status': 'success'})
            except Exception as e:
                return json({'status': 'error', 'error': 'failed to terminate process: ' + str(e)})
    return json({'status': 'error',
                 'error': 'hosing provider not found'})


@apfell.route(apfell.config['API_BASE'] + "/services/host_directory/<port:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_host_directory(request, port, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    for i in range(len(web_servers)):
        if web_servers[i]['port'] == str(port):
            try:
                web_servers[i]['process'].terminate()
            except Exception as e:
                pass
            web_servers.pop(i)  # remove that element from the web_servers list
            return json({'status': 'success'})
    return json({'status': 'error', 'error': 'hosing provider not found'})