from app import mythic
import app
from sanic.response import json
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
from pathlib import PureWindowsPath, PurePosixPath
import sys
import ujson as js
from peewee import fn
from math import ceil
from sanic.log import logger


@mythic.route(mythic.config["API_BASE"] + "/filebrowserobj/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_filebrowserobj(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    objs = await app.db_objects.execute(db_model.filebrowserobj_query)
    output = []
    for o in objs:
        output.append(o.to_json())
    # print(output)
    return json({"status": "success", "output": output})


@mythic.route(mythic.config["API_BASE"] + "/filebrowsertree/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_filebrowsertree(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    return json(await get_filebrowser_tree_for_operation(user["current_operation"]))


async def get_filebrowser_tree_for_operation(operation_name):
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=operation_name)
    except Exception as e:
        return {"status": "error", "error": "failed to find operation name"}
    try:
        objs = await app.db_objects.execute(
            db_model.filebrowserobj_query.where(
                (db_model.FileBrowserObj.operation == operation) &
                (db_model.FileBrowserObj.is_file == False) &
                (db_model.FileBrowserObj.parent == None)
        ))
        final_output = {}
        for e in objs:
            e_json = e.to_json()
            if e_json["host"].upper() not in final_output:
                final_output[e_json["host"].upper()] = []
            final_output[e_json["host"].upper()].append(e_json)
        return {"status": "success", "output": final_output}
    except Exception as e:
        print(e)
        return {"status": "error", "error": str(e)}


async def store_response_into_filebrowserobj(operation, task, response):
    # for the current message, see what the parent_path value is for that host
    # we want to link-up any new/updated objects to their parents
    if response["name"] is None or response["name"] == "":
        return {"status": "error", "error": "Name must be supplied"}
    parent = await create_and_check_parents(operation, task, response)
    if parent is None and response["parent_path"] != "":
        return {
            "status": "error",
            "error": "Failed to parse and handle file browser objects",
        }
    if "host" not in response or response["host"] == "" or response["host"] is None:
        response["host"] = task.callback.host.upper()
    # now that we have the immediate parent and all parent hierarchy create, deal with current obj and sub objects
    try:
        if (
            response["name"] == "/"
            or len(response["parent_path"]) > 0
            and response["parent_path"][0] == "/"
        ):
            parent_path = PurePosixPath(response["parent_path"])
            blank_root = PurePosixPath("")
        else:
            parent_path = PureWindowsPath(response["parent_path"])
            blank_root = PureWindowsPath("")
        parent_path_str = str(parent_path) if not parent_path == blank_root else ""
        try:
            filebrowserobj = await app.db_objects.get(
                db_model.filebrowserobj_query,
                operation=operation,
                host=response["host"].upper(),
                name=response["name"].encode("utf-8"),
                is_file=response["is_file"],
                parent=parent,
                parent_path=str(parent_path_str).encode("utf-8"),
            )
            filebrowserobj.task = task
            if "permissions" in response:
                filebrowserobj.permissions = js.dumps(response["permissions"]).encode("utf-8")
            if "access_time" in response:
                filebrowserobj.access_time = str(response["access_time"]).encode("utf-8")
            if "modify_time" in response:
                filebrowserobj.modify_time = str(response["modify_time"]).encode("utf-8")
            filebrowserobj.size = str(response["size"]).encode("utf-8")
            if "success" in response:
                filebrowserobj.success = response["success"]
            filebrowserobj.deleted = False
            await app.db_objects.update(filebrowserobj)
        except Exception as e:
            filebrowserobj = await app.db_objects.create(
                db_model.FileBrowserObj,
                task=task,
                operation=operation,
                host=response["host"].upper(),
                name=response["name"].encode("utf-8"),
                permissions=js.dumps(response["permissions"]).encode("utf-8") if "permissions" in response else js.dumps({}).encode("utf-8"),
                parent=parent,
                parent_path=str(parent_path_str).encode("utf-8"),
                full_path=str(parent_path / response["name"]).encode("utf-8"),
                access_time=str(response["access_time"]).encode("utf-8") if "access_time" in response else "".encode("utf-8"),
                modify_time=str(response["modify_time"]).encode("utf-8") if "modify_time" in response else "".encode("utf-8"),
                is_file=response["is_file"],
                size=str(response["size"]).encode("utf-8"),
                success=response["success"] if "success" in response else True,
            )
        if (
            not filebrowserobj.is_file
            and "files" in response
            and response["files"] is not None
            and len(response["files"]) > 0
        ):
            # iterate over the files and create their objects
            parent_path = parent_path.joinpath(response["name"])
            for f in response["files"]:
                try:
                    newfileobj = await app.db_objects.get(
                        db_model.filebrowserobj_query,
                        operation=operation,
                        host=response["host"].upper(),
                        name=f["name"].encode("utf-8"),
                        is_file=f["is_file"],
                        parent=filebrowserobj,
                        parent_path=str(parent_path).encode("utf-8"),
                    )
                    if "permissions" not in f:
                        f["permissions"] = {}
                    if "access_time" not in f:
                        f["access_time"] = ""
                    if "modify_time" not in f:
                        f["modify_time"] = ""
                    newfileobj.task = task
                    newfileobj.permissions = js.dumps(f["permissions"]).encode("utf-8")
                    newfileobj.access_time = str(f["access_time"]).encode("utf-8")
                    newfileobj.modify_time = str(f["modify_time"]).encode("utf-8")
                    newfileobj.size = str(f["size"]).encode("utf-8")
                    newfileobj.deleted = False
                    await app.db_objects.update(newfileobj)
                except Exception as e:
                    await app.db_objects.create(
                        db_model.FileBrowserObj,
                        task=task,
                        operation=operation,
                        host=response["host"].upper(),
                        parent=filebrowserobj,
                        permissions=js.dumps(f["permissions"]).encode("utf-8") if "permissions" in f else js.dumps({}).encode("utf-8"),
                        parent_path=str(parent_path).encode("utf-8"),
                        access_time=str(f["access_time"]).encode("utf-8") if "access_time" in f else "".encode("utf-8"),
                        modify_time=str(f["modify_time"]).encode("utf-8") if "modify_time" in f else "".encode("utf-8"),
                        size=str(f["size"]).encode("utf-8") if "size" in f else "0".encode("utf-8"),
                        is_file=f["is_file"],
                        name=f["name"].encode("utf-8"),
                        full_path=str(parent_path / f["name"]).encode("utf-8"),
                    )
        if "update_deleted" in response and response["update_deleted"]:
            # go through and mark all files/folders not associated with this task as deleted
            base_files = await app.db_objects.execute(db_model.filebrowserobj_query.where(
                (db_model.FileBrowserObj.task != task) &
                (db_model.FileBrowserObj.parent == filebrowserobj) &
                (db_model.FileBrowserObj.operation == operation)
            ))
            for f in base_files:
                # this file object is not associated with this task but has the same parent folder, so it's gone
                f.deleted = True
                if not f.is_file:
                    # this is a folder that was deleted, so make sure we mark all of its children as deleted
                    await mark_nested_deletes(f, operation)
                await app.db_objects.update(f)
        return {"status": "success"}
    except Exception as e:
        logger.warning("file_browser_api.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": str(e)}


async def mark_nested_deletes(folder, operation):
    nested_files = await app.db_objects.execute(db_model.filebrowserobj_query.where(
        (db_model.FileBrowserObj.operation == operation) &
        (db_model.FileBrowserObj.parent == folder)
    ))
    for f in nested_files:
        f.deleted = True
        if not f.is_file:
            await mark_nested_deletes(f, operation)
        await app.db_objects.update(f)


async def add_upload_file_to_file_browser(operation, task, file, data):
    try:
        if "full_path" not in data or data["full_path"] is None or data["full_path"] == "":
            return
        data["is_file"] = True
        data["permissions"] = {}
        data["success"] = True
        data["access_time"] = ""
        data["modify_time"] = ""
        data["size"] = file.chunk_size
        data["files"] = []
        if data["full_path"][0] == "/":
            full_path = PurePosixPath(data["full_path"])
        else:
            full_path = PureWindowsPath(data["full_path"])
        data["name"] = full_path.name
        data["parent_path"] = str(full_path.parents[0])
        if "host" not in data or data["host"] is None or data["host"] == "":
            data["host"] = file.host.upper()
        await store_response_into_filebrowserobj(operation, task, data)
        fbo = await app.db_objects.get(db_model.filebrowserobj_query, operation=operation,
                                   host=data["host"].upper(),
                                   full_path=data["full_path"].encode("utf-8"))
        file.file_browser = fbo
        await app.db_objects.update(file)
    except Exception as e:
        logger.warning("file_browser_api.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return


async def create_and_check_parents(operation, task, response):
    #  start at the top and make the root node if necessary, then recursively go down the path
    #  should return as the immediate parent the last entry we make (if any)
    try:
        if "host" not in response:
            response["host"] = task.callback.host
        if (
            response["name"] == "/"
            or len(response["parent_path"]) > 0
            and response["parent_path"][0] == "/"
        ):
            if response["parent_path"] == "":
                parent_path = PurePosixPath("")
                base_path = parent_path
            else:
                parent_path = PurePosixPath(response["parent_path"])
                base_path = PurePosixPath(parent_path.parts[0])
        else:
            if response["parent_path"] == "":
                parent_path = PureWindowsPath("")
                base_path = parent_path
            else:
                parent_path = PureWindowsPath(response["parent_path"])
                base_path = PureWindowsPath(parent_path.parts[0])
        parent_obj = None
        # print(parent_path.parts)
        for p in range(len(parent_path.parts)):
            name = parent_path.parts[p]
            parent_path_name = base_path
            if p > 0:
                for i in range(p):
                    parent_path_name = parent_path_name.joinpath(parent_path.parts[i])
            else:
                parent_path_name = ""
            if parent_path_name == "":
                full_path = str(name)
            else:
                full_path = str(parent_path_name.joinpath(name))
            name = str(name)
            parent_path_name = str(parent_path_name)
            # print("looking for name:{} and parent:{}".format(name, parent_obj))
            try:
                parent = await app.db_objects.get(
                    db_model.filebrowserobj_query,
                    host=response["host"].upper(),
                    parent=parent_obj,
                    name=name.encode("utf-8"),
                    operation=operation,
                )
            except Exception as e:
                # it doesn't exist, so create it
                # print("adding name:{} and parent:{}".format(name, parent_obj))
                # we didn't find a matching parent, so we need to create it and potentially create all the way up
                parent = await app.db_objects.create(
                    db_model.FileBrowserObj,
                    task=task,
                    operation=operation,
                    host=response["host"].upper(),
                    name=name.encode("utf-8"),
                    parent=parent_obj,
                    parent_path=parent_path_name.encode("utf-8"),
                    full_path=full_path,
                )
            parent_obj = parent
        return parent_obj
    except Exception as e:
        logger.warning("file_browser_api.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return None


@mythic.route(mythic.config["API_BASE"] + "/filebrowserobj/<fid:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def edit_filebrowsobj(request, user, fid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        file = await app.db_objects.get(db_model.filebrowserobj_query, id=fid, operation=operation)
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to find that file browsing object in your current operation",
            }
        )
    try:
        data = request.json
        if "comment" in data:
            file.comment = data["comment"]
        await app.db_objects.update(file)
        return json({"status": "success", "file_browser": file.to_json()})
    except Exception as e:
        return json({"status": "error", "error": str(e)})


@mythic.route(mythic.config["API_BASE"] + "/filebrowserobj/search", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def search_filebrowsobj(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to find that file browsing object in your current operation",
            }
        )
    try:
        data = request.json
        count = await app.db_objects.count(
            db_model.filebrowserobj_query.where(
                (db_model.FileBrowserObj.operation == operation)
                & (
                    db_model.FileBrowserObj.host.regexp(
                        data["host"]
                    )
                )
                & (db_model.FileBrowserObj.comment.regexp(data["comment"]))
                & (
                    fn.encode(db_model.FileBrowserObj.full_path, "escape").regexp(
                        data["path"]
                    )
                )
            ).distinct()
        )
        if "page" not in data:
            # allow a blanket search to still be performed
            responses = await app.db_objects.prefetch(
                db_model.filebrowserobj_query.where(
                    (db_model.FileBrowserObj.operation == operation)
                    & (
                        db_model.FileBrowserObj.host.regexp(
                            data["host"]
                        )
                    )
                    & (db_model.FileBrowserObj.comment.regexp(data["comment"]))
                    & (
                        fn.encode(db_model.FileBrowserObj.full_path, "escape").regexp(
                            data["path"]
                        )
                    )
                )
                #.distinct()
                .order_by(db_model.FileBrowserObj.full_path),
                db_model.filemeta_query
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
            responses = await app.db_objects.prefetch(
                db_model.filebrowserobj_query.where(
                    (db_model.FileBrowserObj.operation == operation)
                    & (
                        db_model.FileBrowserObj.host.regexp(
                            data["host"]
                        )
                    )
                    & (db_model.FileBrowserObj.comment.regexp(data["comment"]))
                    & (
                        fn.encode(db_model.FileBrowserObj.full_path, "escape").regexp(
                            data["path"]
                        )
                    )
                )
                #.distinct()
                .order_by(db_model.FileBrowserObj.full_path)
                .paginate(data["page"], data["size"]),
                db_model.filemeta_query
            )
        output = []
        for r in responses:
            rjson = r.to_json()
            rjson["files"] = []
            for f in r.files:
                fjson = f.to_json()
                if f.task is not None and f.task.comment != "":
                    fjson["comment"] = f.task.comment
                rjson["files"].append(fjson)
            output.append(rjson)
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
        logger.warning("file_browser_api.py: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": str(e)})


@mythic.route(mythic.config["API_BASE"] + "/filebrowserobj/<fid:int>/permissions", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_filebrowsobj_permissions(request, user, fid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        file = await app.db_objects.get(db_model.filebrowserobj_query, id=fid, operation=operation)
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to find that file browsing object in your current operation",
            }
        )
    try:
        return json({"status": "success", "permissions": file.permissions})
    except Exception as e:
        return json({"status": "error", "error": str(e)})


@mythic.route(mythic.config["API_BASE"] + "/filebrowserobj/permissions/bypath", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_filebrowsobj_permissions_by_path(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        data = request.json
        if "host" not in data:
            return json({"status": "error", "error": "Missing host parameter"})
        if "full_path" not in data:
            return json({"status": "error", "error": "Missing full_path parameter"})
        file = await app.db_objects.get(db_model.filebrowserobj_query, operation=operation, host=data["host"].upper(),
                                    full_path=data["full_path"].encode("utf-8"))
        return json({"status": "success", "permissions": file.permissions})
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to find that file browsing object in your current operation",
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/filebrowserobj/<fid:int>/files", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_filebrowsobj_files(request, user, fid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        files = await app.db_objects.prefetch(db_model.filebrowserobj_query.where(
            (db_model.FileBrowserObj.operation == operation) &
            (db_model.FileBrowserObj.parent == fid)
        ), db_model.filemeta_query)
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to find that file browsing object in your current operation",
            }
        )
    try:
        output = []
        for f in files:
            f_json = f.to_json()
            f_json["files"] = []
            for fm_file in f.files:
                fjson = fm_file.to_json()
                if (
                        fm_file.task is not None
                        and fm_file.task.comment != ""
                ):
                    fjson["comment"] = f.task.comment
                f_json["files"].append(fjson)
            if f.is_file:
                output.append({f_json["name"]: {"data": f_json}})
            else:
                output.append({f_json["name"]: {"data": f_json,  "children": []}})
        return json({"status": "success", "files": output})
    except Exception as e:
        return json({"status": "error", "error": str(e)})
