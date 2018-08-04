from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Callback, Operator, Task, Response
from sanic import response
import datetime


# ---------- TASKS GET ---------------------------
# This gets all tasks in the database
@apfell.route("/api/v1.0/tasks/", methods=['GET'])
async def get_all_tasks(request):
    callbacks = Callback.select()
    operators = Operator.select()
    tasks = Task.select()
    # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
    full_task_data = await db_objects.prefetch(tasks, callbacks, operators)
    return json([c.to_json() for c in full_task_data])


@apfell.route("/api/v1.0/tasks/callback/<cid:int>", methods=['GET'])
async def get_all_tasks_for_callback(request, cid):
    try:
        callback = await db_objects.get(Callback, id=cid)
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Callback does not exist'})
    try:
        tasks = Task.select()
        cb_task_data = await db_objects.execute(Task.select().where(Task.callback == callback))
        return json([c.to_json() for c in cb_task_data])
    except Exception as e:
        return json({'status': 'error',
                     'error': 'No Tasks',
                     'msg': str(e)})


@apfell.route("/api/v1.0/tasks/callback/<cid:int>/nextTask", methods=['GET'])
async def get_next_task(request, cid):
    # gets the next task by time for the callback to do
    try:
        callback = await db_objects.get(Callback, id=cid)
    except Exception as e:
        return json({'status': 'error',
                     'error': 'callback does not exist'})
    try:
        callback.last_checkin = datetime.datetime.now()
        callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await db_objects.update(callback)  # update the last checkin time
        tasks = await db_objects.get(Task.select().join(Callback).where(
            (Task.callback == callback) & (Task.status == "submitted")).order_by(Task.timestamp))
    except Exception as e:
        print(e)
        return json({'command': 'none'})  # return empty if there are no tasks that meet the criteria
    tasks.status = "processing"
    await db_objects.update(tasks)
    return json({"command": tasks.command, "params": tasks.params, "id": tasks.id})


# ---------- TASKS POST -------------------------
# add an operator's task to a specific callback
@apfell.route("/api/v1.0/tasks/callback/<cid:int>/operator/<name:string>", methods=['POST'])
async def add_task_to_callback(request, cid, name):
    data = request.json
    print(data)
    return json(await add_task_to_callback_func(data, cid, name))


async def add_task_to_callback_func(data, cid, name):
    try:
        # first see if the operator and callback exists
        op = await db_objects.get(Operator, username=name)
        cb = await db_objects.get(Callback, id=cid)
        # now check the task and add it if it's valid
        # some tasks require a bit more processing, so we'll handle that here so it's easier for the implant
        task = await db_objects.create(Task, callback=cb, operator=op, command=data['command'], params=data['params'])
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'error': 'Failed to create task',  'msg': str(e)}

