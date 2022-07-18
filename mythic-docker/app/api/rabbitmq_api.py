from app import mythic, valid_payload_container_version_bounds, valid_c2_container_version_bounds, \
    valid_translation_container_version_bounds
import app
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
import random
import traceback
import uuid
from app.api.operation_api import send_all_operations_message
from app.api.siem_logger import log_to_siem
import operator
from peewee import reduce, TextField, BooleanField, IntegerField, fn
from app.api.file_browser_api import mark_nested_deletes, add_upload_file_to_file_browser


# Keep track of sending sync requests to containers so we don't go crazy


async def rabbit_c2_callback(message: aio_pika.IncomingMessage):
    async with message.process():
        pieces = message.routing_key.split(".")
        # logger.warning(pieces)
        # logger.warning(" [x] %r:%r" % (message.routing_key,message.body))
        if pieces[4] == "sync_classes":
            if len(pieces) == 7:
                if int(pieces[6]) > valid_c2_container_version_bounds[1] or \
                        int(pieces[6]) < valid_c2_container_version_bounds[0]:
                    asyncio.create_task(
                        send_all_operations_message(
                            message="C2 Profile container, {}, of version {} is not supported by this version of Mythic.\nThe container version must be between {} and {}. \nCheck https://docs.mythic-c2.net/customizing/payload-type-development/container-syncing#current-payloadtype-versions for information about which Docker Images or mythic_payloadtype_contianer PyPi version is needed for the agent to successfully connect. \nSending a kill message now".format(
                                pieces[2], pieces[6], str(valid_c2_container_version_bounds[0]),
                                str(valid_c2_container_version_bounds[1])
                            ), level="warning", source="bad_c2_version"))
                    from app.api.c2profiles_api import kill_c2_profile_container
                    await kill_c2_profile_container(pieces[2])
                    return
            else:
                asyncio.create_task(
                    send_all_operations_message(
                        message="C2 Profile container, {}, of version 1 is not supported by this version of Mythic.\nThe container version must be between {} and {}. \nCheck https://docs.mythic-c2.net/customizing/payload-type-development/container-syncing#current-payloadtype-versions for information about which Docker Images or mythic_payloadtype_contianer PyPi version is needed for the agent to successfully connect.".format(
                            pieces[2],
                            str(valid_c2_container_version_bounds[0]),
                            str(valid_c2_container_version_bounds[1])
                        ), level="warning", source="bad_c2_version"))
                return
            if pieces[5] == "":
                operator = None
            else:
                operator = await app.db_objects.get(
                    db_model.operator_query, username=base64.b64decode(pieces[5]).decode()
                )
            from app.api.c2profiles_api import import_c2_profile_func

            try:
                status = await import_c2_profile_func(
                    json.loads(message.body.decode()), operator, pieces[2]
                )
            except Exception as e:
                asyncio.create_task(
                    send_all_operations_message(message="Failed Sync-ed database with {} C2 files: {}".format(
                        pieces[2], str(e)
                    ), level="warning", source="sync_c2_failed"))
                return

            if status["status"] == "success":
                profile = status.pop("profile", None)
                if profile is None:
                    asyncio.create_task(send_all_operations_message(
                        message="Failed to sync files for {}\nIs the container online and at least version 7?".format(
                            pieces[2]
                        ), level="warning"))
                    return
                app.redis_pool.set(f"C2SYNC:{pieces[2]}", "success")
                asyncio.create_task(
                    send_all_operations_message(message="Successfully Sync-ed database with {} C2 files".format(
                        pieces[2]
                    ), level="info", source="sync_c2_success"))
                # for a successful checkin, we need to find all non-wrapper payload types and get them to re-check in
                if status["new"]:
                    pts = await app.db_objects.execute(
                        db_model.payloadtype_query.where(db_model.PayloadType.wrapper == False)
                    )
                    sync_operator = "" if operator is None else operator.username
                    for pt in pts:
                        stats = await send_pt_rabbitmq_message(
                            pt.ptype, "sync_classes", "", sync_operator, ""
                        )
                        if stats["status"] == "error":
                            asyncio.create_task(send_all_operations_message(
                                message="Failed to contact {} service: {}\nIs the container online and at least version 7?".format(
                                    pt.ptype, stats["error"]
                                ), level="warning", source="payload_import_sync_error"))
                if not profile.is_p2p:
                    from app.api.c2profiles_api import start_stop_c2_profile
                    run_stat, successfully_started = await start_stop_c2_profile(action="start", profile=profile)
                    if not successfully_started:
                        await send_all_operations_message(
                            message=f"C2 Profile {profile.name} failed to automatically start - container couldn't be contacted",
                            level="info", source="update_c2_profile")
                        return
                    run_stat = json.loads(run_stat)
                    try:
                        if "running" in run_stat:
                            profile.running = run_stat["running"]
                            if profile.container_running is False:
                                from app.api.operation_api import resolve_all_operations_message
                                await resolve_all_operations_message(f"{profile.name}'s container stopped")
                            profile.container_running = True
                            profile.last_heartbeat = datetime.datetime.utcnow()
                            await app.db_objects.update(profile)
                            if run_stat["running"]:
                                await send_all_operations_message(
                                    message=f"C2 Profile {profile.name} successfully started",
                                    level="info", source="update_c2_profile")
                                from app.api.operation_api import resolve_all_operations_message
                                await resolve_all_operations_message(f"{profile.name}'s internal server stopped")
                                await resolve_all_operations_message(f"C2 Profile {profile.name}.*")
                            else:
                                await send_all_operations_message(
                                    message=f"C2 Profile {profile.name} failed to automatically start",
                                    level="info", source="update_c2_profile")
                            return
                    except Exception as c:
                        logger.warning("rabbitmq_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(c))
            else:
                asyncio.create_task(
                    send_all_operations_message(message="Failed Sync-ed database with {} C2 files: {}".format(
                        pieces[2], status["error"]
                    ), level="warning", source="sync_C2_errored"))
        if pieces[1] == "status":
            try:
                profile = await app.db_objects.get(db_model.c2profile_query, name=pieces[2], deleted=False)
                if pieces[3] == "running" and not profile.running:
                    profile.running = True
                    from app.api.operation_api import resolve_all_operations_message
                    await resolve_all_operations_message(f"{profile.name}'s internal server stopped")
                    await resolve_all_operations_message(
                        f"C2 Profile {profile.name}.*")
                    await app.db_objects.update(profile)
                    asyncio.create_task(
                        send_all_operations_message(message=f"C2 Profile {profile.name} has started", level="info",
                                                    source="c2_started"))
                elif pieces[3] == "stopped" and profile.running:
                    profile.running = False
                    await app.db_objects.update(profile)
                    asyncio.create_task(
                        send_all_operations_message(
                            message=f"C2 Profile {profile.name} has stopped. Either Mythic just booted or something happened to this container.",
                            level="warning", source="c2_stopped"))
                # otherwise we got a status that matches the current status, just move on
            except Exception as e:
                logger.exception(
                    "Exception in rabbit_c2_callback (status): {}, {}".format(
                        pieces, str(e)
                    )
                )


async def rabbit_pt_callback(message: aio_pika.IncomingMessage):
    async with message.process():
        pieces = message.routing_key.split(".")
        # print(" [x] %r:%r" % (
        #    message.routing_key,
        #    message.body.decode('utf-8')
        # ))
        logger.debug(message.routing_key)
        if pieces[1] == "status":
            if len(pieces) == 8:
                if int(pieces[7]) > valid_payload_container_version_bounds[1] or \
                        int(pieces[7]) < valid_payload_container_version_bounds[0]:
                    asyncio.create_task(
                        send_all_operations_message(
                            message="Payload container, {}, of version {} is not supported by this version of Mythic.\nThe container version must be between {} and {}.\nContainer versions and information can be found at: https://docs.mythic-c2.net/customizing/payload-type-development/container-syncing#current-payloadtype-versions\nSending Exit command".format(
                                pieces[2], pieces[7], str(valid_payload_container_version_bounds[0]),
                                str(valid_payload_container_version_bounds[1])
                            ), level="warning", source="bad_payload_version_" + pieces[2]))
                    stats = await send_pt_rabbitmq_message(pieces[2], "exit_container", "", "", "")
                    if stats["status"] == "error":
                        asyncio.create_task(send_all_operations_message(
                            message="Failed to contact {} service to task it to exit: {}\nIs the container online?".format(
                                pieces[2], stats["error"]
                            ), level="warning", source="payload_import_sync_error"))
                    return
            else:
                asyncio.create_task(
                    send_all_operations_message(
                        message="Payload container, {}, of version 1 is not supported by this version of Mythic.\nThe container version must be between {} and {}".format(
                            pieces[2], str(valid_payload_container_version_bounds[0]),
                            str(valid_payload_container_version_bounds[1])
                        ), level="warning", source="bad_payload_version_" + pieces[2]))
                return
            try:
                if pieces[3] == "create_payload_with_code":
                    # print(pieces)
                    # this means we should be getting back the finished payload or an error
                    payload = await app.db_objects.get(db_model.payload_query, uuid=pieces[4])
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
                        await app.db_objects.update(payload.file)
                        current_instances = await app.db_objects.execute(
                            db_model.buildparameterinstance_query.where(
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
                                await app.db_objects.update(ci)
                                del agent_message["build_parameter_instances"][
                                    ci.build_parameter.name
                                ]
                        for k, v in agent_message["build_parameter_instances"].items():
                            # now create entries that were set to default in the build script that weren't supplied by the user
                            try:
                                bp = await app.db_objects.get(
                                    db_model.buildparameter_query, name=k, payload_type=payload.payload_type
                                )
                                await app.db_objects.create(
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
                    if "description" in agent_message:
                        payload.tag = agent_message["description"]
                    if "filename" in agent_message:
                        payload.file.filename = agent_message["filename"].encode("utf-8")
                        await app.db_objects.update(payload.file)
                    payload.build_message = payload.build_message + "\n" + agent_message["build_message"]
                    payload.build_stderr = agent_message["build_stderr"] if "build_stderr" in agent_message else ""
                    payload.build_stdout = agent_message["build_stdout"] if "build_stdout" in agent_message else ""
                    await app.db_objects.update(payload)
                    asyncio.create_task(log_to_siem(mythic_object=payload, mythic_source="payload_new"))
                elif pieces[3] == "command_transform":
                    try:
                        response_message = json.loads(message.body)
                    except Exception as e:
                        error_message = f"Failed to parse tasking message from the {pieces[2]} service: {str(e)}"
                        logger.error(error_message)
                        asyncio.create_task(send_all_operations_message(
                            message=error_message, level="warning", source="payload_import_sync_error"))
                        return
                    from app.api.task_api import check_and_issue_task_callback_functions
                    logger.info(f"RABBITMQ GOT CREATE_TASK INFO BACK FROM CONTAINER FOR {pieces[4]} WITH STATUS CODE {pieces[5]}")
                    task = await app.db_objects.get(db_model.task_query, id=pieces[4])
                    logger.debug(response_message)

                    task.display_params = response_message["task"]["display_params"]
                    task.stdout = response_message["task"]["stdout"]
                    task.stderr = response_message["task"]["stderr"]
                    task.command_name = response_message["task"]["command_name"]
                    task.params = response_message["task"]["args"]
                    task.timestamp = datetime.datetime.utcnow()
                    task.opsec_pre_blocked = response_message["task"]["opsec_pre_blocked"]
                    task.opsec_pre_message = response_message["task"]["opsec_pre_message"]
                    task.opsec_pre_bypass_role = response_message["task"]["opsec_pre_bypass_role"]
                    if response_message["task"]["opsec_pre_bypassed"] and response_message["task"][
                        "opsec_pre_bypass_user"] is None:
                        task.opsec_pre_bypassed_user = task.operator
                    task.opsec_post_blocked = response_message["task"]["opsec_post_blocked"]
                    task.opsec_post_message = response_message["task"]["opsec_post_message"]
                    task.opsec_post_bypass_role = response_message["task"]["opsec_post_bypass_role"]
                    if response_message["task"]["opsec_post_bypassed"] and response_message["task"][
                        "opsec_post_bypass_user"] is None:
                        task.opsec_post_bypassed_user = task.operator
                    task.completed_callback_function = response_message["task"][
                        "completed_callback_function"] if "completed_callback_function" in response_message[
                        "task"] else None
                    if "parameter_group_name" in response_message["task"] and response_message["task"]["parameter_group_name"] is not None:
                        task.parameter_group_name = response_message["task"]["parameter_group_name"]
                    task.status_timestamp_submitted = task.timestamp
                    # handle if tags changed
                    if pieces[5] == "parse_arguments_error":
                        task.status = "Error: Failed Arguments"
                        task.completed = True
                        task.status_timestamp_submitted = task.timestamp
                        await app.db_objects.create(
                            db_model.Response,
                            task=task,
                            response=response_message["message"],
                        )
                        await app.db_objects.update(task)
                        asyncio.create_task(check_and_issue_task_callback_functions(task))
                        asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_new"))
                    elif pieces[5] == "verify_arguments_error":
                        task.status = "Error: Invalid Arguments"
                        task.completed = True
                        task.status_timestamp_submitted = task.timestamp
                        await app.db_objects.create(
                            db_model.Response,
                            task=task,
                            response=response_message["message"],
                        )
                        await app.db_objects.update(task)
                        asyncio.create_task(check_and_issue_task_callback_functions(task))
                        asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_new"))
                    elif pieces[5] == "opsec_pre_error":
                        # we threw an error trying to run the opsec_pre function
                        task.status = "Error: OPSEC_PRE Error"
                        task.completed = True
                        await app.db_objects.create(
                            db_model.Response,
                            task=task,
                            response=response_message["message"],
                        )
                        await app.db_objects.update(task)
                        asyncio.create_task(check_and_issue_task_callback_functions(task))
                        asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_new"))
                    elif pieces[5] == "opsec_pre_success":
                        # we successfully ran opsec_pre and were blocked
                        task.status = "OPSESC_PRE_BLOCKED"
                        await app.db_objects.update(task)
                    elif pieces[5] == "create_tasking_error":
                        task.completed = True
                        task.status = "Error: Create Tasking"
                        await app.db_objects.create(
                            db_model.Response,
                            task=task,
                            response=response_message["message"],
                        )
                        await app.db_objects.update(task)
                        asyncio.create_task(check_and_issue_task_callback_functions(task))
                        asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_new"))
                    elif pieces[5] == "opsec_post_error":
                        # we threw an error trying to run the opsec_pre function
                        task.status = "Error: OPSEC_POST Error"
                        task.completed = True
                        await app.db_objects.create(
                            db_model.Response,
                            task=task,
                            response=response_message["message"],
                        )
                        await app.db_objects.update(task)
                        asyncio.create_task(check_and_issue_task_callback_functions(task))
                        asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_new"))
                    elif pieces[5] == "opsec_post_success":
                        # we successfully ran opsec_pre and were blocked
                        task.status = "OPSESC_POST_BLOCKED"
                        await app.db_objects.update(task)
                    elif pieces[5] == "general_error":
                        task.status = "Error: General Error"
                        task.completed = True
                        await app.db_objects.create(
                            db_model.Response,
                            task=task,
                            response=response_message["message"],
                        )
                        await app.db_objects.update(task)
                        asyncio.create_task(check_and_issue_task_callback_functions(task))
                        asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_new"))
                    elif pieces[5] == "error_not_found":
                        task.status = "Error: Command Not Found"
                        task.completed = True
                        await app.db_objects.create(
                            db_model.Response,
                            task=task,
                            response=response_message["message"],
                        )
                        await app.db_objects.update(task)
                        asyncio.create_task(check_and_issue_task_callback_functions(task))
                        asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_new"))
                    else:
                        if pieces[5] == "success":
                            # check if there are subtasks created for this task, if so, this should not go to submitted
                            subtasks = await app.db_objects.count(db_model.task_query.where(
                                (db_model.Task.parent_task == task) &
                                (db_model.Task.completed == False)
                            ))
                            if subtasks > 0:
                                task.status = "delegating"
                            else:
                                if task.command.script_only and not task.completed:
                                    task.status = "processed"
                                    task.status_timestamp_processed = task.timestamp
                                    task.completed = True
                                elif task.completed:
                                    # this means it was already previously marked as completed
                                    logger.info(f"RABBITMQ CREATE_TASKING status {pieces[5]} updating task {task.id} to 'completed'")
                                    task.status = "completed"
                                else:
                                    task.status = "submitted"
                        elif pieces[5] == "completed":
                            logger.info(f"RABBITMQ CREATE_TASKING status {pieces[5]} updating task {task.id} to 'completed'")
                            task.status = "completed"
                            task.status_timestamp_processed = task.timestamp
                            task.completed = True
                        elif pieces[5] == "preprocessing":
                            task.status = "submitted"
                        else:
                            task.status = pieces[5].lower()
                        task.status_timestamp_submitted = task.timestamp
                        await app.db_objects.update(task)
                        logger.info(f"RABBITMQ CALLED UPDATE ON TASK BACK FROM CONTAINER FOR {pieces[4]} WITH STATUS {task.status} FROM CREATE_TASKING")
                        if task.completed:
                            asyncio.create_task(check_and_issue_task_callback_functions(taskOriginal=task,
                                                                                        task_completed=True))
                        asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="task_new"))
                        asyncio.create_task(add_command_attack_to_task(task, task.command))
                elif pieces[3] == "task_callback_function":
                    from app.api.task_api import check_and_issue_task_callback_functions
                    task = await app.db_objects.get(db_model.task_query, id=pieces[4])
                    try:
                        response_message = json.loads(message.body)
                    except Exception as e:
                        error_message = f"Failed to parse tasking message from the {pieces[2]} service: {str(e)}"
                        logger.error(error_message)
                        asyncio.create_task(send_all_operations_message(operation=task.callback.operation,
                                                                        message=error_message, level="warning",
                                                                        source="payload_callback_error"))
                        return

                    task.timestamp = datetime.datetime.utcnow()
                    task.display_params = response_message["task"]["display_params"]
                    task.stdout = response_message["task"]["stdout"]
                    task.stderr = response_message["task"]["stderr"]
                    task.command_name = response_message["task"]["command_name"]
                    task.params = response_message["task"]["args"]
                    task.completed_callback_function = response_message["task"][
                        "completed_callback_function"] if "completed_callback_function" in response_message[
                        "task"] else None
                    if pieces[5] == "parse_arguments_error":
                        task.status = "Error: Failed Arguments For Handler"
                        if task.stderr is None:
                            task.stderr = response_message["message"]
                        else:
                            task.stderr = task.stderr + "\n" + response_message["message"]
                        asyncio.create_task(send_all_operations_message(
                            message=f"Failed to execute callback handler function for task {task.id}:\n{response_message['message']}",
                            level="warning",
                            source=f"task_callback_error_{task.id}",
                            operation=task.callback.operation))
                        await app.db_objects.update(task)
                        return
                    elif pieces[5] == "handler_error":
                        if "updating_task" in response_message and response_message["updating_task"] is not None:
                            updatingTask = await app.db_objects.get(db_model.task_query, id=response_message["updating_task"])
                            updatingTask.status = "Error: Task Callback Handler Error"
                            if updatingTask.stderr is None:
                                updatingTask.stderr = response_message["message"]
                            else:
                                updatingTask.stderr = updatingTask.stderr + "\n" + response_message["message"]
                            asyncio.create_task(send_all_operations_message(
                                message=f"Failed to execute callback handler function for task {updatingTask.id}:\n{response_message['message']}",
                                level="warning",
                                source=f"task_callback_error_{updatingTask.id}",
                                operation=updatingTask.callback.operation))
                            await app.db_objects.update(updatingTask)
                        else:
                            task.status = "Error: Task Callback Handler Error"
                            if task.stderr is None:
                                task.stderr = response_message["message"]
                            else:
                                task.stderr = task.stderr + "\n" + response_message["message"]
                            asyncio.create_task(send_all_operations_message(
                                message=f"Failed to execute callback handler function for task {task.id}:\n{response_message['message']}",
                                level="warning",
                                source=f"task_callback_error_{task.id}",
                                operation=task.callback.operation))
                            await app.db_objects.update(task)
                        return
                    elif pieces[5] == "not_found_error":
                        task.status = "Error: Task Callback Handler Not Found"
                        if task.stderr is None:
                            task.stderr = response_message["message"]
                        else:
                            task.stderr = task.stderr + "\n" + response_message["message"]
                        asyncio.create_task(send_all_operations_message(
                            message=f"Failed to execute callback handler function for task {task.id}:\n{response_message['message']}",
                            level="warning",
                            source=f"task_callback_error_{task.id}",
                            operation=task.callback.operation))
                        await app.db_objects.update(task)
                        return
                    elif pieces[5] == "generic_error":
                        task.status = "Error: Task Callback Handler Generic Error"
                        if task.stderr is None:
                            task.stderr = response_message["message"]
                        else:
                            task.stderr = task.stderr + "\n" + response_message["message"]
                        asyncio.create_task(send_all_operations_message(
                            message=f"Failed to execute callback handler function for task {task.id}:\n{response_message['message']}",
                            level="warning",
                            source=f"task_callback_error_{task.id}",
                            operation=task.callback.operation))
                        await app.db_objects.update(task)
                        return
                    else:
                        subtasks = await app.db_objects.count(db_model.task_query.where(
                            (db_model.Task.parent_task == task) &
                            (db_model.Task.completed == False)
                        ))
                        logger.info(f"task_callback_function with status {pieces[5]} for task {task.id}")
                        if pieces[5] == "success":
                            # check if there are subtasks created for this task, if so, this should not go to
                            # submitted
                            if subtasks > 0:
                                task.status = "delegating"
                            elif not task.completed and not task.command.script_only and not (
                                    task.opsec_pre_blocked and not task.opsec_pre_bypassed) \
                                    and not (task.opsec_post_blocked and not task.opsec_post_bypassed):
                                # this task isn't done, it's not a script_only command, and you're not blocked
                                #    so mark it as ready to execute
                                task.status = "submitted"
                                #logger.info(f"Task {task.id} is not completed, but updating task just did something")
                                await app.db_objects.update(task)
                                asyncio.create_task(check_and_issue_task_callback_functions(taskOriginal=task,
                                                                                            task_completed=False,
                                                                                            updating_task=
                                                                                            response_message[
                                                                                                "updating_task"],
                                                                                            updating_piece=
                                                                                            response_message[
                                                                                                "updating_piece"]))
                            elif task.command.script_only and not task.completed and not (
                                    task.opsec_pre_blocked and not task.opsec_pre_bypassed) \
                                    and not (task.opsec_post_blocked and not task.opsec_post_bypassed):
                                # this task isn't done, it is a script only, and you're not blocked
                                #  so instead of going to submitted, it should be marked as done
                                logger.info(f"Callback_Function marking task {task.id} as 'completed'")
                                task.status = "completed"
                                task.completed = True
                                await app.db_objects.update(task)
                                # since this task is now done, check to see if there are other things that need
                                #    to be executed
                                asyncio.create_task(check_and_issue_task_callback_functions(taskOriginal=task,
                                                                                            task_completed=True,
                                                                                            updating_task=response_message["updating_task"],
                                                                                            updating_piece=response_message["updating_piece"]))
                            elif task.completed and not (
                                    task.opsec_pre_blocked and not task.opsec_pre_bypassed) \
                                    and not (task.opsec_post_blocked and not task.opsec_post_bypassed):
                                # task is done, but it's just some completion handler that fired again
                                #logger.info(f"callback handler completed for task {task.id} and task is completed, passing to others")
                                asyncio.create_task(check_and_issue_task_callback_functions(taskOriginal=task,
                                                                                            task_completed=False,
                                                                                            updating_task=
                                                                                            response_message[
                                                                                                "updating_task"],
                                                                                            updating_piece=
                                                                                            response_message[
                                                                                                "updating_piece"]))
                            # if it's none of these cases, then it's blocked for some reason, so wait
                            #else:
                                #logger.info(f"callback handler for task {task.id} but not any of the others fired")
                                #logger.info(f"{task.id} - completed {task.completed}, subtasks {subtasks}")
                        elif pieces[5] == "completed":

                            if not task.completed:
                                task.status = "processed"
                                task.status_timestamp_processed = task.timestamp
                                task.completed = True
                                logger.info(f"Updating task {task.id} status to completed in task_callback_function rabbitmq")
                                task.status = "completed"
                                await app.db_objects.update(task)
                                asyncio.create_task(check_and_issue_task_callback_functions(taskOriginal=task,
                                                                                            task_completed=True,
                                                                                            updating_task=
                                                                                            response_message[
                                                                                                "updating_task"],
                                                                                            updating_piece=
                                                                                            response_message[
                                                                                                "updating_piece"]
                                                                                            ))
                            else:
                                task.status = "completed"
                                await app.db_objects.update(task)
                        elif pieces[5] == "error":
                            task.status = "Task Handler Error"
                            task.completed = True
                            await app.db_objects.update(task)
                            asyncio.create_task(check_and_issue_task_callback_functions(taskOriginal=task,
                                                                                        task_completed=True,
                                                                                        updating_task=
                                                                                        response_message[
                                                                                            "updating_task"],
                                                                                        updating_piece=
                                                                                        response_message[
                                                                                            "updating_piece"]
                                                                                        ))
                        else:
                            task.status = pieces[5]
                            logger.info(f"called update on task {task.id} with status {task.status}")
                            await app.db_objects.update(task)
                elif pieces[3] == "sync_classes":
                    if pieces[6] == "":
                        # this was an auto sync from starting a container
                        operator = None
                    else:
                        operator = await app.db_objects.get(
                            db_model.operator_query,
                            username=base64.b64decode(pieces[6]).decode(),
                        )
                    if pieces[5] == "success":
                        # logger.info(f"got sync from: {pieces}")
                        from app.api.payloadtype_api import import_payload_type_func
                        try:
                            app.redis_pool.set(f"PTSYNC:{pieces[2]}", "success")
                            status = await import_payload_type_func(
                                json.loads(message.body.decode()), operator, pieces[2]
                            )
                            if status["status"] == "success":
                                # logger.info(f"got pt sync success: {status}")
                                asyncio.create_task(send_all_operations_message(
                                    message="Successfully Sync-ed database with {} payload files".format(
                                        pieces[2]
                                    ), level="info", source="payload_sync_success"))
                                if status["wrapper"] and status["new"]:
                                    pts = await app.db_objects.execute(
                                        db_model.payloadtype_query.where(
                                            db_model.PayloadType.wrapper == False
                                        )
                                    )
                                    sync_operator = (
                                        "" if operator is None else operator.username
                                    )
                                    for pt in pts:
                                        logger.info(
                                            "got sync from {}, sending sync to {}".format(pieces[2], pt.ptype))
                                        stats = await send_pt_rabbitmq_message(
                                            pt.ptype, "sync_classes", "", sync_operator, ""
                                        )
                                        if stats["status"] == "error":
                                            asyncio.create_task(send_all_operations_message(
                                                message="Failed to contact {} service: {}\nIs the container online and at least version 7?".format(
                                                    pt.ptype, status["error"]
                                                ), level="warning", source="payload_import_sync_error"))
                            elif status["status"] == "error" and status["error"] != "duplicate":
                                asyncio.create_task(send_all_operations_message(
                                    message="Failed Sync-ed database import with {} payload files: {}".format(
                                        pieces[2], status["error"]
                                    ), level="warning", source="payload_import_sync_error"))
                        except Exception as i:
                            asyncio.create_task(
                                send_all_operations_message(
                                    message="Failed Sync-ed database fetch with {} payload files: {}".format(
                                        pieces[2], str(i)
                                    ), level="warning", source="payload_parse_sync_error"))
                    else:
                        asyncio.create_task(send_all_operations_message(
                            message="Failed getting information for payload {} with error: {}".format(
                                pieces[2], message.body.decode()
                            ), level="warning", source="payload_sync_error"))
                elif pieces[3] == "process_container":
                    task = await app.db_objects.get(db_model.task_query, id=pieces[4])
                    await app.db_objects.create(db_model.OperationEventLog, operation=task.callback.operation,
                                                message=message.body.decode("utf-8"), level="warning",
                                                source=str(uuid.uuid4()))
            except Exception as e:
                asyncio.create_task(
                    send_all_operations_message(
                        message=f"Hit Exception in payload type response: {str(sys.exc_info()[-1].tb_lineno) + ' ' + str(e)}",
                        level="warning"))
                logger.exception("Exception in rabbit_pt_callback: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))


async def create_file(task_id: int, file: str, delete_after_fetch: bool = True,
                      saved_file_name: str = None, is_screenshot: bool = False,
                      is_download: bool = False, remote_path: str = None, comment: str = "",
                      host: str = None) -> dict:
    """
    Creates a FileMeta object in Mythic's database and writes contents to disk with a random UUID filename.
    This file can then be fetched via the returned file UUID.
    :param task_id: The ID number of the task performing this action (task.id)
    :param file: The base64 contents of the file to register
    :param delete_after_fetch: Should Mythic delete the file from disk after the agent fetches it. This also marks the file as deleted in the UI. This is useful if the file is a temporary file that doesn't necessarily need long-term tracking within Mythic.
    :param saved_file_name: The name of the file (if none supplied, a random UUID4 value will be used)
    :param is_screenshot: Is this file a screenshot reported by the agent? If so, this will cause it to show up in the screenshots page.
    :param is_download: Is this file the result of downloading something from the agent? If so, this will cause it to show up in the Files page under Downloads
    :param remote_path: Does this file exist on target? If so, provide the full remote path here
    :param comment: A user supplied comment about the file
    :param host: If this file exists on a target host, indicate it here in conjunction with the remote_path argument
    :return: Dict of a FileMeta object
    Example: this takes two arguments - ParameterType.String for `remote_path` and ParameterType.File for `file`
        async def create_tasking(self, task: MythicTask) -> MythicTask:
            try:
                original_file_name = json.loads(task.original_params)["file"]
                if len(task.args.get_arg("remote_path")) == 0:
                    task.args.add_arg("remote_path", original_file_name)
                elif task.args.get_arg("remote_path")[-1] == "/":
                    task.args.add_arg("remote_path", task.args.get_arg("remote_path") + original_file_name)
                file_resp = await MythicRPC().execute("create_file", task_id=task.id,
                    file=base64.b64encode(task.args.get_arg("file")).decode(),
                    saved_file_name=original_file_name,
                    delete_after_fetch=False,
                )
                if file_resp.status == MythicStatus.Success:
                    task.args.add_arg("file", file_resp.response["agent_file_id"])
                    task.display_params = f"{original_file_name} to {task.args.get_arg('remote_path')}"
                else:
                    raise Exception("Error from Mythic: " + str(file_resp.error))
            except Exception as e:
                raise Exception("Error from Mythic: " + str(sys.exc_info()[-1].tb_lineno) + str(e))
            return task
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        filename = saved_file_name if saved_file_name is not None else str(uuid.uuid4())
        path = "./app/files/{}".format(str(uuid.uuid4()))
        code_file = open(path, "wb")
        code = base64.b64decode(file)
        code_file.write(code)
        code_file.close()
        size = os.stat(path).st_size
        md5 = await hash_MD5(code)
        sha1 = await hash_SHA1(code)
        new_file_meta = await app.db_objects.create(
            db_model.FileMeta,
            total_chunks=1,
            chunks_received=1,
            chunk_size=size,
            complete=True,
            path=str(path),
            operation=task.callback.operation,
            operator=task.operator,
            full_remote_path=remote_path.encode("utf-8") if remote_path is not None else "".encode("utf-8"),
            md5=md5,
            sha1=sha1,
            task=task,
            delete_after_fetch=delete_after_fetch,
            filename=filename.encode("utf-8"),
            is_screenshot=is_screenshot,
            is_download_from_agent=is_download,
            host=host.upper() if host is not None else task.callback.host,
            comment=comment
        )
        #logger.info("New file comment: " + comment)
        asyncio.create_task(log_to_siem(mythic_object=new_file_meta, mythic_source="file_upload"))
        if remote_path is not None:
            asyncio.create_task(add_upload_file_to_file_browser(task.callback.operation, task, new_file_meta,
                                                                {"full_path": remote_path}))
        return {"status": "success", "response": new_file_meta.to_json()}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create file from task {task_id}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": str(e)}


async def get_file(task_id: int = None, callback_id: int = None, filename: str = None, limit_by_callback: bool = True,
                   max_results: int = 1, comment: str = None, file_id: str = None, get_contents: bool = True) -> dict:
    """
    Get file data and contents by name (ex: from create_file and a specified saved_file_name parameter).
    The search can be limited to just this callback (or the entire operation) and return just the latest or some number of matching results.
    :param task_id: The ID number of the task performing this action (task.id) - if this isn't provided, the callback id must be provided
    :param callback_id: The ID number of the callback for this action - if this isn't provided, the task_id must be provided
    :param filename: The name of the file to search for (Case sensitive)
    :param comment: The comment of the file to search for (Case insensitive)
    :param file_id: If no filename specified, then can search for a specific file by this UUID
    :param limit_by_callback: Set this to True if you only want to search for files that are tied to this callback. This is useful if you're doing this as part of another command that previously loaded files into this callback's memory.
    :param max_results: The number of results you want back. 1 will be the latest file uploaded with that name, -1 will be all results.
    :param get_contents: Boolean of if you want to fetch file contents or just metadata
    :return: An array of dictionaries representing the FileMeta objects of all matching files. When "get_contents" is True, each entry in this array will also have a "contents" key with the base64 representation of the associated file if it hasn't been deleted, or None if it has.
    For an example-
    resp = await MythicRPC().execute("get_file", task_id=task.id, filename="myAssembly.exe")
    resp.response <--- this is an array
    resp.response[0] <--- this is the most recently registered matching file where filename="myAssembly.exe"
    resp.response[0]["filename"] <-- the filename of that first result
    resp.response[0]["contents"] <--- the base64 contents of that file
    All of the possible dictionary keys are available at https://github.com/its-a-feature/Mythic/blob/master/mythic-docker/app/database_models/model.py for the FileMeta class
    """
    try:
        if task_id is not None:
            task = await app.db_objects.get(db_model.task_query, id=task_id)
            operation = task.callback.operation
            callback = task.callback
        elif callback_id is not None:
            callback = await app.db_objects.get(db_model.callback_query, id=callback_id)
            operation = callback.operation
        else:
            return {"status": "error", "error": "task_id or callback_id must be provided", "response": []}
        output = []
        output_file_length = 0
        if filename is not None:
            files = await app.db_objects.execute(
                db_model.filemeta_query.where(
                    (db_model.FileMeta.deleted == False)
                    & (fn.encode(db_model.FileMeta.filename, "escape") ** ("%" + filename + "%"))
                    & (db_model.FileMeta.operation == operation)
                ).order_by(-db_model.FileMeta.id)
            )
            count = 0
            for f in files:
                if count < max_results or max_results == -1:
                    if limit_by_callback:
                        if f.task is not None and f.task.callback == callback:
                            output.append(f.to_json())
                    else:
                        output.append(f.to_json())
        elif file_id is not None:
            try:
                file = await app.db_objects.get(db_model.filemeta_query, agent_file_id=file_id,
                                                operation=operation)
                output.append(file.to_json())
            except Exception as d:
                return {"status": "error", "error": "File does not exist in this operation", "response": []}
        if get_contents:
            for f in output:
                if os.path.exists(f["path"]):
                    f["contents"] = base64.b64encode(open(f["path"], "rb").read()).decode()
                    output_file_length += len(f["contents"])
                else:
                    f["contents"] = None
        if output_file_length > 130000000:
            return {"status": "error", "error": "Total size too big for rabbitmq message, use get_file_contents RPC call or choose to not get contents with the get_file search"}
        return {"status": "success", "response": output}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to get files from task {task_id}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": str(e), "response": []}


async def get_file_for_wrapper(filename: str = None, file_id: str = None, get_contents: bool = True) -> dict:
    """
    Get file data and contents by name (ex: from create_file and a specified saved_file_name parameter).
    :param filename: The name of the file to search for (Case sensitive)
    :param file_id: If no filename specified, then can search for a specific file by this UUID
    :return: A dictionary representing the FileMeta object of the most recent matched file. There is a "contents" key with the base64 representation of the associated file.
    For an example-
    resp = await MythicRPC().execute("get_file_for_wrapper", filename="myAssembly.exe")
    resp.response <--- this is the most recently registered matching file where filename="myAssembly.exe"
    resp.response["filename"] <-- the filename of that result
    resp.response["contents"] <--- the base64 contents of that file
    All of the possible dictionary keys are available at https://github.com/its-a-feature/Mythic/blob/master/mythic-docker/app/database_models/model.py for the FileMeta class
    """
    try:
        finalFile = {}
        if filename is not None:
            files = await app.db_objects.execute(
                db_model.filemeta_query.where(
                    (db_model.FileMeta.deleted == False)
                    & (fn.encode(db_model.FileMeta.filename, "escape") ** ("%" + filename + "%"))
                ).order_by(-db_model.FileMeta.id)
            )
            count = 0
            if len(files) > 0:
                finalFile = files[0].to_json()
            else:
                return {"status": "error", "error": "Failed to match any files by that name"}
        elif file_id is not None:
            try:
                file = await app.db_objects.get(db_model.filemeta_query, agent_file_id=file_id)
                finalFile = file.to_json()
            except Exception as d:
                return {"status": "error", "error": "File does not exist", "response": []}
        if get_contents:
            if os.path.exists(finalFile["path"]):
                finalFile["contents"] = base64.b64encode(open(finalFile["path"], "rb").read()).decode()
                if len(finalFile["contents"]) > 130000000:
                    return {"status": "error", "error": "Total size too big for rabbitmq message"}
            else:
                finalFile["contents"] = None
        else:
            finalFile["contents"] = None
        return {"status": "success", "response": finalFile}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to get file while building: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": str(e), "response": {}}


async def update_file(file_id: str, comment: str = None, delete_after_fetch: bool = None,
                      contents: bytes = None, filename: str = None) -> dict:
    """
    Given a file identifier, update certain attributes of the file.
    :param file_id: This is the string UUID identifier for the file
    :param comment: If you want to update the comment on the file, supply the text here
    :param delete_after_fetch: If you want this file to be deleted after an agent fetches it, set this to True. It's false by default.
    :param contents: Supply the raw bytes of the file if you want to update the contents.
    :param filename: Supply a new filename for the file
    :return: Success or error code
    """
    try:
        file = await app.db_objects.get(db_model.FileMeta, agent_file_id=file_id)
        if comment is not None:
            file.comment = comment
        if delete_after_fetch is not None:
            file.delete_after_fetch = delete_after_fetch
        if filename is not None:
            file.filename = filename.encode("utf-8")
        if contents is not None:
            path = "./app/files/{}".format(file.agent_file_id)
            code_file = open(path, "wb")
            code_file.write(contents)
            code_file.close()
            file.md5 = await hash_MD5(contents)
            file.sha1 = await hash_SHA1(contents)
        await app.db_objects.update(file)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def get_file_contents(agent_file_id: str) -> dict:
    """
    Get file contents for a specific file_id.
    :param agent_file_id: The UUID of the file you want the contents for
    :return:
    The bytes of the file
    """
    try:
        file = await app.db_objects.get(db_model.filemeta_query, agent_file_id=agent_file_id, deleted=False)
    except Exception as d:
        return {"status": "error", "error": "File does not exist in this operation", "response": b""}
    try:
        if os.path.exists(file.path):
            contents = open(file.path, "rb").read()
            if len(contents) > 130000000:
                return {"status": "error", "error": "Total size too big for rabbitmq message"}
            return {"status": "success", "response": contents}
        else:
            return {"status": "error", "error": "File was deleted from disk"}
    except Exception as e:
        return {"status": "error", "error": "Failed to read file"}


async def get_payload(payload_uuid: str, get_contents: bool = True) -> dict:
    """
    Get information about a payload and its contents
    :param payload_uuid: The UUID for the payload you're interested in
    :param get_contents: Whether or not you want to fetch the contents of the file or just the metadata
    :return: dictionary representation of the Payload object
    Example:
        async def create_tasking(self, task: MythicTask) -> MythicTask:
            try:
                gen_resp = await MythicRPC().execute("create_payload_from_uuid", task_id=task.id,
                                                     payload_uuid=task.args.get_arg("template"))
                if gen_resp.status == MythicStatus.Success:
                    # we know a payload is building, now we want it
                    while True:
                        resp = await MythicRPC().execute("get_payload", payload_uuid=gen_resp.response["uuid"])
                        if resp.status == MythicStatus.Success:
                            if resp.response["build_phase"] == "success":
                                task.args.add_arg("template", resp.response["file"]["agent_file_id"])
                                task.display_params = f"new Apfell payload ({resp.response['uuid']}) with description {resp.response['tag']}"
                                break
                            elif resp.response["build_phase"] == "error":
                                raise Exception(
                                    "Failed to build new payload: " + str(resp.error)
                                )
                            else:
                                await asyncio.sleep(1)
                        if resp.status == MythicStatus.Error:
                            raise Exception("Failed to get information about new payload:\\n" + resp.error)
                else:
                    raise Exception("Failed to generate new payload:\\n" + gen_resp.error)
            except Exception as e:
                raise Exception("Error trying to call RPC:\\n" + str(e))
            return task
    """
    try:
        payload = await app.db_objects.prefetch(db_model.payload_query.where(db_model.Payload.uuid == payload_uuid),
                                                db_model.filemeta_query)
        payload = list(payload)[0]
        payload_json = payload.to_json()
        payload_json["contents"] = ""
        if payload.file is None:
            return {"status": "error", "error": "No file associated with payload"}
        if os.path.exists(payload.file.path) and get_contents:
            payload_json["contents"] = base64.b64encode(
                open(payload.file.path, "rb").read()
            ).decode()
            if len(payload_json["contents"]) > 130000000:
                return {"status": "error", "error": "Payload size too big for rabbitmq"}
        from app.api.task_api import add_all_payload_info

        payload_info = await add_all_payload_info(payload)
        if payload_info["status"] == "error":
            return payload_info
        payload_json["commands"] = payload_info["commands"]
        payload_json["c2info"] = payload_info["c2info"]
        payload_json["build_parameters"] = payload_info["build_parameters"]
        return {"status": "success", "response": payload_json}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to get payload {payload_uuid}: {str(e)}",
                                        level="warning"))
        logger.warning("rabbitmq_api.py - get_payload - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "Payload not found:\n" + str(e)}


async def search_payloads(callback_id: int, payload_types: [str] = None, include_auto_generated: bool = False, description: str = "",
                          filename: str = "", build_parameters: dict = None) -> dict:
    """
    Search payloads based on payload type, if it was auto generated, the description, the filename, or build parameter values.
    Note: This does not search payloads that have been deleted.
    :param callback_id: The ID of the callback this search is for, this is what's used to limit your search to the right operation.
    :param payload_types: The names of the associated payload type if you want to restrict results
    :param include_auto_generated: Boolean if you want to include payloads that were automatically generated as part of tasking
    :param description: If you want to search for payloads with certain information in their description, this functions like an igrep search
    :param filename: If you want to search for payloads with certain filenames, this functions like an igrep search
    :param build_parameters: If you want to limit your search based on certain build parameters (maybe shellcode for example),
        then you can specify this dictionary of {"agent name": {"build_param_name": "build_param_value"}}
    :return: An array of dictionaries where each entry is one matching payload. Each dictionary entry contains the following:
        uuid - string
        description -string
        operator - string
        creation_time - string
        payload_type - string
        operation - string
        wrapped_payload - boolean (true if this payload wraps another payload)
        deleted - boolean
        build_container - string
        build_phase - string
        build_message - string
        build_stderr - string
        build_stdout - string
        callback_alert - boolean (true if this payload will attempt to hit the operation's webhook when a new callback is generated)
        auto_generated - boolean (true if this payload is auto generated by a task)
        task - dictionary of information about the associated task
        file - dictionary of information about the associated file
        os - string
    """
    def check_build_parameters(p: db_model.Payload, payload_info: dict):
        for agent, bparams in build_parameters.items():
            if p.payload_type.ptype == agent:
                # bparams is a dict of paramnam:paramvalue
                for bp_name, bp_value in bparams.items():
                    if bp_name in payload_info["build_parameters"]:
                        if str(bp_value) != payload_info["build_parameters"][bp_name]:
                            return False
        return True
    try:
        final_payloads = []
        callback = await app.db_objects.get(db_model.Callback, id=callback_id)
        payloads = await app.db_objects.prefetch(db_model.payload_query.where(
            (db_model.Payload.tag ** ("%" + description + "%")) &
            (db_model.Payload.operation == callback.operation)
        ), db_model.filemeta_query.where(
            (fn.encode(db_model.FileMeta.filename, "escape") ** ("%" + filename + "%")) &
            (db_model.FileMeta.operation == callback.operation)
        ))
        from app.api.task_api import add_all_payload_info
        for p in payloads:
            if include_auto_generated or not p.auto_generated:
                # only process if we want to include auto generated or our payload isn't auto generated
                if not payload_types or p.payload_type.ptype in payload_types:
                    if p.file is None:
                        continue
                    # only process if the user didn't specify any payload types, or this payload is in that list
                    payload_info = await add_all_payload_info(p)
                    if payload_info["status"] == "error":
                        logger.warning("rabbitmq_api.py - add_all_payload_info error: " + payload_info["error"])
                        continue
                    if build_parameters:
                        if not check_build_parameters(p, payload_info):
                            continue
                    payload_json = p.to_json()
                    payload_json["commands"] = payload_info["commands"]
                    payload_json["c2info"] = payload_info["c2info"]
                    payload_json["build_parameters"] = payload_info["build_parameters"]
                    final_payloads.append(payload_json)
        return {"status": "success", "response": final_payloads}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to search payloads: {str(e)}",
                                        level="warning"))
        logger.warning("rabbitmq_api.py - search_payloads - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "Payloads not found:\n" + str(e)}


async def create_agentstorage(unique_id: str, data: bytes):
    """
    Allow Payload Types and Translation containers to store arbitrary data within the database that doesn't fit
        somewhere else in Mythic's current schema
    :param unique_id: A unique string identifier
    :param data:
    :return: {"unique_id": "unique id here", "data": "base64 of data here"}
    """
    try:
        storage, created = await app.db_objects.get_or_create(db_model.AgentStorage, unique_id=unique_id, data=data)
        return {"status": "success", "response": str(storage)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def get_agentstorage(unique_id: str):
    """
    Allow Payload Types and Translation containers to fetch arbitrary data within the database that doesn't fit
        somewhere else in Mythic's current schema
    :param unique_id: A unique string identifier
    :return: {"unique_id": "unique id here", "data": "base64 of data here"}
    """
    try:
        storage = await app.db_objects.get(db_model.AgentStorage, unique_id=unique_id)
        return {"status": "success", "response": str(storage)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def delete_agentstorage(unique_id: str):
    """
    Allow Payload Types and Translation containers to delete arbitrary data within the database that doesn't fit
        somewhere else in Mythic's current schema
    :param unique_id: A unique string identifier
    :return: Success or Error
    """
    try:
        storage = await app.db_objects.get(db_model.AgentStorage, unique_id=unique_id)
        await app.db_objects.delete(storage)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def create_payload_from_uuid(task_id: int, payload_uuid: str, generate_new_random_values: bool = True,
                                   new_description: str = None, remote_host: str = None, filename: str = None) -> dict:
    """
    Given an existing Payload UUID, generate a new copy with a potentially new description, new filename, new random values, and specify that it'll exist on a certain host. This is useful for spawn or lateral movement tasks where you want to potentially change up IOCs and provide new, more informative, descriptions for callbacks.
    :param task_id: The ID number of the task performing this action (task.id)
    :param payload_uuid: The UUID of the payload we're interested in
    :param generate_new_random_values: Set this to True to generate new random values for C2 Profile parameters that are flagged as randomized
    :param new_description: Provide a custom new description for the payload and callbacks associated from it. If you don't provide one, a generic one will be generated
    :param remote_host: Indicate the hostname of the host this new payload is deployed to. If one isn't specified, you won't be able to link to it without first telling Mythic that this payload exists on a certain host via the Popup Modals.
    :param filename: New filename for the payload. If one isn't supplied, a random UUID will be generated
    :return: dictionary representation of the payload that was created
    Example:
        async def create_tasking(self, task: MythicTask) -> MythicTask:
            try:
                gen_resp = await MythicRPC().execute("create_payload_from_uuid", task_id=task.id,
                                                     payload_uuid=task.args.get_arg("template"))
                if gen_resp.status == MythicStatus.Success:
                    # we know a payload is building, now we want it
                    while True:
                        resp = await MythicRPC().execute("get_payload", payload_uuid=gen_resp.response["uuid"])
                        if resp.status == MythicStatus.Success:
                            if resp.response["build_phase"] == "success":
                                task.args.add_arg("template", resp.response["file"]["agent_file_id"])
                                task.display_params = f"new Apfell payload ({resp.response['uuid']}) with description {resp.response['tag']}"
                                break
                            elif resp.response["build_phase"] == "error":
                                raise Exception(
                                    "Failed to build new payload: " + str(resp.error)
                                )
                            else:
                                await asyncio.sleep(1)
                        if resp.status == MythicStatus.Error:
                            raise Exception("Failed to get information about new payload:\\n" + resp.error)
                else:
                    raise Exception("Failed to generate new payload:\\n" + gen_resp.error)
            except Exception as e:
                raise Exception("Error trying to call RPC:\\n" + str(e))
            return task
    """
    # check to make sure we have the right parameters (host, template)
    from app.api.payloads_api import register_new_payload_func
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        # default to the template of the current payload unless otherwise specified
        host = task.callback.host if remote_host is None else remote_host.upper()

        data = await get_payload_build_config(payload_uuid, generate_new_random_values)
        if data["status"] == "success":
            data = data["data"]
        else:
            return data
        if new_description is not None:
            data["tag"] = new_description
        else:
            data["tag"] = "Autogenerated from task {} on callback {}".format(
                str(task.id), str(task.callback.id)
            )
        data["filename"] = "Task" + str(task.id) + "Copy_" + data["filename"]
        if filename is not None:
            data["filename"] = filename
        rsp = await register_new_payload_func(
            data,
            {
                "current_operation": task.callback.operation.name,
                "username": task.operator.username,
            },
        )
        task.status = "building.."
        await app.db_objects.update(task)
        return await handle_automated_payload_creation_response(task, rsp, data, host)
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create payload from task {task_id}: {str(e)}",
                                        level="warning"))
        logger.warning("rabbitmq.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(traceback.format_exc()))
        return {
            "status": "error",
            "error": "Failed to build payload: " + str(traceback.format_exc()),
        }


async def get_payload_build_config(payload_uuid: str, generate_new_random_values: bool = False):
    try:
        from app.api.c2profiles_api import generate_random_format_string
        template = await app.db_objects.get(db_model.payload_query, uuid=payload_uuid)
        if template.build_phase not in ["success", "error"]:
            return {"status": "error", "error": "Can't task to rebuild a payload that's not completed"}
        # using that payload, generate the following build-tasking data
        data = {
            "payload_type": template.payload_type.ptype,
            "c2_profiles": [],
            "commands": [],
            "selected_os": template.os,
            "tag": template.tag,
            "wrapper": template.payload_type.wrapper,
        }
        if data["wrapper"]:
            data["wrapped_payload"] = template.wrapped_payload.uuid
        payloadcommands = await app.db_objects.execute(
            db_model.payloadcommand_query.where(db_model.PayloadCommand.payload == template)
        )
        data["commands"] = [c.command.cmd for c in payloadcommands]
        build_parameters = await app.db_objects.execute(
            db_model.buildparameterinstance_query.where(db_model.BuildParameterInstance.payload == template)
        )
        tmp_build_parameters = [t.to_json() for t in build_parameters]
        data["build_parameters"] = []
        for t in tmp_build_parameters:
            data["build_parameters"].append({
                "name": t["build_parameter"]["name"],
                "value": t["parameter"]
            })
        c2_profiles_data = []
        c2profiles = await app.db_objects.execute(
            db_model.payloadc2profiles_query.where(db_model.PayloadC2Profiles.payload == template)
        )
        for c2p in c2profiles:
            c2_profile_params = await app.db_objects.execute(
                db_model.c2profileparametersinstance_query.where(
                    (db_model.C2ProfileParametersInstance.payload == template)
                    & (
                            db_model.C2ProfileParametersInstance.c2_profile
                            == c2p.c2_profile
                    )
                )
            )
            params = {}
            for p in c2_profile_params:
                if p.c2_profile_parameters.randomize and generate_new_random_values:
                    params[
                        p.c2_profile_parameters.name
                    ] = await generate_random_format_string(
                        p.c2_profile_parameters.format_string
                    )
                elif p.c2_profile_parameters.parameter_type == "Dictionary" or p.c2_profile_parameters.parameter_type == "Array":
                    params[p.c2_profile_parameters.name] = json.loads(p.value)
                else:
                    params[p.c2_profile_parameters.name] = p.value
            c2_profiles_data.append(
                {"c2_profile": c2p.c2_profile.name, "c2_profile_parameters": params}
            )
        data["c2_profiles"] = c2_profiles_data
        data["filename"] = bytes(template.file.filename).decode()
        return {"status": "success", "data": data}
    except Exception as e:
        logger.warning("rabbitmq.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        raise e


async def create_payload_from_parameters(task_id: int, payload_type: str, c2_profiles: list, commands: list,
                                         build_parameters: list, filename: str = None, description: str = None,
                                         destination_host: str = None, wrapped_payload_uuid: str = None) -> dict:
    """
    Create a payload by specifying all of the parameters yourself for what you want to build
    :param task_id: The ID number of the task performing this action (task.id)
    :param payload_type: The name of the payload type you're wanting to build
    :param c2_profiles: List of c2 dictionaries of the form:
    [{ "c2_profile": "name of the c2 profile",
      "c2_profile_parameters": {
        "parameter name": "parameter value",
        "parameter name2": "parameter value 2"
      }
    }]
    :param commands: List of all the command names you want included with the payload that you build. This is of the form:
    [ "command1", "command2", "command3", ...]
    :param build_parameters:
    :param filename: Name of the new file
    :param description: Description for the payload that'll appear in the UI when a callback is created
    :param destination_host: Name of the host where the payload goes. If this isn't specified, then it's assumed to be the same host as the callback where the task is issued
    :param wrapped_payload_uuid: If you're creating a payload that wraps another payload, specify the UUID of the internal payload here
    :return: dictionary representation of a payload object
    """
    try:
        task = app.db_objects.get(db_model.task_query, id=task_id)
        from app.api.payloads_api import register_new_payload_func
        host = task.callback.host.upper()
        if destination_host is not None:
            host = destination_host.upper()
        tag = "Autogenerated from task {} on callback {}".format(
            str(task.id), str(task.callback.id))
        if description is not None:
            tag = description
        new_filename = "Task" + str(task.id) + "Payload"
        if filename is not None:
            new_filename = filename
        request = {
            "tag": tag,
            "filename": new_filename,
            "payload_type": payload_type,
            "c2_profiles": c2_profiles,
            "commands": commands,
            "build_parameters": build_parameters,
            "wrapped_payload": wrapped_payload_uuid,
        }
        rsp = await register_new_payload_func(
            request,
            {
                "current_operation": task.callback.operation.name,
                "username": task.operator.username,
            },
        )
        task.status = "building.."
        await app.db_objects.update(task)
        return await handle_automated_payload_creation_response(task, rsp, request, host)
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create payload from task {task_id}: {str(e)}",
                                        level="warning"))
        return {
            "status": "error",
            "error": "Failed to build payload: " + str(traceback.format_exc()),
        }


async def handle_automated_payload_creation_response(task, rsp, data, host):
    from app.api.payloads_api import write_payload

    if rsp["status"] == "success":
        payload = await app.db_objects.get(db_model.payload_query, uuid=rsp["uuid"])
        payload.task = task
        payload.auto_generated = True
        payload.callback_alert = False
        payload.file.delete_after_fetch = True
        payload.file.task = task
        payload.file.host = host.upper()
        await app.db_objects.update(payload.file)
        await app.db_objects.update(payload)
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
            await app.db_objects.update(payload)
            task.status = "error"
            await app.db_objects.create(
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
            await app.db_objects.update(task)
            await app.db_objects.get_or_create(
                db_model.PayloadOnHost,
                host=host.upper(),
                payload=payload,
                operation=payload.operation,
                task=task,
            )
        from app.api.task_api import add_all_payload_info

        payload_info = await add_all_payload_info(payload)
        if payload_info["status"] == "error":
            return payload_info
        payload_info = {**payload_info, **payload.to_json()}
        return {"status": "success", "response": payload_info}
    else:
        await app.db_objects.create(
            db_model.Response,
            task=task,
            response="Exception when registering payload: {}".format(rsp["error"]),
        )
        return {
            "status": "error",
            "error": "Failed to register new payload: " + rsp["error"],
        }


async def control_socks(task_id: int, port: int, start: bool = False, stop: bool = False) -> dict:
    """
    Start or stop SOCKS 5 on a specific port for this task's callback
    :param task_id: The ID number of the task performing this action (task.id)
    :param port: The port to open for SOCKS 5
    :param start: Boolean for if SOCKS should start
    :param stop: Boolean for if SOCKS should stop
    :return: Status message of if it completed successfully (nothing in the `response` attribute)
    Example:
        async def create_tasking(self, task: MythicTask) -> MythicTask:
            if task.args.get_arg("action") == "start":
                resp = await MythicRPC().execute("control_socks", task_id=task.id, start=True, port=task.args.get_arg("port"))
                if resp.status != MythicStatus.Success:
                    task.status = MythicStatus.Error
                    raise Exception(resp.error)
            else:
                resp = await MythicRPC().execute("control_socks", task_id=task.id, stop=True, port=task.args.get_arg("port"))
                if resp.status != MythicStatus.Success:
                    task.status = MythicStatus.Error
                    raise Exception(resp.error)
            return task
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        if start:
            from app.api.callback_api import start_socks
            resp = await start_socks(port, task.callback, task)
            return resp
        elif stop:
            from app.api.callback_api import stop_socks
            resp = await stop_socks(task.callback, task.operator)
            return resp
        return {"status": "error", "error": "unknown socks tasking"}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to control socks from task {task_id}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": "Exception trying to handle socks control:\n" + str(e)}


async def create_output(task_id: int, output: str) -> dict:
    """
    Add a message to the output for a task that the operator can see
    :param task_id: The ID number of the task performing this action (task.id)
    :param output: The message you want to send.
    :return: Status of if you successfully posted or not (nothing in the `response` attribute)
    Example:
        async def create_tasking(self, task: MythicTask) -> MythicTask:
            resp = await MythicRPC().execute("create_output", task_id=task.id, output="hello")
            if resp.status != MythicStatus.Success:
                task.status = MythicStatus.Error
                raise Exception(resp.error)
            return task
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        resp = await app.db_objects.create(
            db_model.Response,
            task=task,
            response=output.encode("utf-8"),
        )
        return {"status": "success"}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create output from task {task_id}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": str(e)}


async def update_callback(task_id: int, user: str = None, host: str = None, pid: int = None, ip: str = None,
                          external_ip: str = None, description: str = None, integrity_level: int = None,
                          os: str = None, architecture: str = None, domain: str = None, extra_info: str = None,
                          sleep_info: str = None) -> dict:
    """
    Update this task's associated callback data.
    :param task_id: The ID number of the task performing this action (task.id)
    :param user: The new username
    :param host: The new hostname
    :param pid: The new process identifier
    :param ip: The new IP address
    :param external_ip: The new external IP address
    :param description: The new description
    :param integrity_level: The new integrity level
    :param os: The new operating system information
    :param architecture: The new architecture
    :param domain: The new domain
    :param extra_info: The new "extra info" you want to store
    :param sleep_info: The new sleep information for the callback
    :return: Success or error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        update_data = {}
        if user is not None:
            update_data["user"] = user
        if host is not None:
            update_data["host"] = host.upper()
        if pid is not None:
            update_data["pid"] = pid
        if ip is not None:
            update_data["ip"] = ip
        if external_ip is not None:
            update_data["external_ip"] = external_ip
        if description is not None:
            update_data["description"] = description
        if integrity_level is not None:
            update_data["integrity_level"] = integrity_level
        if os is not None:
            update_data["os"] = os
        if architecture is not None:
            update_data["architecture"] = architecture
        if domain is not None:
            update_data["domain"] = domain
        if extra_info is not None:
            update_data["extra_info"] = extra_info
        if sleep_info is not None:
            update_data["sleep_info"] = sleep_info
        from app.api.callback_api import update_callback
        status = await update_callback(
            update_data, task.callback.agent_callback_id
        )
        return status
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to update callback from task {task_id}: {str(e)}",
                                        level="warning"))
        logger.warning("rabbitmq_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": str(e)}


async def create_artifact(task_id: int, artifact_type: str, artifact: str, host: str = None) -> dict:
    """
    Create a new artifact for a certain task on a host
    :param task_id: The ID number of the task performing this action (task.id)
    :param artifact_type: What kind of artifact is this (Process Create, File Write, etc). If the type specified doesn't exist, it will be created
    :param artifact: The actual artifact that was created
    :param host: Which host the artifact was created on. If none is provided, the current task's host is used
    :return: Success or error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
    except Exception as e:
        return {"status": "error", "error": "Failed to find task"}
    try:
        # first try to look for the artifact type, if it doesn't exist, create it
        base_artifact = await app.db_objects.get(db_model.artifact_query, name=artifact_type)
    except Exception as e:
        base_artifact = await app.db_objects.create(db_model.Artifact, name=artifact_type)
    try:
        artifact_host = host.upper() if host is not None else task.callback.host.upper()
        art = await app.db_objects.create(
            db_model.TaskArtifact,
            task=task,
            artifact_instance=artifact.encode("utf-8"),
            artifact=base_artifact,
            host=artifact_host,
            operation=task.callback.operation,
        )
        asyncio.create_task(log_to_siem(mythic_object=art, mythic_source="artifact_new"))
        return {"status": "success"}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create artifact from task {task_id}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": "failed to create task artifact: " + str(e)}


async def create_payload_on_host(task_id: int, payload_uuid: str, host: str) -> dict:
    """
    Register within Mythic that the specified payload exists on the specified host as a result of this tasking
    :param task_id: The ID number of the task performing this action (task.id)
    :param payload_uuid: The payload that will be associated with the host
    :param host: The host that will have the payload on it
    :return: success or error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        payload = await app.db_objects.get(db_model.payload_query, uuid=payload_uuid, operation=task.operation)
        payload_on_host = await app.db_objects.create(db_model.PayloadOnHost, payload=payload,
                                                      host=host.upper(), operation=task.operation, task=task)
        return {"status": "success"}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create payload on host from task {task_id}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": "Failed to register payload on host:\n" + str(e)}


async def get_tasks(task_id: int, host: str = None, ) -> dict:
    """
    Get all of the currently running tasks on the current host or on a specific host
    :param task_id: The ID number of the task performing this action (task.id)
    :param host: The name of the host to check for running tasks
    :return: An array of dictionaries representing the tasks running
    """
    # this needs host name, task_id
    # this returns a list of all jobs that are not errored or completed on that host for the task's callback
    #   and for each one returns the security context (which token is associated with each job)
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        if host is None:
            search_host = task.callback.host
        else:
            search_host = host.upper()
        tasks = await app.db_objects.execute(db_model.task_query.where(
            (db_model.Callback.host == search_host) &
            (db_model.Task.status != "error") &
            (db_model.Task.completed == False)
        ))
        response = []
        for t in tasks:
            response.append(t.to_json())
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def response_create_tokens(task, tokens):
    # create tokens based on a response message, not from an RPC call
    for token in tokens:
        token_host = token["host"].upper() if "host" in token else task.callback.host
        try:
            new_token = await app.db_objects.get(db_model.token_query, TokenId=token["TokenId"],
                                                 host=token_host.upper(), deleted=False)
        except Exception as e:
            new_token = await app.db_objects.create(db_model.Token, TokenId=token["TokenId"], host=token_host,
                                                    task=task)
        try:
            for k, v in token.items():
                if hasattr(new_token, k):
                    # we want to handle foreign keys separately
                    if k == "AuthenticationId":
                        try:
                            session = await app.db_objects.get(db_model.logonsession_query, LogonId=v, host=token_host,
                                                               deleted=False)
                        except Exception as e:
                            session = await app.db_objects.create(db_model.LogonSession, LogonId=v, host=token_host,
                                                                  task=task)
                        setattr(new_token, k, session)
                    else:
                        setattr(new_token, k, v)
            await app.db_objects.update(new_token)
        except Exception as e:
            asyncio.create_task(
                send_all_operations_message(message=f"Failed to create token from data:\n{token}\nError: {str(e)}",
                                            level="warning", operation=task.callback.operation))


async def create_token(task_id: int, TokenId: int, host: str = None, **kwargs) -> dict:
    """
    Create or update a token on a host. The `TokenId` is a unique identifier for the token on the host and is how Mythic identifies tokens as well. A token's `AuthenticationId` is used to link a Token to a LogonSession per Windows documentation, so when setting that value, if the associated LogonSession object doesnt' exist, Mythic will make it.
    :param task_id: The ID number of the task performing this action (task.id)
    :param TokenId: The integer token identifier value that uniquely identifies this token on this host
    :param host: The host where the token exists
    :param kwargs: The `Mythic/mythic-docker/app/database_models/model.py` Token class has all of the possible values you can set when creating/updating tokens. There are too many to list here individually, so a generic kwargs is specified.
    :return: Dictionary representation of the token created
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        token_host = host.upper() if host is not None else task.callback.host
    except Exception as e:
        return {"status": "error", "error": "Failed to find task"}
    try:
        token = await app.db_objects.get(db_model.token_query, TokenId=TokenId, host=token_host.upper(), deleted=False)
    except Exception as e:
        token = await app.db_objects.create(db_model.Token, TokenId=TokenId, host=token_host, task=task)
    try:
        for k, v in kwargs.items():
            if hasattr(token, k):
                # we want to handle foreign keys separately
                if k == "AuthenticationId":
                    try:
                        session = await app.db_objects.get(db_model.logonsession_query, LogonId=v, host=token_host,
                                                           deleted=False)
                    except Exception as e:
                        session = await app.db_objects.create(db_model.LogonSession, LogonId=v, host=token_host,
                                                              task=task)
                    setattr(token, k, session)
                else:
                    setattr(token, k, v)
        await app.db_objects.update(token)
        return {"status": "success", "response": token.to_json()}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create token from task {task_id}: {str(e)}",
                                        level="warning", operation=task.callback.operation))
        return {"status": "error", "error": "Failed to create/update token:\n" + str(e)}


async def delete_token(TokenId: int, host: str) -> dict:
    """
    Mark a specific token as "deleted" on a specific host.
    :param TokenId: The token that should be deleted
    :param host: The host where this token exists
    :return: success or error (nothing in the `response` attribute)
    """
    try:
        token = await app.db_objects.get(db_model.token_query, TokenId=TokenId, host=host.upper())
        token.deleted = True
        await app.db_objects.update(token)
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to delete token {TokenId} on {host}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": "Failed to find/delete token:\n" + str(e)}
    try:
        callback_token = await app.db_objects.execute(db_model.CallbackToken.where(
            (db_model.CallbackToken.token == token) &
            (db_model.CallbackToken.deleted == False)
        ))
        for ct in callback_token:
            ct.deleted = True
            await app.db_objects.update(ct)
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(
                message=f"Failed to delete token {TokenId} associated with a callback: {str(e)}",
                level="warning"))
    return {"status": "success"}


async def response_create_logon_session(task, logonsessions):
    # create logon sessions from response data, not from RPC calls
    for logonsession in logonsessions:
        session_host = logonsession["host"].upper() if "host" in logonsession else task.callback.host
        try:
            session = await app.db_objects.get(db_model.logonsession_query, LogonId=logonsession["LogonId"],
                                               host=session_host, deleted=False)
        except Exception as e:
            session = await app.db_objects.create(db_model.LogonSession, LogonId=logonsession["LogonId"],
                                                  host=session_host,
                                                  task=task)
        try:
            for k, v in logonsession.items():
                if hasattr(session, k):
                    setattr(session, k, v)
            await app.db_objects.update(session)
        except Exception as d:
            asyncio.create_task(
                send_all_operations_message(
                    message=f"Failed to create logon session from data:\n {logonsession}\nError: {str(d)}",
                    level="warning", operation=task.callback.operation))


async def create_logon_session(task_id: int, LogonId: int, host: str = None, **kwargs) -> dict:
    """
    Create a new logon session for this host
    :param task_id: The ID number of the task performing this action (task.id)
    :param LogonId: The integer logon identifier value that uniquely identifies this logon session on this host
    :param host: The host where this logon session exists
    :param kwargs: The `Mythic/mythic-docker/app/database_models/model.py` LogonSession class has all of the possible values you can set when creating/updating logon sessions. There are too many to list here individually, so a generic kwargs is specified.
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        session_host = host.upper() if host is not None else task.callback.host
        try:
            session = await app.db_objects.get(db_model.logonsession_query, LogonId=LogonId, host=session_host,
                                               deleted=False)
        except Exception as e:
            session = await app.db_objects.create(db_model.LogonSession, LogonId=LogonId, host=session_host,
                                                  task=task)
        for k, v in kwargs.items():
            if hasattr(session, k):
                setattr(session, k, v)
        await app.db_objects.update(session)
        return {"status": "success"}
    except Exception as d:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create logon session from task {task_id}: {str(d)}",
                                        level="warning"))
        return {"status": "error", "error": "Failed to create logon session:\n" + str(d)}


