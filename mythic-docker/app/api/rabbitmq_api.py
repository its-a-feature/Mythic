from app import db_objects, mythic, valid_payload_container_version_bounds
import datetime
import app.database_models.model as db_model
import aio_pika
import asyncio
import base64
import ujson as json
import sys
import os
from sanic.log import logger
from app.crypto import hash_SHA1, hash_MD5
from functools import partial
import traceback
import uuid
from app.api.operation_api import send_all_operations_message
from app.api.siem_logger import log_to_siem
import operator
from peewee import reduce

# Keep track of sending sync requests to containers so we don't go crazy
sync_tasks = {}


async def rabbit_c2_callback(message: aio_pika.IncomingMessage):
    with message.process():
        pieces = message.routing_key.split(".")
        # print(pieces)
        # print(" [x] %r:%r" % (message.routing_key,message.body))
        if pieces[4] == "sync_classes":
            if pieces[5] == "":
                operator = None
            else:
                query = await db_model.operator_query()
                operator = await db_objects.get(
                    query, username=base64.b64decode(pieces[5]).decode()
                )
            from app.api.c2profiles_api import import_c2_profile_func

            try:
                status = await import_c2_profile_func(
                    json.loads(message.body.decode()), operator
                )
            except Exception as e:
                asyncio.create_task(send_all_operations_message(message="Failed Sync-ed database with {} C2 files: {}".format(
                    pieces[2], str(e)
                ), level="warning", source="sync_c2_failed"))
                return
            if status["status"] == "success":
                sync_tasks.pop(pieces[2], None)
                asyncio.create_task(send_all_operations_message(message="Successfully Sync-ed database with {} C2 files".format(
                    pieces[2]
                ), level="info", source="sync_c2_success"))
                # for a successful checkin, we need to find all non-wrapper payload types and get them to re-check in
                if status["new"]:
                    query = await db_model.payloadtype_query()
                    pts = await db_objects.execute(
                        query.where(db_model.PayloadType.wrapper == False)
                    )
                    sync_operator = "" if operator is None else operator.username
                    for pt in pts:
                        if pt.ptype not in sync_tasks:
                            sync_tasks[pt.ptype] = True
                            await send_pt_rabbitmq_message(
                                pt.ptype, "sync_classes", "", sync_operator, ""
                            )
            else:
                sync_tasks.pop(pieces[2], None)
                asyncio.create_task(send_all_operations_message(message="Failed Sync-ed database with {} C2 files: {}".format(
                    pieces[2], status["error"]
                ), level="warning", source="sync_C2_errored"))
        if pieces[1] == "status":
            try:
                query = await db_model.c2profile_query()
                profile = await db_objects.get(query, name=pieces[2], deleted=False)
                if pieces[3] == "running" and not profile.running:
                    profile.running = True
                    await db_objects.update(profile)
                    asyncio.create_task(
                        send_all_operations_message(message=f"C2 Profile {profile.name} has started", level="info", source="c2_started"))
                elif pieces[3] == "stopped" and profile.running:
                    profile.running = False
                    await db_objects.update(profile)
                    asyncio.create_task(
                        send_all_operations_message(message=f"C2 Profile {profile.name} has stopped", level="warning", source="c2_stopped"))
                # otherwise we got a status that matches the current status, just move on
            except Exception as e:
                logger.exception(
                    "Exception in rabbit_c2_callback (status): {}, {}".format(
                        pieces, str(e)
                    )
                )
                # print("Exception in rabbit_c2_callback (status): {}, {}".format(pieces, str(e)))


