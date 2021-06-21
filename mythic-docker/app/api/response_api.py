from app import mythic
import app
from sanic.response import json
from app.database_models.model import (
    Task,
    Response,
    Callback,
    Keylog,
    TaskArtifact,
    Artifact,
    Command,
)
from sanic_jwt.decorators import scoped, inject_user
from app.api.file_api import (
    create_filemeta_in_database_func,
    download_file_to_disk_func,
)
from app.api.credential_api import create_credential_func
import ujson as js
import datetime
import app.database_models.model as db_model
import sys
from sanic.exceptions import abort
from math import ceil
from peewee import fn
from app.api.siem_logger import log_to_siem
from app.api.file_browser_api import add_upload_file_to_file_browser, mark_nested_deletes
import asyncio
from app.api.rabbitmq_api import send_pt_rabbitmq_message
from app.api.task_api import add_all_payload_info
from app.api.operation_api import send_all_operations_message
from app.api.rabbitmq_api import create_processes
from app.api.task_api import check_and_issue_task_callback_functions
from sanic.log import logger
from app.api.file_api import download_agent_file


# This gets all responses in the database
@mythic.route(mythic.config["API_BASE"] + "/responses/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_responses(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        responses = []
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        callbacks = await app.db_objects.execute(
            db_model.callback_query.where(Callback.operation == operation)
        )
        for c in callbacks:
            tasks = await app.db_objects.prefetch(
                db_model.task_query.where(Task.callback == c), Command.select()
            )
            for t in tasks:
                task_responses = await app.db_objects.execute(
                    db_model.response_query.where(Response.task == t)
                )
                responses += [r.to_json() for r in task_responses]
    except Exception as e:
        logger.warning("response_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "Cannot get responses: " + str(e)})
    return json(responses)


@mythic.route(
    mythic.config["API_BASE"] + "/responses/by_task/<tid:int>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_responses_for_task(request, user, tid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        task = await app.db_objects.get(db_model.task_query, id=tid)
    except Exception as e:
        return json({"status": "error", "error": "failed to get operation or task"})
    responses = await app.db_objects.execute(
        db_model.response_query.where(Response.task == task).order_by(Response.id)
    )
    return json([r.to_json() for r in responses])


# Get a single response
@mythic.route(mythic.config["API_BASE"] + "/responses/<rid:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_response(request, user, rid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        resp = await app.db_objects.get(db_model.response_query, id=rid)
        cb = await app.db_objects.get(db_model.callback_query.where(Callback.id == resp.task.callback))
        if cb.operation.name == user["current_operation"]:
            return json(resp.to_json())
        else:
            return json(
                {
                    "status": "error",
                    "error": "that task isn't in your current operation",
                }
            )
    except Exception as e:
        return json({"status": "error", "error": "Cannot get that response"})


@mythic.route(mythic.config["API_BASE"] + "/responses/search", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def search_responses(request, user):
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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "Cannot get that response"})
    try:
        count = await app.db_objects.count(
            db_model.response_query
            .where(fn.encode(Response.response, "escape").regexp(data["search"]))
            .switch(Task)
            .where(Callback.operation == operation)
            .order_by(Task.id)
            .distinct(Task.id)
        )
        if "page" not in data:
            # allow a blanket search to still be performed
            responses = await app.db_objects.execute(
                db_model.response_query
                .where(fn.encode(Response.response, "escape").regexp(data["search"]))
                .switch(Task)
                .where(Callback.operation == operation)
                .order_by(Task.id)
                .distinct(Task.id)
            )
            data["page"] = 1
            data["size"] = count
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
            responses = await app.db_objects.execute(
                db_model.response_query
                .where(fn.encode(Response.response, "escape").regexp(data["search"]))
                .switch(Task)
                .where(Callback.operation == operation)
                .order_by(Task.id)
                .distinct(Task.id)
                .paginate(data["page"], data["size"])
            )
        output = []
        for r in responses:
            setup = await app.db_objects.execute(
                db_model.response_query.where(Response.task == r.task).order_by(Response.id)
            )
            # do an extra query here for task data so that we aren't doing a bunch of sync queries when we do .to_json
            task = await app.db_objects.get(db_model.task_query, id=r.task.id)
            output.append({**task.to_json(), "response": [s.to_json(include_task=False) for s in setup]})
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
        logger.warning("response_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "bad regex syntax"})


async def post_agent_response(agent_message, callback):
    # { INPUT
    # "action": "post_response",
    # "responses": [
    #    {
    #      "task_id": "uuid of task",
    #      ... response parameters
    #     }
    #   ]
    # }
    # { RESPONSE
    #   "action": "post_response",
    #   "responses": [
    #       {
    #           "task_id": "success" or "error",
    #           "error": "error message if task_id is error"
    #           ...: ... // additional data as needed, such as file_id
    #       }
    #   ]
    # }
    response_message = {"action": "post_response", "responses": []}

    for r in agent_message["responses"]:
        #print(r)
        try:
            task_id = r["task_id"]
            del r["task_id"]
            parsed_response = r
            try:
                task = await app.db_objects.prefetch(db_model.task_query.where(db_model.Task.agent_task_id == task_id),
                                                     db_model.callback_query,
                                                     db_model.callbacktoken_query)
                task = list(task)[0]
            except Exception as e:
                asyncio.create_task(
                    send_all_operations_message(message=f"Failed to find task: {task_id}",
                                                level="warning", source="process_list", operation=callback.operation))
                response_message["responses"].append(
                    {task_id: "error", "error": "failed to find task or callback"}
                )
                continue
            json_return_info = {"status": "success", "task_id": task_id}
            final_output = ""  # we're resetting it since we're going to be doing some processing on the response
            marked_as_complete = False
            try:
                try:
                    if "completed" in parsed_response:
                        if parsed_response["completed"]:
                            task.completed = True
                            marked_as_complete = True
                            asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_completed"))
                        parsed_response.pop("completed", None)
                    if "user_output" in parsed_response:
                        if parsed_response["user_output"] is not None:
                            final_output += str(parsed_response["user_output"])
                        parsed_response.pop("user_output", None)
                    if "file_browser" in parsed_response:
                        if (
                            parsed_response["file_browser"] != {}
                            and parsed_response["file_browser"] is not None
                        ):
                            # load this information into filebrowserobj entries for later parsing
                            from app.api.file_browser_api import (
                                store_response_into_filebrowserobj,
                            )
                            asyncio.create_task(store_response_into_filebrowserobj(
                                task.callback.operation, task, parsed_response["file_browser"]
                            ))
                        parsed_response.pop("file_browser", None)
                    if "removed_files" in parsed_response:
                        # an agent is reporting back that a file was removed from disk successfully
                        if (
                            parsed_response["removed_files"] is not None
                            and parsed_response["removed_files"] != []
                            and parsed_response["removed_files"] != ""
                        ):
                            for f in parsed_response["removed_files"]:
                                if "host" not in f or f["host"] == "":
                                    f["host"] = task.callback.host
                                # we want to see if there's a filebrowserobj that matches up with the removed files
                                try:
                                    fobj = await app.db_objects.get(
                                        db_model.filebrowserobj_query,
                                        operation=task.callback.operation,
                                        host=f["host"].upper(),
                                        full_path=f["path"].encode('utf-8'),
                                        deleted=False,
                                    )
                                    fobj.deleted = True
                                    if not fobj.is_file:
                                        asyncio.create_task(mark_nested_deletes(fobj, task.callback.operation))
                                    await app.db_objects.update(fobj)
                                except Exception as e:
                                    pass
                        parsed_response.pop("removed_files", None)
                    if "total_chunks" in parsed_response:
                        # we're about to create a record in the db for a file that's about to be send our way
                        if parsed_response["total_chunks"] is not None and \
                                str(parsed_response["total_chunks"]) != "" and\
                                parsed_response["total_chunks"] >= 0:
                            parsed_response["task"] = task.id
                            if app.debugging_enabled:
                                await send_all_operations_message(
                                    message=f"Agent sent 'total_chunks' in a response, starting a file 'Download' from agent to Mythic",
                                    level="info", source="debug", operation=task.callback.operation)
                            rsp = await create_filemeta_in_database_func(parsed_response)
                            parsed_response.pop("task", None)
                            if rsp["status"] == "success":
                                # update the response to indicate we've created the file meta data
                                rsp.pop("status", None)
                                download_data = (
                                    js.dumps(
                                        rsp,
                                        sort_keys=True,
                                        indent=2,
                                    )
                                )
                                await app.db_objects.create(
                                    Response, task=task, response=download_data
                                )
                                json_return_info = {
                                    **json_return_info,
                                    "file_id": rsp["agent_file_id"],
                                }
                            else:
                                final_output += rsp["error"]
                                json_return_info["status"] = "error"
                                json_return_info["error"] = json_return_info["error"] + " " + rsp[
                                    "error"] if "error" in json_return_info else rsp["error"]
                        parsed_response.pop("total_chunks", None)
                        parsed_response.pop("is_screenshot", None)
                    if "chunk_data" in parsed_response:
                        if parsed_response["chunk_data"] is not None and str(parsed_response["chunk_data"]) != "":
                            if (
                                "file_id" not in parsed_response
                                and "file_id" in json_return_info
                            ):
                                # allow agents to post the initial chunk data with initial metadata
                                parsed_response["file_id"] = json_return_info["file_id"]
                            if app.debugging_enabled:
                                await send_all_operations_message(
                                    message=f"in 'Download', agent sent new chunk_data",
                                    level="info", source="debug", operation=task.callback.operation)
                            rsp = await download_file_to_disk_func(parsed_response)
                            if rsp["status"] == "error":
                                json_return_info["status"] = "error"
                                json_return_info["error"] = json_return_info["error"] + " " + rsp[
                                    "error"] if "error" in json_return_info else rsp["error"]
                        parsed_response.pop("chunk_num", None)
                        parsed_response.pop("chunk_data", None)
                    if "keystrokes" in parsed_response:
                        if parsed_response["keystrokes"] is not None and parsed_response["keystrokes"] != "":
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
                            rsp = await app.db_objects.create(
                                Keylog,
                                task=task,
                                window=parsed_response["window_title"],
                                keystrokes=parsed_response["keystrokes"].encode("utf-8"),
                                operation=task.callback.operation,
                                user=parsed_response["user"],
                            )
                            asyncio.create_task(log_to_siem(mythic_object=rsp, mythic_source="keylog_new"))
                        parsed_response.pop("window_title", None)
                        parsed_response.pop("user", None)
                        parsed_response.pop("keystrokes", None)
                    if "credentials" in parsed_response:
                        if parsed_response["credentials"] is not None and str(parsed_response["credentials"]) != "":
                            for cred in parsed_response["credentials"]:
                                cred["task"] = task
                                asyncio.create_task(create_credential_func(
                                    task.operator, task.callback.operation, cred
                                ))
                        parsed_response.pop("credentials", None)
                    if "artifacts" in parsed_response:
                        # now handle the case where the agent is reporting back artifact information
                        if parsed_response["artifacts"] is not None and str(parsed_response["artifacts"]) != "":
                            for artifact in parsed_response["artifacts"]:
                                try:
                                    try:
                                        base_artifact = await app.db_objects.get(
                                            db_model.artifact_query, name=artifact["base_artifact"]
                                        )
                                    except Exception as e:
                                        base_artifact = await app.db_objects.create(
                                            Artifact,
                                            name=artifact["base_artifact"],
                                            description="Auto created from task {}".format(
                                                task.id
                                            ),
                                        )
                                    # you can report back multiple artifacts at once, no reason to make separate C2 requests
                                    art = await app.db_objects.create(
                                        TaskArtifact,
                                        task=task,
                                        artifact_instance=str(artifact["artifact"]).encode("utf-8"),
                                        artifact=base_artifact,
                                        host=task.callback.host.upper(),
                                    )
                                    asyncio.create_task(log_to_siem(mythic_object=art, mythic_source="artifact_new"))
                                    # final_output += "\nAdded artifact {}".format(str(artifact['artifact']))
                                except Exception as e:
                                    final_output += (
                                        "\nFailed to work with artifact: "
                                        + str(artifact)
                                        + " due to: "
                                        + str(e)
                                    )
                                    json_return_info["status"] = "error"
                                    json_return_info["error"] = json_return_info["error"] + " " + str(e) if "error" in json_return_info else str(e)
                        parsed_response.pop("artifacts", None)
                    if "processes" in parsed_response:
                        if parsed_response["processes"] != "" and parsed_response["processes"] is not None:
                            asyncio.create_task(create_processes({"processes": parsed_response["processes"]}, task))
                    if "status" in parsed_response:
                        if parsed_response["status"] != "" and parsed_response["status"] is not None:
                            task.status = str(parsed_response["status"]).lower()
                            if task.status_timestamp_processed is None:
                                task.status_timestamp_processed = datetime.datetime.utcnow()
                            if task.status == "error":
                                task.completed = True
                                marked_as_complete = True
                            elif task.status == "completed" or task.status == "complete":
                                task.completed = True
                                marked_as_complete = True
                        else:
                            if task.status_timestamp_processed is None:
                                task.status_timestamp_processed = datetime.datetime.utcnow()
                            if task.status == "processing":
                                task.status = "processed"
                        parsed_response.pop("status", None)
                    else:
                        if task.status_timestamp_processed is None:
                            task.status_timestamp_processed = datetime.datetime.utcnow()
                        if task.status == "processing":
                            task.status = "processed"
                    if (
                        "full_path" in parsed_response
                        and "file_id" in parsed_response
                        and parsed_response["file_id"] != ""
                        and parsed_response["full_path"] != ""
                        and parsed_response["full_path"] is not None
                        and parsed_response["file_id"] is not None
                    ):
                        # updating the full_path field of a file object after the initial checkin for it
                        if app.debugging_enabled:
                            await send_all_operations_message(
                                message=f"Processing agent response, got file_id, {parsed_response['file_id']}, and a full path, {parsed_response['full_path']}. Going to try to associate them.",
                                level="info", source="debug", operation=task.callback.operation)
                        try:
                            file_meta = await app.db_objects.get(
                                db_model.filemeta_query, agent_file_id=parsed_response["file_id"], operation=task.callback.operation
                            )
                            if "host" in parsed_response and parsed_response["host"] is not None and parsed_response["host"] != "":
                                host = parsed_response["host"]
                            else:
                                host = task.callback.host
                            if file_meta.task is None or file_meta.task != task:
                                # print("creating new file")
                                f = await app.db_objects.create(
                                    db_model.FileMeta,
                                    task=task,
                                    host=host.upper(),
                                    total_chunks=file_meta.total_chunks,
                                    chunks_received=file_meta.chunks_received,
                                    chunk_size=file_meta.chunk_size,
                                    complete=file_meta.complete,
                                    path=file_meta.path,
                                    full_remote_path=parsed_response["full_path"].encode("utf-8"),
                                    operation=task.callback.operation,
                                    md5=file_meta.md5,
                                    sha1=file_meta.sha1,
                                    temp_file=False,
                                    deleted=False,
                                    operator=task.operator,
                                )
                            else:
                                file_meta.full_remote_path = parsed_response["full_path"].encode("utf-8")
                                if host != file_meta.host:
                                    file_meta.host = host.upper()
                                await app.db_objects.update(file_meta)
                                if file_meta.full_remote_path != "":
                                    if app.debugging_enabled:
                                        await send_all_operations_message(
                                            message=f"Processing agent response, associated {file_meta.agent_file_id} with {parsed_response['full_path']}, now updating file browser data",
                                            level="info", source="debug", operation=task.callback.operation)
                                    asyncio.create_task(add_upload_file_to_file_browser(task.callback.operation, task,
                                                                                        file_meta,
                                                                                        {"host": host.upper(),
                                                                                        "full_path": parsed_response["full_path"]}))
                        except Exception as e:
                            logger.warning("response_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                            if app.debugging_enabled:
                                await send_all_operations_message(
                                    message=f"Failed to associate new 'full_path' with file {parsed_response['file_id']} - {str(e)}",
                                    level="info")
                        parsed_response.pop("full_path", None)
                        parsed_response.pop("file_id", None)
                        parsed_response.pop("host", None)
                    if "edges" in parsed_response:
                        if parsed_response["edges"] != "" and parsed_response["edges"] != [] \
                                and parsed_response["edges"] is not None:
                            try:
                                from app.api.callback_api import add_p2p_route

                                asyncio.create_task(add_p2p_route(
                                    parsed_response["edges"], task.callback, task
                                ))
                            except Exception as e:
                                print(str(e))
                        parsed_response.pop("edges", None)
                    if "commands" in parsed_response:
                        if parsed_response["commands"] != [] and parsed_response["commands"] is not None and parsed_response["commands"] != "":
                            # the agent is reporting back that it has commands that are loaded/unloaded
                            from app.api.callback_api import load_commands_func
                            for c in parsed_response["commands"]:
                                asyncio.create_task(load_commands_func(command_dict=c,
                                                                       callback=task.callback,
                                                                       task=task))
                        parsed_response.pop("commands", None)
                    if "upload" in parsed_response:
                        if parsed_response["upload"] != {} and parsed_response["upload"] is not None and parsed_response["upload"] != "":
                            rsp = await download_agent_file(parsed_response["upload"], in_response=True, task_id=task.agent_task_id)
                            if rsp["status"] == "error":
                                json_return_info["status"] = "error"
                                json_return_info["error"] = json_return_info["error"] + " " + rsp[
                                    "error"] if "error" in json_return_info else rsp["error"]
                            else:
                                json_return_info = {**rsp, **json_return_info}
                        parsed_response.pop("upload", None)
                    if "process_response" in parsed_response and parsed_response["process_response"] != "" and parsed_response["process_response"] is not None:
                        try:
                            rabbit_message = {"params": task.params, "command": task.command.cmd}
                            rabbit_message["task"] = task.to_json()
                            rabbit_message["task"]["callback"] = task.callback.to_json()
                            # get the information for the callback's associated payload
                            payload_info = await add_all_payload_info(task.callback.registered_payload)
                            rabbit_message["task"]["callback"]["build_parameters"] = payload_info[
                                "build_parameters"
                            ]
                            rabbit_message["task"]["callback"]["c2info"] = payload_info["c2info"]
                            tags = await app.db_objects.execute(
                                db_model.tasktag_query.where(db_model.TaskTag.task == task))
                            rabbit_message["task"]["tags"] = [t.tag for t in tags]
                            rabbit_message["task"]["token"] = task.token.to_json() if task.token is not None else None
                            rabbit_message["response"] = parsed_response["process_response"]
                            if app.debugging_enabled:
                                await send_all_operations_message(
                                    message=f"Sending message to {task.callback.registered_payload.payload_type.ptype}'s container for processing of a 'process_response' message:\n{str(parsed_response['process_container'])}",
                                    level="info", source="debug", operation=task.callback.operation)
                            status = await send_pt_rabbitmq_message(payload_type=task.callback.registered_payload.payload_type.ptype,
                                                                    command="process_container",
                                                                    username="",
                                                                    reference_id=task.id,
                                                                    message_body=js.dumps(rabbit_message))
                            if status["status"] == "error" and "type" in status:
                                logger.error("response_api.py: sending process_response message: " + status["error"])
                                await app.db_objects.create(Response, task=task,
                                                            response="Container not running, failed to process process_response data, saving here")
                                await app.db_objects.create(Response, task=task, response=parsed_response["process_response"])
                                task.callback.registered_payload.payload_type.container_count = 0
                                await app.db_objects.update(task.callback.registered_payload.payload_type)
                            if status["status"] == "error":
                                logger.error("response_api.py: sending process_response message: " + status["error"])
                        except Exception as pc:
                            logger.error("response_api.py: " + str(sys.exc_info()[-1].tb_lineno) + str(pc))
                            if app.debugging_enabled:
                                await send_all_operations_message(
                                    message=f"Failed to send message to payload container:\n{str(pc)}",
                                    level="info", source="debug", operation=task.callback.operation)
                        parsed_response.pop("process_response", None)
                    parsed_response.pop("full_path", None)
                    parsed_response.pop("host", None)
                    parsed_response.pop("file_id", None)
                except Exception as e:
                    logger.warning("response_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    final_output += (
                        "Failed to process a JSON-based response with error: "
                        + str(e)
                        + " on "
                        + str(sys.exc_info()[-1].tb_lineno)
                        + "\nOriginal Output:\n"
                        + str(r)
                    )
                    json_return_info["status"] = "error"
                    json_return_info["error"] = json_return_info["error"] + " " + str(e) if "error" in json_return_info else str(e)
            except Exception as e:
                # response is not json, so just process it as normal
                asyncio.create_task(
                    send_all_operations_message(message=f"Failed to parse response data:\n{str(e)}",
                                                level="warning", source="response",
                                                operation=task.callback.operation))
                pass
            # echo back any values that the agent sent us that don't match something we're expecting
            json_return_info = {**json_return_info, **parsed_response}
            if final_output != "":
                # if we got here, then we did some sort of meta processing
                resp = await app.db_objects.create(
                    Response,
                    task=task,
                    response=final_output.encode("utf-8")
                )
                asyncio.create_task(log_to_siem(mythic_object=resp, mythic_source="response_new"))
            task.timestamp = datetime.datetime.utcnow()
            await app.db_objects.update(task)
            if marked_as_complete:
                asyncio.create_task(check_and_issue_task_callback_functions(task))
            response_message["responses"].append(json_return_info)
        except Exception as e:
            logger.warning("response_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            asyncio.create_task(
                send_all_operations_message(message=f"Failed to process response:\n{str(e)}", level="warning",
                                            source="response_meta",
                                            operation=callback.operation))
            response_message["responses"].append(
                {
                    "status": "error",
                    "error": str(e),
                    "task_id": r["task_id"] if "task_id" in r else "",
                }
            )
    if (
        "socks" in agent_message
        and agent_message["socks"] != ""
        and agent_message["socks"] != []
        and agent_message["socks"] is not None
    ):
        # since this could be in any worker, publish this data to a channel that should be listening
        app.redis_pool.publish(f"SOCKS:{callback.id}:FromAgent", js.dumps(agent_message["socks"]))
        agent_message.pop("socks", None)
    # echo back any additional parameters here as well
    for k in agent_message:
        if k not in ["action", "responses", "delegates", "socks", "edges"]:
            response_message[k] = agent_message[k]
    return response_message
