from app import apfell, db_objects
from sanic.response import json, raw
from app.database_models.model import Task, Response, Callback, Keylog, TaskArtifact, Artifact, ArtifactTemplate, Command
import base64
from sanic_jwt.decorators import scoped, inject_user
from app.api.file_api import create_filemeta_in_database_func, download_file_to_disk_func
from app.api.credential_api import create_credential_func
import json as js
import datetime
import app.crypto as crypt
import app.database_models.model as db_model
import sys
from sanic.exceptions import abort
from math import ceil
from app.api.crypto_api import decrypt_agent_message, encrypt_agent_message


# This gets all responses in the database
@apfell.route(apfell.config['API_BASE'] + "/responses/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_responses(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        responses = []
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.callback_query()
        callbacks = await db_objects.execute(query.where(Callback.operation == operation))
        for c in callbacks:
            query = await db_model.task_query()
            tasks = await db_objects.prefetch(query.where(Task.callback == c), Command.select())
            for t in tasks:
                query = await db_model.response_query()
                task_responses = await db_objects.execute(query.where(Response.task == t))
                responses += [r.to_json() for r in task_responses]
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Cannot get responses: ' + str(e)})
    return json(responses)


@apfell.route(apfell.config['API_BASE'] + "/responses/by_task/<id:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_responses_for_task(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.task_query()
        task = await db_objects.get(query, id=id)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get operation or task'})
    query = await db_model.response_query()
    responses = await db_objects.execute(query.where(Response.task == task).order_by(Response.id))
    return json([r.to_json() for r in responses])


# Get a single response
@apfell.route(apfell.config['API_BASE'] + "/responses/<id:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_response(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.response_query()
        resp = await db_objects.get(query, id=id)
        query = await db_model.callback_query()
        cb = await db_objects.get(query.where(Callback.id == resp.task.callback))
        if cb.operation.name == user['current_operation']:
            return json(resp.to_json())
        else:
            return json({'status': 'error', 'error': 'that task isn\'t in your current operation'})
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot get that response'})


# Get a single response
@apfell.route(apfell.config['API_BASE'] + "/responses/search", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def search_responses(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        data = request.json
        if 'search' not in data:
            return json({'status': 'error', 'error': 'failed to find search term in request'})
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot get that response'})
    try:
        query = await db_model.response_query()
        count = await db_objects.count(query.where(Response.response.regexp(data['search'])).switch(Task).where(Callback.operation == operation))
        if 'page' not in data:
            # allow a blanket search to still be performed
            responses = await db_objects.execute(query.where(Response.response.regexp(data['search'])).switch(Task).where(Callback.operation == operation).order_by(Response.id))
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
            responses = await db_objects.execute(
                query.where(
                    Response.response.regexp(data['search'])).switch(Task).where(
                    Callback.operation == operation).order_by(Response.id).paginate(data['page'], data['size'])
            )
        output = []
        for r in responses:
            output.append({**r.to_json(), 'host': r.task.callback.host})
        return json({'status': 'success', 'output': output, 'total_count': count, 'page': data['page'], 'size': data['size']})
    except Exception as e:
        return json({'status': 'error', 'error': 'bad regex syntax'})


# implant calling back to update with base64 encoded response from executing a task
# We don't add @protected or @injected_user here because the callback needs to be able to post here for responses
@apfell.route(apfell.config['API_BASE'] + "/responses/<id:string>", methods=['POST'])
async def update_task_for_callback(request, id):
    data = None
    try:
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.agent_task_id == id), Command.select())
        task = list(task)[0]
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=task.callback.id)
        # update the callback's last checkin time since it just posted a response
        callback.last_checkin = datetime.datetime.utcnow()
        callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await db_objects.update(callback)  # update the last checkin time
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Task does not exist or callback does not exist'})
    try:
        data = await decrypt_agent_message(request, callback)
        if data is None:
            return abort(404)
    except Exception as e:
        print("Failed to get data properly: " + str(e))
        return abort(404)
    if 'response' not in data:
        enc = await encrypt_agent_message(js.dumps({'status': 'error', 'error': 'task response not in data'}), callback)
        if enc is None:
            return abort(404)
        else:
            return raw(enc, status=200)
    try:
        decoded = base64.b64decode(data['response']).decode('utf-8')
    except Exception as e:
        print("Failed to decode response properly: {}".format(str(e)))
        enc = await encrypt_agent_message(js.dumps({'status': 'error', 'error': 'failed to decode response'}), callback)
        if enc is None:
            return abort(404)
        else:
            return raw(enc, status=200)
    resp = None  # declare the variable now so we can tell if we already created a response later
    json_return_info = {'status': 'success'}
    final_output = decoded
    json_response = None
    parsed_response = None
    try:
        # print(decoded)
        if task.command.is_process_list:
            # save this data off as a process list object in addition to doing whatever normally
            # this might be chunked, so see if one already exists for this task and just add to it, or create a new one
            json_list = js.loads(decoded)
            if 'user_output' in json_list:
                actual_list = json_list['user_output']
            else:
                actual_list = decoded
            try:
                query = await db_model.processlist_query()
                pl = await db_objects.get(query, task=task)
                pl.process_list += actual_list
                pl.timestamp = datetime.datetime.utcnow()
                await db_objects.update(pl)
            except Exception as e:
                await db_objects.create(db_model.ProcessList, task=task, host=callback.host, process_list=actual_list, operation=callback.operation)
        elif task.command.is_file_browse:
            json_browse = js.loads(decoded)
            if 'user_output' in json_browse:
                actual_browse = json_browse['user_output']
            else:
                actual_browse = decoded
            try:
                query = await db_model.filebrowse_query()
                fb = await db_objects.get(query, task=task)
                fb.file_browse += actual_browse
                fb.timestamp = datetime.datetime.utcnow()
                await db_objects.update(fb)
            except Exception as e:
                await db_objects.create(db_model.FileBrowse, task=task, file_browse=actual_browse, operation=callback.operation)
        json_response = js.loads(decoded)
        final_output = ""  # we're resetting it since we're going to be doing some processing on the response
        try:
            parsed_response = json_response
            if 'completed' in parsed_response and parsed_response['completed']:
                task.completed = True
                del parsed_response['completed']
            if 'user_output' in parsed_response:
                final_output += str(parsed_response['user_output'])
                del parsed_response['user_output']
            if 'total_chunks' in parsed_response:
                # we're about to create a record in the db for a file that's about to be send our way
                parsed_response['task'] = task.id
                rsp = await create_filemeta_in_database_func(parsed_response)
                if rsp['status'] == "success":
                    # update the response to indicate we've created the file meta data
                    rsp.pop('status', None)  # remove the status key from the dictionary
                    final_output += js.dumps(rsp, sort_keys=True, indent=2, separators=(',', ': '))
                    resp = await db_objects.create(Response, task=task, response=final_output)
                    task.status = "processed"
                    if "full_path" in json_response:
                        task.params = json_response['full_path']
                    task.timestamp = datetime.datetime.utcnow()
                    await db_objects.update(task)
                    json_return_info = {**json_return_info, 'file_id': rsp['agent_file_id']}
                else:
                    final_output = rsp['error']
                    json_return_info = {**json_return_info, 'status': 'error'}
                del parsed_response['total_chunks']
                if 'full_path' in parsed_response:
                    del parsed_response['full_path']
            if 'chunk_data' in parsed_response:
                if 'file_id' not in parsed_response and 'file_id' in json_return_info:
                    # allow agents to post the initial chunk data with initial metadata
                    parsed_response['file_id'] = json_return_info['file_id']
                resp = await download_file_to_disk_func(parsed_response)
                if resp['status'] == "error":
                    final_output += resp['error']
                else:
                    # we successfully got a chunk and updated the FileMeta object, so just move along
                    json_return_info = {**json_return_info, 'status': 'success'}
                del parsed_response['chunk_num']
                del parsed_response['file_id']
                del parsed_response['chunk_data']
            if "window_title" in parsed_response and "user" in parsed_response and "keystrokes" in parsed_response:
                if parsed_response['window_title'] is None or parsed_response['window_title'] == "":
                    parsed_response['window_title'] = "UNKNOWN"
                if parsed_response['user'] is None or parsed_response['user'] == "":
                    parsed_response['user'] = "UNKNOWN"
                if parsed_response['keystrokes'] is None or parsed_response['keystrokes'] == "":
                    json_return_info = {'status': 'error', 'error': 'keylogging response has no keystrokes'}
                else:
                    resp = await db_objects.create(Keylog, task=task, window=parsed_response['window_title'],
                                                   keystrokes=parsed_response['keystrokes'], operation=callback.operation,
                                                   user=parsed_response['user'])
                    json_return_info = {**json_return_info, 'status': 'success'}
                del parsed_response['window_title']
                del parsed_response['user']
                del parsed_response['keystrokes']
            if 'artifacts' in parsed_response:
                # now handle the case where the agent is reporting back artifact information
                for artifact in parsed_response['artifacts']:
                    try:
                        try:
                            query = await db_model.artifact_query()
                            base_artifact = await db_objects.get(query, name=artifact['base_artifact'])
                        except Exception as e:
                            base_artifact = await db_objects.create(Artifact, name=artifact['base_artifact'])
                        # you can report back multiple artifacts at once, no reason to make separate C2 requests
                        await db_objects.create(TaskArtifact, task=task, artifact_instance=str(artifact['artifact']),
                                                artifact=base_artifact)
                        final_output += "\nAdded artifact {}".format(str(artifact['artifact']))
                        json_return_info = {"status": "success"}
                    except Exception as e:
                        final_output += "\nFailed to work with artifact: " + str(artifact) + " due to: " + str(e)
                        json_return_info = {**json_return_info, 'status': 'error', 'error': final_output}
                del parsed_response['artifacts']
            if 'credentials' in parsed_response:
                for cred in parsed_response['credentials']:
                    cred['task'] = task.id
                    new_cred_status = await create_credential_func(task.operator, callback.operation, cred)
                    if new_cred_status['status'] == "success":
                        final_output += "\nAdded credential for {}".format(cred['user'])
                    else:
                        final_output += "\nFailed to add credential for {}. {}".format(cred['user'], new_cred_status['error'])
                json_return_info = {**json_return_info, 'status': 'success'}
                del parsed_response['credentials']
            if 'status' in parsed_response:
                if parsed_response['status'] == 'error':
                    task.status = "error"
                del parsed_response['status']
        except Exception as e:
            print(sys.exc_info()[-1].tb_lineno)
            final_output += "Failed to process a JSON-based response with error: " + str(e) + " on " + str(sys.exc_info()[-1].tb_lineno) + "\nOriginal Output:\n"
            final_output += decoded
            json_return_info = {**json_return_info, 'status': 'error', 'error': str(e)}
    except Exception as e:
        #response is not json, so just process it as normal
        pass
    if resp is None:
        # we need to check for the case where the decoded response is JSON, but doesn't conform to any of our keywords
        if final_output != "":
            # if we got here, then we did some sort of meta processing
            resp = await db_objects.create(Response, task=task, response=final_output)
        elif json_response is None:
            # if we got here, we failed to parse the response as JSON
            resp = await db_objects.create(Response, task=task, response=decoded)
        elif parsed_response != {}:
            # if we got here, then we got a json response, took out the key word stuff, and still had some json left
            resp = await db_objects.create(Response, task=task, response=js.dumps(parsed_response, sort_keys=True, indent=4))
        if task.status != "error":
            task.status = "processed"
    if task.status_timestamp_processed is None:
        task.status_timestamp_processed = datetime.datetime.utcnow()
    task.timestamp = datetime.datetime.utcnow()
    await db_objects.update(task)
    enc = await encrypt_agent_message(js.dumps(json_return_info), callback)
    if enc is None:
        return abort(404)
    else:
        return raw(enc, status=200)