async def rabbit_pt_callback(message: aio_pika.IncomingMessage):
    with message.process():
        pieces = message.routing_key.split(".")
        # print(" [x] %r:%r" % (
        #    message.routing_key,
        #    message.body.decode('utf-8')
        # ))
        if pieces[1] == "status":
            if len(pieces) == 8:
                if int(pieces[7]) > valid_payload_container_version_bounds[1] or \
                        int(pieces[7]) < valid_payload_container_version_bounds[0]:
                    asyncio.create_task(
                        send_all_operations_message(
                            message="Payload container of version {} is not supported by this version of Mythic.\nThe container version must be between {} and {}".format(
                                pieces[7], str(valid_payload_container_version_bounds[0]),
                                str(valid_payload_container_version_bounds[1])
                            ), level="warning", source="bad_payload_version"))
                    return
            else:
                asyncio.create_task(
                    send_all_operations_message(
                        message="Payload container of version 1 is not supported by this version of Mythic.\nThe container version must be between {} and {}".format(
                            str(valid_payload_container_version_bounds[0]),
                            str(valid_payload_container_version_bounds[1])
                        ), level="warning", source="bad_payload_version"))
                return
            try:
                if pieces[3] == "create_payload_with_code":
                    # print(pieces)
                    # this means we should be getting back the finished payload or an error
                    query = await db_model.payload_query()
                    payload = await db_objects.get(query, uuid=pieces[4])
                    agent_message = json.loads(message.body.decode())
                    if agent_message["status"] == "success":
                        file = open(payload.file.path, "wb")
                        file.write(base64.b64decode(agent_message["payload"]))
                        file.close()
                        code = base64.b64decode(agent_message["payload"])
                        md5 = await hash_MD5(code)
                        sha1 = await hash_SHA1(code)
                        payload.file.md5 = md5
                        payload.file.sha1 = sha1
                        await db_objects.update(payload.file)
                        query = await db_model.buildparameterinstance_query()
                        current_instances = await db_objects.execute(
                            query.where(
                                db_model.BuildParameterInstance.payload == payload
                            )
                        )
                        for ci in current_instances:
                            if (
                                    ci.build_parameter.name
                                    in agent_message["build_parameter_instances"]
                            ):
                                ci.parameter = agent_message[
                                    "build_parameter_instances"
                                ][ci.build_parameter.name]
                                await db_objects.update(ci)
                                del agent_message["build_parameter_instances"][
                                    ci.build_parameter.name
                                ]
                        query = await db_model.buildparameter_query()
                        for k, v in agent_message["build_parameter_instances"].items():
                            # now create entries that were set to default in the build script that weren't supplied by the user
                            try:
                                bp = await db_objects.get(
                                    query, name=k, payload_type=payload.payload_type
                                )
                                await db_objects.create(
                                    db_model.BuildParameterInstance,
                                    parameter=v,
                                    payload=payload,
                                    build_parameter=bp,
                                )
                            except Exception as e:
                                agent_message[
                                    "message"
                                ] += "Failed to find build parameter for name {}".format(
                                    k
                                )
                    payload.build_phase = agent_message["status"]
                    payload.build_message = payload.build_message + "\n" + agent_message["message"]
                    payload.build_error = agent_message["build_error"] if "build_error" in agent_message else ""
                    await db_objects.update(payload)
                    asyncio.create_task(log_to_siem(payload.to_json(), mythic_object="payload_new"))
                elif pieces[3] == "command_transform":
                    query = await db_model.task_query()
                    task = await db_objects.get(query, id=pieces[4])
                    if pieces[5] == "error":
                        # create a response that there was an error and set task to processed
                        task.status = "error"
                        task.completed = True
                        task.timestamp = datetime.datetime.utcnow()
                        task.status_timestamp_submitted = task.timestamp
                        task.status_timestamp_processed = task.timestamp
                        await db_objects.create(
                            db_model.Response,
                            task=task,
                            response=message.body.decode("utf-8"),
                        )
                        await db_objects.update(task)
                    elif pieces[5] == "opsec_pre":
                        tmp = json.loads(message.body)
                        task.opsec_pre_blocked = tmp["opsec_pre_blocked"]
                        task.opsec_pre_message = tmp["opsec_pre_message"]
                        task.opsec_pre_bypass_role = tmp["opsec_pre_bypass_role"]
                        await db_objects.update(task)
                    elif pieces[5] == "opsec_post":
                        tmp = json.loads(message.body)
                        task.opsec_post_blocked = tmp["opsec_post_blocked"]
                        task.opsec_post_message = tmp["opsec_post_message"]
                        task.opsec_post_bypass_role = tmp["opsec_post_bypass_role"]
                        await db_objects.update(task)
                    else:
                        tmp = json.loads(message.body)
                        task.params = tmp["args"]
                        task.stdout = tmp["stdout"]
                        task.stderr = tmp["stderr"]
                        if "display_params" in tmp:
                            task.display_params = tmp["display_params"]
                        else:
                            task.display_params = task.original_params
                        task.timestamp = datetime.datetime.utcnow()
                        if pieces[5] == "success":
                            task.status = "submitted"
                        elif pieces[5] == "completed":
                            task.status = "processed"
                            task.status_timestamp_processed = task.timestamp
                            task.completed = True
                        else:
                            task.status = pieces[5]
                        task.status_timestamp_submitted = task.timestamp
                        await db_objects.update(task)
                        asyncio.create_task(log_to_siem(task.to_json(), mythic_object="task_new"))
                        asyncio.create_task(add_command_attack_to_task(task, task.command))
                elif pieces[3] == "sync_classes":
                    if pieces[6] == "":
                        # this was an auto sync from starting a container
                        operator = None
                    else:
                        operator_query = await db_model.operator_query()
                        operator = await db_objects.get(
                            operator_query,
                            username=base64.b64decode(pieces[6]).decode(),
                        )
                    sync_tasks.pop(pieces[2], None)
                    if pieces[5] == "success":
                        from app.api.payloadtype_api import import_payload_type_func
                        try:
                            status = await import_payload_type_func(
                                json.loads(message.body.decode()), operator
                            )
                            if status["status"] == "success":
                                asyncio.create_task(send_all_operations_message(
                                    message="Successfully Sync-ed database with {} payload files".format(
                                        pieces[2]
                                    ), level="info", source="payload_sync_success"))
                                if status["wrapper"] and status["new"]:
                                    query = await db_model.payloadtype_query()
                                    pts = await db_objects.execute(
                                        query.where(
                                            db_model.PayloadType.wrapper == False
                                        )
                                    )
                                    sync_operator = (
                                        "" if operator is None else operator.username
                                    )
                                    for pt in pts:
                                        if pt.ptype not in sync_tasks:
                                            sync_tasks[pt.ptype] = True
                                            logger.debug(
                                                "got sync from {}, sending sync to {}".format(pieces[2], pt.ptype))
                                            await send_pt_rabbitmq_message(
                                                pt.ptype, "sync_classes", "", sync_operator, ""
                                            )
                            else:
                                asyncio.create_task(send_all_operations_message(
                                    message="Failed Sync-ed database with {} payload files: {}".format(
                                        pieces[2], status["error"]
                                    ), level="warning", source="payload_sync_error"))
                        except Exception as i:
                            asyncio.create_task(
                                send_all_operations_message(message="Failed Sync-ed database with {} payload files: {}".format(
                                    pieces[2], status["error"]
                                ), level="warning", source="payload_sync_error"))
                    else:
                        asyncio.create_task(send_all_operations_message(
                            message="Failed getting information for payload {} with error: {}".format(
                                pieces[2], message.body.decode()
                            ), level="warning", source="payload_sync_error"))
                elif pieces[3] == "process_container":
                    task_query = await db_model.task_query()
                    task = await db_objects.get(task_query, id=pieces[4])
                    await db_objects.create(db_model.OperationEventLog, operation=task.callback.operation,
                                            message=message.body.decode("utf-8"), level="warning", source=str(uuid.uuid4()))
            except Exception as e:
                logger.exception("Exception in rabbit_pt_callback: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))


async def rabbit_pt_rpc_callback(
        exchange: aio_pika.Exchange, message: aio_pika.IncomingMessage
):
    with message.process():
        request = json.loads(message.body.decode())
        if "task_id" not in request:
            response = json.dumps(
                {"status": "error", "error": "Missing task_id"}
            ).encode("utf-8")
        else:
            try:
                task_query = await db_model.task_query()
                task = await db_objects.get(task_query, id=request["task_id"])
                if "action" in request:
                    if request["action"] == "register_file":
                        response = await register_file(request, task)
                    elif request["action"] == "get_file_by_name":
                        response = await get_file_by_name(request, task)
                    elif request["action"] == "get_payload_by_uuid":
                        response = await get_payload_by_uuid(request, task)
                    elif request["action"] == "build_payload_from_template":
                        response = await build_payload_from_template(request, task)
                    elif request["action"] == "control_socks":
                        response = await control_socks(request, task)
                    elif request["action"] == "user_output":
                        response = await user_output(request, task)
                    elif request["action"] == "task_update_callback":
                        response = await task_update_callback(request, task)
                    elif request["action"] == "register_artifact":
                        response = await register_artifact(request, task)
                    elif request["action"] == "build_payload_from_parameters":
                        response = await build_payload_from_parameters(request, task)
                    elif request["action"] == "register_payload_on_host":
                        response = await register_payload_on_host(request, task)
                    elif request["action"] == "get_security_context_of_running_jobs_on_host":
                        response = await get_security_context_of_running_jobs_on_host(request, task)
                    elif request["action"] == "rpc_tokens":
                        response = await rpc_tokens(request, task)
                    elif request["action"] == "rpc_logon_sessions":
                        response = await rpc_logon_sessions(request, task)
                    elif request["action"] == "rpc_callback_tokens":
                        response = await rpc_callback_tokens(request, task)
                    elif request["action"] == "create_processes":
                        response = await create_processes(request, task)
                    elif request["action"] == "remove_files_from_file_browser":
                        response = await remove_files_from_file_browser(request, task)
                    elif request["action"] == "register_keystrokes":
                        response = await register_keystrokes(request, task)
                    elif request["action"] == "register_credentials":
                        response = await register_credentials(request, task)
                    elif request["action"] == "add_files_to_file_browser":
                        response = await add_files_to_file_browser(request, task)
                    elif request["action"] == "search_database":
                        response = await search_database(request, task)
                    else:
                        response = {"status": "error", "error": "unknown action"}
                    response = json.dumps(response).encode("utf-8")
                else:
                    response = json.dumps(
                        {"status": "error", "error": "Missing action"}
                    ).encode("utf-8")
            except Exception as e:
                logger.exception("Exception in rabbit_pt_rpc_callback: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                response = json.dumps({"status": "error", "error": "Exception in rabbit_pt_rpc_callback: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e)}).encode("utf-8")
        try:
            await exchange.publish(
                aio_pika.Message(body=response, correlation_id=message.correlation_id),
                routing_key=message.reply_to,
            )
        except Exception as e:
            error = (
                    "Exception trying to send message back to container for rpc! " + str(e)
            )
            error += "\nResponse: {}\nCorrelation_id: {}\n RoutingKey: {}".format(
                str(response), message.correlation_id, message.reply_to
            )
            task_query = await db_model.task_query()
            task = await db_objects.get(task_query, id=request["task_id"])
            task.status = "error"
            task.completed = True
            await db_objects.update(task)
            await db_objects.create(
                db_model.Response, task=task, response=error.encode("utf-8")
            )


