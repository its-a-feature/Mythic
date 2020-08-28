from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import Task, Keylog
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort


# Get all keystrokes for an operation
@mythic.route(
    mythic.config["API_BASE"] + "/keylogs/current_operation", methods=["GET", "POST"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_operations_keystrokes(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.keylog_query()
        keylogs = await db_objects.execute(
            query.where(Keylog.operation == operation).order_by(Keylog.timestamp)
        )
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find current operation"})
    # default configuration values
    grouping = "host"
    output = {}
    # if you POST to this method, you can configure the grouping options
    if request.method == "POST":
        data = request.json
        if "grouping" in data and data["grouping"] is not None:
            grouping = data["grouping"]  # this can be by host or user
    # we will make our higher-level grouping by the log.task.callback.host that our keylogs came from
    query = await db_model.callback_query()
    for log in keylogs:
        if grouping == "host":
            group = log.task.callback.host
            if group not in output:
                output[group] = {}
            if log.user not in output[group]:
                output[group][log.user] = {}
            if log.window not in output[group][log.user]:
                output[group][log.user][log.window] = {"keylogs": []}
            callback = await db_objects.get(query, id=log.task.callback)
            output[group][log.user][log.window]["keylogs"].append(
                {**log.to_json(), "callback": callback.to_json()}
            )
        elif grouping == "user":
            group = log.user
            callback = await db_objects.get(query, id=log.task.callback)
            if group not in output:
                output[group] = {}
            if callback.host not in output[group]:
                output[group][callback.host] = {}
            if log.window not in output[group][callback.host]:
                output[group][callback.host][log.window] = {"keylogs": []}
            output[group][callback.host][log.window]["keylogs"].append(
                {**log.to_json(), "callback": callback.to_json()}
            )
        else:
            return json({"status": "error", "error": "grouping type not recognized"})
    return json({"status": "success", "grouping": grouping, "keylogs": output})


@mythic.route(mythic.config["API_BASE"] + "/keylogs/callback/<id:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_callback_keystrokes(request, user, id):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=id, operation=operation)
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to find that callback in your operation",
            }
        )
    try:
        output = {}
        query = await db_model.keylog_query()
        keylogs = await db_objects.execute(
            query.switch(Task)
            .where(Task.callback == callback)
            .switch(Keylog)
            .order_by(Keylog.timestamp)
        )
        for log in keylogs:
            log_json = log.to_json()
            # { "window_title": [ {log_obj}, {log_obj} ], "window2": [ {log_obj} ] } }
            if log.window not in output:
                output[log.window] = []
            output[log.window].append(log_json)
        return json({"status": "success", "callback": id, "keylogs": output})
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to select keylog information from database for that callback",
            }
        )