async def delete_logon_session(LogonId: int, host: str) -> dict:
    """
    Mark a specified logon session as "deleted" on a specific host
    :param LogonId: The Logon Session that should be deleted
    :param host: The host where the logon session used to be
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        session = await app.db_objects.get(db_model.logonsession_query, LogonId=LogonId, host=host.upper())
        session.deleted = True
        await app.db_objects.update(session)
        return {"status": "success"}
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to delete logon session {LogonId} on {host}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": "Failed to find/delete that logon session on that host:\n" + str(e)}


async def response_adjust_callback_tokens(task, tokens):
    for tokenData in tokens:
        try:
            if "action" not in tokenData:
                tokenData["action"] = "add"
            token_host = tokenData["host"].upper() if "host" in tokenData else task.callback.host
            try:
                token = await app.db_objects.get(db_model.token_query, TokenId=tokenData["TokenId"], host=token_host,
                                                 deleted=False)
            except Exception as e:
                if tokenData["action"] == "add":
                    token = await app.db_objects.create(db_model.Token, TokenId=tokenData["TokenId"], host=token_host,
                                                        task=task)
                else:
                    # asked to remove a token that we don't even have, move on
                    return
            try:
                callbacktoken = await app.db_objects.get(db_model.callbacktoken_query, token=token,
                                                         callback=task.callback,
                                                         deleted=False, host=token_host)
                if tokenData["action"] == "remove":
                    callbacktoken.deleted = True
                    await app.db_objects.update(callbacktoken)
            except Exception as e:
                if tokenData["action"] == "add":
                    callbacktoken = await app.db_objects.create(db_model.CallbackToken, token=token,
                                                                callback=task.callback,
                                                                task=task, host=token_host)
                else:
                    # asked to remove a callback token associated we don't have, move on
                    return
        except Exception as d:
            asyncio.create_task(
                send_all_operations_message(message=f"Failed to adjust callback token:\n{tokenData}\nError:\n {str(d)}",
                                            level="warning", operation=task.callback.operation))


async def create_callback_token(task_id: int, TokenId: int, host: str = None) -> dict:
    """
    Associate a token with a callback for usage in further tasking.
    :param task_id: The ID number of the task performing this action (task.id)
    :param TokenId: The token you want to associate with this callback
    :param host: The host where the token exists
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        token_host = host.upper() if host is not None else task.callback.host
        try:
            token = await app.db_objects.get(db_model.token_query, TokenId=TokenId, host=token_host, deleted=False)
        except Exception as e:
            token = await app.db_objects.create(db_model.Token, TokenId=TokenId, host=token_host, task=task)
        # then try to associate it with our callback
        try:
            callbacktoken = await app.db_objects.get(db_model.callbacktoken_query, token=token, callback=task.callback,
                                                     deleted=False, host=token_host)
        except Exception as e:
            callbacktoken = await app.db_objects.create(db_model.CallbackToken, token=token, callback=task.callback,
                                                        task=task, host=token_host)
        return {"status": "success"}
    except Exception as d:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to create callback token from task {task_id}: {str(d)}",
                                        level="warning"))
        return {"status": "error", "error": "Failed to get token and associate it:\n" + str(d)}


