from app import mythic
import app
from app.database_models.model import FileMeta, Callback, Task, Command
from sanic.response import json, file_stream
import base64
from sanic_jwt.decorators import scoped, inject_user
import os
import ujson as js
import sys
import app.database_models.model as db_model
from sanic.exceptions import abort
import shutil
from app.crypto import hash_MD5, hash_SHA1
import uuid
from sanic.log import logger
from math import ceil
from pathlib import Path, PureWindowsPath
from app.api.siem_logger import log_to_siem
from app.api.operation_api import send_all_operations_message
from app.api.file_browser_api import add_upload_file_to_file_browser
import asyncio
import datetime


@mythic.route(mythic.config["API_BASE"] + "/files", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_files_meta(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        files = await app.db_objects.prefetch(
            db_model.filemeta_query, Task.select(), Command.select(), Callback.select()
        )
    except Exception as e:
        return json({"status": "error", "error": "failed to get files"})
    return json([f.to_json() for f in files if f.operation.name in user["operations"]])


@mythic.route(mythic.config["API_BASE"] + "/files/current_operation", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_current_operations_files_meta(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] != "":
        try:
            operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
            files = await app.db_objects.execute(
                db_model.filemeta_query.where(
                    (FileMeta.operation == operation)
                    & (FileMeta.is_screenshot == False)
                    & (FileMeta.is_payload == False)
                )
            )
        except Exception as e:
            return json({"status": "error", "error": "failed to get files"})
        return json([f.to_json() for f in files if not "screenshots" in f.path])
    else:
        return json({"status": "error", "error": "must be part of an active operation"})


@mythic.route(
    mythic.config["API_BASE"] + "/files/download/<fid:str>", methods=["GET"]
)
async def download_file(request, fid):
    try:
        file_meta = await app.db_objects.get(db_model.filemeta_query, agent_file_id=fid)
    except Exception as e:
        request_ip = request.headers['x-forwarded-for'] if 'x-forwarded-for' in request.headers else request.ip
        request_ip = request.headers['x-real-ip'] if 'x-real-ip' in request.headers else request_ip
        asyncio.create_task(send_all_operations_message(level="warning", source="download_file",
                                          message=f"Attempt to download file ID {fid}, but file not known.\nMetadata: Connection from {request_ip}"))
        return json({"status": "error", "error": "file not found"})
    # now that we have the file metadata, get the file if it's done downloading
    if not file_meta.deleted:
        try:
            return await file_stream(file_meta.path, filename=bytes(file_meta.filename).decode('utf-8'))
        except Exception as e:
            logger.warning("file_api.py - " + "File not found: {}".format(str(e)))
            return json(
                {"status": "error", "error": "File doesn't exist on disk"}, status=404
            )
    else:
        logger.warning("file_api.py - File was deleted")
        return json(
            {
                "status": "error",
                "error": "File deleted or not finished uploading to server",
            },
            status=404,
        )


@mythic.route(
    "/direct/download/<fid:str>", methods=["GET"]
)
async def download_file_direct(request, fid: str):
    try:
        file_meta = await app.db_objects.get(db_model.filemeta_query, agent_file_id=fid)
    except Exception as e:
        request_ip = request.headers['x-forwarded-for'] if 'x-forwarded-for' in request.headers else request.ip
        request_ip = request.headers['x-real-ip'] if 'x-real-ip' in request.headers else request_ip
        logger.warning("file_api.py - Failed to find file for direct download: " + str(e))
        asyncio.create_task(send_all_operations_message(level="warning", source="download_file_direct",
                                          message=f"Attempt to download file ID {fid} through, but file not known.\nMetadata: Connection from {request_ip}"))
        return json({"status": "error", "error": "file not found"})
    # now that we have the file metadata, get the file if it's done downloading
    if not file_meta.deleted:
        try:
            return await file_stream(file_meta.path, filename=bytes(file_meta.filename).decode("utf-8"))
        except Exception as e:
            logger.warning("file_api.py - File not found in direct download: {}".format(str(e)))
            return json(
                {"status": "error", "error": "File doesn't exist on disk"}, status=404
            )
    else:
        logger.warning("file_api.py - File was deleted in direct download")
        return json(
            {
                "status": "error",
                "error": "File deleted or not finished uploading to server",
            },
            status=404,
        )


# this is the function for the 'upload' action of file from Mythic to agent
async def download_agent_file(data, in_response: bool = False, task_id: str = None):
    try:
        response_data = {}
        if "task_id" not in data or not data["task_id"]:
            data["task_id"] = task_id
        for k in data:
            if k not in ["action", "total_chunks", "chunk_num", "chunk_data", "file_id", "task_id", "full_path"]:
                response_data[k] = data[k]
        if "task_id" not in data and not in_response:
            return {
                **response_data,
                "action": "upload",
                "total_chunks": 0,
                "chunk_num": 0,
                "chunk_data": "",
                "file_id": data["file_id"],
                "task_id": "",
            }
        try:
            file_meta = await app.db_objects.get(db_model.filemeta_query, agent_file_id=data["file_id"])
        except Exception as e:
            logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            if app.debugging_enabled:
                await send_all_operations_message(
                    message=f"action 'Upload', failed to find file_id of {data['file_id']}",
                    level="info", source="debug")
            if not in_response:
                return {
                    **response_data,
                    "action": "upload",
                    "total_chunks": 0,
                    "chunk_num": 0,
                    "chunk_data": "",
                    "file_id": "",
                    "task_id": data["task_id"],
                }
            else:
                return {"status": "error", "error": "Failed to find that FileID"}
        # now that we have the file metadata, get the file if it's done downloading
        if (
            "full_path" in data
            and data["full_path"] is not None
            and data["full_path"] != ""
        ):
            task = await app.db_objects.get(db_model.task_query, agent_task_id=data["task_id"])
            if file_meta.task is None or file_meta.task.id != task.id:
                # this means the file was hosted on the mythic server and is being pulled down by an agent
                # or means that another task is pulling down a file that was generated from a different task
                fm = await app.db_objects.create(
                    db_model.FileMeta,
                    task=task,
                    total_chunks=file_meta.total_chunks,
                    chunks_received=file_meta.chunks_received,
                    chunk_size=file_meta.chunk_size,
                    complete=file_meta.complete,
                    path=file_meta.path,
                    full_remote_path=data["full_path"].encode("utf-8"),
                    operation=task.callback.operation,
                    md5=file_meta.md5,
                    sha1=file_meta.sha1,
                    delete_after_fetch=False,
                    deleted=False,
                    operator=task.operator,
                    host=file_meta.host.upper(),
                    filename=file_meta.filename
                )
                asyncio.create_task(add_upload_file_to_file_browser(fm.operation, fm.task, fm,
                                                      {"host": fm.host,
                                                       "full_path": bytes(fm.full_remote_path).decode("utf-8")}))
            else:
                # this file_meta is already associated with a task, check if it's the same
                if file_meta.full_remote_path is None or file_meta.full_remote_path == "":
                    file_meta.full_remote_path = data["full_path"].encode("utf-8")
                    try:
                        fb_object = await app.db_objects.get(
                            db_model.filebrowserobj_query,
                            full_path=file_meta.full_remote_path,
                            host=file_meta.host.upper(),
                        )
                        if file_meta.file_browser is None:
                            file_meta.file_browser = fb_object
                            await app.db_objects.update(file_meta)
                    except Exception as e:
                        # no associated file meta object, so create one
                        asyncio.create_task(add_upload_file_to_file_browser(file_meta.operation, file_meta.task,
                                                              file_meta, {"host": file_meta.host,
                                                                          "full_path": bytes(file_meta.full_remote_path).decode("utf-8")}))
                else:
                    file_meta.full_remote_path = data["full_path"].encode("utf-8")
                    asyncio.create_task(add_upload_file_to_file_browser(file_meta.operation, file_meta.task,
                                                                        file_meta, {"host": file_meta.host,
                                                                                    "full_path": bytes(
                                                                                        file_meta.full_remote_path).decode(
                                                                                        'utf-8')}))
                    await app.db_objects.update(file_meta)
        chunk_size = 512000
        if "chunk_size" in data:
            chunk_size = data["chunk_size"]
        if file_meta.complete and not file_meta.deleted and chunk_size > 0:
            total_chunks = ceil(float(os.path.getsize(file_meta.path)) / float(chunk_size))
            chunk_num = 1
            if "chunk_num" in data:
                data["chunk_num"] = abs(data["chunk_num"])
                if data["chunk_num"] == 0:
                    data["chunk_num"] = 1
                if data["chunk_num"] > total_chunks:
                    logger.exception(
                        "Request a chunk that doesn't exist in download_agent_file: "
                        + data["file_id"]
                        + "\n total_chunks: "
                        + str(total_chunks)
                        + " requested chunk: "
                        + str(data["chunk_num"])
                    )
                    if not in_response:
                        return {
                            **response_data,
                            "action": "upload",
                            "total_chunks": total_chunks,
                            "chunk_num": 0,
                            "chunk_data": "",
                            "file_id": data["file_id"],
                            "task_id": data["task_id"],
                        }
                    else:
                        return {"status": "error", "error": "requested chunk_num greater than total chunks"}
                else:
                    chunk_num = data["chunk_num"]
            # now to read the actual file and get the right chunk
            if app.debugging_enabled:
                if not in_response:
                    await send_all_operations_message(
                        message=f"action 'Upload' for file_id {file_meta.agent_file_id}, using chunk_size of {str(chunk_size)}, getting chunk {str(chunk_num)}",
                        level="info", operation=file_meta.operation, source="debug")
                else:
                    await send_all_operations_message(
                        message=f"post_response of uploading file for file_id {file_meta.agent_file_id}, using chunk_size of {str(chunk_size)}, getting chunk {str(chunk_num)}",
                        level="info", operation=file_meta.operation, source="debug")
            encoded_data = ""
            try:
                encoded_data = open(file_meta.path, "rb")
                encoded_data.seek(chunk_size * (chunk_num - 1), 0)
                encoded_data = encoded_data.read(chunk_size)
                encoded_data = base64.b64encode(encoded_data).decode()
                if app.debugging_enabled:
                    if not in_response:
                        await send_all_operations_message(
                            message=f"action 'Upload' for file_id {file_meta.agent_file_id}, successfully opened and got chunk data",
                            level="info", operation=file_meta.operation, source="debug")
                    else:
                        await send_all_operations_message(
                            message=f"post_response of uploading file for file_id {file_meta.agent_file_id}, successfully opened and got chunk data",
                            level="info", operation=file_meta.operation, source="debug")
            except Exception as e:
                logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                if app.debugging_enabled:
                    if in_response:
                        await send_all_operations_message(
                            message=f"action 'Upload' for file_id {file_meta.agent_file_id}, failed to open and read file {file_meta.path}: {str(e)}",
                            level="info", source="debug", operation=file_meta.operation)
                    else:
                        await send_all_operations_message(
                            message=f"post_response of uploading file for file_id {file_meta.agent_file_id}, failed to open and read file {file_meta.path}: {str(e)}",
                            level="info", source="debug", operation=file_meta.operation)
            # if this is a temp, we should remove the file afterwards
            if file_meta.delete_after_fetch:
                # only do this if we actually finished reading it
                if chunk_num == total_chunks:
                    if app.debugging_enabled:
                        if not in_response:
                            await send_all_operations_message(
                                message=f"action 'Upload' for file_id {file_meta.agent_file_id}, deleting off disk",
                                level="info", source="debug", operation=file_meta.operation)
                        else:
                            await send_all_operations_message(
                                message=f"post_response of uploading file for file_id {file_meta.agent_file_id}, deleting off disk",
                                level="info", source="debug", operation=file_meta.operation)
                    os.remove(file_meta.path)
                    # if this is a payload based file that was auto-generated, don't mark it as deleted
                    if file_meta.is_payload:
                        if app.debugging_enabled:
                            if not in_response:
                                await send_all_operations_message(
                                    message=f"action 'Upload' for file_id {file_meta.agent_file_id}, finished pulling down the payload, not marking as deleted though",
                                    level="info", source="debug", operation=file_meta.operation)
                            else:
                                await send_all_operations_message(
                                    message=f"post_response of uploading file for file_id {file_meta.agent_file_id}, finished pulling down the payload, not marking as deleted though",
                                    level="info", source="debug", operation=file_meta.operation)
                    else:
                        file_meta.deleted = True
                        # we need to mark all other files based on this as deleted too now
                        linked_files = await app.db_objects.execute(db_model.filemeta_query.where(db_model.FileMeta.path == file_meta.path))
                        for file in linked_files:
                            file.deleted = True
                            await app.db_objects.update(file)
                        if app.debugging_enabled:
                            if not in_response:
                                await send_all_operations_message(
                                    message=f"action 'Upload' for file_id {file_meta.agent_file_id}, finished pull down the file, marking as deleted",
                                    level="info", source="debug", operation=file_meta.operation)
                            else:
                                await send_all_operations_message(
                                    message=f"post_response of uploading file for file_id {file_meta.agent_file_id}, finished pull down the file, marking as deleted",
                                    level="info", source="debug", operation=file_meta.operation)
                    await app.db_objects.update(file_meta)
            if not in_response:
                return {
                    **response_data,
                    "action": "upload",
                    "total_chunks": total_chunks,
                    "chunk_num": chunk_num,
                    "chunk_data": encoded_data,
                    "file_id": data["file_id"],
                    "task_id": data["task_id"],
                }
            else:
                return {
                    "status": "success",
                    "total_chunks": total_chunks,
                    "chunk_num": chunk_num,
                    "chunk_data": encoded_data,
                    "file_id": data["file_id"],
                    "task_id": data["task_id"]}
        elif file_meta.deleted:
            logger.exception("File is deleted: " + data["file_id"])
            if app.debugging_enabled:
                if not in_response:
                    await send_all_operations_message(
                        message=f"action 'Upload' for file_id {file_meta.agent_file_id}, but file was deleted, so it cannot be fetched",
                        level="info", source="debug", operation=file_meta.operation)
                else:
                    await send_all_operations_message(
                        message=f"post_response of uploading file for file_id {file_meta.agent_file_id}, but file was deleted, so it cannot be fetched",
                        level="info", source="debug", operation=file_meta.operation)
            if not in_response:
                return {
                    **response_data,
                    "action": "upload",
                    "total_chunks": 0,
                    "chunk_num": 0,
                    "chunk_data": "",
                    "file_id": data["file_id"],
                    "task_id": data["task_id"],
                }
            else:
                return {"status": "error", "error": "File deleted"}
        elif chunk_size > 0:
            logger.exception(
                "file not done downloading in download_agent_file: " + data["file_id"]
            )
            if app.debugging_enabled:
                if not in_response:
                    await send_all_operations_message(
                        message=f"action 'Upload' for file_id {file_meta.agent_file_id}, but file not completely on host yet, so it cannot be fetched",
                        level="info", source="debug", operation=file_meta.operation)
                else:
                    await send_all_operations_message(
                        message=f"post_response of uploading file for file_id {file_meta.agent_file_id}, but file not completely on host yet, so it cannot be fetched",
                        level="info", source="debug", operation=file_meta.operation)
            if not in_response:
                return {
                    **response_data,
                    "action": "upload",
                    "total_chunks": 0,
                    "chunk_num": 0,
                    "chunk_data": "",
                    "file_id": data["file_id"],
                    "task_id": data["task_id"],
                }
            else:
                return {"status": "error", "error": "File not fully transferred"}
        else:
            return {"status": "success"}
    except Exception as outerException:
        logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(outerException))
        if not in_response:
            return {
                "status": "error",
                "error": str(outerException),
                "action": "upload",
                "total_chunks": 0,
                "chunk_num": 0,
                "chunk_data": "",
                "file_id": data["file_id"],
                "task_id": data["task_id"],
            }
        else:
            return {"status": "error", "error": str(outerException)}


@mythic.route(mythic.config["API_BASE"] + "/files/<fid:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_filemeta_in_database(request, user, fid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot delete files"})
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        filemeta = await app.db_objects.get(db_model.filemeta_query, id=fid, operation=operation)
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
    except Exception as e:
        logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "file does not exist or not part of your current operation",
            }
        )
    status = {"status": "success"}
    filemeta.deleted = True
    linked_files = await app.db_objects.execute(db_model.filemeta_query.where(
        db_model.FileMeta.path == filemeta.path
    ))
    for file in linked_files:
        file.deleted = True
        await app.db_objects.update(file)
        if file.is_payload:
            payload = await app.db_objects.get(db_model.payload_query, file=file)
            payload.deleted = True
            await app.db_objects.update(payload)
    try:
        await app.db_objects.update(filemeta)
    except Exception as e:
        status = {"status": "error", "error": str(e)}
    try:
        os.remove(filemeta.path)
        await app.db_objects.create(
            db_model.OperationEventLog,
            operator=None,
            operation=operation,
            message="{} deleted {}".format(operator.username, bytes(filemeta.filename)
                        .decode("utf-8")),
        )
    except Exception as e:
        pass
    return json({**status, **filemeta.to_json()})


