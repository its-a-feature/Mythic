from app import mythic, db_objects
from app.database_models.model import FileMeta, Callback, Task, Command
from sanic.response import json, file
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
        query = await db_model.filemeta_query()
        files = await db_objects.prefetch(
            query, Task.select(), Command.select(), Callback.select()
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
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user["current_operation"])
            query = await db_model.filemeta_query()
            files = await db_objects.execute(
                query.where(
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
    mythic.config["API_BASE"] + "/files/download/<id:string>", methods=["GET"]
)
async def download_file(request, id):
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, agent_file_id=id)
    except Exception as e:
        print(e)
        await send_all_operations_message(level="warning",
                                          message=f"Attempt to download file ID {id} through, but file not known.\nMetadata: From {request.socket} with headers: {request.headers}\nURL: {request.url}")
        return json({"status": "error", "error": "file not found"})
    # now that we have the file metadata, get the file if it's done downloading
    if not file_meta.deleted:
        try:
            return await file(file_meta.path, filename=file_meta.filename)
        except Exception as e:
            print("File not found")
            return json(
                {"status": "error", "error": "File doesn't exist on disk"}, status=404
            )
    else:
        print("File was deleted")
        return json(
            {
                "status": "error",
                "error": "File deleted or not finished uploading to server",
            },
            status=404,
        )


# this is the function for the 'upload' action of file from Mythic to agent
async def download_agent_file(data, cid):
    if "task_id" not in data:
        return {
            "action": "upload",
            "total_chunks": 0,
            "chunk_num": 0,
            "chunk_data": "",
            "file_id": data["file_id"],
            "task_id": "",
        }
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, agent_file_id=data["file_id"])
    except Exception as e:
        return {
            "action": "upload",
            "total_chunks": 0,
            "chunk_num": 0,
            "chunk_data": "",
            "file_id": "",
            "task_id": data["task_id"],
        }
    # now that we have the file metadata, get the file if it's done downloading
    if (
        "full_path" in data
        and data["full_path"] is not None
        and data["full_path"] != ""
    ):
        query = await db_model.task_query()
        task = await db_objects.get(query, agent_task_id=data["task_id"])
        if file_meta.task is None or file_meta.task != task:
            # this means the file was hosted on the mythic server and is being pulled down by an agent
            # or means that another task is pulling down a file that was generated from a different task
            fm = await db_objects.create(
                db_model.FileMeta,
                task=task,
                total_chunks=file_meta.total_chunks,
                chunks_received=file_meta.chunks_received,
                chunk_size=file_meta.chunk_size,
                complete=file_meta.complete,
                path=file_meta.path,
                full_remote_path=data["full_path"],
                operation=task.callback.operation,
                md5=file_meta.md5,
                sha1=file_meta.sha1,
                delete_after_fetch=False,
                deleted=False,
                operator=task.operator,
                host=file_meta.host,
            )
            await add_upload_file_to_file_browser(fm.operation, fm.task, fm,
                                                  {"host": fm.host,
                                                   "full_path": fm.full_remote_path})
        else:
            # this file_meta is already associated with a task, check if it's the same
            if file_meta.full_remote_path is None or file_meta.full_remote_path == "":
                file_meta.full_remote_path = data["full_path"]
                query = await db_model.filebrowserobj_query()
                try:
                    fb_object = await db_objects.get(
                        query,
                        full_path=file_meta.full_remote_path.encode("unicode-escape"),
                        host=file_meta.host,
                    )
                    if file_meta.file_browser is None:
                        file_meta.file_browser = fb_object
                        await db_objects.update(file_meta)
                except Exception as e:
                    # no associated file meta object, so create one
                    await add_upload_file_to_file_browser(file_meta.operation, file_meta.task,
                                                          file_meta, {"host": file_meta.host,
                                                                      "full_path": file_meta.full_remote_path})
            else:
                file_meta.full_remote_path = (
                    file_meta.full_remote_path + "," + data["full_path"]
                )
                await db_objects.update(file_meta)
    if file_meta.complete and not file_meta.deleted:
        chunk_size = 512000
        if "chunk_size" in data:
            chunk_size = data["chunk_size"]
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
                return {
                    "action": "upload",
                    "total_chunks": total_chunks,
                    "chunk_num": 0,
                    "chunk_data": "",
                    "file_id": data["file_id"],
                    "task_id": data["task_id"],
                }
            else:
                chunk_num = data["chunk_num"]
        # now to read the actual file and get the right chunk
        encoded_data = open(file_meta.path, "rb")
        encoded_data.seek(chunk_size * (chunk_num - 1), 0)
        encoded_data = encoded_data.read(chunk_size)
        encoded_data = base64.b64encode(encoded_data).decode()
        # if this is a temp, we should remove the file afterwards
        if file_meta.delete_after_fetch:
            # only do this if we actually finished reading it
            if chunk_num == total_chunks:
                os.remove(file_meta.path)
                # if this is a payload based file that was auto-generated, don't mark it as deleted
                query = await db_model.payload_query()
                try:
                    payload = await db_objects.get(query, file_id=file_meta)
                except Exception as e:
                    file_meta.deleted = True
                await db_objects.update(file_meta)
        return {
            "action": "upload",
            "total_chunks": total_chunks,
            "chunk_num": chunk_num,
            "chunk_data": encoded_data,
            "file_id": data["file_id"],
            "task_id": data["task_id"],
        }
    elif file_meta.deleted:
        logger.exception("File is deleted: " + data["file_id"])
        return {
            "action": "upload",
            "total_chunks": 0,
            "chunk_num": 0,
            "chunk_data": "",
            "file_id": data["file_id"],
            "task_id": data["task_id"],
        }
    else:
        logger.exception(
            "file not done downloading in download_agent_file: " + data["file_id"]
        )
        return {
            "action": "upload",
            "total_chunks": 0,
            "chunk_num": 0,
            "chunk_data": "",
            "file_id": data["file_id"],
            "task_id": data["task_id"],
        }


