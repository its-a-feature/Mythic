from app import mythic, db_objects
from sanic.response import json
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
from pathlib import PureWindowsPath, PurePosixPath
import sys
import ujson as js
import treelib
from peewee import fn
from math import ceil


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
    query = await db_model.filebrowserobj_query()
    objs = await db_objects.execute(query)
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=operation_name)
    except Exception as e:
        return {"status": "error", "error": "failed to find operation name"}
    try:
        query = await db_model.filebrowserobj_query()
        objs = await db_objects.execute(
            query.where(
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
        return {"status": "success"}
    parent = await create_and_check_parents(operation, task, response)
    if parent is None and response["parent_path"] != "":
        return {
            "status": "error",
            "error": "Failed to parse and handle file browser objects",
        }
    if "host" not in response or response["host"] == "" or response["host"] is None:
        response["host"] = task.callback.host
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
        query = await db_model.filebrowserobj_query()
        parent_path_str = str(parent_path) if not parent_path == blank_root else ""
        try:
            filebrowserobj = await db_objects.get(
                query,
                operation=operation,
                host=response["host"].upper().encode("unicode-escape"),
                name=response["name"].encode("unicode-escape"),
                is_file=response["is_file"],
                parent=parent,
                parent_path=str(parent_path_str).encode("unicode-escape"),
            )
            filebrowserobj.task = task
            filebrowserobj.permissions = js.dumps(response["permissions"]).encode(
                "unicode-escape"
            )
            filebrowserobj.access_time = response["access_time"].encode(
                "unicode-escape"
            )
            filebrowserobj.modify_time = response["modify_time"].encode(
                "unicode-escape"
            )
            filebrowserobj.size = str(response["size"]).encode("unicode_escape")
            filebrowserobj.success = response["success"]
            filebrowserobj.deleted = False
            await db_objects.update(filebrowserobj)
        except Exception as e:
            filebrowserobj = await db_objects.create(
                db_model.FileBrowserObj,
                task=task,
                operation=operation,
                host=response["host"].upper().encode("unicode-escape"),
                name=response["name"].encode("unicode-escape"),
                permissions=js.dumps(response["permissions"]).encode("unicode-escape"),
                parent=parent,
                parent_path=str(parent_path_str).encode("unicode-escape"),
                full_path=str(parent_path / response["name"]).encode("unicode_escape"),
                access_time=response["access_time"].encode("unicode-escape"),
                modify_time=response["modify_time"].encode("unicode-escape"),
                is_file=response["is_file"],
                size=str(response["size"]).encode("unicode-escape"),
                success=response["success"],
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
                    newfileobj = await db_objects.get(
                        query,
                        operation=operation,
                        host=response["host"].upper().encode("unicode-escape"),
                        name=f["name"].encode("unicode-escape"),
                        is_file=f["is_file"],
                        parent=filebrowserobj,
                        parent_path=str(parent_path).encode("unicode-escape"),
                    )
                    newfileobj.task = task
                    newfileobj.permissions = js.dumps(f["permissions"]).encode(
                        "unicode-escape"
                    )
                    newfileobj.access_time = f["access_time"].encode("unicode-escape")
                    newfileobj.modify_time = f["modify_time"].encode("unicode-escape")
                    newfileobj.size = str(f["size"]).encode("unicode_escape")
                    newfileobj.deleted = False
                    await db_objects.update(newfileobj)
                except Exception as e:
                    await db_objects.create(
                        db_model.FileBrowserObj,
                        task=task,
                        operation=operation,
                        host=response["host"].upper().encode("unicode-escape"),
                        parent=filebrowserobj,
                        permissions=js.dumps(f["permissions"]).encode("unicode-escape"),
                        parent_path=str(parent_path).encode("unicode-escape"),
                        access_time=f["access_time"].encode("unicode-escape"),
                        modify_time=f["modify_time"].encode("unicode-escape"),
                        size=str(f["size"]).encode("unicode-escape"),
                        is_file=f["is_file"],
                        name=f["name"].encode("unicode-escape"),
                        full_path=str(parent_path / f["name"]).encode("unicode-escape"),
                    )
        return {"status": "success"}
    except Exception as e:
        print(sys.exc_info()[-1].tb_lineno)
        print("file_browser_api.py: " + str(e))
        return {"status": "error", "error": str(e)}


async def add_upload_file_to_file_browser(operation, task, file, data):

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
        data["host"] = file.host
    try:
        await store_response_into_filebrowserobj(operation, task, data)
        fbo_query = await db_model.filebrowserobj_query()
        fbo = await db_objects.get(fbo_query, operation=operation,
                                   host=data["host"].upper().encode("unicode-escape"),
                                   full_path=data["full_path"].encode("unicode-escape"))
        file.file_browser = fbo
    except Exception as e:
        print(sys.exc_info()[-1].tb_lineno)
        print("file_browser_api.py: " + str(e))
        return


async def create_and_check_parents(operation, task, response):
    #  start at the top and make the root node if necessary, then recursively go down the path
    #  should return as the immediate parent the last entry we make (if any)
    try:
        query = await db_model.filebrowserobj_query()
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
                parent = await db_objects.get(
                    query,
                    host=response["host"].upper().encode("unicode-escape"),
                    parent=parent_obj,
                    name=name.encode("unicode-escape"),
                    operation=operation,
                )
            except Exception as e:
                # it doesn't exist, so create it
                # print("adding name:{} and parent:{}".format(name, parent_obj))
                # we didn't find a matching parent, so we need to create it and potentially create all the way up
                parent = await db_objects.create(
                    db_model.FileBrowserObj,
                    task=task,
                    operation=operation,
                    host=response["host"].upper().encode("unicode-escape"),
                    name=name.encode("unicode-escape"),
                    parent=parent_obj,
                    parent_path=parent_path_name.encode("unicode-escape"),
                    full_path=full_path,
                )
            parent_obj = parent
        return parent_obj
    except Exception as e:
        print(sys.exc_info()[-1].tb_lineno)
        print("file_browser_api.py: " + str(e))
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.filebrowserobj_query()
        file = await db_objects.get(query, id=fid, operation=operation)
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
        await db_objects.update(file)
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.filebrowserobj_query()
        file_query = await db_model.filemeta_query()
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to find that file browsing object in your current operation",
            }
        )
    try:
        data = request.json
        count = await db_objects.count(
            query.where(
                (db_model.FileBrowserObj.operation == operation)
                & (
                    fn.encode(db_model.FileBrowserObj.host, "escape").regexp(
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
            responses = await db_objects.prefetch(
                query.where(
                    (db_model.FileBrowserObj.operation == operation)
                    & (
                        fn.encode(db_model.FileBrowserObj.host, "escape").regexp(
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
                file_query
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
            responses = await db_objects.prefetch(
                query.where(
                    (db_model.FileBrowserObj.operation == operation)
                    & (
                        fn.encode(db_model.FileBrowserObj.host, "escape").regexp(
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
                file_query
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
        print(e)
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.filebrowserobj_query()
        file = await db_objects.get(query, id=fid, operation=operation)
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.filebrowserobj_query()
        data = request.json
        if "host" not in data:
            return json({"status": "error", "error": "Missing host parameter"})
        if "full_path" not in data:
            return json({"status": "error", "error": "Missing full_path parameter"})
        file = await db_objects.get(query, operation=operation, host=data["host"].upper().encode("unicode-escape"),
                                    full_path=data["full_path"].encode("unicode-escape"))
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
        query = await db_model.operation_query()
        file_query = await db_model.filemeta_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.filebrowserobj_query()
        files = await db_objects.prefetch(query.where(
            (db_model.FileBrowserObj.operation == operation) &
            (db_model.FileBrowserObj.parent == fid)
        ), file_query)
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
