from app import apfell, db_objects, keep_logs
from sanic.response import json, raw, text
from app.database_models.model import Callback, Task, LoadedCommands, PayloadCommand, Command
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
from math import ceil
import requests
import base64
from sanic.log import logger
import json as js
import app.crypto as crypt
from app.api.task_api import get_agent_tasks
from app.api.response_api import post_agent_response
from app.api.file_api import download_agent_file
from app.api.crypto_api import staging_rsa, staging_dh
import urllib.parse
from datetime import datetime
from dijkstar import Graph, find_path
from dijkstar.algorithm import NoPathError


@apfell.route(apfell.config['API_BASE'] + "/callbacks/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_callbacks(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if user['current_operation'] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.callback_query()
        callbacks = await db_objects.execute(query.where(Callback.operation == operation))
        return json([c.to_json() for c in callbacks])
    else:
        return json([])

# format of cached_keys:
#   {
#       "UUID": raw key
#   }
cached_keys = {}
@apfell.route(apfell.config['API_BASE'] + "/agent_message", methods=['GET', 'POST'])
async def get_agent_message(request):
    # get the raw data first
    if request.body != b'':
        data = request.body
        #print("Body: " + str(data))
    elif len(request.cookies) != 0:
        keys = request.cookies.items()
        data = request.cookies[keys[0]]
        #print("Cookies: " + str(data))
    elif len(request.query_args) != 0:
        data = urllib.parse.unquote(request.query_args[0][1])
        #print("Query: " + str(data))
    else:
        logger.exception("Failed to find data for an agent message")
        return raw(b'', 404)
    return text(await parse_agent_message(data, request), 200)


async def get_encryption_data(UUID):
    # this function tries to retrieve a cached key for a given UUID
    # if the key doesn't exist, it queries the database for the key to use if one exists
    if UUID not in cached_keys:
        # we need to look up the key to see if it exists
        try:
            # first check to see if it's some staging piece
            query = await db_model.staginginfo_query()
            staging_info = await db_objects.get(query, staging_uuid=UUID)
            cached_keys[UUID] = base64.b64decode(staging_info.session_key)
        except Exception as a:
            # if it's not a staging key, check if it's a payload uuid and get c2 profile AESPSK
            try:
                query = await db_model.payload_query()
                payload = await db_objects.get(query, uuid=UUID)
                # a payload may or may not have an AESPSK parameter/key
                try:
                    query = await db_model.c2profileparametersinstance_query()
                    c2_params = await db_objects.execute(query.where(db_model.C2ProfileParametersInstance.payload == payload))
                    for cp in c2_params:
                        # loop through all of the params associated with the payload and find one with a key "AESPSK"
                        if cp.c2_profile_parameters.key == "AESPSK":
                            if cp.value == "":
                                cached_keys[UUID] = None
                            else:
                                cached_keys[UUID] = base64.b64decode(cp.value)
                except Exception as d:
                    cached_keys[UUID] = None
                    pass
                if UUID not in cached_keys:
                    # if we get to this point, we found it as a payload that doesn't have an AESPSK parameter, so set it to nonne
                    cached_keys[UUID] = None
            except Exception as b:
                # finally check to see if it's agent checking in
                try:
                    query = await db_model.callback_query()
                    callback = await db_objects.get(query, agent_callback_id=UUID)
                    if callback.decryption_key is not None:
                        cached_keys[UUID] = base64.b64decode(callback.decryption_key)
                    else:
                        cached_keys[UUID] = None
                except Exception as c:
                    logger.exception("Failed to find UUID in staging, payload's with AESPSK c2 param, or callback")
                    raise c
        return cached_keys[UUID]
    else:
        return cached_keys[UUID]


# returns a base64 encoded response message
async def parse_agent_message(data, request):
    try:
        decoded = base64.b64decode(data)
        if keep_logs:
            print(decoded)
    except Exception as e:
        logger.exception("Failed to base64 decode the agent message")
        return ""
    try:
        UUID = decoded[:36].decode()  # first 36 characters are the UUID
        # print(UUID)
    except Exception as e:
        logger.exception("Failed to get a UUID in the first 36 bytes")
        return ""
    try:
        enc_key = await get_encryption_data(UUID)
    except Exception as e:
        return ""
    # now we have cached_keys[UUID] is the right AES key to use with this payload, now to decrypt
    try:
        # print(decoded[36:])
        # print(cached_keys[UUID])
        if enc_key is not None:
            decrypted = await crypt.decrypt_AES256(data=decoded[36:], key=enc_key)
            # print(decrypted)
            decrypted = js.loads(decrypted)
        else:
            decrypted = js.loads(decoded[36:])
        # print(decrypted)
    except Exception as e:
        logger.exception("Failed to decrypt message: " + str(e))
        return ""
    # now we have decrypted=rawJSON
    """
    JSON({
        "action": "", //staging-rsa, staging-dh, staging-psk, get_tasking ...
                    //  staging_info stored in db on what step in the process
        "...": ... // JSON data relating to the action
        "delegates":[
            {"UUID": base64(agentMessage from a forwarded agent)}
        ]
    })
    """
    try:
        if 'action' not in decrypted:
            logger.exception("Missing 'action' in parsed JSON")
            return b""
        # now to parse out what we're doing, everything is decrypted at this point
        # shuttle everything out to the appropriate api files for processing
        if keep_logs:
            print(decrypted)
        response_data = {}
        if decrypted['action'] == 'get_tasking':
            query = await db_model.callback_query()
            callback = await db_objects.get(query, agent_callback_id=UUID)
            response_data = await get_agent_tasks(decrypted, callback)
            delegates = await get_routable_messages(callback, callback.operation)
            if delegates is not None:
                response_data['delegates'] = delegates
        elif decrypted['action'] == 'post_response':
            response_data = await post_agent_response(decrypted)
        elif decrypted['action'] == 'upload':
            response_data = await download_agent_file(decrypted, UUID)
        elif decrypted['action'] == 'delegate':
            # this is an agent message that is just requesting or forwarding along delegate messages
            # this is common in server_routed traffic after the first hop in the mesh
            pass
        elif decrypted['action'] == 'checkin':
            if cached_keys[UUID] is not None:
                decrypted['encryption_key'] = base64.b64encode(enc_key).decode()
                decrypted['decryption_key'] = base64.b64encode(enc_key).decode()
                decrypted['encryption_type'] = "AES256"
            response_data = await create_callback_func(decrypted, request)
        elif decrypted['action'] == 'staging_rsa':
            response_data, staging_info = await staging_rsa(decrypted, UUID)
            if staging_info is not None:
                cached_keys[staging_info.staging_uuid] = base64.b64decode(staging_info.session_key)
            else:
                return ""
            # staging is it's own thing, so return here instead of following down
        elif decrypted['action'] == 'staging_dh':
            response_data, staging_info = await staging_dh(decrypted, UUID)
            if staging_info is not None:
                cached_keys[staging_info.staging_uuid] = base64.b64decode(staging_info.session_key)
            else:
                return ""
        elif decrypted['action'] == "update_info":
            response_data = await update_callback(decrypted, UUID)
        else:
            logger.exception("Unknown action:" + str(decrypted['action']))
            return ""
        # now that we have the right response data, format the response message
        if 'delegates' in decrypted and decrypted['delegates'] is not None and decrypted['delegates'] != "":
            if 'delegates' not in response_data:
                response_data['delegates'] = []
            for d in decrypted['delegates']:
                # handle messages for all of the delegates
                for d_uuid in d:
                    # process the delegate message recursively
                    del_message = await parse_agent_message(d[d_uuid], request)
                    # store the response to send back
                    response_data['delegates'].append({d_uuid: del_message})
        #   special encryption will be handled by the appropriate stager call
        # base64 ( UID + ENC(response_data) )
        if keep_logs:
            print(response_data)
        if enc_key is None:
            return base64.b64encode((UUID + js.dumps(response_data)).encode()).decode()
        else:
            enc_data = await crypt.encrypt_AES256(data=js.dumps(response_data).encode(), key=enc_key)
            return base64.b64encode(UUID.encode() + enc_data).decode()
    except Exception as e:
        logger.exception("Error parsing agent message: " + str(e))
        print(e)
        return ""


async def create_callback_func(data, request):
    if not data:
        return {'status': 'error', 'error': "Data is required for POST"}
    if 'user' not in data:
        return {'status': 'error', 'error': 'User required'}
    if 'host' not in data:
        return {'status': 'error', 'error': 'Host required'}
    if 'pid' not in data:
        return {'status': 'error', 'error': 'PID required'}
    if 'ip' not in data:
        return {'status': 'error', 'error': 'IP required'}
    if 'uuid' not in data:
        return {'status': 'error', 'error': 'uuid required'}
    # Get the corresponding Payload object based on the uuid
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=data['uuid'])
        pcallback = None
    except Exception as e:
        print(e)
        return {}
    if 'integrity_level' not in data:
        data['integrity_level'] = 2  # default medium integrity level
    if 'os' not in data:
        data['os'] = None
    if 'domain' not in data:
        data['domain'] = None
    if 'architecture' not in data:
        data['architecture'] = None
    if 'external_ip' not in data:
        if 'X-Forwarded-For' in request.headers:
            data['external_ip'] = request.headers['X-Forwarded-For'].split(",")[-1]
        else:
            data['external_ip'] = None
    try:
        cal = await db_objects.create(Callback, user=data['user'], host=data['host'], pid=data['pid'],
                                      ip=data['ip'], description=payload.tag, operator=payload.operator,
                                      registered_payload=payload, pcallback=pcallback, operation=payload.operation,
                                      integrity_level=data['integrity_level'], os=data['os'], domain=data['domain'],
                                      architecture=data['architecture'], external_ip=data['external_ip'])
        await db_objects.create(db_model.OperationEventLog, operator=payload.operator, operation=payload.operation,
                                message="Apfell: New Callback ({}) {}@{} with pid {}".format(cal.id, cal.user, cal.host, str(cal.pid)))
        if 'encryption_type' in data:
            cal.encryption_type = data['encryption_type']
        if 'decryption_key' in data:
            cal.decryption_key = data['decryption_key']
        if 'encryption_key' in data:
            cal.encryption_key = data['encryption_key']
        await db_objects.update(cal)
        query = await db_model.payloadcommand_query()
        payload_commands = await db_objects.execute(query.where(PayloadCommand.payload == payload))
        # now create a loaded command for each one since they are loaded by default
        for p in payload_commands:
            await db_objects.create(LoadedCommands, command=p.command, version=p.version, callback=cal,
                                    operator=payload.operator)
        # now create a callback2profile for each loaded c2 profile in the payload since it's there by default
        query = await db_model.payloadc2profiles_query()
        pc2profiles = await db_objects.execute(query.where(db_model.PayloadC2Profiles.payload == payload))
        for pc2p in pc2profiles:
            await db_objects.create(db_model.CallbackC2Profiles, callback=cal, c2_profile=pc2p.c2_profile)
            # now also save off a copy of the profile parameters
            query = await db_model.c2profileparametersinstance_query()
            instances = await db_objects.execute(query.where(
                (db_model.C2ProfileParametersInstance.payload == cal.registered_payload) &
                (db_model.C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
            ))
            for i in instances:
                await db_objects.create(db_model.C2ProfileParametersInstance, callback=cal,
                                        c2_profile_parameters=i.c2_profile_parameters, c2_profile=i.c2_profile,
                                        value=i.value, operation=cal.operation)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'Failed to create callback'}
    status = {'status': 'success'}
    if cal.operation.webhook and cal.registered_payload.callback_alert:
        # if we have a webhook, send a message about the new callback
        try:
            if cal.integrity_level >= 3:
                int_level = "high"
            elif cal.integrity_level == 2:
                int_level = "medium"
            else:
                int_level = "low"
            message = {"attachments": [ {
                "color": "#b366ff",
                "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "<!channel> You have a new Callback!"
                            }
                        },
                        {
                            "type": "divider"
                        },
                        {
                            "type": "section",
                            "fields": [
                                {
                                    "type": "mrkdwn",
                                    "text": "*Operation:*\n{}".format(cal.operation.name)
                                },
                                {
                                    "type": "mrkdwn",
                                    "text": "*IP:*\n{}".format(cal.ip)
                                },
                                {
                                    "type": "mrkdwn",
                                    "text": "*Callback ID:*\n{}".format(cal.id)
                                },
                                {
                                    "type": "mrkdwn",
                                    "text": "*Type:*\n{}".format(cal.registered_payload.payload_type.ptype)
                                },
                                {
                                    "type": "mrkdwn",
                                    "text": "*Description:*\n\"{}\"".format(cal.description)
                                },
                                {
                                    "type": "mrkdwn",
                                    "text": "*Operator:*\n{}".format(cal.operator.username)
                                },
                                {
                                    "type": "mrkdwn",
                                    "text": "*Integrity Level*\n{}".format(int_level)
                                }
                            ]
                        }
                        ] } ] }
            response = requests.post(cal.operation.webhook, json=message)
            if keep_logs:
                print("Slack webhook response: {}".format(str(response.content)))
        except Exception as e:
            logger.exception("Failed to send off webhook: " + str(e))
            print(str(e))
    return {**status, "id": cal.agent_callback_id, "action": "checkin"}