@mythic.route(mythic.config["API_BASE"] + "/files/<id:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_filemeta_in_database(request, user, id):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot delete files"})
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.filemeta_query()
        filemeta = await db_objects.get(query, id=id, operation=operation)
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "file does not exist or not part of your current operation",
            }
        )
    status = {"status": "success"}
    filemeta.deleted = True
    try:
        await db_objects.update(filemeta)
    except Exception as e:
        status = {"status": "error", "error": str(e)}
    try:
        os.remove(filemeta.path)
        await db_objects.create(
            db_model.OperationEventLog,
            operator=None,
            operation=operation,
            message="{} deleted {} from Shared File Hosting".format(operator.username, filemeta.filename),
        )
    except Exception as e:
        pass
    return json({**status, **filemeta.to_json()})


async def create_filemeta_in_database_func(data):
    #  create a filemeta object where we will then start uploading our file
    #  expects total_chunks, and task
    if "total_chunks" not in data:
        return {"status": "error", "error": "total_chunks required"}
    try:
        query = await db_model.task_query()
        task = await db_objects.get(query, id=data["task"])
        operation = task.callback.operation
    except Exception as e:
        print("{} {}".format(str(sys.exc_info()[-1].tb_lineno), str(e)))
        print("file_api.py")
        return {"status": "error", "error": "failed to find task"}
    try:
        if "full_path" in data and data["full_path"] != "":
            filename = data["full_path"]
        elif "{" in task.params:
            try:
                json_params = js.loads(task.params)
                if "path" in json_params:
                    filename = json_params["path"]
                elif "location" in json_params:
                    filename = json_params["location"]
                elif "file" in json_params:
                    filename = json_params["file"]
                else:
                    filename = task.params
            except Exception as e:
                print(e)
                filename = task.params
        else:
            filename = task.params
        # now try to parse the path for the actual file name, os path agnostic
        try:
            filename = PureWindowsPath(filename)
        except Exception as e:
            filename = Path(task.params)
        is_screenshot = False
        if task.command.cmd == "screencapture" or task.command.cmd == "screenshot":
            is_screenshot = True
        if "is_screenshot" in data and data["is_screenshot"] is not None:
            is_screenshot = data["is_screenshot"]
        if "full_path" not in data or data["full_path"] is None:
            data["full_path"] = ""
        if "host" not in data or data["host"] is None or data["host"] == "":
            data["host"] = task.callback.host
            # check and see if there's a filebrowserobj that matches our full path
        query = await db_model.filebrowserobj_query()
        file_browser = None
        try:
            if not is_screenshot:
                fb_object = await db_objects.get(
                    query,
                    full_path=data["full_path"].encode("unicode-escape"),
                    host=data["host"].encode("unicode-escape"),
                )
                file_browser = fb_object
        except Exception as e:
            pass
        file_agent_id = str(uuid.uuid4())
        file_path = "./app/files/{}".format(file_agent_id)
        complete = data['total_chunks'] == 0
        filemeta = await db_objects.create(
            FileMeta,
            agent_file_id=file_agent_id,
            path=file_path,
            total_chunks=data["total_chunks"],
            task=task,
            complete=complete,
            operation=operation,
            operator=task.operator,
            full_remote_path=data["full_path"].encode("unicode-escape"),
            delete_after_fetch=False,
            is_screenshot=is_screenshot,
            file_browser=file_browser,
            filename=filename.name,
            is_download_from_agent=True,
            host=data["host"].encode("unicode-escape"),
        )
        if filemeta.is_screenshot:
            await log_to_siem(task.to_json(), mythic_object="file_screenshot")
    except Exception as e:
        print("{} {}".format(str(sys.exc_info()[-1].tb_lineno), str(e)))
        print("file_api.py")
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
    if request.form:
        data = js.loads(request.form.get("json"))
    else:
        data = request.json
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
    except Exception as e:
        return json(
            {"status": "error", "error": "not registered in a current operation"}
        )
    if request.files:
        code = request.files["upload_file"][0].body
        filename = request.files["upload_file"][0].name
    elif "code" in data and "file_name" in data:
        code = base64.b64decode(data["code"])
        filename = data["file_name"]
    else:
        return json(
            {
                "status": "error",
                "error": "specified remote file, but did not upload anything",
            }
        )
    file_meta = await db_objects.create(
        FileMeta,
        total_chunks=1,
        operation=operation,
        path="",
        complete=True,
        chunks_received=1,
        operator=operator,
        delete_after_fetch=False,
        filename=filename,
    )
    os.makedirs("./app/files/", exist_ok=True)
    path = "./app/files/{}".format(file_meta.agent_file_id)
    code_file = open(path, "wb")
    code_file.write(code)
    code_file.close()
    file_meta.md5 = await hash_MD5(code)
    file_meta.sha1 = await hash_SHA1(code)
    file_meta.path = path
    await db_objects.update(file_meta)
    await db_objects.create(
        db_model.OperationEventLog,
        operator=None,
        operation=operation,
        message="{} hosted {} with UID {}".format(
            operator.username, filename, file_meta.agent_file_id
        ),
    )
    await log_to_siem(file_meta.to_json(), mythic_object="file_manual_upload")
    return json({"status": "success", **file_meta.to_json()})


