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
    decoded = base64.b64decode(data['response'])#.decode("utf-8")
    try:
        task = await db_objects.get(Task, id=id)
        callback = await db_objects.get(Callback, id=task.callback.id)
        # update the callback's last checkin time since it just posted a response
        callback.last_checkin = datetime.datetime.utcnow()
        callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await db_objects.update(callback)  # update the last checkin time
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Task does not exist'})
    try:
        # the process is a little bit different if we're going to save things to disk, like a file or a screenshot instead of saving it into the database
        if task.command.cmd == "download" or task.command.cmd == "screencapture":
            try:
                download_response = js.loads(decoded)
                # print(download_response)
                if 'total_chunks' in download_response:
                    # print("creating file")
                    rsp = await create_filemeta_in_database_func(download_response)
                    if rsp['status'] == "success":
                        # update the response to indicate we've created the file meta data
                        rsp.pop('status', None)  # remove the status key from the dictionary
                        decoded = "Recieved meta data: " + js.dumps(rsp)
                        resp = await db_objects.create(Response, task=task, response=decoded)
                        task.status = "processed"
                        await db_objects.update(task)
                        status = {'status': 'success'}
                        resp_json = resp.to_json()
                        return json({**status, **resp_json, 'file_id': rsp['id']}, status=201)
                    else:
                        decoded = rsp['error']
                elif 'chunk_data' in download_response:
                    # print("storing chunk: " + str(download_response['chunk_num']))
                    #print(download_response)
                    rsp = await download_file_to_disk_func(download_response)
                    if rsp['status'] == "error":
                        decoded = rsp['error']
                    else:
                        # we successfully got a chunk and updated the FileMeta object, so just move along
                        return json({'status': 'success'})
            except Exception as e:
                print("error when trying to handle a download/screencapture command: " + str(e))
                pass
        elif task.command.cmd == "keylog":
            try:
                keylog_response = js.loads(decoded)  # keylogging has a special dictionary of data it passes back
                if "status" in keylog_response:
                    # this is just a message saying that the background task has started or stopped
                    # we don't want to flood the operator view with useless "got keystroke" messages if we can avoid it
                    decoded = keylog_response['status']
                else:
                    if "window_title" not in keylog_response or keylog_response['window_title'] is None:
                        keylog_response['window_title'] = "UNKNOWN"
                    if "keystrokes" not in keylog_response or keylog_response['keystrokes'] is None:
                        return json({'status': 'error', 'error': 'keylogging response has no keystrokes'})
                    if "user" not in keylog_response or keylog_response['user'] is None:
                        keylog_response['user'] = "UNKONWN"
                    await db_objects.create(Keylog, task=task, window=keylog_response['window_title'],
                                            keystrokes=keylog_response['keystrokes'], operation=callback.operation,
                                            user=keylog_response['user'])
                    return json({'status': 'success'})

            except Exception as e:
                print("error when handling a keylog response: " + str(e))
                pass

        resp = await db_objects.create(Response, task=task, response=decoded)
        task.status = "processed"
        await db_objects.update(task)
        status = {'status': 'success'}
        resp_json = resp.to_json()
        return json({**status, **resp_json}, status=201)
    except Exception as e:
        print(e)
        return json({'status': 'error',
                     'error': 'Failed to update task',
                     'msg': str(e)})