async def register_file(request, task):
    # {
    # "action": "register_file",
    # "file": base64.b64encode(file).decode(),
    # "task_id": self.task_id
    # "delete_after_fetch": True,
    # "saved_file_name": str(uuid.uuid4()),
    # "remote_path": "",
    # "is_screenshot": False,
    # "is_download": False,
    # }
    try:
        filename = (
            request["saved_file_name"]
            if "saved_file_name" in request
            else str(uuid.uuid4())
        )
        path = "./app/files/{}".format(str(uuid.uuid4()))
        code_file = open(path, "wb")
        code = base64.b64decode(request["file"])
        code_file.write(code)
        code_file.close()
        size = os.stat(path).st_size
        md5 = await hash_MD5(code)
        sha1 = await hash_SHA1(code)
        new_file_meta = await db_objects.create(
            db_model.FileMeta,
            total_chunks=1,
            chunks_received=1,
            chunk_size=size,
            complete=True,
            path=str(path),
            operation=task.callback.operation,
            operator=task.operator,
            full_remote_path=request["remote_path"].encode("utf-8"),
            md5=md5,
            sha1=sha1,
            task=task,
            delete_after_fetch=request["delete_after_fetch"],
            filename=filename.encode("utf-8"),
            is_screenshot=request["is_screenshot"],
            is_download_from_agent=request["is_download"],
        )
        asyncio.create_task(log_to_siem(new_file_meta.to_json(), mythic_object="file_upload"))
        return {"status": "success", "response": new_file_meta.to_json()}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def get_file_by_name(request, task):
    try:
        file_query = await db_model.filemeta_query()
        files = await db_objects.execute(
            file_query.where(
                (db_model.FileMeta.deleted == False)
                & (db_model.FileMeta.filename == request["filename"])
                & (db_model.FileMeta.operation == task.callback.operation)
            ).order_by(db_model.FileMeta.timestamp)
        )
        file = None
        for f in files:
            file = f
        if file is None:
            return {"status": "error", "error": "File not found"}
        else:
            file_json = file.to_json()
            if os.path.exists(file.path):
                file_json["contents"] = base64.b64encode(
                    open(file.path, "rb").read()
                ).decode()
            return {"status": "success", "response": file_json}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def get_payload_by_uuid(request, task):
    try:
        payload_query = await db_model.payload_query()
        payload = await db_objects.get(payload_query, uuid=request["uuid"])
        payload_json = payload.to_json()
        payload_json["contents"] = ""
        if os.path.exists(payload.file.path):
            payload_json["contents"] = base64.b64encode(
                open(payload.file.path, "rb").read()
            ).decode()
        from app.api.task_api import add_all_payload_info

        payload_info = await add_all_payload_info(payload)
        payload_json["commands"] = payload_info["commands"]
        payload_json["c2info"] = payload_info["c2info"]
        payload_json["build_parameters"] = payload_info["build_parameters"]
        return {"status": "success", "response": payload_json}
    except Exception as e:
        print(str(traceback.format_exc()))
        return {"status": "error", "error": "Payload not found"}


