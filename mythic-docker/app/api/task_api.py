from app import mythic
import app
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
from app.api.rabbitmq_api import send_pt_rabbitmq_message, MythicBaseRPC
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
    full_task_data = await app.db_objects.prefetch(db_model.task_query, Command.select())
    if user["admin"]:
        # callbacks_with_operators = await app.db_objects.prefetch(callbacks, operators)
        return json([c.to_json() for c in full_task_data])
    elif user["current_operation"] != "":
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
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
            operator = await app.db_objects.get(db_model.operator_query, username=data["operator"])
            data["operator"] = operator
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json(
            {"status": "error", "error": "Cannot get that operation or operator"}
        )
    try:
        if data["type"] == "params":
            if "operator" in data:
                count = await app.db_objects.count(
                    db_model.task_query.where(
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
                count = await app.db_objects.count(
                    db_model.task_query.where(
                        (Task.params.regexp(data["search"]))
                        | (Task.original_params.regexp(data["search"]))
                    )
                    .switch(Callback)
                    .where(Callback.operation == operation)
                    .distinct()
                )
        elif data["type"] == "cmds":
            if "operator" in data:
                count = await app.db_objects.count(
                    db_model.task_query.where(Command.cmd.regexp(data["search"]))
                    .switch(Callback)
                    .where(Callback.operation == operation)
                    .switch(Task)
                    .where(Task.operator == data["operator"])
                    .distinct()
                )
            else:
                count = await app.db_objects.count(
                    db_model.task_query.where(Command.cmd.regexp(data["search"]))
                    .switch(Callback)
                    .where(Callback.operation == operation)
                )
        else:
            if "operator" in data:
                count = await app.db_objects.count(
                    db_model.task_query.where(
                        (Task.comment.regexp(data["search"])) & (Task.comment != "")
                    )
                    .switch(Callback)
                    .where(Callback.operation == operation)
                    .switch(Task)
                    .where(Task.comment_operator == data["operator"])
                    .distinct()
                )
            else:
                count = await app.db_objects.count(
                    db_model.task_query.where(
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.where(
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.where(
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.switch(Command)
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.switch(Command)
                        .where(Command.cmd.regexp(data["search"]))
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
            else:
                if "operator" in data:
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.where(
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.where(
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.where(
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.where(
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.switch(Command)
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.switch(Command)
                        .where(Command.cmd.regexp(data["search"]))
                        .switch(Callback)
                        .where(Callback.operation == operation)
                        .order_by(Task.id)
                        .paginate(data["page"], data["size"])
                        .distinct()
                    )
            else:
                if "operator" in data:
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.where(
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
                    tasks = await app.db_objects.prefetch(
                        db_model.task_query.where(
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
        callback = await app.db_objects.get(db_model.callback_query, id=cid)
        operation = await app.db_objects.get(db_model.operation_query, id=callback.operation)
    except Exception as e:
        return json({"status": "error", "error": "Callback does not exist"})
    if operation.name in user["operations"]:
        try:
            cb_task_data = await app.db_objects.prefetch(
                db_model.task_query.where(Task.callback == callback).order_by(Task.id),
                db_model.command_query
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
        cur_op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        task = await app.db_objects.get(db_model.task_query, id=tid)
        if task.callback.operation != cur_op:
            return json({"status": "error", "error": "not part of the right operation"})
    except Exception as e:
        return json({"status": "error", "error": "task does not exist"})
    return json({"status": "success", "stdout": task.stdout, "stderr": task.stderr})


@mythic.route(mythic.config["API_BASE"] + "/tasks/all_params/<tid:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_params_for_task(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        cur_op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        task = await app.db_objects.get(db_model.task_query, id=tid)
        if task.callback.operation != cur_op:
            return json({"status": "error", "error": "not part of the right operation"})
    except Exception as e:
        return json({"status": "error", "error": "task does not exist"})
    return json({"status": "success", "display_params": task.display_params,
                 "original_params": task.original_params, "params": task.params})


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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "Not part of an operation"})
    output = []
    callbacks = await app.db_objects.execute(
        db_model.callback_query.where(Callback.operation == operation).order_by(Callback.id)
    )
    for callback in callbacks:
        c = (
            callback.to_json()
        )  # hold this callback, task, and response info to push to our output stack
        c["tasks"] = []
        tasks = await app.db_objects.prefetch(
            db_model.task_query.where(Task.callback == callback).order_by(Task.id), Command.select()
        )
        for t in tasks:
            t_data = t.to_json()
            t_data["responses"] = []
            responses = await app.db_objects.execute(
                db_model.response_query.where(Response.task == t).order_by(Response.id)
            )
            for r in responses:
                t_data["responses"].append(r.to_json())
            c["tasks"].append(t_data)
        output.append(c)
    return json({"status": "success", "output": output})


async def update_edges_from_checkin(callback_uuid, profile):
    try:
        callback = await app.db_objects.get(db_model.callback_query, agent_callback_id=callback_uuid)
        cur_time = datetime.utcnow()
        callback.last_checkin = cur_time
        # track all of the timestamps for when the callback sends a message
        await app.db_objects.create(db_model.CallbackAccessTime, callback=callback)
        if not callback.active:
            # if the callback isn't active and it's checking in, make sure to update edge info
            c2profiles = await app.db_objects.execute(
                db_model.callbackc2profiles_query.where(db_model.CallbackC2Profiles.callback == callback)
            )
            for c2 in c2profiles:
                if c2.c2_profile.name == profile and not c2.c2_profile.is_p2p:
                    try:
                        edge = await app.db_objects.get(
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
                        edge = await app.db_objects.create(
                            db_model.CallbackGraphEdge,
                            source=callback,
                            destination=callback,
                            c2_profile=c2.c2_profile,
                            direction=1,
                            end_timestamp=None,
                            operation=callback.operation,
                        )
            callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await app.db_objects.update(callback)  # update the last checkin time
    except Exception as e:
        logger.warning("exception in task_api.py trying to update edges from checkin: " + str(e))


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
    rportfwds = []
    try:
        if not callback.operation.complete:
            if data["tasking_size"] > 0:
                task_list = await app.db_objects.execute(
                    db_model.task_query.where(
                        (Task.callback == callback) & (Task.status == "submitted")
                    )
                    .order_by(Task.timestamp)
                    .limit(data["tasking_size"]),
                )
            else:
                task_list = await app.db_objects.execute(
                    db_model.task_query.where(
                        (Task.callback == callback) & (Task.status == "submitted")
                    ).order_by(Task.timestamp),
                )
            for t in task_list:
                t.status = "processing"
                t.status_timestamp_processing = datetime.utcnow()
                t.timestamp = t.status_timestamp_processing
                await app.db_objects.update(t)
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

            from app.api.callback_api import get_rportfwd_data

            rportfwds = await get_rportfwd_data(callback)
        else:
            # operation is complete, just return blank for now, potentially an exit command later
            await app.db_objects.create(
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
    if len(rportfwds) > 0:
        response_message["rportfwds"] = rportfwds
    for k in data:
        if k not in ["tasking_size", "action", "delegates", "socks","rportfwds"]:
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
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to get the current user's info from the database",
            }
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get the current operation"})
    try:
        cb = await app.db_objects.prefetch(db_model.callback_query.where(
            (db_model.Callback.id == cid) & (db_model.Callback.operation == operation)
        ), db_model.callbacktoken_query)
        cb = list(cb)[0]
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
    operatoroperation = await app.db_objects.get(
        db_model.operatoroperation_query, operator=operator, operation=operation
    )
    if operatoroperation.base_disabled_commands is not None:
        if data["command"] not in ["clear"]:
            cmd = await app.db_objects.get(
                db_model.command_query,
                cmd=data["command"],
                payload_type=cb.registered_payload.payload_type,
            )
            try:
                disabled_command = await app.db_objects.get(
                    db_model.disabledcommandsprofile_query,
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
    data["params"] = data["params"].strip()
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
        await add_task_to_callback_func(data, cid, operator, cb)
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
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to get the current user's info from the database",
            }
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get the current operation"})
    try:
        data = request.json["input"]
        cb = await app.db_objects.get(db_model.callback_query, id=data["callback_id"], operation=operation)
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
    operatoroperation = await app.db_objects.get(
        db_model.operatoroperation_query, operator=operator, operation=operation
    )
    if operatoroperation.base_disabled_commands is not None:
        if data["command"] not in ["clear"]:
            cmd = await app.db_objects.get(
                db_model.command_query,
                cmd=data["command"],
                payload_type=cb.registered_payload.payload_type,
            )
            try:
                disabled_command = await app.db_objects.get(
                    db_model.disabledcommandsprofile_query,
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
    data["params"] = data["params"].strip()
    data["original_params"] = data["params"]
    if "files" in data and data["files"] is not None:
        data["params"] = js.loads(data["params"])
        data["files"] = js.loads(data["files"])
        for f, v in data["files"].items():
            data["params"][f] = v
        data["params"] = js.dumps(data["params"])
        data.pop("files", None)
    output = await add_task_to_callback_func(data, data["callback_id"], operator, cb)
    return json({
        "status": output.pop("status"),
        "error": output.pop("error", None),
        "id": output["id"] if "id" in output else None,
    })


cached_payload_info = {}
payload_rpc = MythicBaseRPC()


async def add_task_to_callback_func(data, cid, op, cb):
    task = None
    try:
        # first see if the operator and callback exists


        # now check the task and add it if it's valid and valid for this callback's payload type
        try:
            cmd = await app.db_objects.get(
                db_model.command_query,
                cmd=data["command"],
                payload_type=cb.registered_payload.payload_type,
            )
        except Exception as e:
            # it's not registered, so check the free clear tasking
            if data["command"] == "clear":
                # this means we're going to be clearing out some tasks depending on our access levels
                if "params" not in data:
                    data["params"] = ""
                task = await app.db_objects.create(
                    Task,
                    callback=cb,
                    operator=op,
                    parent_task=data["parent_task"] if "parent_task" in data else None,
                    subtask_callback_function=data["subtask_callback_function"] if "subtask_callback_function" in data else None,
                    group_callback_function=data["group_callback_function"] if "group_callback_function" in data else None,
                    completed_callback_function=data["completed_callback_function"] if "completed_callback_function" in data else None,
                    subtask_group_name=data["subtask_group_name"] if "subtask_group_name" in data else None,
                    params="clear " + data["params"],
                    status="processed",
                    original_params="clear " + data["params"],
                    completed=True,
                    display_params="clear " + data["params"]
                )
                if "tags" in data:
                    await add_tags_to_task(task, data["tags"])
                raw_rsp = await clear_tasks_for_callback_func(
                    {"task": data["params"]}, cb.id, op
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
                    await app.db_objects.create(Response, task=task, response=rsp)
                    return {"status": "success", **task.to_json()}
                else:
                    await app.db_objects.create(
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
        try:
            if not cmd.script_only:
                loaded_commands = await app.db_objects.get(db_model.loadedcommands_query, callback=cb, command=cmd)
        except Exception as e:
            return {
                "status": "error",
                "error": data["command"] + " is not loaded in this callback and is not a scripted command",
                "cmd": data["command"],
                "params": data["params"],
                "callback": cid,
            }
        file_meta = ""
        # check and update if the corresponding container is running or not
        payload_type = await app.db_objects.get(
            db_model.payloadtype_query, ptype=cb.registered_payload.payload_type.ptype
        )
        if (
            cb.registered_payload.payload_type.last_heartbeat
            < datetime.utcnow() + timedelta(seconds=-30)
        ):
            payload_type.container_running = False
            await app.db_objects.update(payload_type)
        result = {
            "status": "success"
        }  # we are successful now unless the rabbitmq service is down
        if payload_type.container_running:
            if "token" in data:
                try:
                    token = await app.db_objects.get(db_model.token_query, TokenId=data["token"], deleted=False)
                except Exception as te:
                    logger.warning("task_api.py: failed to find token associated with task")
                    token = None
            else:
                token = None
            task = await app.db_objects.create(
                Task,
                callback=cb,
                operator=op,
                command=cmd,
                token=token,
                params=data["params"],
                original_params=data["original_params"],
                display_params=data["original_params"],
                parent_task=data["parent_task"] if "parent_task" in data else None,
                subtask_callback_function=data[
                    "subtask_callback_function"] if "subtask_callback_function" in data else None,
                group_callback_function=data["group_callback_function"] if "group_callback_function" in data else None,
                subtask_group_name=data["subtask_group_name"] if "subtask_group_name" in data else None,
            )
            if "tags" in data:
                await add_tags_to_task(task, data["tags"])
            result = await submit_task_to_container(task, op.username)
        else:
            return {
                "status": "error",
                "error": f"{payload_type.ptype}'s container isn't running - no heartbeat in over 30 seconds, so it cannot process tasking.\nUse ./mythic-cli status to check if the container is still online.\nUse './display_output.sh {payload_type.ptype}' to get any error logs from the container.\nUse './start_payload_types.sh {payload_type.ptype}' to start the container again.",
                "cmd": cmd.cmd,
                "params": data["original_params"],
                "callback": cid,
            }
        task_json = task.to_json()
        task_json["task_status"] = task_json[
            "status"
        ]  # we don't want the two status keys to conflict
        task_json.pop("status")
        return {**result, **task_json, "cmd": cmd.cmd, "params": data["original_params"], "callback": cid}
    except Exception as e:
        logger.warning(
            "failed to get something in add_task_to_callback_func "
            + str(sys.exc_info()[-1].tb_lineno)
            + " "
            + str(e)
        )
        if task is not None:
            task.completed = True
            task.status = "error in Mythic"
            await app.db_objects.update(task)
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


async def check_and_issue_task_callback_functions(taskOriginal: Task):
    # pull updated information for the task in case it didn't propagate for whatever reason
    task = await app.db_objects.get(db_model.task_query, id=taskOriginal.id)
    if task.completed:
        if task.parent_task is not None:
            # pass execution to parent_task's functions for subtask_callback_function and group_callback_function
            if task.subtask_callback_function is not None:
                status = await submit_task_callback_to_container(task.parent_task, task.subtask_callback_function, task.operator.username,
                                                        task)
                if status["status"] == "error":
                    task.subtask_callback_function_completed = False
                    logger.warning("error from subtask_callback_function submit_task_callback_to_container: " + status["error"])
                else:
                    task.subtask_callback_function_completed = True
                await app.db_objects.update(task)
            if task.subtask_group_name != "" and task.group_callback_function is not None:
                # we need to check if all tasks are done that have that same group name
                group_tasks = await app.db_objects.count(db_model.task_query.where(
                    (db_model.Task.subtask_group_name == task.subtask_group_name) &
                    (db_model.Task.completed == False) &
                    (db_model.Task.parent_task == task.parent_task)
                ))
                if group_tasks == 0:
                    # there are no more tasks with this same group name and same parent task, so call the group_callback_function
                    status = await submit_task_callback_to_container(task.parent_task, task.group_callback_function, task.operator.username,
                                                            task, subtask_group_name=task.subtask_group_name)
                    if status["status"] == "error":
                        task.group_callback_function_completed = False
                        logger.warning("error from grouptasks == 0, submit_task_callback_to_container: " + status["error"])
                    else:
                        task.group_callback_function_completed = True
                    await app.db_objects.update(task)
        if task.completed_callback_function is not None:
            # pass execution back to task's function called completed_callback_function
            status = await submit_task_callback_to_container(task, task.completed_callback_function, task.operator.username)
            if status["status"] == "error":
                task.completed_callback_function_completed = False
                logger.warning("error in completed_callback_function not None submit_task_callback_to_container: " + status["error"])
            else:
                task.completed_callback_function_completed = True
            await app.db_objects.update(task)


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/dynamic_query",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_dynamic_query_params(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    return json(await process_dynamic_request(request.json))


async def process_dynamic_request(data):
    if "command" not in data:
        return {"status": "error", "error": "command is a required field"}
    if "parameter_name" not in data:
        return {"status": "error", "error": "parameter_name is a required field"}
    if "payload_type" not in data:
        return {"status": "error", "error": "payload_type is a required field"}
    if "callback" not in data:
        return {"status": "error", "error": "callback is a required field"}
    try:
        callback = await app.db_objects.get(db_model.callback_query, id=data["callback"])
        return await issue_dynamic_parameter_call(data["command"], data["parameter_name"], data["payload_type"], callback)
    except Exception as e:
        return {"status": "error", "error": "Failed to get callback data: " + str(e)}


async def issue_dynamic_parameter_call(command: str, parameter_name: str, payload_type: str, callback: Callback):
    try:
        rabbitmq_message = callback.to_json()
        # get the information for the callback's associated payload
        payload_info = await add_all_payload_info(callback.registered_payload)
        rabbitmq_message["build_parameters"] = payload_info[
            "build_parameters"
        ]
        rabbitmq_message["c2info"] = payload_info["c2info"]
    except Exception as e:
        return {"status": "error", "error": "Failed to get callback and payload information"}, False
    status, successfully_sent = await payload_rpc.call(message={
        "action": parameter_name,
        "command": command,
        "callback": rabbitmq_message
    }, receiver="{}_mythic_rpc_queue".format(payload_type))
    if not successfully_sent:
        return {"status": "error", "error": "Failed to connect to rabbitmq, is the container running?"}
    return js.loads(status)


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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        task = await app.db_objects.prefetch(db_model.task_query.where(db_model.Task.id == tid),
                                             db_model.callback_query,
                                             db_model.callbacktoken_query)
        task = list(task)[0]
        operator = await app.db_objects.get(db_model.operator_query, id=user["id"])
        if task.callback.operation == operation:
            return json(await process_bypass_request(operator, task))
        else:
            return json({"status": "error", "error": "Task doesn't exist or isn't part of your operation"})
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        data = request.json["input"]
        task = await app.db_objects.get(db_model.task_query, id=data["task_id"])
        operator = await app.db_objects.get(db_model.operator_query, id=user["id"])
        if task.callback.operation == operation:
            return json(await process_bypass_request(operator, task))
        else:
            return json({"status": "error", "error": "Task doesn't exist or isn't part of your operation"})
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "Failed to find components"})


async def process_bypass_request(user, task):
    if task.opsec_pre_blocked and not task.opsec_pre_bypassed:
        if task.opsec_pre_bypass_role == "operator":
            # we just need an operator to acknowledge the risk, not a lead to approve it necessarily
            task.opsec_pre_bypass_user = user
            task.opsec_pre_bypassed = True
            task.status = "bypassing opsec_pre"
            await app.db_objects.update(task)
            status = await submit_task_to_container(task, user.username)
            if status["status"] == "error":
                task.opsec_pre_bypass_user = None
                task.opsec_pre_bypassed = False
                task.status = "opsec pre blocked (container down)"
                await app.db_objects.update(task)
                await app.db_objects.create(db_model.OperationEventLog, level="info", operation=task.callback.operation,
                                            message=f"OPSEC PreCheck for task {task.id} failed - container down")
            else:
                await app.db_objects.create(db_model.OperationEventLog, level="info", operation=task.callback.operation,
                                            message=f"{user.username} bypassed an OPSEC PreCheck for task {task.id}")
            return status
        elif task.opsec_pre_bypass_role == "lead":
            # only the lead of an operation can bypass the check
            if task.callback.operation.admin == user:
                task.opsec_pre_bypass_user = user
                task.opsec_pre_bypassed = True
                task.status = "bypassing opsec_pre"
                await app.db_objects.update(task)

                status = await submit_task_to_container(task, user.username)
                if status["status"] == "error":
                    task.opsec_pre_bypass_user = None
                    task.opsec_pre_bypassed = False
                    task.status = "opsec pre blocked (container down)"
                    await app.db_objects.update(task)
                    await app.db_objects.create(db_model.OperationEventLog, level="info",
                                                operation=task.callback.operation,
                                                message=f"OPSEC PreCheck for task {task.id} failed - container down")
                else:
                    await app.db_objects.create(db_model.OperationEventLog, level="info",
                                                operation=task.callback.operation,
                                                message=f"{user.username} bypassed an OPSEC PreCheck for task {task.id}")
                return status
            else:
                await app.db_objects.create(db_model.OperationEventLog, level="warning", operation=task.callback.operation,
                                        message=f"{user.username} failed to bypass an OPSEC PreCheck for task {task.id}")
                return {"status": "error", "error": "Not Authorized"}
    elif task.opsec_post_blocked and not task.opsec_post_bypassed:
        if task.opsec_post_bypass_role == "operator":
            # we just need an operator to acknowledge the risk, not a lead to approve it necessarily
            task.opsec_post_bypass_user = user
            task.opsec_post_bypassed = True
            task.status = "bypassing opsec post"
            await app.db_objects.update(task)
            status = await submit_task_to_container(task, user.username)
            if status["status"] == "error":
                task.opsec_post_bypass_user = None
                task.opsec_post_bypassed = False
                task.status = "opsec post blocked (container down)"
                await app.db_objects.update(task)
                await app.db_objects.create(db_model.OperationEventLog, level="info", operation=task.callback.operation,
                                            message=f"OPSEC PostCheck for task {task.id} failed - container down")
            else:
                await app.db_objects.create(db_model.OperationEventLog, level="info", operation=task.callback.operation,
                                            message=f"{user.username} bypassed an OPSEC PostCheck for task {task.id}")
            return status
        elif task.opsec_post_bypass_role == "lead":
            # only the lead of an operation can bypass the check
            if task.callback.operation.admin == user:
                task.opsec_post_bypass_user = user
                task.opsec_post_bypassed = True
                task.status = "bypass opsec post"
                await app.db_objects.update(task)
                status = await submit_task_to_container(task, user.username)
                if status["status"] == "error":
                    task.opsec_post_bypass_user = None
                    task.opsec_post_bypassed = False
                    task.status = "opsec post blocked (container down)"
                    await app.db_objects.update(task)
                    await app.db_objects.create(db_model.OperationEventLog, level="info",
                                                operation=task.callback.operation,
                                                message=f"OPSEC PostCheck for task {task.id} failed - container down")
                else:
                    await app.db_objects.create(db_model.OperationEventLog, level="info",
                                                operation=task.callback.operation,
                                                message=f"{user.username} bypassed an OPSEC PostCheck for task {task.id}")
                return status
            else:
                await app.db_objects.create(db_model.OperationEventLog, level="warning", operation=task.callback.operation,
                                        message=f"{user.username} failed to bypass an OPSEC PostCheck for task {task.id}")
                return {"status": "error", "error": "Not Authorized"}
    else:
        return {"status": "error", "error": "nothing to bypass"}


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/reissue_task_webhook",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def reissue_task_for_down_container(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        data = request.json["input"]
        task = await app.db_objects.get(db_model.task_query, id=data["task_id"])
        if task.status == "error: container down" and task.callback.operation == operation:
            task.status = "preprocessing"
            await app.db_objects.update(task)
            status = await submit_task_to_container(task, user["username"])
            if status["status"] == "error":
                task.status = "error: container down"
                await app.db_objects.update(task)
            return json(status)
        else:
            return json({"status": "error", "error": "bad task status for re-issuing"})
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "Failed to find components"})


async def submit_task_to_container(task, username):
    if (
            task.callback.registered_payload.payload_type.last_heartbeat
            < datetime.utcnow() + timedelta(seconds=-30)
    ):
        task.callback.registered_payload.payload_type.container_running = False
        await app.db_objects.update(task.callback.registered_payload.payload_type)
        return {"status": "error", "error": "Payload Type container not running"}
    if task.callback.registered_payload.payload_type.container_running:
        rabbit_message = {"params": task.params, "command": task.command.cmd, "task": task.to_json()}
        rabbit_message["task"]["callback"] = task.callback.to_json()
        # get the information for the callback's associated payload
        payload_info = await add_all_payload_info(task.callback.registered_payload)
        rabbit_message["task"]["callback"]["build_parameters"] = payload_info[
            "build_parameters"
        ]
        rabbit_message["task"]["callback"]["c2info"] = payload_info["c2info"]
        tags = await app.db_objects.execute(db_model.tasktag_query.where(db_model.TaskTag.task == task))
        rabbit_message["task"]["tags"] = [t.tag for t in tags]
        rabbit_message["task"]["token"] = task.token.to_json() if task.token is not None else None
        # by default tasks are created in a preprocessing state,
        result = await send_pt_rabbitmq_message(
            task.callback.registered_payload.payload_type.ptype,
            "command_transform",
            base64.b64encode(js.dumps(rabbit_message).encode()).decode("utf-8"),
            username,
            task.id
        )
        if result["status"] == "error" and "type" in result:
            task.status = "error: container down"
            task.callback.registered_payload.payload_type.container_running = False
            task.callback.registered_payload.payload_type.container_count = 0
            await app.db_objects.update(task.callback.registered_payload.payload_type)
            await app.db_objects.update(task)
        return result
    else:
        return {"status": "error", "error": "Container not running"}


async def submit_task_callback_to_container(task: Task, function_name: str, username: str,
                                            subtask: Task = None, subtask_group_name: str = None):
    if (
            task.callback.registered_payload.payload_type.last_heartbeat
            < datetime.utcnow() + timedelta(seconds=-30)
    ):
        task.callback.registered_payload.payload_type.container_running = False
        await app.db_objects.update(task.callback.registered_payload.payload_type)
        return {"status": "error", "error": "Payload Type container not running"}
    if task.callback.registered_payload.payload_type.container_running:
        rabbit_message = {"params": task.params, "command": task.command.cmd, "task": task.to_json()}
        rabbit_message["task"]["callback"] = task.callback.to_json()
        # get the information for the callback's associated payload
        payload_info = await add_all_payload_info(task.callback.registered_payload)
        rabbit_message["task"]["callback"]["build_parameters"] = payload_info[
            "build_parameters"
        ]
        rabbit_message["task"]["callback"]["c2info"] = payload_info["c2info"]
        rabbit_message["task"]["token"] = task.token.to_json() if task.token is not None else None
        rabbit_message["subtask_group_name"] = subtask_group_name
        rabbit_message["function_name"] = function_name
        rabbit_message["subtask"] = subtask.to_json() if subtask is not None else None
        tags = await app.db_objects.execute(db_model.tasktag_query.where(db_model.TaskTag.task == task))
        rabbit_message["task"]["tags"] = [t.tag for t in tags]
        # by default tasks are created in a preprocessing state,
        result = await send_pt_rabbitmq_message(
            task.callback.registered_payload.payload_type.ptype,
            "task_callback_function",
            base64.b64encode(js.dumps(rabbit_message).encode()).decode("utf-8"),
            username,
            task.id
        )
        if result["status"] == "error" and "type" in result:
            task.callback.registered_payload.payload_type.container_running = False
            task.callback.registered_payload.payload_type.container_count = 0
            await app.db_objects.update(task.callback.registered_payload.payload_type)
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
        build_params = await app.db_objects.execute(
            db_model.buildparameterinstance_query.where(db_model.BuildParameterInstance.payload == payload)
        )
        for bp in build_params:
            build_parameters[bp.build_parameter.name] = bp.parameter
        rabbit_message["build_parameters"] = build_parameters
        # cache it for later
        cached_payload_info[payload.uuid]["build_parameters"] = build_parameters
        c2_profile_parameters = []
        payloadc2profiles = await app.db_objects.execute(
            db_model.payloadc2profiles_query.where(db_model.PayloadC2Profiles.payload == payload)
        )
        for pc2p in payloadc2profiles:
            # for each profile, we need to get all of the parameters and supplied values for just that profile
            param_dict = {}
            c2_param_instances = await app.db_objects.execute(
                db_model.c2profileparametersinstance_query.where(
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
        stamped_commands = await app.db_objects.execute(db_model.payloadcommand_query.where(
            db_model.PayloadCommand.payload == payload
        ))
        commands = [c.command.cmd for c in stamped_commands]
        rabbit_message["commands"] = commands
        cached_payload_info[payload.uuid]["commands"] = commands
    return rabbit_message


async def add_command_attack_to_task(task, command):
    try:
        attack_mappings = await app.db_objects.execute(
            db_model.attackcommand_query.where(ATTACKCommand.command == command)
        )
        for attack in attack_mappings:
            try:
                # try to get the query, if it doens't exist, then create it in the exception
                await app.db_objects.get(db_model.attacktask_query, task=task, attack=attack.attack)
            except Exception as e:
                attack = await app.db_objects.create(ATTACKTask, task=task, attack=attack.attack)
                asyncio.create_task(log_to_siem(mythic_object=attack, mythic_source="task_mitre_attack"))
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
        callback = await app.db_objects.get(db_model.callback_query, id=cid)
        operation = await app.db_objects.get(db_model.operation_query, id=callback.operation)
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "failed to get callback or operation"}
    if operation.name in user["operations"]:
        # Get all tasks that have a status of submitted or processing
        tasks = await app.db_objects.prefetch(
            db_model.task_query.where(
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


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/tags/<tid:int>",
    methods=["PUT"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_task(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot adjust tags on tasks"}
        )
    try:
        data = request.json
        if "tags" not in data:
            return json({"status": "error", "error": "tags is a required field"})
        task = await app.db_objects.get(db_model.task_query, id=tid)
        if task.callback.operation.name in user["operations"] or task.callback.operation.name in user["admin_operations"] or user["admin"]:
            status = await add_tags_to_task(task, data["tags"])
            return json(status)
        return json({"status": "success"})
    except Exception as e:
        return json({"status": "error", "error": str(e)})


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/add_tags/",
    methods=["PUT"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_tasks_with_tags(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot adjust tags on tasks"}
        )
    try:
        data = request.json
        if "tags" not in data:
            return json({"status": "error", "error": "tags is a required field"})
        if "tasks" not in data:
            return json({"status": "error", "error": "tasks is a required array of task ids"})
        operation = await app.db_objects.get(db_model.operation_query, name=user['current_operation'])
        tasks = await app.db_objects.execute(db_model.task_query.where(
            (db_model.Callback.operation == operation) &
            (db_model.Task.id.in_(data["tasks"]))
        ))
        errors = ""
        status = "success"
        for t in tasks:
            ret_status = await add_tags_to_task(t, data["tags"][:])
            if ret_status["status"] == "error":
                status = "error"
                errors += ret_status["error"] + "\n"
        if status == "success":
            return json({"status": "success"})
        else:
            return json({"status": "error", "error": errors})
    except Exception as e:
        return json({"status": "error", "error": str(e)})


@mythic.route(
    mythic.config["API_BASE"] + "/tasks/tags/<tid:int>",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_task_tags(request, tid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot adjust tags on tasks"}
        )
    try:
        task = await app.db_objects.get(db_model.task_query, id=tid)
        if task.callback.operation.name in user["operations"] or task.callback.operation.name in user["admin_operations"] or user["admin"]:
            tags = await app.db_objects.execute(db_model.tasktag_query.where(
                db_model.TaskTag.task == task
            ))
            return json({"status": "success", "tags": [t.tag for t in tags]})
        else:
            return json({"status": "error", "error": "Not authorized to view task"})
    except Exception as e:
        return json({"status": "error", "error": str(e)})


async def add_tags_to_task(task: Task, tags: [str]):
    try:
        # get all of the tags that exist for the task
        original_tags = await app.db_objects.execute(db_model.tasktag_query.where(
            db_model.TaskTag.task == task
        ))
        for tag in original_tags:
            if tag.tag not in tags:
                await app.db_objects.delete(tag)
            else:
                tags.remove(tag.tag)
        for t in tags:
            if t != "" and t is not None:
                await app.db_objects.create(db_model.TaskTag, task=task, tag=t, operation=task.callback.operation)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def remove_tag_from_task(task: Task, tag: str):
    try:
        desiredTag = await app.db_objects.get(db_model.tasktag_query, task=task, tag=tag)
        await app.db_objects.delete(desiredTag)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": "Failed to find task and tag combination"}


async def clear_tasks_for_callback_func(data, cid, user):
    try:
        callback = await app.db_objects.get(db_model.callback_query, id=cid)
        operation = await app.db_objects.get(db_model.operation_query, id=callback.operation)

        tasks_removed = []
        if "all" == data["task"]:
            tasks = await app.db_objects.prefetch(
                db_model.task_query.where(
                    (Task.callback == callback) & (Task.completed == False)
                ).order_by(Task.timestamp),
                Command.select(),
            )
        elif len(data["task"]) > 0:
            #  if the user specifies a task, make sure that it's not being processed or already done
            tasks = await app.db_objects.prefetch(
                db_model.task_query.where((Task.id == data["task"]) & (Task.completed == False)),
                Command.select(),
            )
        else:
            # if you don't actually specify a task, remove the the last task that was entered
            tasks = await app.db_objects.prefetch(
                db_model.task_query.where((Task.completed == False) & (Task.callback == callback))
                .order_by(-Task.timestamp)
                .limit(1),
                Command.select(),
            )
        for t in list(tasks):
            if operation.name == user.current_operation.name:
                logger.warn("operation.name == user.current_op")
                try:
                    t_removed = t.to_json()
                    # don't actually delete it, just mark it as completed with a response of "CLEARED TASK"
                    t.status = "cleared"
                    t.status_processed_timestamp = datetime.utcnow()
                    t.status_processing_timestamp = t.status_processed_timestamp
                    t.completed = True
                    t.timestamp = datetime.utcnow()
                    await app.db_objects.update(t)
                    await check_and_issue_task_callback_functions(t)
                    # we need to adjust all of the things associated with this task now since it didn't actually happen
                    # find/remove ATTACKTask, TaskArtifact, FileMeta
                    attack_tasks = await app.db_objects.execute(
                        db_model.attacktask_query.where(ATTACKTask.task == t)
                    )
                    for at in attack_tasks:
                        await app.db_objects.delete(at, recursive=True)
                    task_artifacts = await app.db_objects.execute(
                        db_model.taskartifact_query.where(TaskArtifact.task == t)
                    )
                    for ta in task_artifacts:
                        await app.db_objects.delete(ta, recursive=True)
                    file_metas = await app.db_objects.execute(
                        db_model.filemeta_query.where(FileMeta.task == t)
                    )
                    for fm in file_metas:
                        os.remove(fm.path)
                        await app.db_objects.delete(fm, recursive=True)
                    # now create the response so it's easy to track what happened with it
                    response = "CLEARED TASK by " + user.username
                    await app.db_objects.create(Response, task=t, response=response)
                    tasks_removed.append(t_removed)
                except Exception as e:
                    logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    return {
                        "status": "error",
                        "error": "failed to delete task: " + t.command.cmd,
                    }
        return {"status": "success", "tasks_removed": tasks_removed}
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
        task = await app.db_objects.prefetch(db_model.task_query.where(Task.id == tid), db_model.command_query)
        task = list(task)[0]
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {"status": "error", "error": "failed to find that task: " + str(tid)}
        )
    try:
        if task.callback.operation.name in user["operations"] or user["admin"]:
            responses = await app.db_objects.prefetch(
                db_model.response_query.where(Response.task == task).order_by(Response.id),
                db_model.task_query
            )
            callback = await app.db_objects.prefetch(db_model.callback_query.where(Callback.id == task.callback), db_model.CallbackToken.select())
            callback = list(callback)[0]
            # get all artifacts associated with the task
            artifacts = await app.db_objects.execute(db_model.taskartifact_query.where(
                db_model.TaskArtifact.task == task
            ))
            # get all files associated with the task
            files = await app.db_objects.execute(db_model.filemeta_query.where(
                db_model.FileMeta.task == task
            ))
            # get all credentials associated with the task
            credentials = await app.db_objects.execute(db_model.credential_query.where(
                db_model.Credential.task == task
            ))
            attack = await app.db_objects.execute(db_model.attacktask_query.where(
                db_model.ATTACKTask.task == task
            ))
            subtasks = await app.db_objects.execute(db_model.task_query.where(
                db_model.Task.parent_task == task
            ))
            task_json = task.to_json()
            task_json["callback"] = {"user": task.callback.user,
                                     "host": task.callback.host,
                                     "id": task.callback.id,
                                     "integrity_level": task.callback.integrity_level,
                                     "domain": task.callback.domain}
            subtask_json = []
            for s in subtasks:
                subtask_json.append({
                    **s.to_json(), "callback": {"user": s.callback.user,
                                     "host": s.callback.host,
                                     "id": s.callback.id,
                                     "integrity_level": s.callback.integrity_level,
                                     "domain": s.callback.domain}
                })
            return json(
                {
                    "status": "success",
                    "callback": callback.to_json(),
                    "task": task_json,
                    "responses": [r.to_json() for r in responses],
                    "artifacts": [a.to_json() for a in artifacts],
                    "files": [f.to_json() for f in files],
                    "credentials": [c.to_json() for c in credentials],
                    "attack": [a.to_json() for a in attack],
                    "subtasks": subtask_json
                }
            )
        else:
            return json(
                {"status": "error", "error": "you don't have access to that task"}
            )
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "Failed to fetch task: "
                + str(sys.exc_info()[-1].tb_lineno)
                + " "
                + str(e),
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/tasks/by_tag", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_tasks_by_tag(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        data = request.json
        if "tag" not in data:
            return json({"status": "error", "error": "missing tags field"})
        tasks = await app.db_objects.execute(db_model.tasktag_query.where(
            (db_model.TaskTag.operation == operation) &
            (db_model.TaskTag.tag == data["tag"])
        ).order_by(Task.id))
        task_info = []
        task_ids = []
        for t in tasks:
            task_ids.append(t.task.id)
            task_info.append({**t.task.to_json(), "callback": {"user": t.task.callback.user,
                                                               "host": t.task.callback.host,
                                                               "id": t.task.callback.id,
                                                               "integrity_level": t.task.callback.integrity_level,
                                                               "domain": t.task.callback.domain}})
        # get all artifacts associated with the task
        artifacts = await app.db_objects.execute(db_model.taskartifact_query.where(
            db_model.TaskArtifact.task.id.in_(task_ids)
        ).order_by(db_model.TaskArtifact.task.id))
        # get all files associated with the task
        files = await app.db_objects.execute(db_model.filemeta_query.where(
            db_model.FileMeta.task.id.in_(task_ids)
        ))
        # get all credentials associated with the task
        credentials = await app.db_objects.execute(db_model.credential_query.where(
            db_model.Credential.task.id.in_(task_ids)
        ))
        attack = await app.db_objects.execute(db_model.attacktask_query.where(
            db_model.ATTACKTask.task.id.in_(task_ids)
        ).distinct(db_model.ATTACK.t_num).order_by(db_model.ATTACK.t_num))
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {"status": "error", "error": "failed to find that tag: " + str(e)}
        )
    try:
        return json({"status": "success",
                     "tasks": task_info,
                     "artifacts": [a.to_json() for a in artifacts],
                     "files": [f.to_json() for f in files],
                     "credentials": [c.to_json() for c in credentials],
                     "attack": [a.to_json() for a in attack]
                     })
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "Failed to fetch task: "
                + str(sys.exc_info()[-1].tb_lineno)
                + " "
                + str(e),
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/tags/delete", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_tag_on_tasks(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        data = request.json
        if "tag" not in data:
            return json({"status": "error", "error": "missing tags field"})
        if "tasks" not in data:
            return json({"status": "error", "error": "missing tasks array"})
        tasks = await app.db_objects.execute(db_model.task_query.where(
            (db_model.Callback.operation == operation) &
            (db_model.Task.id.in_(data["tasks"]))
        ))
        status = "success"
        error = ""
        for t in tasks:
            status_resp = await remove_tag_from_task(t, data["tag"])
            if status_resp["status"] == "error":
                error += status_resp["status"] + "\n"
                status = "error"
        if status == "error":
            return json({"status": "error", "error": error})
        else:
            return json({"status": "success"})
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "Failed to fetch task: "
                + str(sys.exc_info()[-1].tb_lineno)
                + " "
                + str(e),
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/tasks/by_range", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_tasks_by_ranges(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        data = request.json
        tasks_before = []
        tasks_after = []
        task = None
        before = 0
        after = 0
        if "after" in data:
            after = int(data["after"])
        if "before" in data:
            before = int(data["before"])
        if "tasks" not in data:
            return json({"status": "error", "error": "missing tasks field"})
        elif len(data["tasks"]) > 1 or (len(data["tasks"]) == 1 and "-" in data["tasks"][0]):
            # we're just getting a set of tasks
            task_ids_to_pull = []
            for t in data["tasks"]:
                if "-" in t:
                    low, high = map(int, t.split("-"))
                    task_ids_to_pull += range(low, high+1)
                else:
                    task_ids_to_pull.append(int(t))
            tasks_before = await app.db_objects.execute(db_model.task_query.where(
                (db_model.Callback.operation == operation) &
                (db_model.Task.id.in_(task_ids_to_pull))
            ).order_by(-db_model.Task.id))
        elif len(data["tasks"]) == 1 and "-" not in data["tasks"][0]:
            # this means we have a base task and want to search around it
            if "search" not in data:
                data["search"] = "callback"
            task = await app.db_objects.get(db_model.task_query, id=data["tasks"][0])
            if task.callback.operation.name != operation.name:
                return json({"status": "error", "error": "Task not in your operation"})
            if data["search"] == "all":
                tasks_before = await app.db_objects.execute(db_model.task_query.where(
                    (db_model.Callback.operation == operation) &
                    (db_model.Task.id < task.id)
                ).order_by(-db_model.Task.id).limit(before))
                tasks_after = await app.db_objects.execute(db_model.task_query.where(
                    (db_model.Callback.operation == operation) &
                    (db_model.Task.id > task.id)
                ).order_by(db_model.Task.id).limit(after))
            elif data["search"] == "callback":
                tasks_before = await app.db_objects.execute(db_model.task_query.where(
                    (db_model.Callback.operation == operation) &
                    (db_model.Task.callback == task.callback) &
                    (db_model.Task.id < task.id)
                ).order_by(-db_model.Task.id).limit(before))
                tasks_after = await app.db_objects.execute(db_model.task_query.where(
                    (db_model.Callback.operation == operation) &
                    (db_model.Task.callback == task.callback) &
                    (db_model.Task.id > task.id)
                ).order_by(db_model.Task.id).limit(after))
            else:
                try:
                    search_operator = await app.db_objects.get(db_model.operator_query, username=data["search"])
                except Exception as search_exception:
                    return json({"status": "error", "error": "Unknown operator"})
                tasks_before = await app.db_objects.execute(db_model.task_query.where(
                    (db_model.Callback.operation == operation) &
                    (db_model.Task.operator == search_operator) &
                    (db_model.Task.id < task.id)
                ).order_by(-db_model.Task.id).limit(before))
                tasks_after = await app.db_objects.execute(db_model.task_query.where(
                    (db_model.Callback.operation == operation) &
                    (db_model.Task.operator == search_operator) &
                    (db_model.Task.id > task.id)
                ).order_by(db_model.Task.id).limit(after))
        else:
            return json({"status": "error", "error": "tasks must be an array of at least one task id"})
        task_info = []
        task_ids = []
        for t in tasks_before:
            task_ids.append(t.id)
            task_info.insert(0, {**t.to_json(), "callback": {"user": t.callback.user,
                                                               "host": t.callback.host,
                                                               "id": t.callback.id,
                                                               "integrity_level": t.callback.integrity_level,
                                                               "domain": t.callback.domain}})
        if task is not None:
            task_ids.append(task.id)
            task_info.append({**task.to_json(), "callback": {"user": task.callback.user,
                                                             "host": task.callback.host,
                                                             "id": task.callback.id,
                                                             "integrity_level": task.callback.integrity_level,
                                                             "domain": task.callback.domain}})
        for t in tasks_after:
            task_ids.append(t.id)
            task_info.append({**t.to_json(), "callback": {"user": t.callback.user,
                                                               "host": t.callback.host,
                                                               "id": t.callback.id,
                                                               "integrity_level": t.callback.integrity_level,
                                                               "domain": t.callback.domain}})
        # get all artifacts associated with the task
        artifacts = await app.db_objects.execute(db_model.taskartifact_query.where(
            db_model.TaskArtifact.task.id.in_(task_ids)
        ).order_by(db_model.TaskArtifact.task.id))
        # get all files associated with the task
        files = await app.db_objects.execute(db_model.filemeta_query.where(
            db_model.FileMeta.task.id.in_(task_ids)
        ))
        # get all credentials associated with the task
        credentials = await app.db_objects.execute(db_model.credential_query.where(
            db_model.Credential.task.id.in_(task_ids)
        ))
        attack = await app.db_objects.execute(db_model.attacktask_query.where(
            db_model.ATTACKTask.task.id.in_(task_ids)
        ).distinct(db_model.ATTACK.t_num).order_by(db_model.ATTACK.t_num))
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {"status": "error", "error": "failed to search tasks: " + str(e)}
        )
    try:
        return json({"status": "success",
                     "tasks": task_info,
                     "artifacts": [a.to_json() for a in artifacts],
                     "files": [f.to_json() for f in files],
                     "credentials": [c.to_json() for c in credentials],
                     "attack": [a.to_json() for a in attack]
                     })
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "Failed to fetch task: "
                + str(sys.exc_info()[-1].tb_lineno)
                + " "
                + str(e),
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/tasks/tags", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_tags(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        tags = await app.db_objects.execute(db_model.tasktag_query.where(
            (db_model.TaskTag.operation == operation)
        ).order_by(db_model.TaskTag.tag).distinct(db_model.TaskTag.tag))
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {"status": "error", "error": "failed to find tags: " + str(e)}
        )
    try:
        return json({"status": "success", "tags": [t.tag for t in tags]})
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "Failed to fetch tags: "
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
        task = await app.db_objects.prefetch(db_model.task_query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        if task.callback.operation.name in user["operations"]:
            responses = await app.db_objects.execute(
                db_model.response_query.where(Response.task == task).order_by(Response.id)
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
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
        task = await app.db_objects.prefetch(db_model.task_query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        data = request.json
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        if task.callback.operation.name in user["operations"]:
            if "comment" in data:
                task.comment = data["comment"]
                task.comment_operator = operator
                await app.db_objects.update(task)
                asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_comment"))
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
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
        task = await app.db_objects.prefetch(db_model.task_query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        if task.callback.operation.name in user["operations"]:
            task.comment = ""
            task.comment_operator = operator
            await app.db_objects.update(task)
            asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_comment"))
            return json({"status": "success", "task": task.to_json()})
        else:
            return json(
                {"status": "error", "error": "you don't have access to that task"}
            )
    except Exception as e:
        logger.warning("task_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "failed to find that task"})
