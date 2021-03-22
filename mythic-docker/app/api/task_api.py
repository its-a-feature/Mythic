from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import (
    Callback,
    Task,
    FileMeta,
    Response,
    ATTACKCommand,
    ATTACKTask,
    TaskArtifact,
    Command,
    C2ProfileParametersInstance,
)
from datetime import datetime, timedelta
from sanic_jwt.decorators import scoped, inject_user
import ujson as js
import sys
import os
import base64
import app.database_models.model as db_model
from app.api.rabbitmq_api import send_pt_rabbitmq_message
from sanic.exceptions import abort
from math import ceil
from sanic.log import logger
from app.api.siem_logger import log_to_siem
import asyncio


# This gets all tasks in the database
@mythic.route(mythic.config["API_BASE"] + "/tasks/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_tasks(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    query = await db_model.task_query()
    full_task_data = await db_objects.prefetch(query, Command.select())
    if user["admin"]:
        # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
        return json([c.to_json() for c in full_task_data])
    elif user["current_operation"] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        return json(
            [c.to_json() for c in full_task_data if c.callback.operation == operation]
        )
    else:
        return json(
            {
                "status": "error",
                "error": "must be admin to see all tasks or part of a current operation",
            }
        )


# Get a single response
@mythic.route(mythic.config["API_BASE"] + "/tasks/search", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def search_tasks(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
        if "search" not in data:
            return json(
                {"status": "error", "error": "failed to find search term in request"}
            )
        if "type" not in data:
            data["type"] = "cmds"
        if "export" not in data:
            data["export"] = False
        if "operator" in data:
            query = await db_model.operator_query()
            operator = await db_objects.get(query, username=data["operator"])
            data["operator"] = operator
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json(
            {"status": "error", "error": "Cannot get that operation or operator"}
        )
    try:
        query = await db_model.task_query()
        if data["type"] == "params":
            if "operator" in data:
                count = await db_objects.count(
                    query.where(
                        (
                            (Task.params.regexp(data["search"]))
                            | (Task.original_params.regexp(data["search"]))
                        )
                        & (Task.operator == data["operator"])
                    )
                    .switch(Callback)
                    .where(Callback.operation == operation)
                    .distinct()
                )
            else:
                count = await db_objects.count(
                    query.where(
                        (Task.params.regexp(data["search"]))
                        | (Task.original_params.regexp(data["search"]))
                    )
                    .switch(Callback)
                    .where(Callback.operation == operation)
                    .distinct()
                )
        elif data["type"] == "cmds":
            if "operator" in data:
                count = await db_objects.count(
                    query.where(Command.cmd.regexp(data["search"]))
                    .switch(Callback)
                    .where(Callback.operation == operation)
                    .switch(Task)
                    .where(Task.operator == data["operator"])
                    .distinct()
                )
            else:
                count = await db_objects.count(
                    query.where(Command.cmd.regexp(data["search"]))
                    .switch(Callback)
                    .where(Callback.operation == operation)
                )
        else:
            if "operator" in data:
                count = await db_objects.count(
                    query.where(
                        (Task.comment.regexp(data["search"])) & (Task.comment != "")
                    )
                    .switch(Callback)
                    .where(Callback.operation == operation)
                    .switch(Task)
                    .where(Task.comment_operator == data["operator"])
                    .distinct()
                )
            else:
                count = await db_objects.count(
                    query.where(
                        (Task.comment.regexp(data["search"])) & (Task.comment != "")
                    )
                    .switch(Callback)
                    .where(Callback.operation == operation)
                    .distinct()
                )
        if "page" not in data:
            data["page"] = 1
            data["size"] = count
            if data["type"] == "params":
                if "operator" in data:
                    tasks = await db_objects.prefetch(
                        query.where(
                            (
                                (Task.params.regexp(data["search"]))
                                | (Task.original_params.regexp(data["search"]))
                            )
                            & (Task.operator == data["operator"])
                        )
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
                else:
                    tasks = await db_objects.prefetch(
                        query.where(
                            (Task.params.regexp(data["search"]))
                            | (Task.original_params.regexp(data["search"]))
                        )
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
            elif data["type"] == "cmds":
                if "operator" in data:
                    tasks = await db_objects.prefetch(
                        query.switch(Command)
                        .where(Command.cmd.regexp(data["search"]))
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .switch(Task)
                        .where(Task.operator == data["operator"])
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
                else:
                    tasks = await db_objects.prefetch(
                        query.switch(Command)
                        .where(Command.cmd.regexp(data["search"]))
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
            else:
                if "operator" in data:
                    tasks = await db_objects.prefetch(
                        query.where(
                            (Task.comment.regexp(data["search"])) & (Task.comment != "")
                        )
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .switch(Task)
                        .where(Task.comment_operator == data["operator"])
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
                else:
                    tasks = await db_objects.prefetch(
                        query.where(
                            (Task.comment.regexp(data["search"])) & (Task.comment != "")
                        )
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
        else:
            if (
                "page" not in data
                or "size" not in data
                or int(data["size"]) <= 0
                or int(data["page"]) <= 0
            ):
                return json(
                    {
                        "status": "error",
                        "error": "size and page must be supplied and be greater than 0",
                    }
                )
            data["size"] = int(data["size"])
            data["page"] = int(data["page"])
            if data["page"] * data["size"] > count:
                data["page"] = ceil(count / data["size"])
                if data["page"] == 0:
                    data["page"] = 1
            if data["type"] == "params":
                if "operator" in data:
                    tasks = await db_objects.prefetch(
                        query.where(
                            (
                                (Task.params.regexp(data["search"]))
                                | (Task.original_params.regexp(data["search"]))
                            )
                            & (Task.operator == data["operator"])
                        )
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
                else:
                    tasks = await db_objects.prefetch(
                        query.where(
                            (Task.params.regexp(data["search"]))
                            | (Task.original_params.regexp(data["search"]))
                        )
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
            elif data["type"] == "cmds":
                if "operator" in data:
                    tasks = await db_objects.prefetch(
                        query.switch(Command)
                        .where(Command.cmd.regexp(data["search"]))
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .switch(Task)
                        .where(Task.operator == data["operator"])
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
                else:
                    tasks = await db_objects.prefetch(
                        query.switch(Command)
                        .where(Command.cmd.regexp(data["search"]))
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
            else:
                if "operator" in data:
                    tasks = await db_objects.prefetch(
                        query.where(
                            (Task.comment.regexp(data["search"])) & (Task.comment != "")
                        )
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .switch(Task)
                        .where(Task.comment_operator == data["operator"])
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
                else:
                    tasks = await db_objects.prefetch(
                        query.where(
                            (Task.comment.regexp(data["search"])) & (Task.comment != "")
                        )
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
        output = []
        for t in tasks:
            output.append({**t.to_json(), "responses": []})
        return json(
            {
                "status": "success",
                "output": output,
                "total_count": count,
                "page": data["page"],
                "size": data["size"],
            }
        )
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "Bad regex"})


@mythic.route(mythic.config["API_BASE"] + "/tasks/callback/<cid:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_tasks_for_callback(request, cid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=cid)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=callback.operation)
    except Exception as e:
        return json({"status": "error", "error": "Callback does not exist"})
    if operation.name in user["operations"]:
        try:
            query = await db_model.task_query()
            cb_task_data = await db_objects.prefetch(
                query.where(Task.callback == callback).order_by(Task.id),
                Command.select(),
            )
            return json([c.to_json() for c in cb_task_data])
        except Exception as e:
            return json({"status": "error", "error": "No Tasks", "msg": str(e)})
    else:
        return json(
            {
                "status": "error",
                "error": "You must be part of the right operation to see this information",
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/tasks/stdoutstderr/<tid:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_stdout_stderr_for_task(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation_query = await db_model.operation_query()
        cur_op = await db_objects.get(operation_query, name=user["current_operation"])
        query = await db_model.task_query()
        task = await db_objects.get(query, id=tid)
        if task.callback.operation != cur_op:
            return json({"status": "error", "error": "not part of the right operation"})
    except Exception as e:
        return json({"status": "error", "error": "task does not exist"})
    return json({"status": "success", "stdout": task.stdout, "stderr": task.stderr})


@mythic.route(mythic.config["API_BASE"] + "/task_report_by_callback")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_tasks_by_callback_in_current_operation(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "Not part of an operation"})
    output = []
    query = await db_model.callback_query()
    callbacks = await db_objects.execute(
        query.where(Callback.operation == operation).order_by(Callback.id)
    )
    for callback in callbacks:
        c = (
            callback.to_json()
        )  # hold this callback, task, and response info to push to our output stack
        c["tasks"] = []
        query = await db_model.task_query()
        tasks = await db_objects.prefetch(
            query.where(Task.callback == callback).order_by(Task.id), Command.select()
        )
        for t in tasks:
            t_data = t.to_json()
            t_data["responses"] = []
            query = await db_model.response_query()
            responses = await db_objects.execute(
                query.where(Response.task == t).order_by(Response.id)
            )
            for r in responses:
                t_data["responses"].append(r.to_json())
            c["tasks"].append(t_data)
        output.append(c)
    return json({"status": "success", "output": output})


async def update_edges_from_checkin(callback_uuid, profile):
    try:
        callbackquery = await db_model.callback_query()
        callback = await db_objects.get(callbackquery, agent_callback_id=callback_uuid)
        cur_time = datetime.utcnow()
        callback.last_checkin = cur_time
        c2_query = await db_model.callbackc2profiles_query()
        c2profiles = await db_objects.execute(
            c2_query.where(db_model.CallbackC2Profiles.callback == callback)
        )
        for c2 in c2profiles:
            if c2.c2_profile.name == profile:
                try:
                    edge = await db_objects.get(
                        db_model.CallbackGraphEdge,
                        source=callback,
                        destination=callback,
                        c2_profile=c2.c2_profile,
                        direction=1,
                        end_timestamp=None,
                        operation=callback.operation,
                    )
                except Exception as d:
                    print(d)
                    edge = await db_objects.create(
                        db_model.CallbackGraphEdge,
                        source=callback,
                        destination=callback,
                        c2_profile=c2.c2_profile,
                        direction=1,
                        end_timestamp=None,
                        operation=callback.operation,
                    )
                    from app.api.callback_api import (
                        add_non_directed_graphs,
                        add_directed_graphs,
                    )

                    await add_non_directed_graphs(edge)
                    await add_directed_graphs(edge)
            callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await db_objects.update(callback)  # update the last checkin time
    except Exception as e:
        print(e)


async def get_agent_tasks(data, callback):
    # { INPUT
    #    "action": "get_tasking",
    #    "tasking_size": 1, //indicate the maximum number of tasks you want back
    # }
    # { RESPONSE
    #    "action": "get_tasking",
    #    "tasks": [
    #       {
    #           "command": "shell",
    #           "parameters": "whoami",
    #           "task_id": UUID
    #       }
    #    ]
    # }
    if "tasking_size" not in data:
        data["tasking_size"] = 1
    tasks = []
    socks = []
    try:
        if not callback.operation.complete:
            query = await db_model.task_query()
            if data["tasking_size"] > 0:
                task_list = await db_objects.prefetch(
                    query.where(
                        (Task.callback == callback) & (Task.status == "submitted")
                    )
                    .order_by(Task.timestamp)
                    .limit(data["tasking_size"]),
                    Command.select(),
                )
            else:
                task_list = await db_objects.prefetch(
                    query.where(
                        (Task.callback == callback) & (Task.status == "submitted")
                    ).order_by(Task.timestamp),
                    Command.select(),
                )
            for t in task_list:
                t.status = "processing"
                t.status_timestamp_processing = datetime.utcnow()
                t.timestamp = t.status_timestamp_processing
                await db_objects.update(t)
                tasks.append(
                    {
                        "command": t.command.cmd,
                        "parameters": t.params,
                        "id": t.agent_task_id,
                        "timestamp": t.timestamp.timestamp(),
                    }
                )
            from app.api.callback_api import get_socks_data

            socks = await get_socks_data(callback)
        else:
            # operation is complete, just return blank for now, potentially an exit command later
            await db_objects.create(
                db_model.OperationEventLog,
                operation=callback.operation,
                level="warning",
                message="Callback {} still checking in".format(callback.id),
            )
            tasks = []
    except Exception as e:
        logger.exception(
            "Error in getting tasking for : " + str(callback.id) + ", " + str(e)
        )
        tasks = []
    response_message = {"action": "get_tasking", "tasks": tasks}
    if len(socks) > 0:
        response_message["socks"] = socks
    for k in data:
        if k not in ["tasking_size", "action", "delegates", "socks"]:
            response_message[k] = data[k]
    return response_message


# create a new task to a specific callback
@mythic.route(mythic.config["API_BASE"] + "/tasks/callback/<cid:int>", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def add_task_to_callback(request, cid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # some commands can optionally upload files or indicate files for use
    # if they are uploaded here, process them first and substitute the values with corresponding file_id numbers
    if user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Must be part of a current operation first"}
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot issue tasking"})
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to get the current user's info from the database",
            }
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get the current operation"})
    try:
        query = await db_model.callback_query()
        cb = await db_objects.get(query, id=cid, operation=operation)
    except Exception as e:
        return json({"status": "error", "error": "failed to get callback"})
    # get the tasking data
    if request.form:
        if isinstance(request.form.get("json"), str):
            data = js.loads(request.form.get("json"))
        else:
            data = request.form.get("json")
    else:
        data = request.json
    # check if the callback was locked
    if cb.locked:
        if cb.locked_operator != operator:
            return json(
                {
                    "status": "error",
                    "error": "Callback is locked by another user - Cannot task",
                    "cmd": data["command"],
                    "params": data["params"],
                    "callback": cid,
                }
            )
    # make sure the tasking we're trying to do isn't blocked for our user
    query = await db_model.operatoroperation_query()
    operatoroperation = await db_objects.get(
        query, operator=operator, operation=operation
    )
    if operatoroperation.base_disabled_commands is not None:
        query = await db_model.command_query()
        if data["command"] not in ["tasks", "clear"]:
            cmd = await db_objects.get(
                query,
                cmd=data["command"],
                payload_type=cb.registered_payload.payload_type,
            )
            try:
                query = await db_model.disabledcommandsprofile_query()
                disabled_command = await db_objects.get(
                    query,
                    name=operatoroperation.base_disabled_commands.name,
                    command=cmd,
                )
                return json(
                    {
                        "status": "error",
                        "error": "Not authorized to execute that command",
                        "cmd": data["command"],
                        "params": data["params"],
                        "callback": cid,
                    }
                )
            except Exception as e:
                pass
    # if we create new files throughout this process, be sure to tag them with the right task at the end
    data["original_params"] = data["params"]
    if request.files:
        # this means we got files as part of our task, so handle those first
        params = js.loads(data["params"])
        original_params_with_names = js.loads(data["params"])
        for k in params:
            if params[k] == "FILEUPLOAD":
                original_params_with_names[k] = request.files["file" + k][0].name
                # this means we need to handle a file upload scenario and replace this value with a file_id
                code = request.files["file" + k][0].body
                params[k] = base64.b64encode(code).decode()
        # update data['params'] with new file data or just re-string the old data
        data["params"] = js.dumps(params)
        data["original_params"] = js.dumps(original_params_with_names)
    return json(
        await add_task_to_callback_func(data, cid, user, operator, operation, cb)
    )


@mythic.route(mythic.config["API_BASE"] + "/create_task_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def add_task_to_callback_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # some commands can optionally upload files or indicate files for use
    # if they are uploaded here, process them first and substitute the values with corresponding file_id numbers
    if user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Must be part of a current operation first"}
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot issue tasking"})
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to get the current user's info from the database",
            }
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get the current operation"})
    try:
        data = request.json["input"]
        query = await db_model.callback_query()
        cb = await db_objects.get(query, id=data["callback_id"], operation=operation)
    except Exception as e:
        return json({"status": "error", "error": "failed to get callback"})
    # check if the callback was locked
    if cb.locked:
        if cb.locked_operator != operator and cb.operation.name not in user["admin_operations"] and not user["admin"]:
            return json(
                {
                    "status": "error",
                    "error": "Callback is locked by another user - Cannot task",
                }
            )
    # make sure the tasking we're trying to do isn't blocked for our user
    query = await db_model.operatoroperation_query()
    operatoroperation = await db_objects.get(
        query, operator=operator, operation=operation
    )
    if operatoroperation.base_disabled_commands is not None:
        query = await db_model.command_query()
        if data["command"] not in ["clear"]:
            cmd = await db_objects.get(
                query,
                cmd=data["command"],
                payload_type=cb.registered_payload.payload_type,
            )
            try:
                query = await db_model.disabledcommandsprofile_query()
                disabled_command = await db_objects.get(
                    query,
                    name=operatoroperation.base_disabled_commands.name,
                    command=cmd,
                )
                return json(
                    {
                        "status": "error",
                        "error": "Not authorized to execute that command",
                    }
                )
            except Exception as e:
                pass
    # if we create new files throughout this process, be sure to tag them with the right task at the end
    data["original_params"] = data["params"]
    if "files" in data and data["files"] is not None:
        data["params"] = js.loads(data["params"])
        data["files"] = js.loads(data["files"])
        for f, v in data["files"].items():
            data["params"][f] = v
        data["params"] = js.dumps(data["params"])
        data.pop("files", None)
    output = await add_task_to_callback_func(data, data["callback_id"], user, operator, operation, cb)
    return json({
        "status": output.pop("status"),
        "error": output.pop("error", None),
        "id": output["id"] if "id" in output else None,
    })


cached_payload_info = {}


async def add_task_to_callback_func(data, cid, user, op, operation, cb):
    try:
        # first see if the operator and callback exists
        if user["view_mode"] == "spectator":
            return {"status": "error", "error": "Spectators cannot issue tasking"}
        task = None
        # now check the task and add it if it's valid and valid for this callback's payload type
        try:
            query = await db_model.command_query()
            cmd = await db_objects.get(
                query,
                cmd=data["command"],
                payload_type=cb.registered_payload.payload_type,
            )
        except Exception as e:
            # it's not registered, so check the free clear tasking
            if data["command"] == "clear":
                # this means we're going to be clearing out some tasks depending on our access levels
                if "params" not in data:
                    data["params"] = ""
                task = await db_objects.create(
                    Task,
                    callback=cb,
                    operator=op,
                    params="clear " + data["params"],
                    status="processed",
                    original_params="clear " + data["params"],
                    completed=True,
                    display_params="clear " + data["params"]
                )
                raw_rsp = await clear_tasks_for_callback_func(
                    {"task": data["params"]}, cb.id, user
                )
                if raw_rsp["status"] == "success":
                    rsp = "Removed the following:"
                    for t in raw_rsp["tasks_removed"]:
                        rsp += (
                            "\nOperator: "
                            + t["operator"]
                            + "\nTask "
                            + str(t["id"])
                            + ": "
                            + t["command"]
                            + " "
                            + t["original_params"]
                        )
                    await db_objects.create(Response, task=task, response=rsp)
                    return {"status": "success", **task.to_json()}
                else:
                    await db_objects.create(
                        Response, task=task, response=raw_rsp["error"]
                    )
                    return {
                        "status": "error",
                        "error": raw_rsp["error"],
                        "cmd": data["command"],
                        "params": data["original_params"],
                        "callback": cid,
                    }
            # it's not tasks/clear, so return an error
            return {
                "status": "error",
                "error": data["command"] + " is not a registered command",
                "cmd": data["command"],
                "params": data["params"],
                "callback": cid,
            }
        file_meta = ""


        # check and update if the corresponding container is running or not
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(
            query, ptype=cb.registered_payload.payload_type.ptype
        )
        if (
            cb.registered_payload.payload_type.last_heartbeat
            < datetime.utcnow() + timedelta(seconds=-30)
        ):
            payload_type.container_running = False
            await db_objects.update(payload_type)
        result = {
            "status": "success"
        }  # we are successful now unless the rabbitmq service is down
        if payload_type.container_running:
            if "token" in data:
                token_query = await db_model.token_query()
                try:
                    token = await db_objects.get(token_query, TokenId=data["token"], deleted=False)
                except Exception as te:
                    logger.warning("task_api.py: failed to find token associated with task")
                    token = None
            else:
                token = None
            task = await db_objects.create(
                Task,
                callback=cb,
                operator=op,
                command=cmd,
                token=token,
                params=data["params"],
                original_params=data["original_params"],
                display_params=data["original_params"]
            )
            result = await submit_task_to_container(task, user["username"])
        else:
            return {
                "status": "error",
                "error": f"{payload_type.ptype}'s container isn't running - no heartbeat in over 30 seconds, so it cannot process tasking.\nUse ./status_check.sh to check if the container is still online.\nUse './display_output.sh {payload_type.ptype}' to get any error logs from the container.\nUse './start_payload_types.sh {payload_type.ptype}' to start the container again.",
                "cmd": cmd.cmd,
                "params": data["original_params"],
                "callback": cid,
            }
        task_json = task.to_json()
        task_json["task_status"] = task_json[
            "status"
        ]  # we don't want the two status keys to conflict
        task_json.pop("status")
        return {**result, **task_json}
    except Exception as e:
        print(
            "failed to get something in add_task_to_callback_func "
            + str(sys.exc_info()[-1].tb_lineno)
            + " "
            + str(e)
        )
        return {
            "status": "error",
            "error": "Failed to create task: "
            + str(sys.exc_info()[-1].tb_lineno)
            + " "
            + str(e),
            "cmd": data["command"],
            "params": data["params"],
            "callback": cid,
        }


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/<tid:int>/request_bypass",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def request_bypass_for_opsec_check(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation_query = await db_model.operation_query()
        operation = await db_objects.get(operation_query, name=user["current_operation"])
        task_query = await db_model.task_query()
        task = await db_objects.get(task_query, id=tid)
        user_query = await db_model.operator_query()
        operator = await db_objects.get(user_query, id=user["id"])
        if task.callback.operation == operation:
            return json(await process_bypass_request(operator, task))
        else:
            return json({"status": "error", "error": "Task doesn't exist or isn't part of your operation"})
    except Exception as e:
        logger.warning(str(e))
        return json({"status": "error", "error": "Failed to find components"})


@mythic.route(
    mythic.config["API_BASE"] + "/request_opsec_bypass_webhook",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def request_bypass_for_opsec_check_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation_query = await db_model.operation_query()
        operation = await db_objects.get(operation_query, name=user["current_operation"])
        task_query = await db_model.task_query()
        data = request.json["input"]
        task = await db_objects.get(task_query, id=data["task_id"])
        user_query = await db_model.operator_query()
        operator = await db_objects.get(user_query, id=user["id"])
        if task.callback.operation == operation:
            return json(await process_bypass_request(operator, task))
        else:
            return json({"status": "error", "error": "Task doesn't exist or isn't part of your operation"})
    except Exception as e:
        logger.warning(str(e))
        return json({"status": "error", "error": "Failed to find components"})


async def process_bypass_request(user, task):
    if task.opsec_pre_blocked and not task.opsec_pre_bypassed:
        if task.opsec_pre_bypass_role == "operator":
            # we just need an operator to acknowledge the risk, not a lead to approve it necessarily
            task.opsec_pre_bypass_user = user
            task.opsec_pre_bypassed = True
            task.status = "creating task"
            await db_objects.update(task)
            await db_objects.create(db_model.OperationEventLog, level="info", operation=task.callback.operation,
                                    message=f"{user.username} bypassed an OPSEC PreCheck for task {task.id}")
            return await submit_task_to_container(task, user.username)
        elif task.opsec_pre_bypass_role == "lead":
            # only the lead of an operation can bypass the check
            if task.callback.operation.admin == user:
                task.opsec_pre_bypass_user = user
                task.opsec_pre_bypassed = True
                task.status = "creating task"
                await db_objects.update(task)
                await db_objects.create(db_model.OperationEventLog, level="info", operation=task.callback.operation,
                                        message=f"{user.username} bypassed an OPSEC PreCheck for task {task.id}")
                return await submit_task_to_container(task, user.username)
            else:
                await db_objects.create(db_model.OperationEventLog, level="warning", operation=task.callback.operation,
                                        message=f"{user.username} failed to bypass an OPSEC PreCheck for task {task.id}")
                return {"status": "error", "error": "Not Authorized"}
    elif task.opsec_post_blocked and not task.opsec_post_bypassed:
        if task.opsec_post_bypass_role == "operator":
            # we just need an operator to acknowledge the risk, not a lead to approve it necessarily
            task.opsec_post_bypass_user = user
            task.opsec_post_bypassed = True
            task.status = "creating task"
            await db_objects.update(task)
            await db_objects.create(db_model.OperationEventLog, level="info", operation=task.callback.operation,
                                    message=f"{user.username} bypassed an OPSEC PostCheck for task {task.id}")
            return await submit_task_to_container(task, user.username)
        elif task.opsec_post_bypass_role == "lead":
            # only the lead of an operation can bypass the check
            if task.callback.operation.admin == user:
                task.opsec_post_bypass_user = user
                task.opsec_post_bypassed = True
                task.status = "creating task"
                await db_objects.update(task)
                await db_objects.create(db_model.OperationEventLog, level="info", operation=task.callback.operation,
                                        message=f"{user.username} bypassed an OPSEC PostCheck for task {task.id}")
                return await submit_task_to_container(task, user.username)
            else:
                await db_objects.create(db_model.OperationEventLog, level="warning", operation=task.callback.operation,
                                        message=f"{user.username} failed to bypass an OPSEC PostCheck for task {task.id}")
                return {"status": "error", "error": "Not Authorized"}
    else:
        return {"status": "error", "error": "nothing to bypass"}


async def submit_task_to_container(task, username):
    if (
            task.callback.registered_payload.payload_type.last_heartbeat
            < datetime.utcnow() + timedelta(seconds=-30)
    ):
        task.callback.registered_payload.payload_type.container_running = False
        await db_objects.update(task.callback.registered_payload.payload_type)
        return {"status": "error", "error": "Payload Type container not running"}
    if task.callback.registered_payload.payload_type.container_running:
        rabbit_message = {"params": task.params, "command": task.command.cmd}
        rabbit_message["task"] = task.to_json()
        rabbit_message["task"]["callback"] = task.callback.to_json()
        # get the information for the callback's associated payload
        payload_info = await add_all_payload_info(task.callback.registered_payload)
        rabbit_message["task"]["callback"]["build_parameters"] = payload_info[
            "build_parameters"
        ]
        rabbit_message["task"]["callback"]["c2info"] = payload_info["c2info"]
        rabbit_message["task"]["token"] = task.token.to_json() if task.token is not None else None
        # by default tasks are created in a preprocessing state,
        result = await send_pt_rabbitmq_message(
            task.callback.registered_payload.payload_type.ptype,
            "command_transform",
            base64.b64encode(js.dumps(rabbit_message).encode()).decode("utf-8"),
            username,
            task.id
        )
        return result
    else:
        return {"status": "error", "error": "Container not running"}


async def add_all_payload_info(payload):
    rabbit_message = {}
    if payload.uuid in cached_payload_info:
        rabbit_message["build_parameters"] = cached_payload_info[payload.uuid][
            "build_parameters"
        ]
        rabbit_message["commands"] = cached_payload_info[payload.uuid]["commands"]
        rabbit_message["c2info"] = cached_payload_info[payload.uuid]["c2info"]
    else:
        cached_payload_info[payload.uuid] = {}
        build_parameters = {}
        bp_query = await db_model.buildparameterinstance_query()
        build_params = await db_objects.execute(
            bp_query.where(db_model.BuildParameterInstance.payload == payload)
        )
        for bp in build_params:
            build_parameters[bp.build_parameter.name] = bp.parameter
        rabbit_message["build_parameters"] = build_parameters
        # cache it for later
        cached_payload_info[payload.uuid]["build_parameters"] = build_parameters
        c2_profile_parameters = []
        query = await db_model.payloadc2profiles_query()
        payloadc2profiles = await db_objects.execute(
            query.where(db_model.PayloadC2Profiles.payload == payload)
        )
        for pc2p in payloadc2profiles:
            # for each profile, we need to get all of the parameters and supplied values for just that profile
            param_dict = {}
            query = await db_model.c2profileparametersinstance_query()
            c2_param_instances = await db_objects.execute(
                query.where(
                    (C2ProfileParametersInstance.payload == payload)
                    & (C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
                )
            )
            # save all the variables off to a dictionary for easy looping
            for instance in c2_param_instances:
                param = instance.c2_profile_parameters
                param_dict[param.name] = instance.value

            c2_profile_parameters.append(
                {"parameters": param_dict, **pc2p.c2_profile.to_json()}
            )
        rabbit_message["c2info"] = c2_profile_parameters
        cached_payload_info[payload.uuid]["c2info"] = c2_profile_parameters
        commands_query = await db_model.payloadcommand_query()
        stamped_commands = await db_objects.execute(commands_query.where(
            db_model.PayloadCommand.payload == payload
        ))
        commands = [c.command.cmd for c in stamped_commands]
        rabbit_message["commands"] = commands
        cached_payload_info[payload.uuid]["commands"] = commands
    return rabbit_message


async def add_command_attack_to_task(task, command):
    try:
        query = await db_model.attackcommand_query()
        attack_mappings = await db_objects.execute(
            query.where(ATTACKCommand.command == command)
        )
        for attack in attack_mappings:
            try:
                query = await db_model.attacktask_query()
                # try to get the query, if it doens't exist, then create it in the exception
                await db_objects.get(query, task=task, attack=attack.attack)
            except Exception as e:
                attack = await db_objects.create(ATTACKTask, task=task, attack=attack.attack)
                await log_to_siem(attack.to_json(), mythic_object="task_mitre_attack")
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        raise e


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/callback/<cid:int>/notcompleted",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_not_completed_tasks_for_callback(request, cid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    return json(await get_all_not_completed_tasks_for_callback_func(cid, user))


async def get_all_not_completed_tasks_for_callback_func(cid, user):
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=cid)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=callback.operation)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "failed to get callback or operation"}
    if operation.name in user["operations"]:
        # Get all tasks that have a status of submitted or processing
        query = await db_model.task_query()
        tasks = await db_objects.prefetch(
            query.where(
                (Task.callback == callback) & (Task.completed != True)
            ).order_by(Task.timestamp),
            Command.select(),
        )
        return {"status": "success", "tasks": [x.to_json() for x in tasks]}
    else:
        return {
            "status": "error",
            "error": "You must be part of the operation to view this information",
        }


async def clear_tasks_for_callback_func(data, cid, user):
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=cid)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=callback.operation)

        tasks_removed = []
        if "all" == data["task"]:
            query = await db_model.task_query()
            tasks = await db_objects.prefetch(
                query.where(
                    (Task.callback == callback) & (Task.status == "submitted")
                ).order_by(Task.timestamp),
                Command.select(),
            )
        elif len(data["task"]) > 0:
            #  if the user specifies a task, make sure that it's not being processed or already done
            query = await db_model.task_query()
            tasks = await db_objects.prefetch(
                query.where((Task.id == data["task"]) & (Task.status == "submitted")),
                Command.select(),
            )
        else:
            # if you don't actually specify a task, remove the the last task that was entered
            query = await db_model.task_query()
            tasks = await db_objects.prefetch(
                query.where((Task.status == "submitted") & (Task.callback == callback))
                .order_by(-Task.timestamp)
                .limit(1),
                Command.select(),
            )
        for t in list(tasks):
            if operation.name in user["operations"]:
                try:
                    t_removed = t.to_json()
                    # don't actually delete it, just mark it as completed with a response of "CLEARED TASK"
                    t.status = "processed"
                    t.status_processed_timestamp = datetime.utcnow()
                    t.status_processing_timestamp = t.status_processed_timestamp
                    t.completed = True
                    t.timestamp = datetime.utcnow()
                    await db_objects.update(t)
                    # we need to adjust all of the things associated with this task now since it didn't actually happen
                    # find/remove ATTACKTask, TaskArtifact, FileMeta
                    query = await db_model.attacktask_query()
                    attack_tasks = await db_objects.execute(
                        query.where(ATTACKTask.task == t)
                    )
                    for at in attack_tasks:
                        await db_objects.delete(at, recursive=True)
                    query = await db_model.taskartifact_query()
                    task_artifacts = await db_objects.execute(
                        query.where(TaskArtifact.task == t)
                    )
                    for ta in task_artifacts:
                        await db_objects.delete(ta, recursive=True)
                    query = await db_model.filemeta_query()
                    file_metas = await db_objects.execute(
                        query.where(FileMeta.task == t)
                    )
                    for fm in file_metas:
                        os.remove(fm.path)
                        await db_objects.delete(fm, recursive=True)
                    # now create the response so it's easy to track what happened with it
                    response = "CLEARED TASK by " + user["username"]
                    await db_objects.create(Response, task=t, response=response)
                    tasks_removed.append(t_removed)
                except Exception as e:
                    print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    return {
                        "status": "error",
                        "error": "failed to delete task: " + t.command.cmd,
                    }
        return {"status": "success", "tasks_removed": tasks_removed}
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "failed to set up for removing tasks"}


@mythic.route(mythic.config["API_BASE"] + "/tasks/<tid:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_task_and_responses(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.id == tid), Command.select())
        task = list(task)[0]
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {"status": "error", "error": "failed to find that task: " + str(tid)}
        )
    try:
        if task.callback.operation.name in user["operations"]:
            query = await db_model.response_query()
            responses = await db_objects.execute(
                query.where(Response.task == task).order_by(Response.id)
            )
            query = await db_model.callback_query()
            callback = await db_objects.get(query.where(Callback.id == task.callback))
            return json(
                {
                    "status": "success",
                    "callback": callback.to_json(),
                    "task": task.to_json(),
                    "responses": [r.to_json() for r in responses],
                }
            )
        else:
            return json(
                {"status": "error", "error": "you don't have access to that task"}
            )
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "Failed to fetch task: "
                + str(sys.exc_info()[-1].tb_lineno)
                + " "
                + str(e),
            }
        )


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/<tid:int>/raw_output", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_task_and_responses_as_raw_output(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        if task.callback.operation.name in user["operations"]:
            query = await db_model.response_query()
            responses = await db_objects.execute(
                query.where(Response.task == task).order_by(Response.id)
            )
            output = "".join(
                [
                    bytes(r.response).decode("utf-8")
                    for r in responses
                ]
            )
            return json(
                {
                    "status": "success",
                    "output": base64.b64encode(output.encode()).decode("utf-8"),
                }
            )
        else:
            return json(
                {"status": "error", "error": "you don't have access to that task"}
            )
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "failed to find that task {}".format(
                    str(sys.exc_info()[-1].tb_lineno) + " " + str(e)
                ),
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/tasks/comments/<tid:int>", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def add_comment_to_task(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {"status": "error", "error": "Spectators cannot comment on tasks"}
            )
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        data = request.json
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
        if task.callback.operation.name in user["operations"]:
            if "comment" in data:
                task.comment = data["comment"]
                task.comment_operator = operator
                await db_objects.update(task)
                await log_to_siem(task.to_json(), mythic_object="task_comment")
                return json({"status": "success", "task": task.to_json()})
            else:
                return json(
                    {"status": "error", "error": 'must supply a "comment" to add'}
                )
        else:
            return json(
                {"status": "error", "error": "you don't have access to that task"}
            )
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "failed to find that task"})


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/comments/<tid:int>", methods=["DELETE"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_task_comment(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {
                    "status": "error",
                    "error": "Spectators cannot remove comments on tasks",
                }
            )
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
        if task.callback.operation.name in user["operations"]:
            task.comment = ""
            task.comment_operator = operator
            await db_objects.update(task)
            await log_to_siem(task.to_json(), mythic_object="task_comment")
            return json({"status": "success", "task": task.to_json()})
        else:
            return json(
                {"status": "error", "error": "you don't have access to that task"}
            )
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "failed to find that task"})