async def build_payload_from_template(request, task):
    # check to make sure we have the right parameters (host, template)
    from app.api.payloads_api import register_new_payload_func, write_payload
    from app.api.c2profiles_api import generate_random_format_string

    try:
        # default to the template of the current payload unless otherwise specified
        template = task.callback.registered_payload
        host = task.callback.host
        task.status = "building.."
        await db_objects.update(task)
        if "uuid" in request and request["uuid"] != "" and request["uuid"] is not None:
            # pull that associated payload
            query = await db_model.payload_query()
            template = await db_objects.get(query, uuid=request["uuid"])
        if (
                "destination_host" in request
                and request["destination_host"] != ""
                and request["destination_host"] is not None
                and request["destination_host"] not in ["localhost", "127.0.0.1", "::1"]
        ):
            host = request["destination_host"].upper()
        # using that payload, generate the following build-tasking data
        data = {
            "payload_type": template.payload_type.ptype,
            "c2_profiles": [],
            "commands": [],
            "selected_os": template.os,
            "tag": "Autogenerated from task {} on callback {}".format(
                str(task.id), str(task.callback.id)
            ),
            "wrapper": template.payload_type.wrapper,
        }
        if data["wrapper"]:
            if "wrapped_payload" not in request or request["wrapped_payload"] is None:
                data["wrapped_payload"] = template.wrapped_payload.uuid
        if "description" in request:
            if request["description"] is not None and request["description"] != "":
                data["tag"] = request["description"]
        query = await db_model.payloadcommand_query()
        payloadcommands = await db_objects.execute(
            query.where(db_model.PayloadCommand.payload == template)
        )
        data["commands"] = [c.command.cmd for c in payloadcommands]
        query = await db_model.buildparameterinstance_query()
        create_transforms = await db_objects.execute(
            query.where(db_model.BuildParameterInstance.payload == template)
        )
        data["build_parameters"] = [t.to_json() for t in create_transforms]
        for t in data["build_parameters"]:
            t["name"] = t["build_parameter"]["name"]
            t["value"] = t["parameter"]
        c2_profiles_data = []
        query = await db_model.payloadc2profiles_query()
        c2profiles = await db_objects.execute(
            query.where(db_model.PayloadC2Profiles.payload == template)
        )
        for c2p in c2profiles:
            query = await db_model.c2profileparametersinstance_query()
            c2_profile_params = await db_objects.execute(
                query.where(
                    (db_model.C2ProfileParametersInstance.payload == template)
                    & (
                            db_model.C2ProfileParametersInstance.c2_profile
                            == c2p.c2_profile
                    )
                )
            )
            params = {}
            for p in c2_profile_params:
                if p.c2_profile_parameters.randomize:
                    params[
                        p.c2_profile_parameters.name
                    ] = await generate_random_format_string(
                        p.c2_profile_parameters.format_string
                    )
                else:
                    params[p.c2_profile_parameters.name] = p.value
            c2_profiles_data.append(
                {"c2_profile": c2p.c2_profile.name, "c2_profile_parameters": params}
            )
        data["c2_profiles"] = c2_profiles_data
        data["filename"] = "Task" + str(task.id) + "Copy_" + template.file.filename
        # print(data)
        # upon successfully starting the build process, set pcallback and task
        #   when it's successfully written, it will get a file with it
        rsp = await register_new_payload_func(
            data,
            {
                "current_operation": task.callback.operation.name,
                "username": task.operator.username,
            },
        )
        return await handle_automated_payload_creation_response(task, rsp, data, host)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(traceback.format_exc()))
        return {
            "status": "error",
            "error": "Failed to build payload: " + str(traceback.format_exc()),
        }


async def build_payload_from_parameters(request, task):
    try:
        from app.api.payloads_api import register_new_payload_func
        host = task.callback.host.upper()
        task.status = "building.."
        await db_objects.update(task)
        if (
                "destination_host" in request
                and request["destination_host"] != ""
                and request["destination_host"] is not None
                and request["destination_host"] not in ["localhost", "127.0.0.1", "::1"]
        ):
            host = request["destination_host"]
        if "tag" not in request or request["tag"] == "":
            request["tag"] = "Autogenerated from task {} on callback {}".format(
                str(task.id), str(task.callback.id))
        if "filename" not in request or request["filename"] == "":
            request["filename"] = "Task" + str(task.id) + "Payload"
        rsp = await register_new_payload_func(
            request,
            {
                "current_operation": task.callback.operation.name,
                "username": task.operator.username,
            },
        )
        return await handle_automated_payload_creation_response(task, rsp, request, host)
    except Exception as e:
        return {
            "status": "error",
            "error": "Failed to build payload: " + str(traceback.format_exc()),
        }


async def handle_automated_payload_creation_response(task, rsp, data, host):
    from app.api.payloads_api import write_payload

    if rsp["status"] == "success":
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=rsp["uuid"])
        payload.task = task
        payload.pcallback = task.callback
        payload.auto_generated = True
        payload.callback_alert = False
        payload.file.delete_after_fetch = True
        payload.file.task = task
        payload.file.host = host.upper()
        await db_objects.update(payload.file)
        await db_objects.update(payload)
        # send a message back to the container to build a new payload
        create_rsp = await write_payload(
            payload.uuid,
            {
                "current_operation": task.callback.operation.name,
                "username": task.operator.username,
            },
            data,
        )
        if create_rsp["status"] != "success":
            payload.deleted = True
            await db_objects.update(payload)
            task.status = "error"
            await db_objects.create(
                db_model.Response,
                task=task,
                response="Exception when building payload: {}".format(
                    create_rsp["error"]
                ),
            )
            return {
                "status": "error",
                "error": "Failed to send build message to container: "
                         + create_rsp["error"],
            }
        else:
            task.status = "building.."
            task.timestamp = datetime.datetime.utcnow()
            await db_objects.update(task)
            await db_objects.get_or_create(
                db_model.PayloadOnHost,
                host=host.upper(),
                payload=payload,
                operation=payload.operation,
                task=task,
            )
        from app.api.task_api import add_all_payload_info

        payload_info = await add_all_payload_info(payload)
        payload_info = {**payload_info, **payload.to_json()}
        return {"status": "success", "response": payload_info}
    else:
        await db_objects.create(
            db_model.Response,
            task=task,
            response="Exception when registering payload: {}".format(rsp["error"]),
        )
        return {
            "status": "error",
            "error": "Failed to register new payload: " + rsp["error"],
        }


async def control_socks(request, task):
    if "start" in request:
        from app.api.callback_api import start_socks
        resp = await start_socks(request["port"], task.callback, task)
        return resp
    if "stop" in request:
        from app.api.callback_api import stop_socks
        resp = await stop_socks(task.callback, task.operator)
        return resp
    return {"status": "error", "error": "unknown socks tasking"}


