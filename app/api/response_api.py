from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Task, Response, Operation, Callback, Keylog
import base64
from sanic_jwt.decorators import protected, inject_user
from app.api.file_api import create_filemeta_in_database_func, download_file_to_disk_func
import json as js
import datetime


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
    data = request.json
    if 'response' not in data:
        return json({'status': 'error', 'error': 'task response not in data'})
    try:
        decoded = base64.b64decode(data['response'])
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to decode response'})
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
        json_response = js.loads(decoded)
        # check to see if we're dealing with a file trying to be sent back to the apfell server
        try:
            parsed_response = json_response
            if 'total_chunks' in parsed_response:
                # we're about to create a record in the db for a file that's about to be send our way
                rsp = await create_filemeta_in_database_func(parsed_response)
                if rsp['status'] == "success":
                    # update the response to indicate we've created the file meta data
                    rsp.pop('status', None)  # remove the status key from the dictionary
                    decoded = "Recieved meta data: \n" + js.dumps(rsp, sort_keys=True, indent=2, separators=(',', ': '))
                    resp = await db_objects.create(Response, task=task, response=decoded)
                    task.status = "processed"
                    await db_objects.update(task)
                    return json({'status': 'success', 'file_id': rsp['id']})
                else:
                    decoded = rsp['error']
            elif 'chunk_data' in parsed_response:
                rsp = await download_file_to_disk_func(parsed_response)
                if rsp['status'] == "error":
                    decoded = rsp['error']
                else:
                    # we successfully got a chunk and updated the FileMeta object, so just move along
                    return json({'status': 'success'})
            elif "status" in parsed_response:
                # this is just a message saying that the background task has started or stopped
                # we don't want to flood the operator view with useless "got keystroke" messages if we can avoid it
                decoded = parsed_response['status']
            elif task.ommand.cmd == 'keylog':
                if "window_title" not in parsed_response or parsed_response['window_title'] is None:
                    parsed_response['window_title'] = "UNKNOWN"
                if "keystrokes" not in parsed_response or parsed_response['keystrokes'] is None:
                    return json({'status': 'error', 'error': 'keylogging response has no keystrokes'})
                if "user" not in parsed_response or parsed_response['user'] is None:
                    parsed_response['user'] = "UNKONWN"
                await db_objects.create(Keylog, task=task, window=parsed_response['window_title'],
                                        keystrokes=parsed_response['keystrokes'], operation=callback.operation,
                                        user=parsed_response['user'])
                return json({'status': 'success'})
        except Exception as e:
            decoded = "Failed to process a JSON-based response with error: " + str(e)
    except Exception as e:
        #response is not json, so just process it as normal
        pass

    resp = await db_objects.create(Response, task=task, response=decoded)
    task.status = "processed"
    await db_objects.update(task)
    return json({'status': 'success'})