async def delete_callback_token(task_id: int, TokenId: int, host: str = None) -> dict:
    """
    Mark a callback token as no longer being associated
    :param task_id: The ID number of the task performing this action (task.id)
    :param TokenId: The Token you want to disassociate from the task's callback
    :param host: The host where the token exists
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        token_host = host.upper() if host is not None else task.callback.host
        try:
            token = await app.db_objects.get(db_model.token_query, TokenId=TokenId, host=token_host)
            callbacktoken = await app.db_objects.get(db_model.callbacktoken_query, token=token, callback=task.callback,
                                                     deleted=False, host=token_host)
            callbacktoken.deleted = True
            await app.db_objects.update(callbacktoken)
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "error": "Failed to find and delete callback token:\n" + str(e)}
    except Exception as d:
        return {"status": "error", "error": "Failed to find task:\n" + str(d)}


async def create_processes_rpc(task_id: int, processes: dict) -> dict:
    """
    Create processes in bulk. The parameters in the "processes" dictionary are the same as those in the `create_process` RPC call.
    :param task_id: The ID number of the task performing this action (task.id)
    :param processes: Dictionary of the processes you want to create - the key value pairs are the same as the parameters to the `create_process` RPC call.
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        return await create_processes(processes, task)
    except Exception as e:
        return {"status": "error", "error": "Failed to get task or create processes:\n" + str(e)}