async def update_callback(data, UUID):
    # { INPUT
    #   "action": "update_info",
    #   ... info to update, same as checkin data
    # }
    # { RESPONSE
    #   "action":  "update_info",
    #   "status":  "success",
    #   "error": "error message" (optional)
    # }
    query = await db_model.callback_query()
    cal = await db_objects.get(query, agent_callback_id=UUID)
    try:
        if 'encryption_type' in data:
            cal.encryption_type = data['encryption_type']
        if 'encryption_key' in data:
            cal.encryption_key = data['encryption_key']
        if 'decryption_key' in data:
            cal.decryption_key = data['decryption_key']
        if 'user' in data:
            cal.user = data['user']
        if 'ip' in data:
            cal.ip = data['ip']
        if 'host' in data:
            cal.host = data['host']
        if 'external_ip' in data:
            cal.external_ip = data['external_ip']
        if 'integrity_level' in data:
            cal.integrity_level = data['integrity_level']
        if 'domain' in data:
            cal.domain = data['domain']
        await db_objects.update(cal)
        cached_keys[UUID] = base64.b64decode(cal.encryption_key)
        return {"action": "update_info", "status": "success"}
    except Exception as e:
        print(str(e))
        return {"action": "update_info", "status": "error", 'error': str(e)}


# https://pypi.org/project/Dijkstar/
current_graphs = {}
async def get_routable_messages(requester, operation):
    # are there any messages sitting in the database in the "submitted" stage that have routes from the requester
    # 1. get all CallbackGraphEdge entries that have an end_timestamp of Null (they're still active)
    # 2. feed into dijkstar and do shortest path
    # 3. for each element in the shortest path, see if there's any tasking stored
    # 4.   if there's tasking, wrap it up in a message:
    #        content is the same of that of a "get_tasking" reply with a a -1 request
    delegates = []
    if operation.name not in current_graphs:
        await update_graphs(operation)
    if current_graphs[operation.name].edge_count == 0:
        return None  # graph for this operation has no edges
    query = await db_model.task_query()
    submitted_tasks = await db_objects.execute(query.where(
        (db_model.Task.status == "submitted") & (db_model.Callback.operation == operation)
    ))
    # print(len(submitted_tasks))
    # this is a mapping of UUID to list of tasks that it'll get
    temp_callback_tasks = {}
    for t in submitted_tasks:
        # print(t.to_json())
        try:
            path = find_path(current_graphs[operation.name], requester, t.callback)
        except NoPathError:
            # print("No path from {} to {}".format(requester.id, t.callback.id))
            continue
        if len(path.nodes) > 1:
            # this means we have some sort of path longer than 1
            # make a tasking message for this
            # print(t.to_json())
            if path.nodes[-1].agent_callback_id in temp_callback_tasks:
                temp_callback_tasks[path.nodes[-1].agent_callback_id]['tasks'].append(t)
            else:
                temp_callback_tasks[path.nodes[-1].agent_callback_id] = {'tasks': [t], 'path': path.nodes[::-1]}
    # now actually construct the tasks
    for k, v in temp_callback_tasks.items():
        #print(k)
        #print(v)
        tasks = []
        for t in v['tasks']:
            t.status = "processing"
            t.status_timestamp_processing = datetime.utcnow()
            t.timestamp = t.status_timestamp_processing
            await db_objects.update(t)
            tasks.append({"command": t.command.cmd,
                          "parameters": t.params,
                          "id": t.agent_task_id,
                          "timestamp": t.timestamp.timestamp()})
        # now that we have all the tasks we're going to send, make the message
        message = {"action": "get_tasking", "tasks": tasks}
        # now wrap this message up like it's going to be sent out, first level is just normal
        enc_key = await get_encryption_data(v['path'][0].agent_callback_id)
        if enc_key is None:
            message = {v['path'][0].agent_callback_id: base64.b64encode((v['path'][0].agent_callback_id + js.dumps(message)).encode()).decode()}
        else:
            enc_data = await crypt.encrypt_AES256(data=js.dumps(message).encode(), key=enc_key)
            message = {v['path'][0].agent_callback_id: base64.b64encode(v['path'][0].agent_callback_id.encode() + enc_data).decode()}
        # for every other agent in the path though, their action is a delegate message
        # we don't need to do this wrapping for the last in the list since that's the egress node asking for tasking
        for cal in v['path'][1:-1]:
            message = {"action": "delegate", "delegates": [message]}
            enc_key = await get_encryption_data(cal.agent_callback_id)
            if enc_key is None:
                message = {cal.agent_callback_id: base64.b64encode((cal.agent_callback_id + js.dumps(message)).encode()).decode()}
            else:
                enc_data = await crypt.encrypt_AES256(data=js.dumps(message).encode(),
                                                      key=enc_key)
                message = {cal.agent_callback_id: base64.b64encode(cal.agent_callback_id.encode() + enc_data).decode()}
        delegates.append(message)
    #print(delegates)
    if len(delegates) == 0:
        return None
    else:
        return delegates


