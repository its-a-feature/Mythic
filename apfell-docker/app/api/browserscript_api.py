from app import apfell, db_objects
from sanic_jwt.decorators import inject_user, scoped
import app.database_models.model as db_model
from sanic.response import json
from sanic.exceptions import abort
import json as js
import base64


# -------  BROWSER SCRIPT FUNCTION -----------------
# scripts without a command tied to them are available as support functions
@apfell.route(apfell.config['API_BASE'] + "/browser_scripts", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_c2', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_browserscripts(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.browserscript_query()
        operator_scripts = await db_objects.execute(
            query.where((db_model.BrowserScript.operator == operator) & (db_model.BrowserScript.command != None)))
        operation_scripts = await db_objects.execute(
            query.where((db_model.BrowserScript.operation == operation) & (db_model.BrowserScript.command != None)))
        support_scripts = await db_objects.execute(query.where(db_model.BrowserScript.command == None))
        return json({"status": "success",
                     "operator_scripts": [o.to_json() for o in operator_scripts],
                     "operation_scripts": [o.to_json() for o in operation_scripts],
                     "support_scripts": [o.to_json() for o in support_scripts]})
    except Exception as e:
        print(str(e))
        return json({"status": "error", 'error': 'failed to find user or scripts'})


@apfell.route(apfell.config['API_BASE'] + "/browser_scripts", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_browserscript(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        data = request.json
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to parse json'})
    pieces = {}
    if 'script' not in data:
        return json({'status': 'error', 'error': 'must supply "script" '})
    if 'command' in data:
        try:
            query = await db_model.command_query()
            command = await db_objects.get(query, id=data['command'])
            pieces['command'] = command
        except Exception as e:
            return json({"status": 'error', 'error': 'failed to find command: ' + str(e)})
    query = await db_model.operator_query()
    operator = await db_objects.get(query, username=user['username'])
    pieces['operator'] = operator
    if 'name' in data:
        pieces['name'] = data['name']
        pieces['command'] = None
    if 'operation' in data and data['operation'] == user['current_operation']:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        pieces['operation'] = operation
    pieces['script'] = data['script']
    try:
        browserscript = await db_objects.create(db_model.BrowserScript, **pieces)
        return json({'status': 'success', **browserscript.to_json()})
    except Exception as e:
        print(str(e))
        return json({"status": "error", 'error': 'failed to find user or tokens'})


@apfell.route(apfell.config['API_BASE'] + "/browser_scripts/<bid:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def modify_browserscript(request, user, bid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        data = request.json
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to parse json'})
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.browserscript_query()
        try:
            browserscript = await db_objects.get(query, id=bid)  # you can only modify your own scripts
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to find script'})
        if browserscript.operator.username != operator.username:
            return json({'status': 'error', 'error': 'you can only modify your scripts'})
        if 'operation' in data:
            if data['operation'] in user['admin_operations'] or user['admin'] and data['operation'] != "":
                query = await db_model.operation_query()
                operation = await db_objects.get(query, name=data['operation'])
                browserscript.operation = operation
            elif browserscript.operation is not None and browserscript.operation.name in user['admin_operations'] and data['operation'] == "":
                browserscript.operation = None
            else:
                return json({'status': 'error', 'error': 'you must be the operation admin to apply scripts to the operation'})
        if 'active' in data:
            browserscript.active = data['active']
        if 'command' in data:
            if data['command'] == "":
                browserscript.command = None
            else:
                query = await db_model.command_query()
                command = await db_objects.get(query, id=data['command'])
                browserscript.command = command
        else:
            if "name" in data:
                browserscript.name = data['name']
                browserscript.command = None
        if 'script' in data:
            browserscript.script = data['script']
        await db_objects.update(browserscript)
        return json({'status': 'success', **browserscript.to_json()})
    except Exception as e:
        print(e)
        return json({"status": "error", 'error': 'failed to find or set information: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/browser_scripts/<bid:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_browserscript(request, user, bid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.browserscript_query()
        browserscript = await db_objects.get(query, id=bid, operator=operator)
        browserscript_json = browserscript.to_json()
        await db_objects.delete(browserscript)
        return json({'status': 'success', **browserscript_json})
    except Exception as e:
        print(str(e))
        return json({"status": "error", 'error': 'failed to find information: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/browser_scripts/import", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def import_browserscript(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # get json data
    try:
        if request.files:
            code = js.loads(request.files['upload_file'][0].body)
        else:
            input_data = request.json
            if "code" in input_data:
                code = js.loads(base64.b64decode(input_data["code"]))
            else:
                return json({'status': 'error', 'error': 'code must be supplied in base64 or via a form'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to parse json'})
    failed_imports = []
    for data in code:
        pieces = {}
        # script is base64 encoded
        if 'script' not in data:
            data['error'] = "script must be supplied in base64 format"
            failed_imports.append(data)
            continue
        if 'command' in data and 'payload_type' in data:
            try:
                query = await db_model.payloadtype_query()
                payload_type = await db_objects.get(query, ptype=data['payload_type'])
                query = await db_model.command_query()
                command = await db_objects.get(query, cmd=data['command'], payload_type=payload_type)
                pieces['command'] = command
            except Exception as e:
                data['error'] = str(e)
                failed_imports.append(data)
                continue
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        pieces['operator'] = operator
        if 'name' in data:
            try:
                query = await db_model.browserscript_query()
                script = await db_objects.get(query, name=data['name'])
                data['error'] = "script already exists with that name"
                failed_imports.append(data)
                continue
            except Exception as e:
                # we don't have it in the database yet, so we can make it
                pieces['name'] = data['name']
        pieces['script'] = data['script']
        try:
            browserscript = await db_objects.create(db_model.BrowserScript, **pieces)
        except Exception as e:
            data['error'] = "failed to add script to database: " + str(e)
            failed_imports.append(data)
            continue
    if len(failed_imports) == 0:
        return json({'status': 'success'})
    else:
        return json({'status': 'error', 'error': 'Some of the scripts were not successfully imported.', 'scripts': failed_imports})


@apfell.route(apfell.config['API_BASE'] + "/browser_scripts/export", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def export_browserscript(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    scripts = []
    query = await db_model.operator_query()
    operator = await db_objects.get(query, username=user['username'])
    query = await db_model.operation_query()
    operation = await db_objects.get(query, name=user['current_operation'])
    query = await db_model.browserscript_query()
    operator_scripts = await db_objects.execute(query.where( (db_model.BrowserScript.operator == operator) &
                                                             (db_model.BrowserScript.command != None)))
    operation_scripts = await db_objects.execute(query.where( (db_model.BrowserScript.operation == operation) &
                                                              (db_model.BrowserScript.command != None) &
                                                              (db_model.BrowserScript.operator != operator)))
    support_scripts = await db_objects.execute(query.where(db_model.BrowserScript.command == None))
    for s in operator_scripts:
        scripts.append({"operator": s.operator.username,
                        "script": s.script,
                        "command": s.command.cmd,
                        "payload_type": s.command.payload_type.ptype})
    for s in operation_scripts:
        scripts.append({"operator": s.operator.username,
                        "script": s.script,
                        "command": s.command.cmd,
                        "payload_type": s.command.payload_type.ptype})
    for s in support_scripts:
        scripts.append({"operator": s.operator.username,
                        "script": s.script,
                        "name": s.name})
    return json(scripts)