async def user_output(request, task):
    try:
        resp = await db_objects.create(
            db_model.Response,
            task=task,
            response=request["user_output"].encode("utf-8"),
        )
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def task_update_callback(request, task):
    try:
        from app.api.callback_api import update_callback
        status = await update_callback(
            request["callback_info"], task.callback.agent_callback_id
        )
        return status
    except Exception as e:
        print("error in task_update:" + str(e))
        return {"status": "error", "error": str(e)}


async def update_task(request, task):
    try:
        if "status" in request:
            task.status = request["status"]
        if "completed" in request:
            task.completed = request["completed"]
        await db_objects.update(task)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def register_artifact(request, task):
    # {"action": "register_artifact",
    # "task_id": self.task_id,
    # "host": host, (could be None)
    # "artifact_instance": artifact_instance,
    # "artifact": artifact_type
    # })
    try:
        # first try to look for the artifact type, if it doesn't exist, create it
        query = await db_model.artifact_query()
        artifact = await db_objects.get(query, name=request["artifact"].encode("utf-8"))
    except Exception as e:
        artifact = await db_objects.create(db_model.Artifact, name=request["artifact"].encode("utf-8"))
    try:
        if "host" not in request or request["host"] is None or request["host"] == "":
            request["host"] = task.callback.host.upper()
        art = await db_objects.create(
            db_model.TaskArtifact,
            task=task,
            artifact_instance=request["artifact_instance"].encode("utf-8"),
            artifact=artifact,
            host=request["host"].upper(),
            operation=task.callback.operation,
        )
        asyncio.create_task(log_to_siem(art.to_json(), mythic_object="artifact_new"))
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": "failed to create task artifact: " + str(e)}


async def register_payload_on_host(request, task):
    # {"action": "register_payload_on_host",
    # "task_id": self.task_id,
    # "host": host,
    # "uuid": payload uuid
    # })
    try:
        payloadquery = await db_model.payload_query()
        payload = await db_objects.get(payloadquery, uuid=request["uuid"], operation=task.operation)
        payload_on_host = await db_objects.create(db_model.PayloadOnHost, payload=payload,
                                                  host=request["host"].upper(), operation=task.operation, task=task)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": "Failed to find payload"}


async def get_security_context_of_running_jobs_on_host(request, task):
    # this needs host name, task_id
    # this returns a list of all jobs that are not errored or completed on that host for the task's callback
    #   and for each one returns the security context (which token is associated with each job)
    task_query = await db_model.task_query()
    tasks = await db_objects.execute(task_query.where(
        (db_model.Callback.host == request["host"].upper()) &
        (db_model.Task.status != "error") &
        (db_model.Task.completed == False)
    ))
    response = []
    for t in tasks:
        response.append(t.to_json())
    return response


async def rpc_tokens(request, task):
    # { "action": "rpc_tokens",
    # "add": [ {token info} ], // this will update if it already exists
    # "remove": [ {token info} ],
    # "host": "hostname in question"
    # }
    tokenquery = await db_model.token_query()
    for t in request["add"]:
        try:
            token = await db_objects.get(tokenquery, TokenId=t["TokenId"], host=request["host"].upper(), deleted=False)
        except Exception as e:
            token = await db_objects.create(db_model.Token, TokenId=t["TokenId"], host=request["host"].upper(),
                                            task=task)
        for k, v in t.items():
            if hasattr(token, k):
                # we want to handle foreign keys separately
                if k == "AuthenticationId":
                    auth_query = await db_model.logonsession_query()
                    try:
                        session = await db_objects.get(auth_query, LogonId=v, host=request["host"].upper(), deleted=False)
                    except Exception as e:
                        session = await db_objects.create(db_model.LogonSession, LogonId=v, host=request["host"].upper(),
                                                          task=task)
                    setattr(token, k, session)

                else:
                    setattr(token, k, v)
        await db_objects.update(token)
    for t in request["remove"]:
        try:
            token = await db_objects.get(tokenquery, TokenId=t["TokenId"], host=request["host"].upper())
            token.deleted = True
            await db_objects.update(token)
        except Exception as e:
            pass
    return {"status": "success"}


async def rpc_logon_sessions(request, task):
    # { "action": "rpc_logon_sessions",
    # "add": [ {session info} ], // this will update if it already exists
    # "remove": [ {session info} ],
    # "host": "hostname in question"
    # }
    sessionquery = await db_model.logonsession_query()
    for t in request["add"]:
        try:
            session = await db_objects.get(sessionquery, LogonId=t["LogonId"], host=request["host"].upper(), deleted=False)
        except Exception as e:
            session = await db_objects.create(db_model.LogonSession, LogonId=request["LogonId"], host=request["host"].upper(),
                                            task=task)
        for k, v in t.items():
            if hasattr(session, k):
                setattr(session, k, v)
        await db_objects.update(session)
    for t in request["remove"]:
        try:
            session = await db_objects.get(sessionquery, LogonId=t["LogonId"], host=request["host"].upper())
            session.deleted = True
            await db_objects.update(session)
        except Exception as e:
            pass
    return {"status": "success"}


async def rpc_callback_tokens(request, task):
    # { "action": "rpc_callback_tokens",
    # "add": [ {token info} ], // this will update if it already exists
    # "remove": [ {token info} ],
    # "host": "hostname in question"
    # }
    callbacktokenquery = await db_model.callbacktoken_query()
    tokenquery = await db_model.token_query()
    for t in request["add"]:
        # first get/create the token as needed
        try:
            token = await db_objects.get(tokenquery, TokenId=t["TokenId"], host=request["host"].upper(), deleted=False)
        except Exception as e:
            token = await db_objects.create(db_model.Token, TokenId=t["TokenId"], host=request["host"].upper(),
                                            task=task)
        for k, v in t.items():
            if hasattr(token, k):
                # we want to handle foreign keys separately
                if k == "AuthenticationId":
                    auth_query = await db_model.logonsession_query()
                    try:
                        session = await db_objects.get(auth_query, LogonId=v, host=request["host"].upper(), deleted=False)
                    except Exception as e:
                        session = await db_objects.create(db_model.LogonSession, LogonId=v, host=request["host"].upper(),
                                                          task=task)
                    setattr(token, k, session)
                else:
                    setattr(token, k, v)
        await db_objects.update(token)
        # then try to associate it with our callback
        try:
            callbacktoken = await db_objects.get(callbacktokenquery, token=token, callback=task.callback,
                                                 deleted=False, host=request["host"].upper())
        except Exception as e:
            callbacktoken = await db_objects.create(db_model.CallbackToken, token=token, callback=task.callback,
                                                    task=task, host=request["host"].upper())
    for t in request["remove"]:
        try:
            token = await db_objects.get(tokenquery, TokenId=t["TokenId"], host=request["host"].upper())
            callbacktoken = await db_objects.get(callbacktokenquery, token=token, callback=task.callback, deleted=False, host=request["host"].upper())
            callbacktoken.deleted = True
            await db_objects.update(callbacktoken)
        except Exception as e:
            pass
    return {"status": "success"}