@mythic.route(mythic.config["API_BASE"] + "/delete_file_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_filemeta_in_database_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot delete files"})
    try:
        data = request.json["input"]
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        filemeta = await app.db_objects.get(db_model.filemeta_query, id=data["file_id"], operation=operation)
        if filemeta.is_payload:
            payload = await app.db_objects.get(db_model.payload_query, file=filemeta)
        else:
            payload = None
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
    except Exception as e:
        logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "file does not exist or not part of your current operation",
            }
        )
    status = {"status": "success"}
    filemeta.deleted = True
    linked_files = await app.db_objects.execute(db_model.filemeta_query.where(
        db_model.FileMeta.path == filemeta.path
    ))
    deleted_file_ids = [filemeta.id]
    deleted_payload_ids = []
    if payload is not None:
        deleted_payload_ids.append(payload.id)
    for file in linked_files:
        file.deleted = True
        deleted_file_ids.append(file.id)
        await app.db_objects.update(file)
        if file.is_payload:
            payload = await app.db_objects.get(db_model.payload_query, file=file)
            payload.deleted = True
            deleted_payload_ids.append(payload.id)
            await app.db_objects.update(payload)
    try:
        await app.db_objects.update(filemeta)
    except Exception as e:
        status = {"status": "error", "error": str(e)}
    try:
        os.remove(filemeta.path)
        await app.db_objects.create(
            db_model.OperationEventLog,
            operator=None,
            operation=operation,
            message="{} deleted {}".format(operator.username, bytes(filemeta.filename)
                        .decode("utf-8")),
        )
    except Exception as e:
        pass
    return json({**status, "file_ids": deleted_file_ids, "payload_ids": deleted_payload_ids})


