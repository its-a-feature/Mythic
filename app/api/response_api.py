from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Task, Response
import base64


# ---------- RESPONSE GET ---------------------------
# This gets all responses in the database
@apfell.route("/api/v1.0/responses/", methods=['GET'])
async def get_all_tasks(request):
    try:
        all_responses = await db_objects.execute(Response.select())
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Cannot get responses'})
    return json([c.to_json() for c in all_responses])


# implant calling back to update with response from executing a task
@apfell.route("/api/v1.0/responses/<tid:int>", methods=['POST'])
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
        print(str(len(data['response'])))
        resp = await db_objects.create(Response, task=task, response=decoded)
        task.status = "processed"
        await db_objects.update(task)
        return json({'status': 'success'})
    except Exception as e:
        print(e)
        return json({'status': 'error',
                     'error': 'Failed to update task',
                     'msg': str(e)})