async def update_graphs(operation):
    try:
        query = await db_model.callbackgraphedge_query()
        available_edges = await db_objects.execute(query.where(
            (db_model.CallbackGraphEdge.operation == operation) & (db_model.CallbackGraphEdge.end_timestamp == None)
        ))
        if operation.name not in current_graphs:
            current_graphs[operation.name] = Graph()
        # dijkstra is directed, so if we have a bidirectional connection (type 3) account for that as well
        for e in available_edges:
            if e.direction == 1:
                current_graphs[operation.name].add_edge(e.source, e.destination, 1)
            elif e.direction == 2:
                current_graphs[operation.name].add_edge(e.destination, e.source, 1)
            else:
                current_graphs[operation.name].add_edge(e.source, e.destination, 1)
                current_graphs[operation.name].add_edge(e.destination, e.source, 1)
    except Exception as e:
        print(str(e))
        return


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_callback(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        if user['current_operation'] == "":
            return json({'status': 'error', 'error': "must be part of an operation"})
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=id, operation=operation)
        return_json = callback.to_json()
        query = await db_model.loadedcommands_query()
        loaded_commands = await db_objects.execute(query.where(LoadedCommands.callback == callback))
        return_json['loaded_commands'] = [{'command': lc.command.cmd, 'version': lc.version,
                                                               'apfell_version': lc.command.version} for lc in loaded_commands]
        query = await db_model.callbackc2profiles_query()
        callbackc2profiles = await db_objects.execute(query.where(db_model.CallbackC2Profiles.callback == callback))
        c2_profiles_info = {}
        for c2p in callbackc2profiles:
            query = await db_model.c2profileparametersinstance_query()
            c2_profile_params = await db_objects.execute(query.where(
                (db_model.C2ProfileParametersInstance.callback == callback) &
                (db_model.C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
            ))
            params = [p.to_json() for p in c2_profile_params]
            c2_profiles_info[c2p.c2_profile.name] = params
        return_json['c2_profiles'] = c2_profiles_info
        query = await db_model.transforminstance_query()
        create_transforms = await db_objects.execute(
            query.where(db_model.TransformInstance.payload == callback.registered_payload).order_by(db_model.TransformInstance.order))
        transforms = [t.to_json() for t in create_transforms]
        return_json['transforms'] = transforms
        return_json['payload_uuid'] = callback.registered_payload.uuid
        return_json['payload_name'] = callback.registered_payload.location.split("/")[-1]
        return_json['status'] = 'success'
        return json(return_json)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get callback: ' + str(e)}, 404)


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user', 'auth:apitoken_c2'], False)
async def update_callback(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.callback_query()
        cal = await db_objects.get(query, id=id, operation=operation)
        if 'description' in data:
            if data['description'] == 'reset':
                # set the description back to what it was from the payload
                cal.description = cal.registered_payload.tag
            else:
                cal.description = data['description']
        if 'active' in data:
            if data['active'] == 'true':
                cal.active = True
            elif data['active'] == 'false':
                cal.active = False
        if 'encryption_type' in data:
            cal.encryption_type = data['encryption_type']
        if 'encryption_key' in data:
            cal.encryption_key = data['encryption_key']
        if 'decryption_key' in data:
            cal.decryption_key = data['decryption_key']
        if 'locked' in data:
            if cal.locked and not data['locked']:
                # currently locked and trying to unlock, must be admin, admin of that operation, or the user that did it
                if user['admin'] or cal.operation.name in user['admin_operations'] or user['username'] == cal.locked_operator.username:
                    cal.locked = False
                    cal.locked_operator = None
                else:
                    await db_objects.update(cal)
                    return json({'status': 'error', 'error': 'Not authorized to unlock'})
            elif not cal.locked and data['locked']:
                # currently unlocked and wanting to lock it
                if user['admin'] or cal.operation.name in user['operations'] or cal.operation.name in user['admin_operations']:
                    cal.locked = True
                    query = await db_model.operator_query()
                    operator = await db_objects.get(query, username=user['username'])
                    cal.locked_operator = operator
                else:
                    await db_objects.update(cal)
                    return json({'status': 'error', 'error': 'Not authorized to lock'})
        if 'parent' in data:
            try:
                if data['parent'] == -1:
                    # this means to remove the current parent
                    cal.pcallback = None
                else:
                    query = await db_model.callback_query()
                    parent = await db_objects.get(query, id=data['parent'], operation=operation)
                    if parent.id == cal.id:
                        return json({'status': 'error', 'error': 'cannot set parent = child'})
                    cal.pcallback = parent
            except Exception as e:
                return json({'status': 'error', 'error': "failed to set parent callback: " + str(e)})
        await db_objects.update(cal)
        success = {'status': 'success'}
        updated_cal = cal.to_json()
        return json({**success, **updated_cal})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to update callback: ' + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_callback(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.callback_query()
        cal = await db_objects.get(query, id=id)
        if user['admin'] or cal.operation.name in user['operations']:
            cal.active = False
            await db_objects.update(cal)
            success = {'status': 'success'}
            deleted_cal = cal.to_json()
            return json({**success, **deleted_cal})
        else:
            return json({'status': 'error',
                         'error': 'must be an admin or part of that operation to mark it as no longer active'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': "failed to delete callback: " + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>/all_tasking", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def callbacks_get_all_tasking(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # Get all of the tasks and responses so far for the specified agent
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=id, operation=operation)
        cb_json = callback.to_json()
        cb_json['tasks'] = []
        query = await db_model.task_query()
        tasks = await db_objects.prefetch(query.where(Task.callback == callback).order_by(Task.id), Command.select())
        for t in tasks:
            cb_json['tasks'].append({**t.to_json()})
        return json({'status': 'success', **cb_json})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': str(e)})


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<id:int>/keys", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user', 'auth:apitoken_c2'], False)
async def get_callback_keys(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=id, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find callback'})
    encryption_type = callback.encryption_type if callback.encryption_type else ""
    decryption_key = callback.decryption_key if callback.decryption_key else ""
    encryption_key = callback.encryption_key if callback.encryption_key else ""
    return json({'status': 'success', 'encryption_type': encryption_type, 'decryption_key': decryption_key,
                 'encryption_key': encryption_key})


@apfell.route(apfell.config['API_BASE'] + "/callbacks/<page:int>/<size:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_pageinate_callbacks(request, user, page, size):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # get all of the artifact tasks for the current operation
    if page <= 0 or size <= 0:
        return json({'status': 'error', 'error': 'page or size must be greater than 0'})
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get current operation"})
    query = await db_model.callback_query()
    callbacks_query = query.where(Callback.operation == operation)
    count = await db_objects.count(callbacks_query)

    if page * size > count:
        page = ceil(count / size)
        if page == 0:
            page = 1
    cb = await db_objects.execute(callbacks_query.order_by(-Callback.id).paginate(page, size))
    return json(
        {'status': 'success', 'callbacks': [c.to_json() for c in cb], 'total_count': count, 'page': page, 'size': size})


# Get a single response
@apfell.route(apfell.config['API_BASE'] + "/callbacks/search", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def search_callbacks_with_pageinate(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        data = request.json
        if 'search' not in data:
            return json({'status': 'error', 'error': 'must supply a search term'})
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot find operation'})
    try:
        query = await db_model.callback_query()
        count = await db_objects.count(
            query.where((Callback.operation == operation) & (Callback.host.regexp(data['search']))))

        if 'page' not in data:
            cb = await db_objects.execute(
                query.where((Callback.operation == operation) & (Callback.host.regexp(data['search']))).order_by(
                    -Callback.id))
            data['page'] = 1
            data['size'] = count
        else:
            if 'page' not in data or 'size' not in data or int(data['size']) <= 0 or int(data['page']) <= 0:
                return json({'status': 'error', 'error': 'size and page must be supplied and be greater than 0'})
            data['size'] = int(data['size'])
            data['page'] = int(data['page'])
            if data['page'] * data['size'] > count:
                data['page'] = ceil(count / data['size'])
                if data['page'] == 0:
                    data['page'] = 1
            cb = await db_objects.execute(query.where(
                (Callback.operation == operation) & (Callback.host.regexp(data['search']))
            ).order_by(-Callback.id).paginate(data['page'], data['size']))
        return json(
            {'status': 'success', 'callbacks': [c.to_json() for c in cb], 'total_count': count, 'page': data['page'],
             'size': data['size']})
    except Exception as e:
        print(str(e))
        return json({"status": 'error', 'error': str(e)})


async def add_p2p_route(agent_message, callback, task):
    # { INPUT
    # "edges": [
    #    {
    #      "source": "uuid of callback",
    #      "destination": "uuid of adjoining callback",
    #      "direction": 1 or 2 or 3,
    #      "metadata": "{ optional metadata json string }",
    #       "action": "add" or "remove"
    #     }
    #   ]
    # }
    # { RESPONSE
    #   "status": "success" or "error"
    # }
    query = await db_model.callback_query()
    profile_query = await db_model.c2profile_query()
    # dijkstra is directed, so if we have a bidirectional connection (type 3) account for that as well
    for e in agent_message:
        if e['action'] == "add":
            try:
                profile = None
                source = await db_objects.get(query, agent_callback_id=e['source'])
                destination = await db_objects.get(query, agent_callback_id=e['destination'])
                if source.operation.name not in current_graphs:
                    current_graphs[source.operation.name] = Graph()
                if "c2_profile" in e and e['c2_profile'] is not None and e['c2_profile'] != "":
                    profile = await db_objects.get(profile_query, name=e['c2_profile'])
                else:
                    # find an overlapping p2p profile in both agents, else error
                    callback_c2profile_query = await db_model.callbackc2profiles_query()
                    mutual_c2 = await db_objects.execute(callback_c2profile_query.where(
                        ( (db_model.CallbackC2Profiles.callback == source) | (db_model.CallbackC2Profiles.callback == destination) )
                        & (db_model.C2Profile.is_p2p == True) ))
                    hist = []
                    for cc2 in mutual_c2:
                        if cc2.c2_profile.name not in hist:
                            hist.append(cc2.c2_profile.name)
                        else:
                            profile = cc2.c2_profile
                            break
                    if profile is None:
                        return {'status': 'error', 'error': "No matching p2p profiles", "task_id": task.agent_task_id}
                await db_objects.create(db_model.CallbackGraphEdge, source=source, destination=destination,
                                        direction=e['direction'], metadata=e['metadata'], operation=callback.operation,
                                        c2_profile=profile, task_start=task)
                if e['direction'] == 1:
                    current_graphs[source.operation.name].add_edge(source, destination, 1)
                elif e['direction'] == 2:
                    current_graphs[source.operation.name].add_edge(destination, source, 1)
                else:
                    current_graphs[source.operation.name].add_edge(source, destination, 1)
                    current_graphs[source.operation.name].add_edge(destination, source, 1)
            except Exception as d:
                print(d)
                return {'status': 'error', 'error': str(d), "task_id": task.agent_task_id}
        if e['action'] == "remove":
            try:
                # find the edge its talking about
                source = await db_objects.get(query, agent_callback_id=e['source'])
                destination = await db_objects.get(query, agent_callback_id=e['destination'])
                edge = await db_objects.get(db_model.CallbackGraphEdge, source=source, destination=destination,
                                            direction=e['direction'], metadata=e['metadata'], operation=callback.operation)
                edge.end_timestamp = datetime.utcnow()
                edge.task_end = task
                await db_objects.update(edge)
                if source.operation.name not in current_graphs:
                    current_graphs[source.operation.name] = Graph()
                try:
                    if edge.direction == 1:
                        current_graphs[source.operation.name].remove_edge(source, destination)
                    elif edge.direction == 2:
                        current_graphs[source.operation.name].remove_edge(destination, source)
                    else:
                        current_graphs[source.operation.name].remove_edge(source, destination)
                        current_graphs[source.operation.name].remove_edge(destination, source)
                except Exception as e:
                    print(str(e))
                    pass
            except Exception as d:
                print(d)
                return {'status': 'error', 'error': str(d), "task_id": task.agent_task_id}
    return {"status": "success", "task_id": task.agent_task_id}