async def create_filemeta_in_database_func(data):
    #  create a filemeta object where we will then start uploading our file
    #  expects total_chunks, and task
    if "total_chunks" not in data:
        return {"status": "error", "error": "total_chunks required"}
    try:
        task = await app.db_objects.get(db_model.task_query, id=data["task"])
        operation = task.callback.operation
    except Exception as e:
        logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "failed to find task"}
    try:
        if "full_path" not in data or data["full_path"] is None:
            data["full_path"] = ""
        if "full_path" in data and data["full_path"] != "" and data["full_path"] is not None:
            filename = data["full_path"]
        else:
            filename = str(datetime.datetime.utcnow())
        # now try to parse the path for the actual file name, os path agnostic
        try:
            filename = PureWindowsPath(filename)
        except Exception as e:
            filename = Path(filename)
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"in 'Download', determined initial filename to be {filename}. If 'full_path' is reported later, this can be updated",
                level="info", source="debug", operation=task.callback.operation)
        is_screenshot = False
        if task.command.cmd == "screencapture" or task.command.cmd == "screenshot":
            is_screenshot = True
        if "is_screenshot" in data and data["is_screenshot"] is not None:
            is_screenshot = data["is_screenshot"]
        if "host" not in data or data["host"] is None or data["host"] == "":
            data["host"] = task.callback.host
        else:
            data["host"] = data["host"].upper()
            # check and see if there's a filebrowserobj that matches our full path
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"in 'Download', determined is_screenshot ({is_screenshot}), full remote path ({data['full_path']}, and the associated host ({data['host']})",
                level="info", source="debug", operation=task.callback.operation)
        file_browser = None
        try:
            if not is_screenshot:
                if app.debugging_enabled:
                    await send_all_operations_message(
                        message=f"in 'Download', checking if there's a file browser object for the full path of {data['full_path']} on host {data['host']}",
                        level="info", source="debug", operation=task.callback.operation)
                fb_object = await app.db_objects.get(
                    db_model.filebrowserobj_query,
                    full_path=data["full_path"].encode("utf-8"),
                    host=data["host"].upper(),
                )
                if app.debugging_enabled:
                    await send_all_operations_message(
                        message=f"in 'Download', found a matching file browser object!",
                        level="info", source="debug", operation=task.callback.operation)
                file_browser = fb_object
        except Exception as e:
            if app.debugging_enabled:
                await send_all_operations_message(
                    message=f"in 'Download', did not find a file browser object",
                    level="info", source="debug", operation=task.callback.operation)
            pass
        file_agent_id = str(uuid.uuid4())
        file_path = "./app/files/{}".format(file_agent_id)
        complete = data['total_chunks'] == 0
        chunk_size = 512000
        if "chunk_size" in data and data["chunk_size"] is not None:
            chunk_size = data["chunk_size"]
        filemeta = await app.db_objects.create(
            FileMeta,
            agent_file_id=file_agent_id,
            path=file_path,
            chunk_size=chunk_size,
            total_chunks=data["total_chunks"],
            task=task,
            complete=complete,
            operation=operation,
            operator=task.operator,
            full_remote_path=data["full_path"].encode("utf-8"),
            delete_after_fetch=False,
            is_screenshot=is_screenshot,
            file_browser=file_browser,
            filename=filename.name.encode("utf-8"),
            is_download_from_agent=True,
            host=data["host"].upper(),
        )
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"in 'Download', registered new file:\n{filemeta.to_json()}",
                level="info", source="debug", operation=task.callback.operation)
        if filemeta.is_screenshot:
            asyncio.create_task(log_to_siem(mythic_object=task, mythic_source="file_screenshot"))
    except Exception as e:
        logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"in 'Download', failed to create file: {str(e)}",
                level="info")
        return {"status": "error", "error": "failed to create file"}
    status = {"status": "success"}
    return {**status, **filemeta.to_json()}


