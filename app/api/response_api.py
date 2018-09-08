from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Task, Response
import base64
from sanic_jwt.decorators import protected, inject_user


# This gets all responses in the database
@apfell.route(apfell.config['API_BASE'] + "/responses/", methods=['GET'])
@inject_user()
@protected()
async def get_all_responses(request, user):
    try:
        all_responses = await db_objects.execute(Response.select())
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Cannot get responses'})
    return json([c.to_json() for c in all_responses])


# Get a single response
@apfell.route(apfell.config['API_BASE'] + "/response/<rid:int>", methods=['GET'])
@inject_user()
@protected()
async def get_one_response(request, user, rid):
    try:
        resp = await db_objects.get(Response, id=rid)
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot get that response'})
    return json(resp.to_json())


# implant calling back to update with base64 encoded response from executing a task
# We don't add @protected or @injected_user here because the callback needs to be able to post here for responses
@apfell.route(apfell.config['API_BASE'] + "/responses/<tid:int>", methods=['POST'])
async def update_task_for_callback(request, tid):
    data = request.json
    # print(data)
    # print(len(data['response']))
    decoded = base64.b64decode(data['response']).decode("utf-8")
    # print(decoded)
    try:
        task = await db_objects.get(Task, id=tid)
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Task does not exist'})
    try:
        if 'response' not in data:
            return json({'status': 'error', 'error': 'task response not in data'})
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