async def create_process(task_id: int, host: str, process_id: int, parent_process_id: int = None,
                         architecture: str = None, name: str = None, bin_path: str = None,
                         user: str = None, command_line: str = None, integrity_level: int = None,
                         start_time: str = None, description: str = None, signer: str = None) -> dict:
    """
    Create a new process within Mythic.
    :param task_id: The ID number of the task performing this action (task.id)
    :param host: The host where this process exists
    :param process_id: The process ID
    :param parent_process_id: The process's parent process ID
    :param architecture: The architecture for the process (x86, x64, arm, etc)
    :param name: The name of the process
    :param bin_path: The path to the binary that's executed
    :param user: The user context that the process is executing
    :param command_line: The command line that's spawned with the process
    :param integrity_level: The integrity level of the process
    :param start_time: When the process started
    :param description: The description of the process
    :param signer: The process' signing information
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        process_data = {
            "host": host.upper(),
            "process_id": process_id,
            "parent_process_id": parent_process_id,
            "architecture": architecture,
            "name": name,
            "bin_path": bin_path,
            "user": user,
            "command_line": command_line,
            "integrity_level": integrity_level,
            "start_time": start_time,
            "description": description,
            "signer": signer
        }
        return await create_processes([process_data], task)
    except Exception as e:
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to parse 'process' data from task {task_id}: {str(e)}",
                                        level="warning"))
        return {"status": "error", "error": "Failed to create process:\n" + str(e)}


async def create_processes(request, task):
    # perform the same additions that you could do from request_api.py to add processes
    # just offer as RPC mechanism
    try:
        host = task.callback.host
        if "host" in request:
            host = request["host"].upper()
        timestamp = datetime.datetime.utcnow()
        bulk_insert = []
        for p in request["processes"]:
            bulk_insert.append(
                {
                    "task": task,
                    "host": host,
                    "timestamp": timestamp,
                    "operation": task.callback.operation,
                    "process_id": p["process_id"],
                    "parent_process_id": p["parent_process_id"] if "parent_process_id" in p else None,
                    "architecture": p["architecture"] if "architecture" in p else None,
                    "name": p["name"] if "name" in p else None,
                    "bin_path": p["bin_path"] if "bin_path" in p else None,
                    "user": p["user"] if "user" in p else None,
                    "command_line": p["command_line"] if "command_line" in p else None,
                    "integrity_level": p["integrity_level"] if "integrity_level" in p else None,
                    "start_time": p["start_time"] if "start_time" in p else None,
                    "description": p["description"] if "description" in p else None,
                    "signer": p["signer"] if "signer" in p else None
                }
            )
        if len(bulk_insert) > 0:
            await app.db_objects.execute(db_model.Process.insert_many(bulk_insert))
        return {"status": "success"}
    except Exception as e:
        logger.warning("rabbitmq_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        asyncio.create_task(
            send_all_operations_message(message=f"Failed to parse 'process' data from task {task.id}: {str(e)}",
                                        level="warning", operation=task.callback.operation))
        return {"status": "error", "error": str(e)}


async def search_processes(callback, **request):
    clauses = []
    for k, v in request.items():
        if k != "operation":
            if hasattr(db_model.Process, k):
                clauses.append(getattr(db_model.Process, k) ** v)
    results = await app.db_objects.execute(db_model.process_query.where(
        (db_model.Process.operation == callback.operation) &
        reduce(operator.and_, clauses)
    ))
    result = {"status": "success", "response": [r.to_json() for r in results]}
    return result


async def search_tokens(callback, **request):
    clauses = []
    for k, v in request.items():
        if k == "AuthenticationId":
            clauses.append(db_model.LogonSession.id == v)
        elif hasattr(db_model.Token, k):
            if isinstance(getattr(db_model.Token, k), TextField):
                clauses.append(getattr(db_model.Token, k) ** v)
            elif isinstance(getattr(db_model.Token, k), BooleanField):
                clauses.append(getattr(db_model.Token, k) == v)
            elif isinstance(getattr(db_model.Token, k), IntegerField):
                clauses.append(getattr(db_model.Token, k) ** v)
    results = await app.db_objects.execute(db_model.token_query.where(
        (db_model.Callback.operation == callback.operation) &
        reduce(operator.and_, clauses)
    ))
    result = {"status": "success", "response": [r.to_json() for r in results]}
    return result


async def search_file_browser(callback, **request):
    clauses = []
    for k, v in request.items():
        if hasattr(db_model.FileBrowserObj, k):
            if isinstance(getattr(db_model.FileBrowserObj, k), TextField):
                clauses.append(getattr(db_model.FileBrowserObj, k) ** v)
            elif isinstance(getattr(db_model.FileBrowserObj, k), BooleanField):
                clauses.append(getattr(db_model.FileBrowserObj, k) == v)
            elif isinstance(getattr(db_model.FileBrowserObj, k), IntegerField):
                clauses.append(getattr(db_model.FileBrowserObj, k) ** v)
    results = await app.db_objects.execute(db_model.filebrowserobj_query.where(
        (db_model.FileBrowserObj.operation == callback.operation) &
        reduce(operator.and_, clauses)
    ))
    result = {"status": "success", "response": [r.to_json() for r in results]}
    return result


async def search_tasks(callback, **request):
    clauses = []
    specified_host = False
    for k, v in request.items():
        if hasattr(db_model.Task, k):
            if isinstance(getattr(db_model.Task, k), TextField):
                clauses.append(getattr(db_model.Task, k) ** v)
            elif isinstance(getattr(db_model.Task, k), BooleanField):
                clauses.append(getattr(db_model.Task, k) == v)
            elif isinstance(getattr(db_model.Task, k), IntegerField):
                clauses.append(getattr(db_model.Task, k) == v)
            elif k == "id":
                clauses.append(getattr(db_model.Task, k) == v)
            elif k == "command":
                clauses.append(getattr(db_model.Command, "cmd") ** v)
        elif k == "host":
            clauses.append(getattr(db_model.Callback, k) ** v)
            specified_host = True

    # if we don't call out to search by host, then we'll search within the tasking callback
    if not specified_host:
        clauses.append(getattr(db_model.Callback, "id") == callback.id)
    results = await app.db_objects.execute(db_model.task_query.where(
        (db_model.Callback.operation == callback.operation) &
        reduce(operator.and_, clauses)
    ))
    result = {"status": "success", "response": [r.to_json() for r in results]}
    return result


async def search_loaded_commands(callback, **request):
    clauses = []
    for k, v in request.items():
        if hasattr(db_model.Command, k):
            if isinstance(getattr(db_model.Command, k), TextField):
                clauses.append(getattr(db_model.Command, k) ** v)
            elif isinstance(getattr(db_model.Command, k), BooleanField):
                clauses.append(getattr(db_model.Command, k) == v)
            elif isinstance(getattr(db_model.Command, k), IntegerField):
                clauses.append(getattr(db_model.Command, k) == v)

    results = await app.db_objects.execute(db_model.task_query.where(
        (db_model.LoadedCommands.callback == callback) &
        reduce(operator.and_, clauses)
    ))
    result = {"status": "success", "response": [r.to_json() for r in results]}
    return result


async def search_database(table: str, task_id: int = None, callback_id: int = None, **kwargs) -> dict:
    """
    Search the Mythic database for some data. Data is searched by regular expression for the fields specified. Because the available fields depends on the table you're searching, that argument is a generic python "kwargs" value.
    :param task_id: The ID number of the task performing this action (task.id) - if this isn't supplied, callback_id must be supplied
    :param callback_id: The ID number of the callback performing this action - if this isn't supplied, task_id must be supplied
    :param table: The name of the table you want to query. Currently only options are: process, token, file_browser, task, loaded_commands. To search files (uploads/downloads/hosted), use `get_file`
    :param kwargs: These are the key=value pairs for how you're going to search the table specified. For example, searching processes where the name of "bob" and host that starts with "spooky" would have kwargs of: name="bob", host="spooky*"
    :return: an array of dictionaries that represent your search. If your search had no results, you'll get back an empty array
    """
    try:
        if task_id is not None:
            task = await app.db_objects.get(db_model.task_query, id=task_id)
            callback = task.callback
        elif callback_id is not None:
            callback = await app.db_objects.get(db_model.callback_query, id=callback_id)
        else:
            return {"status": "error", "error": "task_id or callback_id must be supplied", "response": []}
        # this is the single entry point to do queries across the back-end database
        #   for RPC calls from payload types
        table_lower = table.lower()
        if table_lower in ["process", "processes"]:
            return await search_processes(callback, **kwargs)
        elif table_lower in ["token", "tokens"]:
            return await search_tokens(callback, **kwargs)
        elif table_lower in ["file_browser"]:
            return await search_file_browser(callback, **kwargs)
        elif table_lower in ["task", "tasks"]:
            return await search_tasks(callback, **kwargs)
        elif table_lower in ["loaded_commands", "loaded_command"]:
            return await search_loaded_commands(callback, **kwargs)
        else:
            return {"status": "error", "error": "Search not supported yet for that table", "response": []}
    except Exception as e:
        return {"status": "error", "error": "Failed to find task or search database:\n" + str(e), "response": []}


async def delete_file_browser(task_id: int, file_path: str, host: str = None) -> dict:
    """
    Mark a file in the file browser as deleted (typically as part of a manual removal via a task)
    :param task_id: The ID number of the task performing this action (task.id)
    :param file_path: The full path to the file that's being removed
    :param host: The host where the file existed. If you don't specify a host, the callback's host is used
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        file_host = host.upper() if host is not None else task.callback.host
        try:
            fobj = await app.db_objects.get(
                db_model.filebrowserobj_query,
                operation=task.callback.operation,
                host=file_host,
                full_path=file_path.encode("utf-8"),
                deleted=False,
            )
            fobj.deleted = True
            if not fobj.is_file:
                await mark_nested_deletes(fobj, task.callback.operation)
            await app.db_objects.update(fobj)
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "error": "Failed to mark file as deleted:\n" + str(e)}
    except Exception as d:
        return {"status": "error", "error": "Failed to find task:\n" + str(d)}


