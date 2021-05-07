from app import mythic
import app
from sanic.response import json
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
import sys
from sanic.exceptions import abort
import datetime
import base64


# This gets all responses in the database
@mythic.route(mythic.config["API_BASE"] + "/process_lists/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_process_lists(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operation"})
    process_lists = await app.db_objects.execute(
        db_model.process_query.where(db_model.Process.operation == operation)
    )
    return json(
        {"status": "success", "process_lists": [l.to_json() for l in process_lists]}
    )


@mythic.route(
    mythic.config["API_BASE"] + "/process_list/<host:string>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_a_process_list(request, user, host):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operation"})
    host = base64.b64decode(host).decode("utf-8").upper()
    # get the latest one
    latest = await app.db_objects.execute(
        db_model.process_query.where(
            (db_model.Process.operation == operation)
            & (db_model.Process.host == host)
        )
        .order_by(-db_model.Process.timestamp)
    )
    processes = []
    latest_timestamp = None
    task = None
    callback = None
    for p in latest:
        if latest_timestamp is None:
            latest_timestamp = p.timestamp
            task = p.task.id
            callback = p.task.callback.id
        if p.timestamp == latest_timestamp:
            processes.append(p.to_json())
        else:
            break
    try:
        tree_list = await get_process_tree(processes)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        tree_list = {}
    if task is None:
        return json({"status": "error", "error": "No process data yet for that host"})
    return json({"status": "success", "process_list": {"task": task, "callback": callback,"host": host,
                                                       "timestamp": latest_timestamp.strftime("%m/%d/%Y %H:%M:%S.%f"),
                                                       "process_list": processes}, "tree_list": tree_list})


@mythic.route(mythic.config["API_BASE"] + "/process_list/search", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_adjacent_process_list(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operation"})
    try:
        data = request.json
    except Exception as e:
        return json({"status": "error", "error": "must provide json data"})
    if "timestamp" not in data or data["timestamp"] == "" or data["timestamp"] is None:
        return json({"status": "error", "error": '"timestamp" is required'})
    try:
        timestamp = datetime.datetime.strptime(data["timestamp"], "%m/%d/%Y %H:%M:%S.%f")
    except Exception as e:
        return json({"status": "error", "error": "bad timestamp"})
    if "adjacent" not in data or data["adjacent"] not in ["next", "prev"]:
        return json(
            {
                "status": "error",
                "error": 'must specify "adjacent" with a value of "next" or "prev"',
            }
        )
    if "host" not in data:
        return json({"status": "error", "error": '"host" is required'})
    if data["adjacent"] == "prev":
        try:
            process_list = await app.db_objects.execute(
                db_model.process_query.where(
                    (db_model.Process.operation == operation)
                    & (db_model.Process.timestamp < timestamp)
                    & (db_model.Process.host == data["host"].upper())
                )
                .order_by(-db_model.Process.timestamp)
            )
            processes = []
            latest_timestamp = None
            task = None
            callback = None
            for p in process_list:
                if latest_timestamp is None:
                    latest_timestamp = p.timestamp
                    task = p.task.id
                    callback = p.task.callback.id
                if p.timestamp == latest_timestamp:
                    processes.append(p.to_json())
            if task is None:
                return json(
                    {
                        "status": "error",
                        "error": "No earlier process lists for this host",
                    }
                )
        except Exception as e:
            return json(
                {"status": "error", "error": "Error trying to get process lists for this host"}
            )
    else:
        # get the latest one
        try:
            process_list = await app.db_objects.execute(
                db_model.process_query.where(
                    (db_model.Process.operation == operation)
                    & (db_model.Process.timestamp > timestamp)
                    & (db_model.Process.host == data["host"].upper())
                )
                .order_by(db_model.Process.timestamp)
            )
            processes = []
            latest_timestamp = None
            task = None
            callback = None
            for p in process_list:
                if latest_timestamp is None:
                    latest_timestamp = p.timestamp
                    task = p.task.id
                    callback = p.task.callback.id
                if p.timestamp == latest_timestamp:
                    processes.append(p.to_json())
            if task is None:
                return json(
                    {"status": "error", "error": "No later process lists for this host"}
                )
        except Exception as e:
            return json(
                {"status": "error", "error": "Error getting process list for this host"}
            )

    try:
        tree = await get_process_tree(processes)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        tree = {}
    return json({"status": "success", "process_list": {"task": task, "callback": callback, "host": data["host"].upper(),
                                                       "timestamp": latest_timestamp.strftime("%m/%d/%Y %H:%M:%S.%f"),
                                                       "process_list": processes}, "tree_list": tree})


async def get_process_tree(pl):
    try:
        tree = {}
        # print(pl)
        if not isinstance(pl, list):
            return {}
        if len(pl) == 0 or "process_id" not in pl[0]:
            return tree
        pl_dict = {x["process_id"]: x for x in pl}
        sorted_keys = sorted(pl_dict.keys())
        tree[sorted_keys[0]] = {**pl_dict[sorted_keys[0]], "children": {}}
        for p in sorted_keys[1:]:
            if "parent_process_id" in pl_dict[p]:
                # print(pl_dict[p])
                await add_proc(tree, pl_dict[p])
            else:
                tree[p] = {**pl_dict[p], "children": {}}
        # do one final pass to check for pid reuse
        root_keys = list(tree.keys())
        for p in root_keys:
            element = tree.pop(p)
            await add_proc(tree, element)
        return tree
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {}


async def add_proc(tree, p):
    try:
        # do a breadth-first search to find p['parent_process_id'] in tree
        procs = [tree]
        while procs:
            cur_tree = procs[0]
            procs = procs[1:]  # remove the current one from the array
            if "parent_process_id" in p and p["parent_process_id"] in cur_tree:
                cur_tree[p["parent_process_id"]]["children"][p["process_id"]] = {
                    "children": {},
                    **p,
                }
                return
            else:
                for (pid, data) in cur_tree.items():
                    procs.append(cur_tree[pid]["children"])
        # if we get here, we failed to find p['parent_process_id'] in our tree, so add it as a root node
        tree[p["process_id"]] = {"children": {}, **p}
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
