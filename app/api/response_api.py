from app import apfell, db_objects
from sanic.response import json, raw
from app.database_models.model import Task, Response, Operation, Callback, Keylog, TaskArtifact, Artifact, ArtifactTemplate
import base64
from sanic_jwt.decorators import protected, inject_user
from app.api.file_api import create_filemeta_in_database_func, download_file_to_disk_func
import json as js
import datetime
import app.crypto as crypt


# This gets all responses in the database
@apfell.route(apfell.config['API_BASE'] + "/responses/", methods=['GET'])
@inject_user()
@protected()
async def get_all_responses(request, user):
    try:
        responses = []
        operation = await db_objects.get(Operation, name=user['current_operation'])
        callbacks = await db_objects.execute(Callback.select().where(Callback.operation == operation))
        for c in callbacks:
            tasks = await db_objects.execute(Task.select().where(Task.callback == c))
            for t in tasks:
                task_responses = await db_objects.execute(Response.select().where(Response.task == t))
                responses += [r.to_json() for r in task_responses]
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Cannot get responses'})
    return json(responses)


@apfell.route(apfell.config['API_BASE'] + "/responses/by_task/<id:int>", methods=['GET'])
@inject_user()
@protected()
async def get_all_responses_for_task(request, user, id):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        task = await db_objects.get(Task, id=id)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get operation or task'})
    responses = await db_objects.execute(Response.select().where(Response.task == task).order_by(Response.id))
    return json([r.to_json() for r in responses])


# Get a single response
@apfell.route(apfell.config['API_BASE'] + "/responses/<id:int>", methods=['GET'])
@inject_user()
@protected()
async def get_one_response(request, user, id):
    try:
        resp = await db_objects.get(Response, id=id)
        if resp.task.callback.operation.name == user['current_operation']:
            return json(resp.to_json())
        else:
            return json({'status': 'error', 'error': 'that task isn\'t in your current operation'})
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot get that response'})


# Get a single response
@apfell.route(apfell.config['API_BASE'] + "/responses/search", methods=['POST'])
@inject_user()
@protected()
async def search_responses(request, user):
    try:
        data = request.json
        if 'search' not in data:
            return json({'status': 'error', 'error': 'failed to find search term in request'})
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot get that response'})
    responses = await db_objects.execute(Response.select().where(Response.response.contains(data['search'])).join(Task).join(Callback).where(Callback.operation == operation).order_by(Response.id))
    return json({'status': 'success', 'output': [r.to_json() for r in responses]})


# implant calling back to update with base64 encoded response from executing a task
# We don't add @protected or @injected_user here because the callback needs to be able to post here for responses
@apfell.route(apfell.config['API_BASE'] + "/responses/<id:int>", methods=['POST'])
async def update_task_for_callback(request, id):
    data = None
    try:
        task = await db_objects.get(Task, id=id)
        callback = await db_objects.get(Callback, id=task.callback.id)
        # update the callback's last checkin time since it just posted a response
        callback.last_checkin = datetime.datetime.utcnow()
        callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await db_objects.update(callback)  # update the last checkin time
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Task does not exist or callback does not exist'})
    try:
        if callback.encryption_type != "null" and callback.encryption_type is not None:
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
                    final_output += "Recieved meta data: \n" + js.dumps(rsp, sort_keys=True, indent=2, separators=(',', ': '))
                    resp = await db_objects.create(Response, task=task, response=final_output)
                    task.status = "processed"
                    await db_objects.update(task)
                    json_return_info = {**json_return_info, 'file_id': rsp['id']}
                else:
                    final_output = rsp['error']
                    json_return_info = {**json_return_info, 'status': 'error'}
            if 'chunk_data' in parsed_response:
                if 'file_id' not in parsed_response and 'file_id' in json_return_info:
                    # allow agents to post the initial chunk data with initial metadata
                    parsed_response['file_id'] = json_return_info['file_id']
                rsp = await download_file_to_disk_func(parsed_response)
                if rsp['status'] == "error":
                    final_output += rsp['error']
                else:
                    # we successfully got a chunk and updated the FileMeta object, so just move along
                    json_return_info = {**json_return_info, 'status': 'success'}
            if "status" in parsed_response:
                # this is just a message saying that the background task has started or stopped
                # we don't want to flood the operator view with useless "got keystroke" messages if we can avoid it
                final_output += parsed_response['status']
                json_return_info = {**json_return_info, 'status': 'success'}
            if task.command.cmd == 'keylog':
                if "window_title" not in parsed_response or parsed_response['window_title'] is None:
                    parsed_response['window_title'] = "UNKNOWN"
                if "user" not in parsed_response or parsed_response['user'] is None:
                    parsed_response['user'] = "UNKONWN"
                if "keystrokes" not in parsed_response or parsed_response['keystrokes'] is None:
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
                        # each command can have 1 generic ArtifactTemplate auto added per Artifact type
                        base_artifact, created = await db_objects.get_or_create(Artifact, name=artifact['base_artifact'])
                        base_artifact_template, created = await db_objects.get_or_create(ArtifactTemplate,
                                                                                         command=task.command,
                                                                                         artifact=base_artifact,
                                                                                         artifact_string="*",
                                                                                         replace_string="*")

                        # you can report back multiple artifacts at once, no reason to make separate C2 requests
                        await db_objects.create(TaskArtifact, task=task, artifact_template=base_artifact_template,
                                                artifact_instance=str(artifact['artifact']))
                    except Exception as e:
                        final_output += "\nFailed to work with artifact: " + str(artifact) + " due to: " + str(e)
                        json_return_info = {**json_return_info, 'status': 'error', 'error': final_output}
        except Exception as e:
            final_output = "Failed to process a JSON-based response with error: " + str(e)
            json_return_info = {**json_return_info, 'status': 'error', 'error': str(e)}
    except Exception as e:
        #response is not json, so just process it as normal
        pass
    if resp is None and final_output is not "":
        resp = await db_objects.create(Response, task=task, response=final_output)
        task.status = "processed"
        await db_objects.update(task)
    # handle the final reply back if it needs to be encrypted or not
    if callback.encryption_type != "" and callback.encryption_type is not None:
        # encrypt the message before returning it
        string_message = js.dumps(json_return_info)
        if callback.encryption_type == "AES256":
            raw_encrypted = await crypt.encrypt_AES256(data=string_message.encode(),
                                                       key=base64.b64decode(callback.encryption_key))
            return raw(base64.b64encode(raw_encrypted), status=200)
    else:
        return json(json_return_info)