async def create_keylog(task_id: int, keystrokes: str, user: str = None, window_title: str = None) -> dict:
    """
    Create a new keylog entry in Mythic.
    :param task_id: The ID number of the task performing this action (task.id)
    :param keystrokes: The keys that are being registered
    :param user: The user that performed the keystrokes. If you don't supply this, "UNKNOWN" will be used.
    :param window_title: The title of the window where the keystrokes came from. If you don't supply this, "UNKNOWN" will be used.
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        rsp = await app.db_objects.create(
            db_model.Keylog,
            task=task,
            window=window_title if window_title is not None else "UNKNOWN",
            keystrokes=keystrokes.encode("utf-8"),
            operation=task.callback.operation,
            user=user if user is not None else "UNKNOWN",
        )
        asyncio.create_task(log_to_siem(mythic_object=rsp, mythic_source="keylog_new"))
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def create_credential(task_id: int, credential_type: str, account: str, realm: str, credential: str,
                            metadata: str = "", comment: str = None) -> dict:
    """
    Create a new credential within Mythic to be leveraged in future tasks
    :param task_id: The ID number of the task performing this action (task.id)
    :param credential_type: The type of credential we're storing (plaintext, hash, ticket, certificate, token)
    :param account: The account associated with the credential
    :param realm: The realm for the credential (sometimes called the domain)
    :param credential: The credential value itself
    :param metadata: Any additional metadata you want to store about the credential
    :param comment: Any comment you want to store about it the credential
    :return: Success or Error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        from app.api.credential_api import create_credential_func
        cred = {
            "task": task,
            "type": credential_type,
            "account": account,
            "realm": realm,
            "credential": credential,
            "comment": comment,
            "metadata": metadata
        }
        await create_credential_func(task.operator, task.callback.operation, cred)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def get_credential(task_id: int, credential_type: str = None, account: str = None, realm: str = None,
                         metadata: str = None, comment: str = None, limit_by_callback: bool = False) -> dict:
    """

    :param task_id:
    :param credential_type:
    :param account:
    :param realm:
    :param metadata:
    :param comment:
    :param limit_by_callback:
    :return:
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        if limit_by_callback:
            credentials = await app.db_objects.execute(db_model.credential_query.where(
                (db_model.Credential.operation == task.callback.operation) &
                (db_model.Credential.deleted == False) &
                (db_model.Callback == task.callback)

            ))
        else:
            credentials = await app.db_objects.execute(db_model.credential_query.where(
                (db_model.Credential.operation == task.callback.operation) &
                (db_model.Credential.deleted == False)

            ))
        result = []
        for c in credentials:
            if credential_type is not None and c.type != credential_type:
                continue
            if realm is not None and realm.lower() not in c.realm.lower():
                continue
            if account is not None and account.lower() not in c.account.lower():
                continue
            if comment is not None and comment.lower() not in c.comment.lower():
                continue
            if metadata is not None and metadata.lower() not in c.metadata.lower():
                continue
            result.append(c.to_json())
        return {"status": "success", "response": result}

    except Exception as e:
        return {"status": "error", "error": str(e)}


async def create_file_browser(task_id: int, name: str, parent_path: str = "", permissions: dict = None,
                              access_time: str = "", modify_time: str = "", comment: str = "", host: str = None,
                              is_file: bool = True, size: str = "", success: bool = True, files: [dict] = None,
                              update_deleted: bool = False) -> dict:
    """
    Add file browser content to the file browser user interface.
    :param parent_path: The full parent path for the file. If the name of the folder is the root path (i.e. "/" or "C:\"), then the parent path should be ""
    :param task_id: The ID number of the task performing this action (task.id)
    :param host: Which host this data is from (useful for remote file listings). If this is None, then use the host from the task's callback
    :param name: Name of the file/folder that was listed
    :param permissions: Dictionary of permissions. The key/values here are completely up to you and are displayed as key/value pairs in the UI
    :param access_time: String representation of when the file/folder was last accessed
    :param modify_time: String representation of when the file/folder was last modified
    :param comment: Any comment you might want to add to this file/folder
    :param is_file: Is this a file?
    :param size: Size of the file (can be an int or something human readable, like 10MB)
    :param success: True/False if you successfully listed this file. A False value (like from an access denied) will appear as a red X in the UI
    :param files: Array of dictionaries of information for all of the files in this folder (or an empty array of this is a file). Each dictionary has all of the same pieces of information as the main folder itself.
    :param update_deleted: True or False indicating if this file browser data should be used to automatically update deleted files for the listed folder. This defaults to false, but if set to true and there are files that Mythic knows about for this folder that the passed-in data doesn't include, it will be marked as deleted.
    :return: success or error (nothing in the `response` attribute)
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        request = {
            "host": host.upper() if host is not None else task.callback.host,
            "name": name,
            "parent_path": parent_path,
            "permissions": permissions if permissions is not None else {},
            "access_time": access_time,
            "modify_time": modify_time,
            "comment": comment,
            "is_file": is_file,
            "size": size,
            "success": success,
            "update_deleted": update_deleted,
            "files": files if files is not None else []
        }
        from app.api.file_browser_api import store_response_into_filebrowserobj
        status = await store_response_into_filebrowserobj(
            task.callback.operation, task, request
        )
        return status
    except Exception as e:
        return {"status": "error", "error": "Failed to find task or store data:\n" + str(e)}


async def create_subtask(parent_task_id: int, command: str, params_string: str = None, params_dict: dict = None, files: dict = None,
                         subtask_callback_function: str = None, subtask_group_name: str = None, tags: [str] = None,
                         group_callback_function: str = None) -> dict:
    """
    Issue a new task to the current callback as a child of the current task.
    You can use the "subtask_callback_function" to provide the name of the function you want to call when this new task enters a "completed=True" state.
    If you issue create_subtask_group, the group name and group callback functions are propagated here.
    You MUST provide params_string or params_dict to this function, but you don't provide both.
    :param parent_task_id: The id of the current task (task.id)
    :param command: The name of the command you want to use
    :param params_string: The string parameters you want to issue to that command (this gets passed to the command's parse_arguments function)
    :param params_dict: THe dictionary of parameters you want to issue to that command (this will get converted into a string and passed to that command's parse_arguments function)
    :param files: If you want to pass along a file to the task, provide it here (example provided)
    :param subtask_callback_function: The name of the function to call on the _parent_ task when this function exits
    :param subtask_group_name: An optional name of a group so that tasks can share a single callback function
    :param tags: A list of strings of tags you want to apply to this new task
    :param group_callback_function: If you're grouping tasks together, this is the name of the shared callback function for when they're all in a "completed=True" state
    :return: Information about the task you just created
    If the command for your subtask normally takes a parameter of type File, then we need to do something a little bit differently for you to pass that along to the subtask.
    Let's say you want to call the "upload" command which takes a `path` argument which is a string and a `file` argument which is a type of File.
    To call this as a subtask you'd need to pass in:
        MythicRPC().execute("create_subtask", parent_task_id=task.id, command="upload", params_dict={"path": "/wherever", "file": "filename"}, files={"file": "base64 file contents"})
    Notice here that in the parameters piece, the "file" value is the filename and in the "files" parameter, we associated it with the file contents.
    This allows us to save off the filename in the task's "original_params" while still getting access to the contents in the "params" value.
    """
    try:
        parent_task = await app.db_objects.get(db_model.task_query, id=parent_task_id)
        operatoroperation = await app.db_objects.get(
            db_model.operatoroperation_query, operator=parent_task.operator, operation=parent_task.callback.operation
        )
        if operatoroperation.base_disabled_commands is not None:
            if command not in ["clear"]:
                cmd = await app.db_objects.get(
                    db_model.command_query,
                    cmd=command,
                    payload_type=parent_task.callback.registered_payload.payload_type,
                )
                try:
                    disabled_command = await app.db_objects.get(
                        db_model.disabledcommandsprofile_query,
                        name=operatoroperation.base_disabled_commands.name,
                        command=cmd,
                    )
                    return {"status": "error", "error": "Not authorized to execute that command"}
                except Exception as e:
                    pass
        # if we create new files throughout this process, be sure to tag them with the right task at the end
        final_params = params_string
        if final_params is None:
            final_params = json.dumps(params_dict)
        data = {
            "command": command,
            "params": final_params,
            "original_params": final_params,
            "subtask_callback_function": subtask_callback_function,
            "subtask_group_name": subtask_group_name,
            "group_callback_function": group_callback_function,
            "tags": tags if tags is not None else [],
            "parent_task": parent_task,
        }
        if parent_task.token is not None:
            data["token"] = parent_task.token.TokenId
        if files is not None and len(files) > 0:
            data["params"] = json.loads(data["params"])
            for f, v in files.items():
                data["params"][f] = v
            data["params"] = json.dumps(data["params"])
            data.pop("files", None)
        from app.api.task_api import add_task_to_callback_func
        output = await add_task_to_callback_func(data, parent_task.callback.id, parent_task.operator,
                                                 parent_task.callback)
        if output["status"] == "success":
            output.pop("status", None)
            return {"status": "success", "response": output}
        else:
            return {"status": "error", "error": output["error"]}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def create_subtask_group(parent_task_id: int, tasks: [dict], subtask_group_name: str = None, tags: [str] = None,
                               group_callback_function: str = None) -> dict:
    """
    Create a group of subtasks at once and register a single callback function when the entire group is done executing.
    :param parent_task_id: The id of the parent task (i.e. task.id)
    :param tasks: An array of dictionaries representing the tasks to create. An example is shown below.
    :param subtask_group_name: The name for the group. If one isn't provided, a random UUID will be used instead
    :param tags: An optional list of tags to apply to all of the subtasks created.
    :param group_callback_function: The name of the function to call in the _parent_ task when all of these subtasks are done.
    :return: An array of dictionaries representing information about all of the subtasks created.
    """
    try:
        task_responses = []
        overall_status = "success"
        for t in tasks:
            response = await create_subtask(
                parent_task_id=parent_task_id,
                command=t["command"],
                params_string=t["params"] if isinstance(t["params"], str) else None,
                params_dict=t["params"] if isinstance(t["params"], dict) else None,
                files=t["files"] if "files" in t else None,
                subtask_callback_function=t["subtask_callback_function"] if "subtask_callback_function" in t else None,
                subtask_group_name=subtask_group_name,
                group_callback_function=group_callback_function,
                tags=tags
            )
            if response["status"] == "error":
                overall_status = "error"
            task_responses.append(response)
        return {"status": overall_status, "response": task_responses}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def get_responses(task_id: int) -> dict:
    """
    For a given Task, get all of the user_output, artifacts, files, and credentials that task as created within Mythic
    :param task_id: The TaskID you're interested in (i.e. task.id)
    :return: A dictionary of the following format:
    {
      "user_output": array of dictionaries where each dictionary is user_output message for the task,
      "artifacts": array of dictionaries where each dictionary is an artifact created for the task,
      "files": array of dictionaries where each dictionary is a file registered as part of the task,
      "credentials": array of dictionaries where each dictionary is a credential created as part of the task.
    }
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        responses = await app.db_objects.prefetch(
            db_model.response_query.where(db_model.Response.task == task).order_by(db_model.Response.id),
            db_model.task_query
        )
        # get all artifacts associated with the task
        artifacts = await app.db_objects.execute(db_model.taskartifact_query.where(
            db_model.TaskArtifact.task == task
        ).order_by(db_model.TaskArtifact.id))
        # get all files associated with the task
        files = await app.db_objects.execute(db_model.filemeta_query.where(
            db_model.FileMeta.task == task
        ).order_by(db_model.FileMeta.id))
        # get all credentials associated with the task
        credentials = await app.db_objects.execute(db_model.credential_query.where(
            db_model.Credential.task == task
        ).order_by(db_model.Credential.id))
        response = {
            "user_output": [r.to_json() for r in responses],
            "artifacts": [a.to_json() for a in artifacts],
            "files": [f.to_json() for f in files],
            "credentials": [c.to_json() for c in credentials]
        }
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def encrypt_message(message: dict, target_uuid: str, c2_profile_name: str):
    """
    Given a dictionary agent message, submit it to Mythic to encrypt with a target callback/payload's encryption keys
    :param message: the dictionary message
    :param target_uuid: the UUID of the payload/stager/callback that will receive the encrypted message
    :param c2_profile_name: the name of the c2 profile that this message will be sent over
    :return: The final base64 and encrypted message
    """
    try:
        from app.api.callback_api import get_encryption_data
        enc_key = await get_encryption_data(target_uuid, c2_profile_name)
        from app.api.callback_api import create_final_message_from_data_and_profile_info
        final_msg = await create_final_message_from_data_and_profile_info(message, enc_key, target_uuid, None)
        return {"status": "success", "response": final_msg}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def decrypt_message(message: str, c2_profile_name: str):
    """
    Given an encrypted message from an agent, decrypt it based on the C2 profile that received it
    :param message: The base64 of the message from an agent
    :param c2_profile_name: the name of the c2 profile where this message came from
    :return: the dictionary representation of the message for Mythic
    """
    try:
        from app.api.callback_api import parse_agent_message
        return await parse_agent_message(message, None, c2_profile_name, True)
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def get_commands(callback_id: int = None, loaded_only: bool = False,
                       payload_type_name: str = None, commands: [str] = None, os: str = None):
    """
    Get an array of dictionaries of all the possible commands for the specified callback or payload type
    :param callback_id: the id of the callback in question
    :param loaded_only: specify this as True to only include commands currently loaded into this callback
    :param payload_type_name: specify this to fetch all possible commands for a specific payload type
    :param commands: specify an array of command names along with the payload_type_name to fetch information
        about only the listed commands for the specified payload type
    :param os: Specify the OS that's associated with the payload_type_name so that commands can be filtered
    :return: an array of dictionaries representing all of the requested commands for that payload type.
    When returning all possible commands for this callback, commands are still filtered by their supported_os attributes
    """
    try:
        if callback_id is not None:
            callback = await app.db_objects.get(db_model.callback_query, id=callback_id)
            callback_commands = await app.db_objects.execute(db_model.loadedcommands_query.where(
                db_model.LoadedCommands.callback == callback
            ))
            loaded_commands = [c.command for c in callback_commands]
            all_commands = await app.db_objects.execute(db_model.command_query.where(
                (db_model.Command.payload_type == callback.registered_payload.payload_type)
            ))
            final_commands = []
            if loaded_only:
                for c in loaded_commands:
                    if commands is None or (commands is not None and c.cmd in commands):
                        attributes = json.loads(c.attributes)
                        if len(attributes["supported_os"]) == 0 or callback.registered_payload.os in attributes["supported_os"]:
                            final_commands.append({**c.to_json(), "attributes": attributes})
                return {"status": "success", "response": final_commands}
            else:
                loaded_commands = [c.cmd for c in loaded_commands]
                for c in all_commands:
                    if commands is None or (commands is not None and c.cmd in commands):
                        attributes = json.loads(c.attributes)
                        if len(attributes["supported_os"]) == 0 or callback.registered_payload.os in attributes["supported_os"]:
                            final_commands.append({**c.to_json(), "attributes": attributes, "loaded": c.cmd in loaded_commands})
                return {"status": "success", "response": final_commands}
        elif payload_type_name is not None and os is not None:
            payload_type = await app.db_objects.get(db_model.payloadtype_query, ptype=payload_type_name)
            all_commands = await app.db_objects.execute(db_model.command_query.where(
                (db_model.Command.payload_type == payload_type)
            ))
            final_commands = []
            for c in all_commands:
                if commands is None or (commands is not None and c.cmd in commands):
                    attributes = json.loads(c.attributes)
                    if len(attributes["supported_os"]) == 0 or os in attributes["supported_os"]:
                        final_commands.append( {**c.to_json(), "attributes": attributes} )
            return {"status": "success", "response": final_commands}
        else:
            return {"status": "error", "error": "Must supply both payload_type_name and os or callback_id"}

    except Exception as e:
        from app.api.operation_api import send_all_operations_message
        await send_all_operations_message(message=f"Failed to get commands in RPC call:\n{str(e)}", level="warning")
        return {"status": "error", "error": str(e)}


async def add_commands_to_payload(payload_uuid: str, commands: [str]):
    """
    Register additional commands that are in the payload. This is useful if a user selects command X to include in a payload, but command X needs command Y.
    A common example would be if command X is a script_only command or will end up delegating additional commands.
    :param payload_uuid: The UUID of the payload that you're adding commands to.
    :param commands: An array of command names that should be added to this payload.
    :return: Success or Error
    """
    try:
        payload = await app.db_objects.get(db_model.payload_query, uuid=payload_uuid)
    except Exception as e:
        return {"status": "error", "error": "Payload not found"}
    try:
        for cmd in commands:
            command = await app.db_objects.get(db_model.command_query, cmd=cmd, payload_type=payload.payload_type)
            await app.db_objects.get_or_create(db_model.PayloadCommand, payload=payload, command=command, version=command.version)
    except Exception as e:
        return {"status": "error", "error": "Failed to find command"}
    return {"status": "success"}


async def add_commands_to_callback(task_id: int, commands: [str]):
    """
    Register additional commands that are in the callback. This is useful if a user selects to load script_only commands, so you want to inform mythic that the command is now available, but maybe not actually send anything down to the agent.
    :param task_id: The ID of the task that's loading commands.
    :param commands: An array of command names that should be added to this payload.
    :return: Success or Error
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
    except Exception as e:
        return {"status": "error", "error": "Callback not found"}
    try:
        for cmd in commands:
            command = await app.db_objects.get(db_model.command_query, cmd=cmd, payload_type=task.callback.registered_payload.payload_type)
            await app.db_objects.get_or_create(db_model.LoadedCommands,
                                               callback=task.callback,
                                               command=command,
                                               operator=task.operator,
                                               version=command.version)
    except Exception as e:
        return {"status": "error", "error": "Failed to find command or load it: " + str(e)}
    return {"status": "success"}


async def update_loaded_commands(task_id: int, commands: [str], add: bool = None, remove: bool = None):
    """
    Add or Remove loaded commands for the callback associated with task_id
    :param task_id: The task doing the modifications
    :param commands: The list of command names to add/remove
    :param add: Boolean set to True if you want to add the commands to the callback associated with task_id
    :param remove: Boolean set to True if you want to remove teh commands from the callback assocaited with task_id
    :return: Status for success or error
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        callback = task.callback
        payload_type = task.callback.registered_payload.payload_type
        commands_to_load = await app.db_objects.execute(db_model.command_query.where(
            (db_model.Command.payload_type == payload_type) &
            (db_model.Command.cmd.in_(commands))
        ))
        if add:
            for c in commands_to_load:
                await app.db_objects.create_or_get(db_model.LoadedCommands, command=c, callback=callback,
                                                   operator=task.operator, version=c.version)
        if remove:
            for c in commands_to_load:
                try:
                    loaded = await app.db_objects.get(db_model.LoadedCommands, command=c, callback=callback)
                    await app.db_objects.delete(loaded)
                except Exception as e:
                    logger.info(f"{c.cmd} wasn't loaded in callback {callback.id}, so can't remove it via RPC")
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def create_callback(payload_uuid: str, c2_profile: str, encryption_key: bytes = None, decryption_key: bytes = None, crypto_type: str = None):
    from app.api.callback_api import create_callback_func
    from app.api.task_api import update_edges_from_checkin
    result = await create_callback_func({"uuid": payload_uuid,
                                         "external_ip": "",
                                         "enc_key": encryption_key,
                                         "dec_key": decryption_key,
                                         "crypto_type": crypto_type}, {})
    if result["status"] == "success":
        await update_edges_from_checkin(result["id"], c2_profile)
        return {"status": "success", "response": result["id"]}
    else:
        return result


async def create_event_message(message: str, warning: bool = False, task_id: int = None) -> dict:
    """
    Create a message in the Event feed within the UI as an info message or as a warning
    :param task_id: The ID number of the task performing this action (task.id)
    :param message: The message you want to send
    :param warning: If this is True, the message will be a "warning" message
    :return: success or error (nothing in the `response` attribute)
    """
    try:
        if task_id is not None:
            task = await app.db_objects.get(db_model.task_query, id=task_id)
            msg = await app.db_objects.create(
                db_model.OperationEventLog,
                level="warning" if warning else "info",
                operation=task.callback.operation,
                message=message
            )
            asyncio.create_task(log_to_siem(mythic_object=msg, mythic_source="eventlog_new"))
        else:
            from app.api.operation_api import send_all_operations_message
            await send_all_operations_message(message=message, level="warning" if warning else "info")
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def get_task_for_id(task_id: int, requested_uuid: str = None, requested_id: int = None) -> dict:
    """
    A task can ask for information about other tasks within the same operation. This typically happens when you get an
    agent_task_id back from something like a `jobs list` command and want to see what those commands are.
    :param task_id: The TaskID you're interested in (i.e. task.id)
    :param requested_uuid: The agent_task_id (uuid) of the task you want information about, this is optional
    :param requested_id: The id of the task you want information about, this is optional, but this or requested_uuid must be supplied
    :return: A dictionary representation of that task
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        if requested_uuid is not None:
            other_task = await app.db_objects.get(db_model.task_query, agent_task_id=requested_uuid)
        elif requested_id is not None:
            other_task = await app.db_objects.get(db_model.task_query, id=requested_id)
        else:
            return {"status": "error", "error": "Must supply requested_uuid or requested_id"}
        if task.callback.operation == other_task.callback.operation:
            return {"status": "success", "response": other_task.to_json()}
        else:
            return {"status": "error", "error": "Failed to find task in current operation"}
    except Exception as e:
        return {"status": "error", "error": "Failed to find task: " + str(e)}


async def update_task_opsec_status(task_id: int, opsec_pre_blocked: bool = None, opsec_pre_bypassed: bool = None,
                                   opsec_pre_bypass_role: str = None, opsec_pre_message: str = None,
                                   opsec_post_blocked: bool = None, opsec_post_bypassed: bool = None,
                                   opsec_post_bypass_role: str = None, opsec_post_message: str = None):
    """
    This function allows you to update the OPSEC status components for the specified task.
    :param task_id: The task you want to edit (ex: task.id in your calls)
    :param opsec_pre_blocked: Boolean indicating if this task should be blocked in the pre-phase. This means a user bypass would go to that task's create_tasking next.
    :param opsec_pre_bypassed: Boolean indicating if this task is bypassed. If this is True, you won't have to issue a bypass request through the UI to continue.
    :param opsec_pre_bypass_role: String indicating who is required to bypass; this can be "operator" or "lead"
    :param opsec_pre_message: String message that you want associated with the status. If this wasn't empty initially, your message will be appended to the end.
    :param opsec_post_blocked: Boolean indicating if this task should be blocked in the post-phase. This means a user bypass would set the task to be picked up by the agent (if not script_only) or marked as completed.
    :param opsec_post_bypassed: Boolean indicating if this task is bypassed. If this is True, you won't have to issue a bypass request through the UI to continue.
    :param opsec_post_bypass_role: String indicating who is required to bypass; this can be "operator" or "lead"
    :param opsec_post_message: String message that you want associated with the status. If this wasn't empty initially, your message will be appended to the end.
    :return: Status indicating success or error on if the task was updated or not.
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        if opsec_pre_blocked is not None:
            task.opsec_pre_blocked = opsec_pre_blocked
        if opsec_pre_bypassed is not None:
            task.opsec_pre_bypassed = opsec_pre_bypassed
        if opsec_pre_bypass_role is not None and opsec_pre_bypass_role in ["operator", "lead"]:
            task.opsec_pre_bypass_role = opsec_pre_bypass_role
        if opsec_pre_message is not None:
            task.opsec_pre_message += opsec_pre_message
        if opsec_post_blocked is not None:
            task.opsec_post_blocked = opsec_post_blocked
        if opsec_post_bypassed is not None:
            task.opsec_post_bypassed = opsec_post_bypassed
        if opsec_post_message is not None:
            task.opsec_post_message += opsec_post_message
        if opsec_post_bypass_role is not None and opsec_post_bypass_role in ["operator", "lead"]:
            task.opsec_post_bypass_role = opsec_post_bypass_role
        await app.db_objects.update(task)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def update_task_status(task_id: int, status: str, completed: bool = None):
    """
    Update a task's status to a custom value and optionally mark a task as completed
    :param task_id: The task you want to update (i.e. task.id in you create_tasking)
    :param status: The string value of the status you want to set
    :param completed: Optional boolean value to mark the task as completed
    :return: Status indicating success or error on if the task was updated or not.
    """
    try:
        task = await app.db_objects.get(db_model.task_query, id=task_id)
        task.status = status
        if completed:
            task.completed = True
        await app.db_objects.update(task)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def add_command_attack_to_task(task, command):
    try:
        attack_mappings = await app.db_objects.execute(
            db_model.attackcommand_query.where(db_model.ATTACKCommand.command == command)
        )
        for attack in attack_mappings:
            try:
                # try to get the query, if it doens't exist, then create it in the exception
                await app.db_objects.get(db_model.attacktask_query, task=task, attack=attack.attack)
            except Exception as e:
                attack = await app.db_objects.create(
                    db_model.ATTACKTask, task=task, attack=attack.attack
                )
                asyncio.create_task(log_to_siem(mythic_object=attack, mythic_source="task_mitre_attack"))
    except Exception as e:
        logger.warning("rabbitmq.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        raise e


async def update_container_status():
    while True:
        try:
            try:
                if not app.db_objects.is_connected:
                    logger.info("app.db_objects.is_connected is false in update_container_status")
                    await app.db_objects.close()
                    logger.info("reopening connection in update_container_status")
                    await app.db_objects.connect()
                    logger.info("connected again in update_container_status")
            except Exception as e:
                logger.warning(f"Failed to reconnect to database in update_container_status, {e}")
                continue
            profiles = await app.db_objects.execute(db_model.c2profile_query.where(
                db_model.C2Profile.deleted == False
            ))
            for profile in profiles:
                if (
                        profile.last_heartbeat
                        < datetime.datetime.utcnow() + datetime.timedelta(seconds=-30)
                        and profile.container_running
                ):
                    if profile.running and not profile.is_p2p:
                        asyncio.create_task(
                            send_all_operations_message(message=f"{profile.name}'s internal server stopped",
                                                        level="warning"))
                        profile.running = False  # container just started, clearly the inner service isn't running
                    profile.container_running = False
                    asyncio.create_task(
                        send_all_operations_message(message=f"{profile.name}'s container stopped",
                                                    level="warning", source=f"{profile.name}_container_stopped"))
                    await app.db_objects.update(profile)
                    app.redis_pool.delete(f"C2SYNC:{profile.name}")
            payloads = await app.db_objects.execute(db_model.payloadtype_query.where(
                db_model.PayloadType.deleted == False
            ))
            for profile in payloads:
                if (
                        profile.last_heartbeat < datetime.datetime.utcnow() + datetime.timedelta(seconds=-30)
                        and profile.container_running
                ):
                    profile.container_running = False
                    asyncio.create_task(
                        send_all_operations_message(message=f"{profile.ptype}'s container stopped",
                                                    level="warning", source=f"{profile.ptype}_container_stopped"))
                    await app.db_objects.update(profile)
                    app.redis_pool.delete(f"PTSYNC:{profile.ptype}")
            translators = await app.db_objects.execute(db_model.translationcontainer_query.where(
                db_model.TranslationContainer.deleted == False
            ))
            for profile in translators:
                if (
                        profile.last_heartbeat < datetime.datetime.utcnow() + datetime.timedelta(seconds=-30)
                        and profile.container_running
                ):
                    profile.container_running = False
                    asyncio.create_task(
                        send_all_operations_message(message=f"{profile.name}'s container stopped",
                                                    level="warning", source=f"{profile.name}_container_stopped"))
                    await app.db_objects.update(profile)
        except Exception as e:
            asyncio.create_task(
                send_all_operations_message(message=f"Mythic Periodic Container Status Check Failed:\n{str(e)}",
                                            level="warning", source="periodic_container_status_check"))
        await asyncio.sleep(random.randint(5, 20))


async def rabbit_heartbeat_callback(message: aio_pika.IncomingMessage):

    async with message.process():
        try:
            if not app.db_objects.is_connected:
                logger.info("app.db_objects.is_connected is false")
                await app.db_objects.close()
                logger.info("reopening connection")
                await app.db_objects.connect()
                logger.info("connected again")
        except Exception as e:
            logger.warning(f"Failed to reconnect to database, {e}")
            return
        pieces = message.routing_key.split(".")
        # print(" [x] %r:%r" % (
        #   message.routing_key,
        #   message.body
        # ))
        try:
            if pieces[0] == "c2":
                try:
                    profile = await app.db_objects.get(db_model.c2profile_query, name=pieces[2], deleted=False)
                except Exception as e:
                    # asyncio.create_task(
                    #    send_all_operations_message(message=f"sending container sync message to {pieces[2]}",
                    #                                level="info", source="sync_c2_send"))
                    asyncio.create_task(
                        send_all_operations_message(message=f"Got heartbeat from unknown C2: {pieces[2]}, asking it to sync",
                                                    level="info", source="sync_c2_send"))
                    await send_c2_rabbitmq_message(pieces[2], "sync_classes", "", "")
                    return
                if (
                        profile.last_heartbeat
                        < datetime.datetime.utcnow() + datetime.timedelta(seconds=-30)
                        or not profile.container_running
                ):
                    if profile.running and not profile.is_p2p:
                        asyncio.create_task(
                            send_all_operations_message(message=f"{profile.name}'s internal server stopped",
                                                        level="warning"))
                        profile.running = False  # container just started, clearly the inner service isn't running
                    profile.container_running = True
                    from app.api.operation_api import resolve_all_operations_message
                    await resolve_all_operations_message(f"{profile.name}'s container stopped")
                profile.last_heartbeat = datetime.datetime.utcnow()
                await app.db_objects.update(profile)
                if app.redis_pool.get(f"C2SYNC:{profile.name}") is None:
                    stats = await send_c2_rabbitmq_message(pieces[2], "sync_classes", "", "")
                    if stats["status"] == "error":
                        asyncio.create_task(send_all_operations_message(
                            message="Failed to contact {} service: {}\nIs the container online and at least version 7?".format(
                                pieces[2], stats["error"]
                            ), level="warning", source="payload_import_sync_error"))
            elif pieces[0] == "pt":
                try:
                    payload_type = await app.db_objects.get(
                        db_model.payloadtype_query, ptype=pieces[2], deleted=False
                    )
                    if payload_type.container_running is False:
                        from app.api.operation_api import resolve_all_operations_message
                        await resolve_all_operations_message(f"{payload_type.ptype}'s container stopped")
                    if app.redis_pool.get(f"PTSYNC:{payload_type.ptype}") is None:
                        stats = await send_pt_rabbitmq_message(pieces[2], "sync_classes", "", "", "")
                        if stats["status"] == "error":
                            asyncio.create_task(send_all_operations_message(
                                message="Failed to contact {} service: {}\nIs the container online and at least version 7?".format(
                                    pieces[2], stats["error"]
                                ), level="warning", source="payload_import_sync_error"))
                    payload_type.container_running = True
                    payload_type.last_heartbeat = datetime.datetime.utcnow()
                    if len(pieces) == 5:
                        payload_type.container_count = int(pieces[4])
                    elif payload_type.container_running:
                        payload_type.container_count = 1
                    else:
                        payload_type.container_count = 0
                    await app.db_objects.update(payload_type)
                except Exception as e:
                    asyncio.create_task(
                        send_all_operations_message(
                            message=f"sending container sync message to {pieces[2]} due to a new Heartbeat",
                            level="info", source="payload_sync_send"))
                    stats = await send_pt_rabbitmq_message(pieces[2], "sync_classes", "", "", "")
                    if stats["status"] == "error":
                        asyncio.create_task(send_all_operations_message(
                            message="Failed to contact {} service: {}\nIs the container online and at least version 7?".format(
                                pieces[2], stats["error"]
                            ), level="warning", source="payload_import_sync_error"))
            elif pieces[0] == "tr":
                if len(pieces) == 4:
                    if int(pieces[3]) > valid_translation_container_version_bounds[1] or \
                            int(pieces[3]) < valid_translation_container_version_bounds[0]:
                        asyncio.create_task(
                            send_all_operations_message(
                                message="Translation container, {}, of version {} is not supported by this version of Mythic.\nThe container version must be between {} and {}".format(
                                    pieces[2], pieces[3], str(valid_translation_container_version_bounds[0]),
                                    str(valid_translation_container_version_bounds[1])
                                ), level="warning", source="bad_translation_version"))
                        return
                else:
                    asyncio.create_task(
                        send_all_operations_message(
                            message="Translation container, {}, of version 1 is not supported by this version of Mythic.\nThe container version must be between {} and {}".format(
                                pieces[2],
                                str(valid_translation_container_version_bounds[0]),
                                str(valid_translation_container_version_bounds[1])
                            ), level="warning", source="bad_translation_version"))
                    return
                try:
                    translation_container = await app.db_objects.get(db_model.translationcontainer_query,
                                                                     name=pieces[2], deleted=False)

                except Exception as e:
                    translation_container = await app.db_objects.create(db_model.TranslationContainer,
                                                                        name=pieces[2])
                    payloads = await app.db_objects.execute(db_model.payloadtype_query)
                    for p in payloads:
                        if not p.deleted:
                            stats = await send_pt_rabbitmq_message(
                                p.ptype, "sync_classes", "", "", ""
                            )
                            if stats["status"] == "error":
                                asyncio.create_task(send_all_operations_message(
                                    message="Failed to contact {} service: {}\nIs the container online and at least version 7?".format(
                                        p.ptype, stats["error"]
                                    ), level="warning", source="payload_import_sync_error"))
                translation_container.last_heartbeat = datetime.datetime.utcnow()
                if translation_container.container_running is False:
                    from app.api.operation_api import resolve_all_operations_message
                    await resolve_all_operations_message(f"{translation_container.name}'s container stopped")
                translation_container.container_running = True
                await app.db_objects.update(translation_container)
        except Exception as e:
            logger.exception(
                "Exception in rabbit_heartbeat_callback: {}, {}".format(pieces, str(e))
            )


async def background_agent_response_callback(message: aio_pika.IncomingMessage):
    async with message.process():
        response = json.loads(message.body)
        pieces = message.routing_key.split(".")
        # print(" [x] %r:%r" % (
        #   message.routing_key,
        #   message.body
        # ))
        try:
            callback = await app.db_objects.get(db_model.callback_query, id=pieces[1])
            from app.api.response_api import background_process_agent_responses
            await background_process_agent_responses(response, callback)
        except Exception as e:
            logger.exception(
                "Exception in background_agent_response_callback, {}".format(str(e))
            )


# just listen for c2 heartbeats and update the database as necessary
should_reestablish_rabbitmq = False


async def start_listening():
    global should_reestablish_rabbitmq
    logger.debug("Waiting for RabbitMQ to start..")
    await wait_for_rabbitmq()
    should_reestablish_rabbitmq = True
    logger.debug("Starting to consume rabbitmq messages")
    task = None
    task2 = None
    task3 = None
    task4 = None
    task5 = None
    #task6 = None
    tasks = [task, task2, task3, task4, task5]
    try:
        task = asyncio.create_task(connect_and_consume_c2())
        task2 = asyncio.create_task(connect_and_consume_heartbeats())
        task3 = asyncio.create_task(connect_and_consume_pt())
        task4 = asyncio.create_task(connect_and_consume_rpc())
        task5 = asyncio.create_task(update_container_status())
        #task6 = asyncio.create_task(connect_and_consume_background_agent_responses())
        await asyncio.wait([task, task2, task3, task4, task5])
    except Exception as e:
        logger.error("Hit exception in start_listening in rabbit_mq.py: " + str(e))
        for t in tasks:
            if t is not None:
                task.cancel()
        await asyncio.sleep(3)


def subprocess_listen_for_background_processing():
    try:
        logger.info("starting subprocess")
        loop = asyncio.get_event_loop()
        loop.create_task(async_listening_for_background_processing())
        loop.run_forever()
    except Exception as e:
        logger.exception(e)


async def async_listening_for_background_processing():
    try:
        logger.info("starting async listening for background processing")
        from peewee_async import Manager
        from app import mythic_db
        loop = asyncio.get_event_loop()
        app.db_objects = Manager(mythic_db, loop=loop)
        await mythic_db.connect_async(loop=loop)
        await wait_for_rabbitmq()
        logger.info("about to create task for connect_and_consume_background_agent_responses")
        task = asyncio.create_task(connect_and_consume_background_agent_responses())
        await asyncio.wait([task])
    except Exception as e:
        logger.warning("Failed in waiting for background responses: " + str(e))


async def mythic_rabbitmq_connection():
    logger.debug("Logging into RabbitMQ with {}@{}:{}/{}".format(
        mythic.config["RABBITMQ_USER"],
        mythic.config['RABBITMQ_HOST'],
        mythic.config['RABBITMQ_PORT'],
        mythic.config['RABBITMQ_VHOST']))
    return await aio_pika.connect(
        host=mythic.config["RABBITMQ_HOST"],
        port=mythic.config["RABBITMQ_PORT"],
        login=mythic.config["RABBITMQ_USER"],
        password=mythic.config["RABBITMQ_PASSWORD"],
        virtualhost=mythic.config["RABBITMQ_VHOST"],
    )


def closed_connection_callback(exceptionClass, weak, **kwargs):
    global should_reestablish_rabbitmq
    global should_reestablish_rabbitmq_background
    args = ""
    args += f"exception: {exceptionClass}\nweak:{weak}\n"
    for k,v in kwargs.items():
        args += f"{k} = {v}\n"
    logger.warning("[-] rabbitmq: " + args)
    if should_reestablish_rabbitmq:
        asyncio.create_task(start_listening())
    if should_reestablish_rabbitmq_background:
        asyncio.create_task(async_listening_for_background_processing())


async def wait_for_rabbitmq():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            connection.add_close_callback(closed_connection_callback)
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
            connection.add_close_callback(closed_connection_callback)
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange(
                "mythic_traffic", aio_pika.ExchangeType.TOPIC
            )
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("consume_c2", auto_delete=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange="mythic_traffic", routing_key="c2.status.#")

            await channel.set_qos(prefetch_count=1)
            logger.info("Waiting for messages in connect_and_consume_c2.")
            try:
                task = queue.consume(rabbit_c2_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception(
                    "Exception in connect_and_consume .consume: {}".format(str(e))
                )
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
            connection.add_close_callback(closed_connection_callback)
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange(
                "mythic_traffic", aio_pika.ExchangeType.TOPIC
            )
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("consume_pt", auto_delete=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange="mythic_traffic", routing_key="pt.status.#")
            await channel.set_qos(prefetch_count=1)
            logger.info("Waiting for messages in connect_and_consume_pt.")
            try:
                task = queue.consume(rabbit_pt_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as r:
                logger.exception(
                    "Exception in connect_and_consume .consume: {}".format(str(r))
                )
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume connect: {}".format(str(e))
            )
        await asyncio.sleep(2)


async def connect_and_consume_rpc():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            connection.add_close_callback(closed_connection_callback)
            channel = await connection.channel()
            # queue = await channel.declare_queue("rpc_queue", auto_delete=True)
            rpc = await aio_pika.patterns.RPC.create(channel)
            await register_rpc_endpoints(rpc)
            await channel.set_qos(prefetch_count=10)
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume_rpc connect: {}".format(str(e))
            )
        await asyncio.sleep(2)


async def connect_and_consume_heartbeats():
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            connection.add_close_callback(closed_connection_callback)
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange(
                "mythic_traffic", aio_pika.ExchangeType.TOPIC
            )
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("heartbeats", auto_delete=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange="mythic_traffic", routing_key="*.heartbeat.#")
            await channel.set_qos(prefetch_count=1)
            logger.info("Waiting for messages in connect_and_consume_heartbeats.")
            try:
                task = queue.consume(rabbit_heartbeat_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception(
                    "Exception in connect_and_consume .consume: {}".format(str(e))
                )
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume connect: {}".format(str(e))
            )
        await asyncio.sleep(2)

should_reestablish_rabbitmq_background = False


async def connect_and_consume_background_agent_responses():
    global should_reestablish_rabbitmq_background
    should_reestablish_rabbitmq_background = True
    connection = None
    while connection is None:
        try:
            connection = await mythic_rabbitmq_connection()
            connection.add_close_callback(closed_connection_callback)
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange(
                "mythic_traffic", aio_pika.ExchangeType.TOPIC
            )
            # get a random queue that only the mythic server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("background_agent_responses", auto_delete=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange="mythic_traffic", routing_key="background_response.#")
            await channel.set_qos(prefetch_count=1)
            logger.info("Waiting for messages in connect_and_consume_backgrounded_agent_responses.")
            try:
                task = queue.consume(background_agent_response_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception(
                    "Exception in connect_and_consume .consume: {}".format(str(e))
                )
        except (ConnectionError, ConnectionRefusedError) as c:
            logger.error("Connection to rabbitmq failed, trying again..")
        except Exception as e:
            logger.exception(
                "Exception in connect_and_consume connect: {}".format(str(e))
            )
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
        logger.exception("rabbitmq.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
        try:
            queue = await channel.get_queue(payload_type + "_tasking")
            if queue.declaration_result.consumer_count == 0:
                return {"status": "error", "error": "No containers online for {}".format(payload_type),
                        "type": "no_queue"}
        except Exception as d:
            return {"status": "error", "error": "Container not online: " + str(d), "type": "no_queue"}
        await exchange.publish(
            message,
            routing_key=routing_key,
        )
        await connection.close()
        return {"status": "success"}
    except Exception as e:
        logger.exception("rabbitmq.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "Failed to connect to rabbitmq: " + str(e)}


async def send_background_response_rabbitmq_message(message_body, callback_id):
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
        routing_key = "background_response.{}".format(str(callback_id))
        try:
            queue = await channel.get_queue("background_agent_responses")
            if queue.declaration_result.consumer_count == 0:
                return {"status": "error", "error": "No containers online for background_agent_responses",
                        "type": "no_queue"}
        except Exception as d:
            return {"status": "error", "error": "Container not online: " + str(d), "type": "no_queue"}
        await exchange.publish(
            message,
            routing_key=routing_key,
        )
        await connection.close()
        return {"status": "success"}
    except Exception as e:
        logger.exception("rabbitmq.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "Failed to connect to rabbitmq: " + str(e)}


class MythicBaseRPC:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.callback_queue = None
        self.futures = {}
        self.loop = None

    async def connect(self):
        try:
            self.connection = await mythic_rabbitmq_connection()
            self.connection.add_close_callback(closed_connection_callback)
            self.channel = await self.connection.channel()
            self.callback_queue = await self.channel.declare_queue(exclusive=False, auto_delete=True)
            await self.callback_queue.consume(self.on_response)
            return self
        except Exception as e:
            logger.warning(
                "rabbitmq.py connect: " + type(e).__name__ + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))

    def on_response(self, message: aio_pika.IncomingMessage):
        try:
            future = self.futures.pop(message.correlation_id)
            message.ack()
            future.set_result(message.body)
        except Exception as e:
            logger.warning(
                "rabbitmq.py on_response: " + type(e).__name__ + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))

    async def call(self, message: dict, receiver: str = None) -> (bytes, bool):
        try:
            if self.loop is None:
                self.loop = asyncio.get_event_loop()
            if self.connection is None:
                await self.connect()

            try:
                try:
                    await self.channel.get_queue(receiver)
                except aio_pika.exceptions.ChannelClosed as cc:
                    asyncio.create_task(
                        send_all_operations_message(
                            message="Failed to connect to {}; is the container running?".format(receiver.split("_")[0]),
                            level="warning", source=f"{receiver}_rabbitmq_container_connect"))
                    logger.warning("rabbitmq.py ChannelClosed: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(cc))
                    return b"", False
                except aio_pika.exceptions.ChannelInvalidStateError as cc:
                    logger.warning(
                        "rabbitmq.py ChannelInvalidStateError: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(cc))
                    logger.warning("Calling reopen on channel")
                    await self.channel.reopen()
                    return b"", False
                #logger.warning(f"about to send message to {receiver}")
                correlation_id = str(uuid.uuid4())
                future = self.loop.create_future()
                self.futures[correlation_id] = future
                msg = json.dumps(message).encode("utf-8")
                logger.debug(f"length of message: {len(msg)}\n{msg}")
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
                        message="Failed to send message to {}; is the container running?".format(
                            receiver.split("_")[0]),
                        level="warning", source=f"{receiver}_rabbitmq_container_connect"))
                logger.warning("rabbitmq.py: " + type(d).__name__ + str(sys.exc_info()[-1].tb_lineno) + " " + str(d))
                return b"", False
        except Exception as e:
            self.connection = None
            asyncio.create_task(
                send_all_operations_message(message="rabbitmq.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e),
                                            level="warning", source="rabbitmq_container_exception"))
            logger.warning("rabbitmq.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return b"", False


async def register_rpc_endpoints(rpc):
    for k, v in exposed_rpc_endpoints.items():
        await rpc.register(k, v, auto_delete=True)
    await rpc.register("get_rpc_functions", get_rpc_functions, auto_delete=True)


def get_rpc_functions():
    import inspect
    output = ""
    for k, v in exposed_rpc_endpoints.items():
        output += k + str(inspect.signature(v))
        if v.__doc__ is not None:
            output += v.__doc__ + "\n"
        else:
            output += "\n"
    return {"status": "success", "response": output}


exposed_rpc_endpoints = {
    "create_file": create_file,
    "get_file": get_file,
    "get_file_contents": get_file_contents,
    "get_file_for_wrapper": get_file_for_wrapper,
    "update_file": update_file,
    "get_payload": get_payload,
    "search_payloads": search_payloads,
    "get_tasks": get_tasks,
    "get_responses": get_responses,
    "get_task_for_id": get_task_for_id,
    "get_commands": get_commands,
    "add_commands_to_payload": add_commands_to_payload,
    "add_commands_to_callback": add_commands_to_callback,
    "create_agentstorage": create_agentstorage,
    "get_agentstorage": get_agentstorage,
    "delete_agentstorage": delete_agentstorage,
    "create_payload_from_uuid": create_payload_from_uuid,
    "create_payload_from_parameters": create_payload_from_parameters,
    "create_processes": create_processes_rpc,
    "create_process": create_process,
    "create_artifact": create_artifact,
    "create_keylog": create_keylog,
    "create_output": create_output,
    "create_event_message": create_event_message,
    "create_credential": create_credential,
    "get_credential": get_credential,
    "create_file_browser": create_file_browser,
    "create_payload_on_host": create_payload_on_host,
    "create_logon_session": create_logon_session,
    "create_callback_token": create_callback_token,
    "create_token": create_token,
    "delete_token": delete_token,
    "delete_file_browser": delete_file_browser,
    "delete_logon_session": delete_logon_session,
    "delete_callback_token": delete_callback_token,
    "update_callback": update_callback,
    "update_task_opsec_status": update_task_opsec_status,
    "update_task_status": update_task_status,
    "update_loaded_commands": update_loaded_commands,
    "search_database": search_database,
    "control_socks": control_socks,
    "create_subtask": create_subtask,
    "create_subtask_group": create_subtask_group,
    "create_encrypted_message": encrypt_message,
    "create_decrypted_message": decrypt_message,
    "create_callback": create_callback
}