async def create_processes(request, task):
    # perform the same additions that you could do from request_api.py to add processes
    # just offer as RPC mechanism
    try:
        for p in request["processes"]:
            await db_objects.create(
                db_model.Process,
                task=task,
                host=task.callback.host,
                operation=task.callback.operation,
                process_id=p["process_id"],
                parent_process_id=p["parent_process_id"] if "parent_process_id" in p else None,
                architecture=p["architecture"] if "architecture" in p else None,
                name=p["name"] if "name" in p else None,
                bin_path=p["bin_path"] if "bin_path" in p else None,
                user=p["user"] if "user" in p else None
            )
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def search_processes(request, task):
    process_query = await db_model.process_query()
    clauses = []
    for k, v in request.items():
        if k != "operation":
            clauses.append(getattr(db_model.Process, k).regexp(v))
    results = await db_objects.execute(process_query.where(
        (db_model.Process.operation == task.callback.operation) &
        reduce(operator.and_, clauses)
    ))
    result = {"status": "success", "response": [r.to_json() for r in results]}
    return result


async def search_database(request, task):
    # this is the single entry point to do queries across the back-end database
    #   for RPC calls from payload types
    if request["table"].lower() == "process":
        return await search_processes(request["search"], task)
    else:
        return {"status": "error", "error": "Search not supported yet for that table"}


async def remove_files_from_file_browser(request, task):
    filebrowserquery = await db_model.filebrowserobj_query()
    for f in request["removed_files"]:
        if "host" not in f or f["host"] == "":
            f["host"] = task.callback.host
        # we want to see if there's a filebrowserobj that matches up with the removed files
        try:
            fobj = await db_objects.get(
                filebrowserquery,
                operation=task.callback.operation,
                host=f["host"].upper(),
                full_path=f["path"].encode("utf-8"),
                deleted=False,
            )
            fobj.deleted = True
            await db_objects.update(fobj)
        except Exception as e:
            pass
    return {"status": "success"}


async def register_keystrokes(request, task):
    try:
        for k in request["keystrokes"]:
            if (
                    "window_title" not in k
                    or k["window_title"] is None
                    or k["window_title"] == ""
            ):
                k["window_title"] = "UNKNOWN"
            if (
                    "user" not in k
                    or k["user"] is None
                    or k["user"] == ""
            ):
                k["user"] = "UNKNOWN"
            rsp = await db_objects.create(
                db_model.Keylog,
                task=task,
                window=k["window_title"],
                keystrokes=k["keystrokes"].encode("utf-8"),
                operation=task.callback.operation,
                user=k["user"],
            )
            asyncio.create_task(log_to_siem(rsp.to_json(), mythic_object="keylog_new"))
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def register_credentials(request, task):
    try:
        from app.api.credential_api import create_credential_func
        for cred in request["credentials"]:
            cred["task"] = task
            asyncio.create_task(create_credential_func(
                task.operator, task.callback.operation, cred
            ))
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def add_files_to_file_browser(request, task):
    from app.api.file_browser_api import (
        store_response_into_filebrowserobj,
    )
    status = await store_response_into_filebrowserobj(
        task.callback.operation, task, request["file_browser"]
    )
    return status


async def rabbit_c2_rpc_callback(
        exchange: aio_pika.Exchange, message: aio_pika.IncomingMessage
):
    with message.process():
        # print(message)
        request = json.loads(message.body.decode())
        if "action" in request:
            if request["action"] == "add_route":
                response = await add_route(request)
            elif request["action"] == "remove_route":
                response = await remove_route(request)
            elif request["action"] == "get_callback_info":
                response = await get_callback_info(request)
            elif request["action"] == "update_callback_info":
                response = await update_callback_info(request)
            elif request["action"] == "add_event_message":
                response = await add_event_message(request)
            else:
                response = {"status": "error", "error": "unknown action"}
            response = json.dumps(response).encode("utf-8")
        else:
            response = json.dumps(
                {"status": "error", "error": "Missing action"}
            ).encode("utf-8")
        try:
            await exchange.publish(
                aio_pika.Message(body=response, correlation_id=message.correlation_id),
                routing_key=message.reply_to,
            )
        except Exception as e:
            error = (
                    "Exception trying to send message back to container for rpc! " + str(e)
            )
            error += "\nResponse: {}\nCorrelation_id: {}\n RoutingKey: {}".format(
                str(response), message.correlation_id, message.reply_to
            )
            operation_query = await db_model.operation_query()
            operations = await db_objects.execute(
                operation_query.where(db_model.Operation.complete == False)
            )
            for o in operations:
                await db_objects.create(
                    db_model.OperationEventLog,
                    level="warning",
                    operation=o,
                    message="Failed to process C2 RPC: {}".format(str(e)),
                )


async def get_callback_info(request):
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, agent_callback_id=request["uuid"])
        cjson = callback.to_json()
        cjson["encryption_type"] = callback.encryption_type
        cjson["encryption_key"] = callback.encryption_key
        cjson["decryption_key"] = callback.decryption_key
        return {"status": "success", "response": cjson}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def update_callback_info(request):
    try:
        from app.api.callback_api import update_callback

        status = await update_callback(request["data"], request["uuid"])
        return status
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def add_event_message(request):
    try:
        operation_query = await db_model.operation_query()
        operations = await db_objects.execute(
            operation_query.where(db_model.Operation.complete == False)
        )
        for o in operations:
            msg = await db_objects.create(
                db_model.OperationEventLog,
                level=request["level"],
                operation=o,
                message=request["message"],
            )
            await log_to_siem(msg.to_json(), mythic_object="eventlog_new")
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def add_route(request):
    # {"action": "add_route",
    # "source": source_uuid,
    # "destination": destination_uuid,
    # "direction": direction,
    # "metadata": metadata
    # }
    from app.api.callback_api import add_p2p_route

    request["action"] = "add"
    rsp = await add_p2p_route(request, None, None)
    return rsp