async def download_file_to_disk_func(data):
    #  upload content blobs to be associated with filemeta id
    if "chunk_num" not in data:
        return {"status": "error", "error": "missing chunk_num"}
    if "chunk_data" not in data:
        return {"status": "error", "error": "missing chunk data"}
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, agent_file_id=data["file_id"])
    except Exception as e:
        print(e)
        return {"status": "error", "error": "failed to get File info"}
    try:
        # print("trying to base64 decode chunk_data")
        if data["chunk_num"] <= file_meta.chunks_received:
            return {"status": "error", "error": "out of order or duplicate chunk"}
        chunk_data = base64.b64decode(data["chunk_data"])
        f = open(file_meta.path, "ab")
        f.write(chunk_data)
        f.close()
        async with db_objects.atomic():
            file_meta = await db_objects.get(query, agent_file_id=data["file_id"])
            file_meta.chunks_received = file_meta.chunks_received + 1
            if "host" in data and data["host"] is not None and data["host"] != "":
                file_meta.host = data["host"].encode("unicode-escape")
            if "full_path" in data and data["full_path"] is not None and data["full_path"] != "":
                file_meta.full_remote_path = data["full_path"].encode("unicode-escape")
                if file_meta.file_browser is None:
                    await add_upload_file_to_file_browser(file_meta.operation, file_meta.task, file_meta,
                                                          {"host": file_meta.host,
                                                           "full_path": file_meta.full_remote_path})
            # print("received chunk num {}".format(data['chunk_num']))
            if file_meta.chunks_received == file_meta.total_chunks:
                file_meta.complete = True
                contents = open(file_meta.path, "rb").read()
                file_meta.md5 = await hash_MD5(contents)
                file_meta.sha1 = await hash_SHA1(contents)
                if not file_meta.is_screenshot:
                    await log_to_siem(file_meta.to_json(), mythic_object="file_download")
            await db_objects.update(file_meta)
    except Exception as e:
        print("Failed to save chunk to disk: " + str(e))
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.filemeta_query()
        screencaptures = await db_objects.execute(
            query.where(
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
    mythic.config["API_BASE"] + "/files/screencaptures/bycallback/<id:int>",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def list_all_screencaptures_per_callback(request, user, id):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find callback"})
    screencapture_paths = []
    if callback.operation.name in user["operations"]:
        query = await db_model.filemeta_query()
        screencaptures = await db_objects.prefetch(
            query.where(
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
    mythic.config["API_BASE"] + "/files/screencaptures/<id:string>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_screencapture(request, user, id):
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, agent_file_id=id)
    except Exception as e:
        print("error in get_screencapture: " + str(e))
        return json({"status": "error", "error": "failed to find callback"})
    try:
        if file_meta.operation.name in user["operations"]:
            return await file(file_meta.path, filename=file_meta.filename)
    except Exception as e:
        return json({"status": "error", "error": "failed to read screenshot from disk"})
    else:
        return json(
            {
                "status": "error",
                "error": "must be part of that callback's operation to see its screenshot",
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/files/download/bulk", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def download_zipped_files(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
        if "files" not in data:
            return abort(404, "missing 'files' value")
        # need to make aa temporary directory, copy all the files there, zip it, return that and clean up temp dir
        temp_id = str(uuid.uuid4())
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
        working_dir = "./app/files/{}/".format(str(uuid.uuid4()))
        os.makedirs(working_dir, exist_ok=True)
        query = await db_model.filemeta_query()
        mapping = {}
        for file_id in data["files"]:
            try:
                cur_file = await db_objects.get(
                    query, agent_file_id=file_id, operation=operation, deleted=False
                )
                shutil.copy(
                    cur_file.path, working_dir + os.path.basename(cur_file.path)
                )
                mapping[os.path.basename(cur_file.path)] = cur_file.filename
            except Exception as e:
                print(str(e))
        with open("{}/mapping.json".format(working_dir), "w") as f:
            f.write(js.dumps(mapping, indent=2, sort_keys=True))
        shutil.make_archive("./app/files/{}".format(temp_id), "zip", working_dir)
        shutil.rmtree(working_dir)
        file_meta = await db_objects.create(
            FileMeta,
            total_chunks=1,
            operation=operation,
            path="./app/files/{}.zip".format(temp_id),
            complete=True,
            chunks_received=1,
            operator=operator,
            delete_after_fetch=False,
            filename="Mythic_Downloads.zip",
        )
        return json({"status": "success", "file_id": file_meta.agent_file_id})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to process request"})
