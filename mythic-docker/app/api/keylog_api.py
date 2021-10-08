from app import mythic
import app
from sanic.response import json
from app.database_models.model import Task, Keylog
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
import asyncio
from app.api.siem_logger import log_to_siem
from app.api.operation_api import send_all_operations_message


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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        keylogs = await app.db_objects.execute(
            db_model.keylog_query.where(Keylog.operation == operation).order_by(Keylog.timestamp)
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
    for log in keylogs:
        if grouping == "host":
            group = log.task.callback.host
            if group not in output:
                output[group] = {}
            if log.user not in output[group]:
                output[group][log.user] = {}
            if log.window not in output[group][log.user]:
                output[group][log.user][log.window] = {"keylogs": []}
            callback = await app.db_objects.get(db_model.callback_query, id=log.task.callback)
            output[group][log.user][log.window]["keylogs"].append(
                {**log.to_json(), "callback": callback.to_json()}
            )
        elif grouping == "user":
            group = log.user
            callback = await app.db_objects.get(db_model.callback_query, id=log.task.callback)
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


@mythic.route(mythic.config["API_BASE"] + "/keylogs/callback/<kid:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_callback_keystrokes(request, user, kid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        callback = await app.db_objects.get(db_model.callback_query, id=kid, operation=operation)
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
        keylogs = await app.db_objects.execute(
            db_model.keylog_query.switch(Task)
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
        return json({"status": "success", "callback": kid, "keylogs": output})
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to select keylog information from database for that callback",
            }
        )


async def add_keylogs(parsed_responses: list, task):
    for parsed_response in parsed_responses:
        if (
                "window_title" not in parsed_response
                or parsed_response["window_title"] is None
                or parsed_response["window_title"] == ""
        ):
            parsed_response["window_title"] = "UNKNOWN"
        if (
                "user" not in parsed_response
                or parsed_response["user"] is None
                or parsed_response["user"] == ""
        ):
            parsed_response["user"] = "UNKNOWN"
        try:
            rsp = await app.db_objects.create(
                Keylog,
                task=task,
                window=parsed_response["window_title"],
                keystrokes=parsed_response["keystrokes"].encode("utf-8"),
                operation=task.callback.operation,
                user=parsed_response["user"],
            )
            asyncio.create_task(log_to_siem(mythic_object=rsp, mythic_source="keylog_new"))
        except Exception as e:
            await send_all_operations_message(message=f"Failed to add the following keystrokes to the operation:\n{parsed_response['keystrokes']}\nError: {str(e)}",
                                              level="warning", operation=task.callback.operation)