async def remove_route(request):
    # {"action": "remove_route",
    # "source": source_uuid,
    # "destination": destination_uuid,
    # "direction": direction,
    # "metadata": metadata
    # }
    from app.api.callback_api import add_p2p_route

    request["action"] = "remove"
    rsp = await add_p2p_route(request, None, None)
    return rsp


async def add_command_attack_to_task(task, command):
    try:
        query = await db_model.attackcommand_query()
        attack_mappings = await db_objects.execute(
            query.where(db_model.ATTACKCommand.command == command)
        )
        for attack in attack_mappings:
            try:
                query = await db_model.attacktask_query()
                # try to get the query, if it doens't exist, then create it in the exception
                await db_objects.get(query, task=task, attack=attack.attack)
            except Exception as e:
                attack = await db_objects.create(
                    db_model.ATTACKTask, task=task, attack=attack.attack
                )
                asyncio.create_task(log_to_siem(attack.to_json(), mythic_object="task_mitre_attack"))
    except Exception as e:
        # logger.exception(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        raise e


async def rabbit_heartbeat_callback(message: aio_pika.IncomingMessage):
    with message.process():
        pieces = message.routing_key.split(".")
        # print(" [x] %r:%r" % (
        #   message.routing_key,
        #   message.body
        # ))
        try:
            if pieces[0] == "c2":
                query = await db_model.c2profile_query()
                try:
                    profile = await db_objects.get(query, name=pieces[2], deleted=False)
                except Exception as e:
                    if pieces[2] not in sync_tasks:
                        sync_tasks[pieces[2]] = True
                        asyncio.create_task(
                            send_all_operations_message(message=f"sending container sync message to {pieces[2]}",
                                                        level="info", source="sync_c2_send"))
                        await send_c2_rabbitmq_message(pieces[2], "sync_classes", "", "")
                    return
                if (
                        profile.last_heartbeat
                        < datetime.datetime.utcnow() + datetime.timedelta(seconds=-30)
                        or not profile.container_running
                ):
                    if profile.running:
                        asyncio.create_task(
                            send_all_operations_message(message=f"{profile.name}'s internal server stopped",
                                                        level="warning", source="c2_stopped"))
                        profile.running = False  # container just started, clearly the inner service isn't running
                    # print("setting running to false")
                profile.container_running = True
                profile.last_heartbeat = datetime.datetime.utcnow()
                await db_objects.update(profile)
            elif pieces[0] == "pt":
                ptquery = await db_model.payloadtype_query()
                try:
                    payload_type = await db_objects.get(
                        ptquery, ptype=pieces[2], deleted=False
                    )
                    payload_type.container_running = True
                    payload_type.last_heartbeat = datetime.datetime.utcnow()
                    await db_objects.update(payload_type)
                except Exception as e:
                    if pieces[2] not in sync_tasks:
                        # don't know the ptype, but haven't sent a sync request either, wait for an auto sync
                        sync_tasks[pieces[2]] = True
                    else:
                        # don't know the ptype and haven't seen an auto sync, force a sync
                        sync_tasks.pop(pieces[2], None)
                        asyncio.create_task(
                            send_all_operations_message(message=f"sending container sync message to {pieces[2]}",
                                                        level="info", source="payload_sync_send"))
                        await send_pt_rabbitmq_message(pieces[2], "sync_classes", "", "", "")
        except Exception as e:
            logger.exception(
                "Exception in rabbit_heartbeat_callback: {}, {}".format(pieces, str(e))
            )
            # print("Exception in rabbit_heartbeat_callback: {}, {}".format(pieces, str(e)))


# just listen for c2 heartbeats and update the database as necessary
async def start_listening():
    logger.debug("Waiting for RabbitMQ to start..")
    await wait_for_rabbitmq()

    logger.debug("Starting to consume rabbitmq messages")
    task = None
    task2 = None
    task3 = None
    task4 = None
    task5 = None
    tasks = [task, task2, task3, task4, task5]
    try:
        task = asyncio.ensure_future(connect_and_consume_c2())
        task2 = asyncio.ensure_future(connect_and_consume_heartbeats())
        task3 = asyncio.ensure_future(connect_and_consume_pt())
        task4 = asyncio.ensure_future(connect_and_consume_rpc())
        task5 = asyncio.ensure_future(connect_and_consume_c2_rpc())
        await asyncio.wait_for([task, task2, task3, task4, task5], None)
    except Exception as e:
        for t in tasks:
            if t is not None:
                task.cancel()
        await asyncio.sleep(3)


async def mythic_rabbitmq_connection():
    logger.debug("Logging into RabbitMQ with {}@{}:{}/{}".format(
        mythic.config["RABBITMQ_USER"],
        mythic.config['RABBITMQ_HOST'],
        mythic.config['RABBITMQ_PORT'],
        mythic.config['RABBITMQ_VHOST']))

    return await aio_pika.connect_robust(
        host=mythic.config["RABBITMQ_HOST"],
        port=mythic.config["RABBITMQ_PORT"],
        login=mythic.config["RABBITMQ_USER"],
        password=mythic.config["RABBITMQ_PASSWORD"],
        virtualhost=mythic.config["RABBITMQ_VHOST"],
        timeout=5
    )


async def wait_for_rabbitmq():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.info("Waiting for RabbitMQ port to come online. Trying again in 2 seconds..")
        except Exception as e:
            logger.info("Waiting for RabbitMQ service to come online. Trying again in 2 seconds..")
        await asyncio.sleep(2)

    await connection.close()
    logger.info("RabbitMQ is online")