@mythic.route(mythic.config["API_BASE"] + "/files/manual", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_filemeta_in_database_manual(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot upload files"})

    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
    except Exception as e:
        return json(
            {"status": "error", "error": "not registered in a current operation"}
        )
    if request.files:
        code = request.files["upload_file"][0].body
        filename = request.files["upload_file"][0].name
    elif request.form:
        try:
            data = js.loads(request.form.get("json"))
            if "code" in data and "file_name" in data:
                code = base64.b64decode(data["code"])
                filename = data["file_name"]
            else:
                return json({"status": "error",
                             "error": "If uploading files via a JSON Form, include a 'json' field with a 'code' and 'file_name' attribute"})
        except Exception as e:
            return json({"status": "error", "error": "If uploading files via a JSON Form, include a 'json' field with a 'code' and 'file_name' attribute"})
    else:
        try:
            data = request.json
            if "code" in data and "file_name" in data:
                code = base64.b64decode(data["code"])
                filename = data["file_name"]
            else:
                return json({"status": "error",
                             "error": "If uploading files via a JSON body, include a 'code' and 'file_name' attribute"})
        except Exception as e:
            return json({"status": "error",
                         "error": "If uploading files via a JSON body, include a 'code' and 'file_name' attribute"})
    file_meta = await app.db_objects.create(
        FileMeta,
        total_chunks=1,
        operation=operation,
        path="",
        complete=True,
        chunks_received=1,
        comment="Manually hosted only on Mythic server",
        operator=operator,
        delete_after_fetch=False,
        filename=filename.encode("utf-8"),
    )
    os.makedirs("./app/files/", exist_ok=True)
    path = "./app/files/{}".format(file_meta.agent_file_id)
    code_file = open(path, "wb")
    code_file.write(code)
    code_file.close()
    file_meta.md5 = await hash_MD5(code)
    file_meta.sha1 = await hash_SHA1(code)
    file_meta.path = path
    await app.db_objects.update(file_meta)
    await app.db_objects.create(
        db_model.OperationEventLog,
        operator=None,
        operation=operation,
        message="{} hosted {} with UID {}".format(
            operator.username, filename, file_meta.agent_file_id
        ),
    )
    asyncio.create_task(log_to_siem(mythic_object=file_meta, mythic_source="file_manual_upload"))
    return json({"status": "success", **file_meta.to_json()})


async def download_file_to_disk_func(data):
    #  upload content blobs to be associated with filemeta id
    if "chunk_num" not in data:
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"in 'Download', got chunk_data, but not chunk_num",
                level="info", source="debug")
        return {"status": "error", "error": "missing chunk_num"}
    if "chunk_data" not in data:
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"in 'Download', failed to find chunk_data",
                level="info", source="debug")
        return {"status": "error", "error": "missing chunk data"}
    try:
        file_meta = await app.db_objects.get(db_model.filemeta_query, agent_file_id=data["file_id"])
    except Exception as e:
        logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"in 'Download', failed to find file for file_id of {data['file_id']}",
                level="info", source="debug")
        return {"status": "error", "error": "failed to get File info"}
    try:
        # print("trying to base64 decode chunk_data")
        if data["chunk_num"] <= file_meta.chunks_received:
            if app.debugging_enabled:
                await send_all_operations_message(
                    message=f"in 'Download' for file {file_meta.agent_file_id}, received {file_meta.chunks_received} so far, but just got chunk {str(data['chunk_num'])}, which is out of order",
                    level="info", source="debug", operation=file_meta.operation)
            return {"status": "error", "error": "out of order or duplicate chunk"}
        chunk_data = base64.b64decode(data["chunk_data"])
        f = open(file_meta.path, "ab")
        f.write(chunk_data)
        f.close()
        async with app.db_objects.atomic():
            file_meta = await app.db_objects.get(db_model.filemeta_query, agent_file_id=data["file_id"])
            file_meta.chunks_received = file_meta.chunks_received + 1
            if "host" in data and data["host"] is not None and data["host"] != "":
                file_meta.host = data["host"].upper()
            if "full_path" in data and data["full_path"] is not None and data["full_path"] != "":
                if app.debugging_enabled:
                    await send_all_operations_message(
                        message=f"in 'Download' for file {file_meta.agent_file_id}, got full_path data with chunk_data, setting full remote path for the file to be {data['full_path']}",
                        level="info", source="debug", operation=file_meta.operation)
                file_meta.full_remote_path = data["full_path"].encode("utf-8")
                # now that we have full_path reported, try to parse out the filename
                if len(data["full_path"]) > 0 and data["full_path"][0] == "/":
                    # looking at a linux style path
                    path_obj = Path(data["full_path"])
                    file_meta.filename = path_obj.name
                elif len(data["full_path"]) > 0:
                    path_obj = PureWindowsPath(data["full_path"])
                    file_meta.filename = path_obj.name
                if file_meta.file_browser is None:
                    if app.debugging_enabled:
                        await send_all_operations_message(
                            message=f"in 'Download' for file {file_meta.agent_file_id}, got full_path with chunk_data and no file browser data associated with file, {data['full_path']}, creating that now",
                            level="info", source="debug", operation=file_meta.operation)
                    asyncio.create_task(add_upload_file_to_file_browser(file_meta.operation, file_meta.task, file_meta,
                                                          {"host": file_meta.host.upper(),
                                                           "full_path": bytes(file_meta.full_remote_path).decode("utf-8")}))
            if file_meta.chunks_received == file_meta.total_chunks:
                file_meta.complete = True
                contents = open(file_meta.path, "rb").read()
                file_meta.md5 = await hash_MD5(contents)
                file_meta.sha1 = await hash_SHA1(contents)
                if app.debugging_enabled:
                    await send_all_operations_message(
                        message=f"in 'Download' for file {file_meta.agent_file_id}, finished downloading file. Creating MD5 and SHA1 hashes",
                        level="info", source="debug", operation=file_meta.operation)
                if not file_meta.is_screenshot:
                    asyncio.create_task(log_to_siem(mythic_object=file_meta, mythic_source="file_download"))
            await app.db_objects.update(file_meta)
    except Exception as e:
        logger.warning("file_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"in 'Download', failed to save chunk to disk: {str(e)}",
                level="info", source="debug", operation=file_meta.operation)
        return {"status": "error", "error": "failed to store chunk: " + str(e)}
    return {"status": "success"}


