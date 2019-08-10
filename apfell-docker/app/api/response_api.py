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
    return json({'status': 'success', 'output': [r.to_json() for r in responses], 'total_count': count, 'page': data['page'], 'size': data['size']})


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
        if callback.encryption_type != "" and callback.encryption_type is not None:
            if callback.encryption_type == "AES256":
                # now handle the decryption
                decrypted_message = await crypt.decrypt_AES256(data=base64.b64decode(request.body),
                                                               key=base64.b64decode(callback.decryption_key))
                data = js.loads(decrypted_message.decode('utf-8'))
        if data is None:
            data = request.json
    except Exception as e:
        print("Failed to get data properly: " + str(e))
        return json({'status': 'error', 'error': 'failed to get data'})
    if 'response' not in data:
        return json({'status': 'error', 'error': 'task response not in data'})
    try:
        decoded = base64.b64decode(data['response']).decode('utf-8')
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to decode response'})
    resp = None  # declare the variable now so we can tell if we already created a response later
    json_return_info = {'status': 'success'}
    final_output = decoded
    try:
        # print(decoded)
        json_response = js.loads(decoded)
        final_output = ""  # we're resetting it since we're going to be doing some processing on the response
        try:
            parsed_response = json_response
            if 'user_output' in parsed_response:
                final_output += parsed_response['user_output']
            if 'total_chunks' in parsed_response:
                # we're about to create a record in the db for a file that's about to be send our way
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
                        final_output += "Added artifact"
                        json_return_info = {"status": "success"}
                    except Exception as e:
                        final_output += "\nFailed to work with artifact: " + str(artifact) + " due to: " + str(e)
                        json_return_info = {**json_return_info, 'status': 'error', 'error': final_output}
            if 'credentials' in parsed_response:
                for cred in parsed_response['credentials']:
                    cred['task'] = task.id
                    new_cred_status = await create_credential_func(task.operator, callback.operation, cred)
                    if new_cred_status['status'] == "success":
                        final_output += "\nAdded credential for {}".format(cred['user'])
                    else:
                        final_output += "\nFailed to add credential for {}. {}".format(cred['user'], new_cred_status['error'])
                json_return_info = {**json_return_info, 'status': 'success'}
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
        else:
            # if we got here, we got JSON back, but without any keywords
            resp = await db_objects.create(Response, task=task, response=decoded)
        task.status = "processed"
        if task.status_timestamp_processed is not None and task.status_timestamp_processed != "null":
            task.status_timestamp_processed = datetime.datetime.utcnow()
        task.timestamp = datetime.datetime.utcnow()
        await db_objects.update(task)
    # handle the final reply back if it needs to be encrypted or not
    if callback.encryption_type != "" and callback.encryption_type is not None:
        # encrypt the message before returning it
        string_message = js.dumps(json_return_info)
        if callback.encryption_type == "AES256":
            raw_encrypted = await crypt.encrypt_AES256(data=string_message.encode(),
                                                       key=base64.b64decode(callback.encryption_key))
            return raw(base64.b64encode(raw_encrypted), status=200)

    return json(json_return_info)