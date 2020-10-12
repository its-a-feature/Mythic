from app import mythic, db_objects
from app.database_models.model import Callback, Task, TaskArtifact, FileMeta
from sanic.response import json, file
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
import os


@mythic.route(
    mythic.config["API_BASE"] + "/analytics/command_frequency", methods=["GET", "POST"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def analytics_command_frequency_api(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json(
            {"status": "error", "error": "failed to find operation or payloads"}
        )
    request_format = {"order": "operator"}  # can order by operator or command
    if request.method == "POST":
        data = request.json
        if "order" in data and data["order"] in ["operator", "command"]:
            request_format["order"] = data["order"]
    query = await db_model.task_query()
    tasks = await db_objects.execute(query.where(Callback.operation == operation))
    output = {}
    if request_format["order"] == "operator":
        # {"mythic_admin": {"apfell": {"shell": 2, "ls": 5}, "viper": {"shell": 1} } }
        for t in tasks:
            if t.operator.username not in output:
                output[t.operator.username] = {}
            if t.command is None:
                # this is the case with things like clear or tasks commands that don't go to the agent
                payload_type = t.callback.registered_payload.payload_type.ptype
                command = t.params.split()[0]
            else:
                payload_type = t.command.payload_type.ptype
                command = t.command.cmd
            if payload_type not in output[t.operator.username]:
                output[t.operator.username][payload_type] = {"total_count": 0}
            if command not in output[t.operator.username][payload_type]:
                output[t.operator.username][payload_type][command] = 1
            else:
                output[t.operator.username][payload_type][command] += 1
            output[t.operator.username][payload_type]["total_count"] += 1
    elif request_format["order"] == "command":
        # {"apfell": { "shell": 10, "ls": 15} }
        for t in tasks:
            if t.command is None:
                # this is the case with things like clear or tasks commands that don't go to the agent
                payload_type = t.callback.registered_payload.payload_type.ptype
                command = t.params.split()[0]
            else:
                payload_type = t.command.payload_type.ptype
                command = t.command.cmd
            if payload_type not in output:
                output[payload_type] = {}
            if command not in output[payload_type]:
                output[payload_type][command] = 1
            else:
                output[payload_type][command] += 1
    return json({"status": "success", "output": output})


@mythic.route(
    mythic.config["API_BASE"] + "/analytics/callback_analysis", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def analytics_callback_analysis_api(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.callback_query()
        callbacks = await db_objects.execute(
            query.where(Callback.operation == operation)
        )
    except Exception as e:
        return json({"status": "error", "error": "failed to get artifact templates"})
    users = {}
    hosts = {}
    timings = []
    for c in callbacks:
        if c.host not in hosts:
            hosts[c.host] = {"count": 1}
        else:
            hosts[c.host]["count"] += 1
        if c.user not in users:
            users[c.user] = {"count": 1}
        else:
            users[c.user]["count"] += 1
        timings.append({"date": c.init_callback.strftime("%m/%d/%Y %H:%M:%S"),
                        "count": 1})
    hosts = [{"name": k, "count": v["count"]} for k,v in hosts.items()]
    users = [{"name": k, "count": v["count"]} for k, v in users.items()]
    return json({"status": "success", "users": users, "hosts": hosts, "timings": timings})


@mythic.route(
    mythic.config["API_BASE"] + "/analytics/artifact_overview", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def analytics_artifact_overview_api(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operation"})
    output = {
        "artifact_counts": {"total_count": 0},
        "artifact_payloads": {},
        "files": {
            "manual_uploads": {"total_count": 0, "operators": {}},
            "staged_files": 0,
            "download_files": {"total_count": 0, "operators": {}},
            "upload_files": {"total_count": 0, "operators": {}},
            "screenshots": {"total_count": 0, "operators": {}},
            "payloads": {"total_count": 0, "operators": {}},
        },
    }
    # totals for each artifact type (15 process creates, 5 file writes)
    query = await db_model.callback_query()
    callbacks = query.where(Callback.operation == operation).select(Callback.id)
    task_query = await db_model.taskartifact_query()
    artifact_tasks = await db_objects.execute(
        task_query.where(Task.callback.in_(callbacks))
    )
    manual_tasks = await db_objects.execute(
        task_query.where(
            (TaskArtifact.operation == operation) & (TaskArtifact.task == None)
        )
    )
    for t in artifact_tasks:
        artifact_name = bytes(t.artifact.name).decode()
        if artifact_name not in output["artifact_counts"]:
            output["artifact_counts"][artifact_name] = {
                "agent_reported": 0,
                "manual": 0,
            }
        if t.task is not None:  # this was automatically reported by a task
            output["artifact_counts"][artifact_name]["agent_reported"] += 1
            if artifact_name not in output["artifact_payloads"]:
                output["artifact_payloads"][artifact_name] = {}
            if t.task.command.payload_type.ptype not in output["artifact_payloads"][artifact_name]:
                output["artifact_payloads"][artifact_name][t.task.command.payload_type.ptype] = {}
            if t.task.command.cmd not in output["artifact_payloads"][artifact_name][t.task.command.payload_type.ptype]:
                output["artifact_payloads"][artifact_name][t.task.command.payload_type.ptype][t.task.command.cmd] = 0
            output["artifact_payloads"][artifact_name][t.task.command.payload_type.ptype][t.task.command.cmd] += 1
        else:
            output["artifact_counts"][artifact_name]["manual"] += 1
        output["artifact_counts"]["total_count"] += 1
    for t in manual_tasks:
        artifact_name = bytes(t.artifact.name).decode()
        if artifact_name not in output["artifact_counts"]:
            output["artifact_counts"][artifact_name] = {
                "agent_reported": 0,
                "manual": 0,
            }
        output["artifact_counts"][artifact_name]["manual"] += 1
        output["artifact_counts"]["total_count"] += 1

    query = await db_model.filemeta_query()
    files = await db_objects.execute(query.where(FileMeta.operation == operation))
    for f in files:
        if f.is_screenshot:
            if f.operator.username not in output["files"]["screenshots"]["operators"]:
                output["files"]["screenshots"]["operators"][f.operator.username] = 0
            output["files"]["screenshots"]["operators"][f.operator.username] += 1
            output["files"]["screenshots"]["total_count"] += 1
        elif f.is_payload:
            if f.operator.username not in output["files"]["payloads"]["operators"]:
                output["files"]["payloads"]["operators"][f.operator.username] = 0
            output["files"]["payloads"]["operators"][f.operator.username] += 1
            output["files"]["payloads"]["total_count"] += 1
        elif f.is_download_from_agent:
            if (
                f.operator.username
                not in output["files"]["download_files"]["operators"]
            ):
                output["files"]["download_files"]["operators"][f.operator.username] = 0
            output["files"]["download_files"]["operators"][f.operator.username] += 1
            output["files"]["download_files"]["total_count"] += 1
        elif f.delete_after_fetch:
            output["files"]["staged_files"] += 1
        elif f.task is None:
            # this means it was a manual upload
            if (
                f.operator.username
                not in output["files"]["manual_uploads"]["operators"]
            ):
                output["files"]["manual_uploads"]["operators"][f.operator.username] = 0
            output["files"]["manual_uploads"]["operators"][f.operator.username] += 1
            output["files"]["manual_uploads"]["total_count"] += 1
        else:
            if f.operator.username not in output["files"]["upload_files"]["operators"]:
                output["files"]["upload_files"]["operators"][f.operator.username] = 0
            output["files"]["upload_files"]["operators"][f.operator.username] += 1
            output["files"]["upload_files"]["total_count"] += 1
    return json({"status": "success", "output": output})


@mythic.route(
    mythic.config["API_BASE"] + "/analytics/task_frequency", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def analytics_task_frequency_api(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json(
            {"status": "error", "error": "failed to find operation"}
        )
    query = await db_model.task_query()
    tasks = await db_objects.execute(query.where(Callback.operation == operation))
    output = []
    for t in tasks:
        output.append({"date": t.status_timestamp_preprocessing.strftime("%m/%d/%Y %H:%M:%S"),
                       "count": 1})
    return json({"status": "success", "output": output})


@mythic.route(
    mythic.config["API_BASE"] + "/analytics/event_frequency", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def analytics_event_frequency_api(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json(
            {"status": "error", "error": "failed to find operation"}
        )
    query = await db_model.operationeventlog_query()
    events = await db_objects.execute(query.where(db_model.OperationEventLog.operation == operation))
    output = {"Deleted Events": 0, "Warning Events": 0, "Mythic Events": 0, "Resolved Events": 0}
    operator_specific = {"Mythic Events": {"warning": 0, "info": 0}}
    timings = []
    for e in events:
        if e.deleted:
            output["Deleted Events"] += 1
        if e.level == "warning":
            output["Warning Events"] += 1
        if e.resolved:
            output["Resolved Events"] += 1
        if e.operator is None:
            output["Mythic Events"] += 1
            operator_specific["Mythic Events"][e.level] += 1
        else:
            if e.operator.username not in output:
                output[e.operator.username] = 0
            output[e.operator.username] += 1
            if e.operator.username not in operator_specific:
                operator_specific[e.operator.username] = {"warning": 0, "info": 0}
            operator_specific[e.operator.username][e.level] += 1
        timings.append({"date": e.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
                       "count": 1})
    output = [{"name": k, "count": v} for k,v in output.items()]
    for k,v in operator_specific.items():
        operator_specific[k] = [{"name": "warning", "count": v["warning"]},
                                {"name": "info", "count": v["info"]}]
    return json({"status": "success", "output": output, "timings": timings, "operators": operator_specific})


# ------------------ endpoint for getting access or  debugging logs ------------------
@mythic.route(mythic.config["API_BASE"] + "/mythic_logs/", methods=["GET", "POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_access_log_data(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    entries = 1000
    page = 1
    total_entries = 0
    try:
        if request.method == "POST":
            data = request.json
            if "entries" in data and int(data["entries"]) > 0:
                entries = int(data["entries"])
            else:
                return json(
                    {
                        "status": "error",
                        "error": 'missing required "entries" parameter or bad value',
                    }
                )
            if "page" in data:
                page = data["page"]
        output = []
        if os.path.exists("mythic_access.log"):
            logs = open("mythic_access.log", "r")
            # for now, not efficient
            all_lines = logs.readlines()
            all_lines.reverse()
            seek_lines = entries * (page - 1)  # the number of entries we need to skip
            for line in all_lines:
                total_entries += 1
                if seek_lines > 0:  # if we still need to skip lines
                    seek_lines -= 1
                elif entries > 0:  # if we still have lines to capture
                    output.insert(0, line)
                    entries -= 1
            logs.close()
            return json(
                {
                    "status": "success",
                    "output": output,
                    "total": total_entries,
                    "page": page,
                }
            )
        else:
            return json({"status": "error", "error": "mythic_access.log doesn't exist"})
    except Exception as e:
        return json({"status": "error", "error": str(e)})


@mythic.route(mythic.config["API_BASE"] + "/mythic_logs/download", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def download_access_log_data(request, user):
    if os.path.exists("mythic_access.log"):
        return await file("mythic_access.log", filename="mythic_access.log")
    else:
        return json({"status": "error", "error": "file does not exist"})