@mythic.route(mythic.config["API_BASE"] + "/files/screencaptures", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def list_all_screencaptures_per_operation(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] != "":
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        screencaptures = await app.db_objects.execute(
            db_model.filemeta_query.where(
                (FileMeta.operation == operation) & (FileMeta.is_screenshot == True)
            )
        )
        screencapture_paths = []
        for s in screencaptures:
            screencapture_paths.append(s.to_json())
        return json({"status": "success", "files": screencapture_paths})
    else:
        return json(
            {
                "status": "error",
                "error": "must be part of a current operation to see an operation's screencaptures",
            }
        )


@mythic.route(
    mythic.config["API_BASE"] + "/files/screencaptures/bycallback/<fid:int>",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def list_all_screencaptures_per_callback(request, user, fid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        callback = await app.db_objects.get(db_model.callback_query, id=fid)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find callback"})
    screencapture_paths = []
    if callback.operation.name in user["operations"]:
        screencaptures = await app.db_objects.prefetch(
            db_model.filemeta_query.where(
                (FileMeta.operation == callback.operation)
                & (FileMeta.is_screenshot == True)
            )
        )
        for s in screencaptures:
            if s.task.callback == callback:
                screencapture_paths.append(s.to_json())
        return json(
            {"status": "success", "callback": callback.id, "files": screencapture_paths}
        )
    else:
        return json(
            {
                "status": "error",
                "error": "must be part of that callback's operation to see its screenshots",
            }
        )


@mythic.route(
    mythic.config["API_BASE"] + "/files/screencaptures/<id:str>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_screencapture(request, user, id):
    try:
        file_meta = await app.db_objects.get(db_model.filemeta_query, agent_file_id=id)
    except Exception as e:
        print("error in get_screencapture: " + str(e))
        return json({"status": "error", "error": "failed to find callback"})
    try:
        if file_meta.operation.name in user["operations"]:
            return await file_stream(file_meta.path, filename=bytes(file_meta.filename).decode("utf-8"))
    except Exception as e:
        return json({"status": "error", "error": "failed to read screenshot from disk"})
    else:
        return json(
            {
                "status": "error",
                "error": "must be part of that callback's operation to see its screenshot",
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/download_bulk_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def download_zipped_files_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
        data = data["input"]
        if "files" not in data:
            return abort(404, "missing 'files' value")
        # need to make aa temporary directory, copy all the files there, zip it, return that and clean up temp dir
        temp_id = str(uuid.uuid4())
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        working_dir = "./app/files/{}/".format(str(uuid.uuid4()))
        os.makedirs(working_dir, exist_ok=True)
        mapping = {}
        for file_id in data["files"]:
            try:
                cur_file = await app.db_objects.get(
                    db_model.filemeta_query, agent_file_id=file_id, operation=operation, deleted=False
                )
                shutil.copy(
                    cur_file.path, working_dir + os.path.basename(cur_file.path)
                )
                mapping[os.path.basename(cur_file.path)] = bytes(cur_file.filename).decode("utf-8")
            except Exception as e:
                print(str(e))
        with open("{}/mapping.json".format(working_dir), "w") as f:
            f.write(js.dumps(mapping, indent=2, sort_keys=True))
        shutil.make_archive("./app/files/{}".format(temp_id), "zip", working_dir)
        shutil.rmtree(working_dir)
        file_meta = await app.db_objects.create(
            FileMeta,
            total_chunks=1,
            operation=operation,
            path="./app/files/{}.zip".format(temp_id),
            complete=True,
            chunks_received=1,
            operator=operator,
            delete_after_fetch=False,
            filename="Mythic_Downloads.zip".encode("utf-8"),
        )
        with open("./app/files/{}.zip".format(temp_id), "rb") as f:
            ziped_bytes = f.read()
            file_meta.md5 = await hash_MD5(ziped_bytes)
            file_meta.sha1 = await hash_SHA1(ziped_bytes)
            await app.db_objects.update(file_meta)
        return json({"status": "success", "file_id": file_meta.agent_file_id})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to process request"})