async def connect_and_consume_c2():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange(
                "mythic_traffic", aio_pika.ExchangeType.TOPIC
            )
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("", auto_delete=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange="mythic_traffic", routing_key="c2.status.#")

            await channel.set_qos(prefetch_count=50)
            logger.info("Waiting for messages in connect_and_consume_c2.")
            try:
                task = queue.consume(rabbit_c2_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception(
                    "Exception in connect_and_consume .consume: {}".format(str(e))
                )
                # print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume connect: {}".format(str(e))
            )
        await asyncio.sleep(2)


async def connect_and_consume_pt():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange(
                "mythic_traffic", aio_pika.ExchangeType.TOPIC
            )
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("", auto_delete=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange="mythic_traffic", routing_key="pt.status.#")
            await channel.set_qos(prefetch_count=50)
            logger.info("Waiting for messages in connect_and_consume_pt.")
            try:
                task = queue.consume(rabbit_pt_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as r:
                logger.exception(
                    "Exception in connect_and_consume .consume: {}".format(str(r))
                )
                # print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume connect: {}".format(str(e))
            )
            # print("Exception in connect_and_consume connect: {}".format(str(e)))
        await asyncio.sleep(2)


async def connect_and_consume_rpc():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            channel = await connection.channel()
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("rpc_queue", auto_delete=True)
            await channel.set_qos(prefetch_count=50)
            logger.info("Waiting for messages in connect_and_consume_rpc.")
            try:
                task = queue.consume(
                    partial(rabbit_pt_rpc_callback, channel.default_exchange)
                )
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception(
                    "Exception in connect_and_consume_rpc .consume: {}".format(str(e))
                )
                # print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume_rpc connect: {}".format(str(e))
            )
            # print("Exception in connect_and_consume connect: {}".format(str(e)))
        await asyncio.sleep(2)


async def connect_and_consume_c2_rpc():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            channel = await connection.channel()
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("c2rpc_queue", auto_delete=True)
            await channel.set_qos(prefetch_count=50)
            logger.info("Waiting for messages in connect_and_consume_rpc.")
            try:
                task = queue.consume(
                    partial(rabbit_c2_rpc_callback, channel.default_exchange)
                )
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception(
                    "Exception in connect_and_consume_c2_rpc .consume: {}".format(
                        str(e)
                    )
                )
                # print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume_c2_rpc connect: {}".format(str(e))
            )
            # print("Exception in connect_and_consume connect: {}".format(str(e)))
        await asyncio.sleep(2)


async def connect_and_consume_heartbeats():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange(
                "mythic_traffic", aio_pika.ExchangeType.TOPIC
            )
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("", auto_delete=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange="mythic_traffic", routing_key="*.heartbeat.#")
            await channel.set_qos(prefetch_count=20)
            logger.info("Waiting for messages in connect_and_consume_heartbeats.")
            try:
                task = queue.consume(rabbit_heartbeat_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception(
                    "Exception in connect_and_consume .consume: {}".format(str(e))
                )
                # print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume connect: {}".format(str(e))
            )
            # print("Exception in connect_and_consume connect: {}".format(str(e)))
        await asyncio.sleep(2)


async def send_c2_rabbitmq_message(name, command, message_body, username):
    try:
        connection = await mythic_rabbitmq_connection()
        channel = await connection.channel()
        # declare our exchange
        exchange = await channel.declare_exchange(
            "mythic_traffic", aio_pika.ExchangeType.TOPIC
        )
        message = aio_pika.Message(
            message_body.encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )
        # Sending the message
        await exchange.publish(
            message,
            routing_key="c2.modify.{}.{}.{}".format(
                name, command, base64.b64encode(username.encode("utf-8")).decode("utf-8")
            ),
        )
        await connection.close()
        return {"status": "success"}
    except Exception as e:
        logger.exception(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "Failed to connect to rabbitmq, refresh"}


async def send_pt_rabbitmq_message(payload_type, command, message_body, username, reference_id):
    try:
        connection = await mythic_rabbitmq_connection()
        channel = await connection.channel()
        # declare our exchange
        exchange = await channel.declare_exchange(
            "mythic_traffic", aio_pika.ExchangeType.TOPIC
        )
        message = aio_pika.Message(
            message_body.encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )
        # Sending the message
        routing_key = "pt.task.{}.{}.{}.{}".format(
                payload_type,
                command,
                reference_id,
                base64.b64encode(username.encode("utf-8")).decode("utf-8"))
        await exchange.publish(
            message,
            routing_key=routing_key,
        )
        await connection.close()
        return {"status": "success"}
    except Exception as e:
        logger.exception(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "Failed to connect to rabbitmq, refresh"}


class MythicBaseRPC:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.callback_queue = None
        self.futures = {}
        self.loop = None

    async def connect(self):
        self.connection = await mythic_rabbitmq_connection()
        self.channel = await self.connection.channel()
        self.callback_queue = await self.channel.declare_queue(exclusive=True, auto_delete=True)
        await self.callback_queue.consume(self.on_response)
        return self

    def on_response(self, message: aio_pika.IncomingMessage):
        future = self.futures.pop(message.correlation_id)
        future.set_result(message.body)

    async def call(self, message: dict, receiver: str = None) -> (bytes, bool):
        try:
            if self.loop is None:
                self.loop = asyncio.get_event_loop()
            if self.connection is None:
                await self.connect()
            correlation_id = str(uuid.uuid4())
            future = self.loop.create_future()

            self.futures[correlation_id] = future
            try:
                await self.channel.get_queue(receiver)
                await self.channel.default_exchange.publish(
                    aio_pika.Message(
                        json.dumps(message).encode("utf-8"),
                        content_type="application/json",
                        correlation_id=correlation_id,
                        reply_to=self.callback_queue.name,
                    ),
                    routing_key=receiver,
                )
                return await future, True
            except Exception as d:
                self.connection = None
                asyncio.create_task(
                    send_all_operations_message(
                        message="Failed to connect to {}; is the container running?".format(receiver),
                        level="warning", source="rabbitmq_container_connect"))
                logger.warning("rabbitmq.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(d))
                return b"", False
        except Exception as e:
            self.connection = None
            asyncio.create_task(
                send_all_operations_message(message="rabbitmq.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e),
                                            level="warning", source="rabbitmq_container_exception"))
            logger.warning("rabbitmq.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return b"", False
