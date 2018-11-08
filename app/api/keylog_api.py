from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Task, Operation, Callback, Keylog
import base64
from sanic_jwt.decorators import protected, inject_user


# Get all keystrokes for an operation
@apfell.route(apfell.config['API_BASE'] + "/keylogs/current_operation", methods=['GET', 'POST'])
@inject_user()
@protected()
async def get_operations_keystrokes(request, user):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        keylogs = await db_objects.execute(Keylog.select().where(Keylog.operation == operation))
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find current operation'})
    # default configuration values
    grouping = "host"
    sub_grouping = "window"
    output = {}
    # if you POST to this method, you can configure the grouping options
    if request.method == "POST":
        data = request.json
        if "grouping" in data and data['grouping'] is not None:
            grouping = data['grouping']  # this can be by host or user
        if "sub_grouping" in data and data['sub_grouping'] is not None:
            sub_grouping = data['sub_grouping']  # this can be by time or window title
    # we will make our higher-level grouping by the log.task.callback.host that our keylogs came from
    for log in keylogs:
        if grouping == "host":
            group = log.task.callback.host
        elif grouping == "user":
            group = log.user
        else:
            return json({'status': 'error', 'error': 'grouping type not recognized'})
        log_json = log.to_json()
        if group not in output:
            output[group] = {}
        if sub_grouping == "window":
            # {"group": { "window_title": [ {log_obj}, {log_obj} ], "window2": [ {log_obj} ] }, "group2"...}
            if log.window not in output[group]:
                output[group][log.window] = []
            output[group][log.window].append({**log_json, "callback": log.task.callback.to_json()})
        elif sub_grouping == "time":
            # {"group": {"t1": {log_obj}, "t2": {log_obj} }, "group2": { "t3": {log_obj} }}
            output[group][log_json['timestamp']] = {**log_json, "callback": log.task.callback.to_json()}
        else:
            return json({'status': 'error', 'error': 'subgrouping type not recognized'})
    return json({'status': 'success', 'grouping': grouping, 'sub_grouping': sub_grouping, "keylogs": output})


@apfell.route(apfell.config['API_BASE'] + "/keylogs/callback/<id:int>", methods=['GET'])
@inject_user()
@protected()
async def get_callback_keystrokes(request, user, id):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        callback = await db_objects.get(Callback, id=id, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that callback in your operation'})
    try:
        keylogs = await db_objects.execute(Keylog.select().join(Task).where(Task.callback == callback))
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to select keylog information from database for that callback'})
    return json({'status': 'success', 'callback': id, 'keylogs': [k.to_json() for k in keylogs]})
