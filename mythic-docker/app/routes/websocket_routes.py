from app import mythic
import app
import aiopg
import ujson as js
from sanic.log import logger
from app.database_models.model import (
    Callback,
    Payload,
    PayloadType,
    C2Profile,
    Credential,
    FileMeta,
    Task,
    TaskArtifact,
)
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
import sys
from app.api.processlist_api import get_process_tree
import asyncio
import peewee


# --------------- TASKS --------------------------
async def task_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            tsk = await app.db_objects.get(db_model.task_query, id=msg_id)
            if tsk.callback.operation == operation:
                taskj = tsk.to_json()
                taskj["callback"] = tsk.callback.to_json()
                await ws.send(js.dumps(taskj))
        except Exception as e:
            logger.warning("exception in task_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/tasks/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_tasks(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        cb = None
        def callback_func(*args):
            asyncio.create_task(cb(*args))
        async with app.websocket_pool.acquire() as conn:
            cb = await task_data_callback(ws, op)
            await conn.add_listener("newtask", callback_func)
            await conn.add_listener("updatedtask", callback_func)
            # before we start getting new things, update with all of the old data
            tasks_with_all_info = await app.db_objects.prefetch(
                db_model.task_query.where(db_model.Callback.operation == op).order_by(
                    db_model.Task.id
                ),
                db_model.callback_query,
                db_model.callbacktoken_query
            )
            # callbacks_with_operators = await app.db_objects.prefetch(callbacks, operators)
            for task in tasks_with_all_info:
                taskj = task.to_json()
                taskj["callback"] = task.callback.to_json()
                await ws.send(js.dumps(taskj))
            await ws.send("")
            # now pull off any new tasks we got queued up while processing the old data
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/tasks/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


@mythic.websocket("/ws/tasks/new/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_tasks_new(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await task_data_callback(ws, op)
            await conn.add_listener("newtask", callback_func)
            await conn.add_listener("updatedtask", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning(
            "closed /ws/tasks/new/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def task_data_for_one_task_callback(ws, operation, tid):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            tsk = await app.db_objects.get(db_model.task_query, id=msg_id)
            if tsk.id == tid:
                await ws.send(js.dumps(tsk.to_json()))
        except Exception as e:
            logger.warning("exception in task_data_for_one_task_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/task/<tid:int>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_updates_for_task(request, ws, user, tid):
    if not await valid_origin_header(request):
        return
    try:
        op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            # before we start getting new things, update with all of the old data
            task = await app.db_objects.get(db_model.task_query, id=tid)
            if task.callback.operation == op:
                await ws.send(js.dumps(task.to_json()))
            else:
                return
            cb = await task_data_for_one_task_callback(ws, op, tid)
            await conn.add_listener("updatedtask", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning(
            "closed /ws/task/<tid:int> error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def taskfeed_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            t = await app.db_objects.get(db_model.task_query, id=msg_id)
            if t.callback.operation == operation:
                await ws.send(
                    js.dumps(
                        {
                            **t.to_json(),
                            "host": t.callback.host,
                            "user": t.callback.user,
                            "integrity_level": t.callback.integrity_level,
                            "domain": t.callback.domain
                        }
                    )
                )
        except Exception as e:
            logger.warning("exception in taskfeed_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/task_feed/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_tasks_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        cb = None
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            return
        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await task_data_callback(ws, operation)
            await conn.add_listener("newtask", callback_func)
            await conn.add_listener("updatedtask", callback_func)
            # to avoid being too slow, just get the latest 200
            initial_tasks = await app.db_objects.execute(
                db_model.task_query.where(Callback.operation == operation)
                .order_by(Task.timestamp)
                .limit(200)
            )
            for t in initial_tasks:
                await ws.send(
                    js.dumps(
                        {
                            **t.to_json(),
                            "host": t.callback.host,
                            "user": t.callback.user,
                            "integrity_level": t.callback.integrity_level,
                            "domain": t.callback.domain
                        }
                    )
                )
            await ws.send("")
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/task_feed/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# --------------- RESPONSES ---------------------------
# notifications for task updates
async def response_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            rsp = await app.db_objects.get(db_model.response_query, id=msg_id)
            if rsp.task.callback.operation == operation:
                await ws.send(js.dumps(rsp.to_json()))
        except Exception as e:
            logger.warning("exception in response_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/responses/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_responses_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await response_data_callback(ws, op)
            await conn.add_listener("newresponse", callback_func)
            responses_with_tasks = await app.db_objects.execute(
                db_model.response_query.where(db_model.Callback.operation == op).order_by(
                    db_model.Response.id
                )
            )
            for resp in responses_with_tasks:
                await ws.send(js.dumps(resp.to_json()))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/responses/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


@mythic.websocket("/ws/responses/new/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_responses_new_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await response_data_callback(ws, op)
            await conn.add_listener("newresponse", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
       logger.warning("closed /ws/responses/new/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def response_data_by_task_callback(ws, task):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            rsp = await app.db_objects.get(db_model.response_query, id=msg_id)
            if rsp.task.id == task.id:
                await ws.send(js.dumps(rsp.to_json()))
                if rsp.task.completed:
                    raise Exception("task is completed, closing websocket")
        except Exception as e:
            logger.warning("exception in response_data_by_task_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/responses/by_task/<tid:int>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_responses_by_task(request, ws, user, tid):
    if not await valid_origin_header(request):
        return
    if not user["admin"]:
        await ws.send(js.dumps({"status": "error", "error": "must be an admin"}))
        return
    try:
        task = await app.db_objects.get(db_model.task_query, id=tid)
        if (
                task.callback.operation.name not in user["operations"]
                and task.callback.operation.name not in user["admin_operations"]
        ):
            await ws.send(
                js.dumps(
                    {
                        "error": "task not in one of your operations",
                        "status": "error",
                    }
                )
            )
            return
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await response_data_by_task_callback(ws, task)
            await conn.add_listener("newresponse", callback_func)
            responses_with_tasks = await app.db_objects.execute(
                db_model.response_query.where(db_model.Response.task == task).order_by(
                    db_model.Response.id
                )
            )
            for resp in responses_with_tasks:
                await ws.send(js.dumps(resp.to_json()))
            if task.completed:
                return
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning(
            "closed /ws/responses/by_task/<tid> error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# --------------------- CALLBACKS ------------------
async def callback_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            cb = await app.db_objects.prefetch(
                db_model.callback_query.where(
                    (db_model.Callback.id == msg_id) & (db_model.Callback.operation == operation)),
                db_model.callbacktoken_query
            )
            cb = list(cb)[0]
            cb_json = cb.to_json()
            callbackc2profiles = await app.db_objects.execute(
                db_model.callbackc2profiles_query.where(
                    db_model.CallbackC2Profiles.callback == cb
                )
            )
            c2_profiles_info = []
            for c2p in callbackc2profiles:
                profile_info = {
                    "name": c2p.c2_profile.name,
                    "is_p2p": c2p.c2_profile.is_p2p,
                    "parameters": {},
                }
                c2_profile_params = await app.db_objects.execute(
                    db_model.c2profileparametersinstance_query.where(
                        (
                                db_model.C2ProfileParametersInstance.callback
                                == cb
                        )
                        & (
                                db_model.C2ProfileParametersInstance.c2_profile
                                == c2p.c2_profile
                        )
                    )
                )
                for param in c2_profile_params:
                    profile_info["parameters"][
                        param.c2_profile_parameters.name
                    ] = param.value
                c2_profiles_info.append(profile_info)
            cb_json["supported_profiles"] = c2_profiles_info
            await ws.send(js.dumps(cb_json))
        except Exception as e:
            logger.warning("exception in callback_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/callbacks/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_callbacks_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        callbackcb = None
        if user["current_operation"] != "":
            # before we start getting new things, update with all of the old data
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)

        def callback_func(*args):
            asyncio.create_task(callbackcb(*args))

        async with app.websocket_pool.acquire() as conn:
            callbackcb = await callback_data_callback(ws, operation)
            await conn.add_listener("newcallback", callback_func)
            callbacks_with_operators = await app.db_objects.prefetch(
                db_model.callback_query.where(
                    (Callback.operation == operation)
                    & (Callback.active == True)
                ).order_by(Callback.id), db_model.callbacktoken_query
            )
            for cb in callbacks_with_operators:
                cb_json = cb.to_json()
                cb_json["payload_os"] = cb.registered_payload.os
                callbackc2profiles = await app.db_objects.execute(
                    db_model.callbackc2profiles_query.where(
                        db_model.CallbackC2Profiles.callback == cb
                    )
                )
                c2_profiles_info = []
                for c2p in callbackc2profiles:
                    profile_info = {
                        "name": c2p.c2_profile.name,
                        "is_p2p": c2p.c2_profile.is_p2p,
                        "parameters": {},
                    }
                    c2_profile_params = await app.db_objects.execute(
                        db_model.c2profileparametersinstance_query.where(
                            (
                                db_model.C2ProfileParametersInstance.callback
                                == cb
                            )
                            & (
                                db_model.C2ProfileParametersInstance.c2_profile
                                == c2p.c2_profile
                            )
                        )
                    )
                    for param in c2_profile_params:
                        profile_info["parameters"][
                            param.c2_profile_parameters.name
                        ] = param.value
                    c2_profiles_info.append(profile_info)
                cb_json["supported_profiles"] = c2_profiles_info
                await ws.send(js.dumps(cb_json))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/callbacks/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


@mythic.websocket("/ws/new_callbacks/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_callbacks_current_operation_new(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        if user["current_operation"] != "":
            # before we start getting new things, update with all of the old data
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await callback_data_callback(ws, operation)
            await conn.add_listener("newcallback", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning(
            "closed /ws/new_callbacks/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def unified_callback_callback(ws, operation, callback):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            if channel == "updatedcallback":
                if str(msg_id) != str(callback.id):
                    return
                obj = await app.db_objects.prefetch(db_model.callback_query.where(
                    (db_model.Callback.id == msg_id) & (db_model.Callback.operation == operation)
                ), db_model.callbacktoken_query)
                obj = list(obj)[0]
                obj_json = obj.to_json()
                obj_json["payload_os"] = obj.registered_payload.os
            elif "task" in channel:
                obj = await app.db_objects.get(
                    db_model.task_query, id=msg_id, callback=callback
                )
                obj_json = obj.to_json()
            elif "filemeta" in channel:
                obj = await app.db_objects.get(
                    db_model.filemeta_query, id=msg_id, operation=operation
                )
                obj_json = obj.to_json()
                if obj.task is not None:
                    obj_json["callback_id"] = obj.task.callback.id
                else:
                    obj_json["callback_id"] = 0
            elif "loadedcommand" in channel:
                if "deleted" in channel:
                    obj_json = js.loads(msg_id)
                    obj_json["callback"] = obj_json["callback_id"]
                    obj_json["channel"] = "deletedloadedcommand"
                else:
                    obj = await app.db_objects.get(db_model.loadedcommands_query,
                                                   id=msg_id, callback=callback)
                    obj_json = obj.to_json()
            else:
                obj = await app.db_objects.prefetch(db_model.response_query.where(db_model.Response.id == msg_id),
                                                    db_model.task_query)
                obj = list(obj)[0]
                if obj.task.callback.id != callback.id:
                    return
                obj_json = obj.to_json()
            obj_json["channel"] = channel
        except peewee.DoesNotExist:
            return
        except Exception as e:
            logger.warning("exception in unified callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
        try:
            await ws.send(js.dumps(obj_json))
        except Exception as e:
            logger.warning("in unified_callback callback, exception: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
    return callback_func


@mythic.websocket("/ws/unified_callback/<cid:int>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_unified_single_callback_current_operation(request, ws, user, cid):
    if not await valid_origin_header(request):
        return
    cb = None
    def callback_func(*args):
        asyncio.create_task(cb(*args))
    try:
        if user["current_operation"] != "":
            # before we start getting new things, update with all of the old data
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
            callback = await app.db_objects.get(
                db_model.callback_query, operation=operation, id=cid
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(1)
        async with app.websocket_pool.acquire() as conn:
            cb = await unified_callback_callback(ws, operation, callback)
            await conn.add_listener("updatedcallback", callback_func)
            await conn.add_listener("newtask", callback_func)
            await conn.add_listener("updatedtask", callback_func)
            await conn.add_listener("newfilemeta", callback_func)
            await conn.add_listener("updatedfilemeta", callback_func)
            await conn.add_listener("newloadedcommands", callback_func)
            await conn.add_listener("updatedloadedcommands", callback_func)
            await conn.add_listener("deletedloadedcommands", callback_func)
            await conn.add_listener("newresponse", callback_func)
            cur_loaded = await app.db_objects.execute(db_model.loadedcommands_query.where(
                (db_model.LoadedCommands.callback == callback)
            ))
            for c in cur_loaded:
                await ws.send(js.dumps({**c.to_json(), "channel": "newloadedcommand"}))
            scripts_loaded = await app.db_objects.execute(db_model.command_query.where(
                (db_model.Command.payload_type == callback.registered_payload.payload_type) &
                (db_model.Command.script_only == True) &
                (db_model.Command.deleted == False)
            ))
            for c in scripts_loaded:
                await ws.send(js.dumps({
                    "id": 0,
                    "command": c.cmd,
                    "version": c.version,
                    "callback": cid,
                    "operator": "",
                    "attributes": js.loads(c.attributes),
                    "supported_ui_features": c.supported_ui_features,
                    "channel": "newloadedcommand"}))
            await ws.send("")
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as e:
        logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))


async def updatedcallback_callback(ws, operation):
    async def callback(connection, pid, channel, payload):
        cb = await app.db_objects.get(db_model.callback_query, id=payload, operation=operation)
        obj = cb.to_json(get_tokens=False)
        obj["tokens"] = []
        obj["channel"] = "updatedcallback"
        obj["payload_os"] = cb.registered_payload.os
        asyncio.ensure_future(ws.send(js.dumps(obj)))
    return callback


# notifications for updated callbacks
@mythic.websocket("/ws/updatedcallbacks/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_callbacks_updated_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    cb = None
    def callback_func(*args):
        asyncio.create_task(cb(*args))
    try:
        operation = await app.db_objects.get(
            db_model.operation_query, name=user["current_operation"]
        )
        async with app.websocket_pool.acquire() as conn:
            cb = await updatedcallback_callback(ws, operation)
            await conn.add_listener("updatedcallback", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as t:
        logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(t))


# --------------- PAYLOADS -----------------------
# notifications for new payloads
async def payload_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            p = await app.db_objects.get(db_model.payload_query, id=msg_id)
            if p.operation == operation:
                await ws.send(js.dumps(p.to_json()))
        except Exception as e:
            logger.warning("exception in payload_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/payloads/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payloads_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await payload_data_callback(ws, operation)
            await conn.add_listener("newpayload", callback_func)
            await conn.add_listener("updatedpayload", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
            payloads = await app.db_objects.prefetch(
                db_model.payload_query.where(
                    (Payload.operation == operation)
                    #& (Payload.deleted == False)
                    #& (Payload.auto_generated == False)
                ).order_by(Payload.id),
                db_model.filemeta_query, db_model.task_query, db_model.command_query
            )
            for p in payloads:
                await ws.send(js.dumps(p.to_json()))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning(
            "closed /ws/payloads/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def payload_info_data_callback(ws, operation):
    from app.api.payloads_api import get_payload_config
    async def callback_func(connection, pid, channel, msg_id):
        try:
            p = await app.db_objects.get(db_model.payload_query, id=msg_id)
            if p.operation == operation:
                pinfo = await get_payload_config(p)
                pinfo.pop("status", None)
                await ws.send(js.dumps(pinfo))
        except Exception as e:
            logger.warning("exception in payload_info_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/payloads/info/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payloads_current_operation_info(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await payload_info_data_callback(ws, operation)
            await conn.add_listener("newpayload", callback_func)
            await conn.add_listener("updatedpayload", callback_func)
            from app.api.payloads_api import get_payload_config
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
            payloads = await app.db_objects.execute(
                db_model.payload_query.where((Payload.operation == operation)).order_by(
                    Payload.id
                )
            )
            for p in payloads:
                pinfo = await get_payload_config(p)
                pinfo.pop("status", None)
                await ws.send(js.dumps(pinfo))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/payloads/info/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def payload_one_data_callback(ws, operation, puuid):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            p = await app.db_objects.get(db_model.payload_query, uuid=puuid)
            #logger.warning(f"in callback_func for ws_updates_for_payload with:\n{p}")
            if p.uuid == str(puuid) and p.operation == operation:
                await ws.send(js.dumps(p.to_json()))
            sys.stdout.flush()
        except Exception as e:
            logger.warning("exception in payload_one_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/payloads/<puuid:str>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_updates_for_payload(request, ws, user, puuid):
    if not await valid_origin_header(request):
        return
    try:
        #logger.warning("in ws starting listening")
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            #logger.warning("in ws, got connection to db")
            cb = await payload_one_data_callback(ws, operation, puuid)
            await conn.add_listener("updatedpayload", callback_func)
            # before we start getting new things, update with all of the old data
            payload = await app.db_objects.get(db_model.payload_query, uuid=puuid)
            if payload.operation == operation:
                #logger.warning(f"in callback_func for ws_updates_for_payload sending initial info with:\n{payload}")
                await ws.send(js.dumps(payload.to_json()))
            else:
                #logger.warning(f"in callback_func for ws_updates_for_payload returning")
                return
            while True:
                #logger.warning(f"in callback_func for ws_updates_for_payload loop 1s")
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/payloads/<puuid> error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# --------------- C2PROFILES -----------------------
# notifications for new c2profiles
async def c2profile_data_callback(ws):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            p = await app.db_objects.get(db_model.c2profile_query, id=msg_id)
            await ws.send(js.dumps(p.to_json()))
        except Exception as e:
            logger.warning("exception in c2profile_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/c2profiles")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_c2profile_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await c2profile_data_callback(ws)
            await conn.add_listener("newc2profile", callback_func)
            await conn.add_listener("updatedc2profile", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
            profiles = await app.db_objects.execute(
                db_model.c2profile_query.where(C2Profile.deleted == False)
            )
            for p in profiles:
                await ws.send(js.dumps(p.to_json()))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/c2profiles error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def payloadtypec2profile_data_callback(ws):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            p = await app.db_objects.get(db_model.payloadtypec2profile_query, id=id)
            await ws.send(js.dumps(p.to_json()))
        except Exception as e:
            logger.warning("exception in c2profile_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/payloadtypec2profile")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payloadtypec2profile(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await payloadtypec2profile_data_callback(ws)
            await conn.add_listener("newpayloadtypec2profile", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
            profiles = await app.db_objects.execute(db_model.payloadtypec2profile_query)
            for p in profiles:
                await ws.send(js.dumps(p.to_json()))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/payloadtypec2profile error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# ---------------- OPERATORS --------------------------
# notifications for new operators
async def operator_data_callback(ws):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            p = await app.db_objects.get(db_model.operator_query, id=msg_id, deleted=False)
            await ws.send(js.dumps(p.to_json()))
        except Exception as e:
            logger.warning("exception in operator_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/operators")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_operators(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await operator_data_callback(ws)
            await conn.add_listener("newoperator", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
            operators = await app.db_objects.execute(
                db_model.operator_query.where(db_model.Operator.deleted == False)
            )
            for o in operators:
                await ws.send(js.dumps(o.to_json()))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/operators error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# notifications for updated operators
@mythic.websocket("/ws/updatedoperators")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_updated_operators(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await operator_data_callback(ws)
            await conn.add_listener("updatedoperator", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/updatedoperators error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# ---------------- PAYLOADTYPES --------------------------
# notifications for new payloadtypes
async def payloadtype_data_callback(ws):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            if "deleted" in channel:
                await ws.send("")
            else:
                if "translation" in channel:
                    p = await app.db_objects.prefetch(db_model.payloadtype_query.where(
                        (PayloadType.translation_container != None) & (PayloadType.deleted == False)
                    ), db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False))
                else:
                    p = await app.db_objects.prefetch(db_model.payloadtype_query.where(
                        (PayloadType.id == msg_id) & (PayloadType.deleted == False)
                    ), db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False))
                for element in p:
                    await ws.send(js.dumps(element.to_json()))
        except Exception as e:
            logger.warning("exception in payloadtype_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/payloadtypes")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payloadtypes(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await payloadtype_data_callback(ws)
            await conn.add_listener("newpayloadtype", callback_func)
            await conn.add_listener("updatedpayloadtype", callback_func)
            await conn.add_listener("newwrappedpayloadtypes", callback_func)
            await conn.add_listener("updatedwrappedpayloadtypes", callback_func)
            await conn.add_listener("deletedwrappedpayloadtypes", callback_func)
            await conn.add_listener("updatedtranslationcontainer", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
            payloadtypes = await app.db_objects.prefetch(
                db_model.payloadtype_query.where(db_model.PayloadType.deleted == False).order_by(
                    PayloadType.id
                ), db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False)
            )
            for p in payloadtypes:
                wrappedpayloadtypes = await app.db_objects.execute(
                    db_model.wrappedpayloadtypes_query.where(
                        db_model.WrappedPayloadTypes.wrapper == p
                    )
                )
                await ws.send(
                    js.dumps(
                        {
                            **p.to_json(),
                            "wrapped_payload_types": [
                                w.to_json() for w in wrappedpayloadtypes
                            ],
                        }
                    )
                )
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/payloadtypes error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# ---------------- COMMANDS --------------------------
# notifications for new commands
async def all_command_info_data_callback(ws):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            msg_dict = {}
            if (
                    "parameters" in channel
                    and "deleted" not in channel
            ):
                p = await app.db_objects.get(db_model.commandparameters_query, id=msg_id)
            elif "deleted" not in channel:
                p = await app.db_objects.get(db_model.command_query, id=msg_id)
            elif "deleted" in channel:
                # print(msg)
                p = await app.db_objects.get(
                    db_model.command_query, id=js.loads(msg_id)["command_id"]
                )
                msg_dict = {**js.loads(msg_id)}
            else:
                return
            await ws.send(
                js.dumps(
                    {**p.to_json(), **msg_dict, "notify": channel}
                )
            )
        except Exception as e:
            logger.warning("exception in all_command_info_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/all_command_info")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_commands_all(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await all_command_info_data_callback(ws)
            await conn.add_listener("newcommandparameters", callback_func)
            await conn.add_listener("updatedcommandparameters", callback_func)
            await conn.add_listener("deletedcommandparameters", callback_func)
            await conn.add_listener("newcommand", callback_func)
            await conn.add_listener("updatedcommand", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/all_command_info error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def command_data_callback(ws):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            p = await app.db_objects.get(db_model.command_query, id=id, deleted=False)
            await ws.send(js.dumps(p.to_json()))
        except Exception as e:
            logger.warning("exception in command_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


# basic info of just new commmands for the payload types page
@mythic.websocket("/ws/commands")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_commands(request, ws, user):
    if not await valid_origin_header(request):
        return
    if user["current_operation"] == "":
        return
    try:
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await command_data_callback(ws)
            await conn.add_listener("newcommand", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
            commands = await app.db_objects.execute(
                db_model.command_query.where(db_model.Command.deleted == False)
            )
            for c in commands:
                await ws.send(js.dumps(c.to_json()))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/commands error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# ------------- FILEMETA ---------------------------
# notifications for new screenshots
async def filemeta_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            f = await app.db_objects.get(
                db_model.filemeta_query,
                id=msg_id,
                operation=operation,
                is_screenshot=True,
            )
            task = await app.db_objects.get(db_model.task_query, id=f.task)
            await ws.send(
                js.dumps(
                    {
                        **task.callback.to_json(),
                        **f.to_json(),
                        "callback_id": task.callback.id,
                        "comment": task.comment,
                    }
                )
            )
        except Exception as e:
            logger.warning("exception in filemeta_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/screenshots")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_screenshots(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await filemeta_data_callback(ws, operation)
            await conn.add_listener("newfilemeta", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA

            files = await app.db_objects.execute(
                db_model.filemeta_query.where(
                    (FileMeta.operation == operation)
                    & (FileMeta.is_screenshot == True)
                ).order_by(FileMeta.id)
            )
            for f in files:
                task = await app.db_objects.get(db_model.task_query, id=f.task)
                await ws.send(
                    js.dumps(
                        {
                            **task.callback.to_json(),
                            **f.to_json(),
                            "callback_id": task.callback.id,
                            "comment": task.comment,
                        }
                    )
                )
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning(
            "closed /ws/screenshots error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# notifications for updated screenshots
@mythic.websocket("/ws/updated_screenshots")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_updated_screenshots(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await filemeta_data_callback(ws, operation)
            await conn.add_listener("updatedfilemeta", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning(
            "closed /ws/screenshots error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def files_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            f = await app.db_objects.get(
                db_model.filemeta_query,
                id=msg_id,
                operation=operation,
                is_screenshot=False,
            )
            try:
                if not f.is_download_from_agent:
                    # this means it's an upload, so supply additional information as well
                    # could be upload via task or manual
                    if (
                            f.task is not None
                    ):  # this is an upload via gent tasking
                        task = await app.db_objects.get(
                            db_model.task_query, id=f.task
                        )
                        await ws.send(
                            js.dumps(
                                {
                                    **f.to_json(),
                                    "comment": f.task.comment,
                                    "host": task.callback.host,
                                    "upload": task.params,
                                }
                            )
                        )

                else:
                    # this is a file download, so it's straight forward
                    task = await app.db_objects.get(db_model.task_query, id=f.task)
                    await ws.send(
                        js.dumps(
                            {
                                **f.to_json(),
                                "comment": f.task.comment,
                                "host": task.callback.host,
                                "params": task.params,
                            }
                        )
                    )
            except Exception as e:
                pass  # we got a file that's just not part of our current operation, so move on

        except Exception as e:
            logger.warning("exception in files_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


# notifications for new files in the current operation
@mythic.websocket("/ws/files/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_files_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await files_data_callback(ws, operation)
            await conn.add_listener("newfilemeta", callback_func)
            await conn.add_listener("updatedfilemeta", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA

            files = await app.db_objects.execute(
                db_model.filemeta_query.where(
                    (FileMeta.operation == operation)
                    & (FileMeta.is_screenshot == False)
                    & (FileMeta.is_payload == False)
                ).order_by(FileMeta.id)
            )
            for f in files:
                if not f.is_download_from_agent:
                    # this means it's an upload, so supply additional information as well
                    if f.task is not None:
                        callback = await app.db_objects.get(
                            db_model.callback_query, id=f.task.callback
                        )
                        await ws.send(
                            js.dumps(
                                {
                                    **f.to_json(),
                                    "comment": f.task.comment,
                                    "host": callback.host,
                                    "upload": f.task.params,
                                }
                            )
                        )
                else:
                    # this is a file download, so it's straight forward
                    callback = await app.db_objects.get(
                        db_model.callback_query, id=f.task.callback
                    )
                    await ws.send(
                        js.dumps(
                            {
                                **f.to_json(),
                                "comment": f.task.comment,
                                "host": callback.host,
                                "params": f.task.params,
                            }
                        )
                    )
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/files/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


@mythic.websocket("/ws/files/new/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_new_files_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await files_data_callback(ws, operation)
            await conn.add_listener("newfilemeta", callback_func)
            await conn.add_listener("updatedfilemeta", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/files/new/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def manual_files_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            f = await app.db_objects.get(
                db_model.filemeta_query, id=msg_id, operation=operation, deleted=False, is_payload=False
            )
            if f.file.task is None:
                await ws.send(js.dumps({**f.to_json()}))
        except Exception as e:
            logger.warning("exception in manual_files_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


# notifications for new files in the current operation
@mythic.websocket("/ws/manual_files/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_manual_files_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await manual_files_data_callback(ws, operation)
            await conn.add_listener("newfilemeta", callback_func)
            await conn.add_listener("updatedfilemeta", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA

            files = await app.db_objects.execute(
                db_model.filemeta_query.where(
                    (FileMeta.operation == operation)
                    & (FileMeta.deleted == False)
                    & (FileMeta.is_payload == False)
                    & (FileMeta.task == None)
                ).order_by(FileMeta.id)
            )
            for f in files:
                if f.task is None:
                    await ws.send(js.dumps({**f.to_json()}))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/manual_files/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# ------------- CREDENTIAL ---------------------------
# notifications for new credentials
async def credential_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            c = await app.db_objects.get(
                db_model.credential_query, id=msg_id, deleted=False
            )
            if c.operation == operation:
                await ws.send(js.dumps({**c.to_json()}))
        except Exception as e:
            logger.warning("exception in credential_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/credentials/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_credentials_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await credential_data_callback(ws, operation)
            await conn.add_listener("newcredential", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA

            creds = await app.db_objects.execute(
                db_model.credential_query.where(
                    (Credential.operation == operation)
                    & (Credential.deleted == False)
                ).order_by(db_model.Credential.id)
            )
            for c in creds:
                await ws.send(js.dumps({**c.to_json()}))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/credentials/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


@mythic.websocket("/ws/credentials/new/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_credentials_new_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await credential_data_callback(ws, operation)
            await conn.add_listener("newcredential", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/credentials/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# ------------- KEYLOG ---------------------------
# notifications for new keylogs
async def keylog_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            c = await app.db_objects.get(
                db_model.keylog_query, id=msg_id, operation=operation
            )
            await ws.send(js.dumps({**c.to_json()}))
        except Exception as e:
            logger.warning("exception in keylog_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/keylogs/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_keylogs_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        cb = None
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await keylog_data_callback(ws, operation)
            await conn.add_listener("newkeylog", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/keylogs/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def parameter_hints_callback(ws, operation):
    async def parameter_callback(con, pid, channel, msg):
        try:
            if "credential" in channel:
                obj = await app.db_objects.get(
                    db_model.credential_query, id=msg, operation=operation
                )
                obj_json = obj.to_json()
            elif "onhost" in channel:
                payloadonhost = await app.db_objects.prefetch(
                    db_model.payloadonhost_query.where(
                        (db_model.PayloadOnHost.operation == operation) &
                        (db_model.PayloadOnHost.id == msg)
                    ), db_model.payload_query, db_model.filemeta_query
                )
                payloadonhost = list(payloadonhost)[0]
                if (
                        payloadonhost.payload.wrapped_payload
                        is not None
                ):
                    cur_payload = (
                        payloadonhost.payload.wrapped_payload
                    )
                else:
                    cur_payload = payloadonhost.payload
                c2profiles = await app.db_objects.execute(
                    db_model.payloadc2profiles_query.where(
                        db_model.PayloadC2Profiles.payload
                        == cur_payload
                    )
                )
                supported_profiles = []
                for c2p in c2profiles:
                    profile_info = {
                        "name": c2p.c2_profile.name,
                        "is_p2p": c2p.c2_profile.is_p2p,
                        "parameters": {},
                    }
                    c2profiledata = await app.db_objects.execute(
                        db_model.c2profileparametersinstance_query.where(
                            (
                                    db_model.C2ProfileParametersInstance.payload
                                    == cur_payload
                            )
                            & (
                                    db_model.C2ProfileParametersInstance.c2_profile
                                    == c2p.c2_profile
                            )
                        )
                    )
                    for c in c2profiledata:
                        profile_info["parameters"][
                            c.c2_profile_parameters.name
                        ] = c.value
                    supported_profiles.append(profile_info)
                obj_json = {
                    **payloadonhost.to_json(),
                    "supported_profiles": supported_profiles,
                }
            else:
                # this is just for new payloads
                payload = await app.db_objects.prefetch(
                    db_model.payload_query.where(
                        (Payload.operation == operation)
                        & (Payload.id == msg)
                        & (Payload.deleted == False)
                        & (Payload.build_phase == "success")
                    ), db_model.buildparameterinstance_query, db_model.filemeta_query, db_model.task_query
                )
                if len(payload) == 0:
                    return
                payload = list(payload)[0]
                if payload.wrapped_payload is not None:
                    cur_payload = payload.wrapped_payload
                else:
                    cur_payload = payload
                c2profiles = await app.db_objects.execute(
                    db_model.payloadc2profiles_query.where(
                        db_model.PayloadC2Profiles.payload
                        == cur_payload
                    )
                )
                build_parameters = []
                if payload.build_parameters is not None:
                    for bp in payload.build_parameters:
                        build_parameters.append(
                            {"name": bp.build_parameter.name, "value": bp.parameter})
                supported_profiles = []
                for c2p in c2profiles:
                    profile_info = {
                        "name": c2p.c2_profile.name,
                        "is_p2p": c2p.c2_profile.is_p2p,
                        "parameters": {},
                    }
                    c2profiledata = await app.db_objects.execute(
                        db_model.c2profileparametersinstance_query.where(
                            (
                                    db_model.C2ProfileParametersInstance.payload
                                    == cur_payload
                            )
                            & (
                                    db_model.C2ProfileParametersInstance.c2_profile
                                    == c2p.c2_profile
                            )
                        )
                    )
                    for c in c2profiledata:
                        profile_info["parameters"][
                            c.c2_profile_parameters.name
                        ] = c.value
                    supported_profiles.append(profile_info)
                obj_json = {
                    **payload.to_json(),
                    "supported_profiles": supported_profiles,
                    "build_parameters": build_parameters
                }
            obj_json["channel"] = channel
            await ws.send(js.dumps(obj_json))
        except Exception as e:
            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            pass  # we got a file that's not part of our operation
    return parameter_callback


# ------ OPERATING COMMAND POPUP INFORMATION --------------------
# ----- INCLUDES CREDENTIALS, PAYLOADS, PAYLOADSONHOST ------------
# notifications for new credentials
@mythic.websocket("/ws/parameter_hints/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_parameter_hints_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    cb = None
    def callback_func(*args):
        asyncio.create_task(cb(*args))
    try:

        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(2)
        async with app.websocket_pool.acquire() as conn:
            cb = await parameter_hints_callback(ws, operation)

            await conn.add_listener("newcredential", callback_func)
            await conn.add_listener("updatedcredential", callback_func)
            await conn.add_listener("newpayload", callback_func)
            await conn.add_listener("updatedpayload", callback_func)
            await conn.add_listener("newpayloadonhost", callback_func)
            await conn.add_listener("updatedpayloadonhost", callback_func)
            # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
            creds = await app.db_objects.execute(
                db_model.credential_query.where(
                    (Credential.operation == operation)
                    & (Credential.deleted == False)
                )
            )
            for c in creds:
                await ws.send(
                    js.dumps({**c.to_json(), "channel": "newcredential"})
                )
            payloads = await app.db_objects.prefetch(
                db_model.payload_query.where(
                    (Payload.operation == operation)
                    & (Payload.deleted == False)
                    & (Payload.build_phase == "success")
                ), db_model.buildparameterinstance_query, db_model.filemeta_query
            )
            for p in payloads:
                if p.wrapped_payload is not None:
                    cur_payload = p.wrapped_payload
                else:
                    cur_payload = p
                c2profiles = await app.db_objects.execute(
                    db_model.payloadc2profiles_query.where(
                        db_model.PayloadC2Profiles.payload == cur_payload
                    )
                )
                build_parameters = []
                if p.build_parameters is not None:
                    for bp in p.build_parameters:
                        build_parameters.append({"name": bp.build_parameter.name, "value": bp.parameter})
                supported_profiles = []
                for c2p in c2profiles:
                    profile_info = {
                        "name": c2p.c2_profile.name,
                        "is_p2p": c2p.c2_profile.is_p2p,
                        "parameters": {},
                    }
                    c2profiledata = await app.db_objects.execute(
                        db_model.c2profileparametersinstance_query.where(
                            (
                                db_model.C2ProfileParametersInstance.payload
                                == cur_payload
                            )
                            & (
                                db_model.C2ProfileParametersInstance.c2_profile
                                == c2p.c2_profile
                            )
                        )
                    )
                    for c in c2profiledata:
                        profile_info["parameters"][
                            c.c2_profile_parameters.name
                        ] = c.value
                    supported_profiles.append(profile_info)
                await ws.send(
                    js.dumps(
                        {
                            **p.to_json(),
                            "supported_profiles": supported_profiles,
                            "channel": "newpayload",
                            "build_parameters": build_parameters
                        }
                    )
                )
            payloadonhost = await app.db_objects.prefetch(
                db_model.payloadonhost_query.where(
                    (db_model.PayloadOnHost.operation == operation)
                    & (db_model.PayloadOnHost.deleted == False)
                ), db_model.payload_query, db_model.filemeta_query
            )
            for p in payloadonhost:
                if p.payload.wrapped_payload is not None:
                    cur_payload = p.payload.wrapped_payload
                else:
                    cur_payload = p.payload
                c2profiles = await app.db_objects.execute(
                    db_model.payloadc2profiles_query.where(
                        db_model.PayloadC2Profiles.payload == cur_payload
                    )
                )
                supported_profiles = []
                for c2p in c2profiles:
                    profile_info = {
                        "name": c2p.c2_profile.name,
                        "is_p2p": c2p.c2_profile.is_p2p,
                        "parameters": {},
                    }
                    c2profiledata = await app.db_objects.execute(
                        db_model.c2profileparametersinstance_query.where(
                            (
                                db_model.C2ProfileParametersInstance.payload
                                == cur_payload
                            )
                            & (
                                db_model.C2ProfileParametersInstance.c2_profile
                                == c2p.c2_profile
                            )
                        )
                    )
                    for c in c2profiledata:
                        profile_info["parameters"][
                            c.c2_profile_parameters.name
                        ] = c.value
                    supported_profiles.append(profile_info)
                await ws.send(
                    js.dumps(
                        {
                            **p.to_json(),
                            "supported_profiles": supported_profiles,
                            "channel": "newpayloadonhost",
                        }
                    )
                )
            await ws.send("")
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as t:
        logger.warning("websocket_routes.py " + str(sys.exc_info()[-1].tb_lineno) + " param_hints error: " + str(t))


# ============= BROWSER SCRIPTING WEBSOCKETS ===============
async def browser_scripting_data_callback(ws, operation, operator):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            if "operation" in channel:
                if operation is not None:
                    if "deleted" in channel:
                        await ws.send(
                            js.dumps(
                                {
                                    "type": "deletedbrowserscriptoperation",
                                    "info": id,
                                }
                            )
                        )
                    else:
                        s = await app.db_objects.get(
                            db_model.browserscriptoperation_query,
                            id=msg_id,
                            operation=operation,
                        )
                        if s.browserscript.for_new_ui:
                            return
                        await ws.send(
                            js.dumps(
                                {
                                    "type": "browserscriptoperation",
                                    **s.to_json(),
                                }
                            )
                        )
            else:
                s = await app.db_objects.get(
                    db_model.browserscript_query, id=msg_id, operator=operator, for_new_ui=False
                )
                await ws.send(
                    js.dumps({"type": "browserscript", **s.to_json()})
                )
        except Exception as e:
            logger.warning("exception in browser_scripting_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/browser_scripts")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_browserscripts(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        operator = await app.db_objects.get(
            db_model.operator_query, username=user["username"]
        )
        operation = await app.db_objects.get(
            db_model.operation_query, name=user["current_operation"]
        )
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            # before we start getting new things, update with all of the old data
            try:
                all_scripts = await app.db_objects.execute(
                    db_model.browserscript_query.where(
                        (db_model.BrowserScript.operator == operator)
                        & (db_model.BrowserScript.for_new_ui == False)
                    )
                )
                for s in all_scripts:
                    await ws.send(
                        js.dumps({"type": "browserscript", **s.to_json()})
                    )
                try:

                    all_scripts = await app.db_objects.execute(
                        db_model.browserscriptoperation_query.where(
                            db_model.BrowserScriptOperation.operation
                            == operation
                        )
                    )
                    for s in all_scripts:
                        if s.browserscript.for_new_ui:
                            continue
                        await ws.send(
                            js.dumps(
                                {
                                    "type": "browserscriptoperation",
                                    **s.to_json(),
                                }
                            )
                        )
                except Exception as e:
                    operation = None
                    pass  # user might not have an operation assigned, so still
            except Exception as e:
                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) + str(e))
                return
            await ws.send("")
            cb = await browser_scripting_data_callback(ws, operation, operator)
            await conn.add_listener("newbrowserscript", callback_func)
            await conn.add_listener("updatedbrowserscript", callback_func)
            await conn.add_listener("newbrowserscriptoperation", callback_func)
            await conn.add_listener("updatedbrowserscriptoperation", callback_func)
            await conn.add_listener("deletedbrowserscriptoperation", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/browser_scripts error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# ============= ARTIFACT WEBSOCKETS ===============
async def artifact_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            if channel == "newartifact":
                artifact = await app.db_objects.get(db_model.artifact_query, id=msg_id)
                await ws.send(
                    js.dumps(
                        {
                            **artifact.to_json(),
                            "channel": "artifact",
                        }
                    )
                )
            elif channel == "newtaskartifact":
                artifact = await app.db_objects.get(db_model.taskartifact_query, id=msg_id)
                if artifact.operation == operation or (
                        artifact.task is not None
                        and artifact.task.callback.operation
                        == operation
                ):
                    await ws.send(
                        js.dumps(
                            {
                                **artifact.to_json(),
                                "channel": "taskartifact",
                            }
                        )
                    )
        except Exception as e:
            logger.warning("exception in artifact_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/artifacts")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_artifacts(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        cb = None
        if user["current_operation"] != "":
            # before we start getting new things, update with all of the old data

            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await artifact_data_callback(ws, operation)
            await conn.add_listener("newartifact", callback_func)
            await conn.add_listener("newtaskartifact", callback_func)
            base_artifacts = await app.db_objects.execute(db_model.artifact_query)
            for b in base_artifacts:
                await ws.send(
                    js.dumps({**b.to_json(), "channel": "artifact"})
                )
            callbacks = db_model.callback_query.where(Callback.operation == operation).select(
                Callback.id
            )
            artifact_tasks = await app.db_objects.execute(
                db_model.taskartifact_query.where(Task.callback.in_(callbacks))
            )
            manual_tasks = await app.db_objects.execute(
                db_model.taskartifact_query.where(TaskArtifact.operation == operation)
            )
            for a in artifact_tasks:
                await ws.send(
                    js.dumps({**a.to_json(), "channel": "taskartifact"})
                )
            for m in manual_tasks:
                await ws.send(
                    js.dumps({**m.to_json(), "channel": "taskartifact"})
                )
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/tasks/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# ============= PROCESS LIST WEBSOCKETS ===============
async def process_list_data_callback(ws, operation, callback):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            proc = await app.db_objects.get(
                db_model.process_query,
                id=msg_id,
                operation=operation,
                host=callback.host,
            )
            processes = await app.db_objects.execute(
                db_model.process_query.where(db_model.Process.timestamp == proc.timestamp)
            )
            plist = proc.to_json()
            plist["process_list"] = [p.to_json() for p in processes]
            try:
                tree = await get_process_tree(plist["process_list"])
            except Exception as e:
                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) + str(e))
                tree = {}
            await ws.send(
                js.dumps({"process_list": plist, "tree_list": tree})
            )
        except Exception as e:
            logger.warning("exception in process_list_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/process_list/<cid:int>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_process_list(request, ws, user, cid):
    if not await valid_origin_header(request):
        return
    try:
        operation = await app.db_objects.get(
            db_model.operation_query, name=user["current_operation"]
        )
        callback = await app.db_objects.get(
            db_model.callback_query, operation=operation, id=cid
        )
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await process_list_data_callback(ws, operation, callback)
            await conn.add_listener("newprocess", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/process_list/<cid> error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# -------------- EVENT LOGS ----------------------
async def events_current_operation_callback(ws, operation):
    async def event_callback(conn, pid, channel, msg):
        t = await app.db_objects.get(db_model.operationeventlog_query, id=msg)
        if t.operation == operation:
            op_msg = t.to_json()
            if op_msg["operator"] is None:
                op_msg["operator"] = "Mythic"
            op_msg["channel"] = channel
            asyncio.ensure_future(ws.send(js.dumps(op_msg)))
    return event_callback


@mythic.websocket("/ws/events/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_events_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    def callback_func(*args):
        asyncio.create_task(cb(*args))
    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(2)
        async with app.websocket_pool.acquire() as conn:
            cb = await events_current_operation_callback(ws, operation)
            await conn.add_listener("newoperationeventlog", callback_func)
            await conn.add_listener("updatedoperationeventlog", callback_func)

            initial_events = await app.db_objects.execute(
                db_model.operationeventlog_query.where(
                    (db_model.OperationEventLog.operation == operation)
                    & (db_model.OperationEventLog.deleted == False)
                ).order_by(-db_model.OperationEventLog.id).limit(100)
            )
            events = []
            for i in initial_events:
                op_msg = i.to_json()
                if op_msg["operator"] is None:
                    op_msg["operator"] = "Mythic"
                events.append(op_msg)
            await ws.send(js.dumps(events))
            await ws.send("")
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# the main operator callback page doesn't need all historic events, just new ones
@mythic.websocket("/ws/events_notifier/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_events_notifier_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    cb = None

    def callback_func(*args):
        asyncio.create_task(cb(*args))
    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(2)
        async with app.websocket_pool.acquire() as conn:
            cb = await events_current_operation_callback(ws, operation)
            await conn.add_listener("newoperationeventlog",
                                    callback_func)
            await conn.add_listener("updatedoperationeventlog",
                                    callback_func)

            from app.api.event_message_api import get_old_event_alerts

            alert_counts = await get_old_event_alerts(user)
            if alert_counts["status"] == "success":
                alert_counts.pop("status", None)
                alert_counts["channel"] = "historic"
                await ws.send(js.dumps(alert_counts))
            else:
                print(alert_counts["error"])
                return
            await ws.send("")
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# -------------- CALLBACK GRAPH EDGE CONNECTIONS ----------------------
async def callbackgraphedge_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            i = await app.db_objects.get(
                db_model.callbackgraphedge_query, id=msg_id, operation=operation
            )
            if i.source.id == i.destination.id:
                await ws.send(
                    js.dumps(
                        {
                            "id": i.id,
                            "start_timestamp": i.start_timestamp.strftime("%m/%d/%Y %H:%M:%S"),
                            "end_timestamp": i.end_timestamp.strftime(
                                "%m/%d/%Y %H:%M:%S") if i.end_timestamp is not None else None,
                            "direction": i.direction,
                            "metadata": i.metadata,
                            "c2_profile": i.c2_profile.name,
                            "source": js.dumps(await get_edge_info(i.source)),
                            "destination": js.dumps(
                                {"id": "c" + str(i.c2_profile.id)}
                            ),
                        }
                    )
                )
            else:
                await ws.send(js.dumps({
                    "id": i.id,
                    "source": js.dumps(await get_edge_info(i.source)),
                    "destination": js.dumps(await get_edge_info(i.destination)),
                    "start_timestamp": i.start_timestamp.strftime("%m/%d/%Y %H:%M:%S"),
                    "end_timestamp": i.end_timestamp.strftime(
                        "%m/%d/%Y %H:%M:%S") if i.end_timestamp is not None else None,
                    "direction": i.direction,
                    "metadata": i.metadata,
                    "c2_profile": i.c2_profile.name,
                })
                )
        except Exception as e:
            logger.warning("exception in callbackgraphedge_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/graph_edges/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_graph_edges_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await callbackgraphedge_data_callback(ws, operation)
            await conn.add_listener("newcallbackgraphedge", callback_func)
            await conn.add_listener("updatedcallbackgraphedge", callback_func)
            profiles = await app.db_objects.execute(
                db_model.c2profile_query.where(db_model.C2Profile.is_p2p == False)
            )
            for p in profiles:
                await ws.send(
                    js.dumps(
                        {
                            "id": (-1 * p.id),
                            "destination": js.dumps({"id": 0}),
                            "source": js.dumps(
                                {
                                    "id": "c" + str(p.id),
                                    "payload_type": "mythic",
                                    "user": p.name,
                                    "integrity_level": 0,
                                    "host": p.name,
                                    "description": p.description,
                                }
                            ),
                            "direction": 1,
                            "metadata": "",
                            "name": p.name,
                            "end_timestamp": None,
                        }
                    )
                )
            initial_edges = await app.db_objects.execute(
                db_model.callbackgraphedge_query.where(
                    (db_model.CallbackGraphEdge.operation == operation)
                    & (db_model.CallbackGraphEdge.end_timestamp == None)
                ).order_by(db_model.CallbackGraphEdge.id))
            for i in initial_edges:
                if i.source.id == i.destination.id:
                    await ws.send(
                        js.dumps(
                            {
                                "id": i.id,
                                "source": js.dumps(await get_edge_info(i.source)),
                                "start_timestamp": i.start_timestamp.strftime("%m/%d/%Y %H:%M:%S"),
                                "end_timestamp": i.end_timestamp.strftime("%m/%d/%Y %H:%M:%S") if i.end_timestamp is not None else None,
                                "direction": i.direction,
                                "metadata": i.metadata,
                                "c2_profile": i.c2_profile.name,
                                "destination": js.dumps(
                                    {"id": "c" + str(i.c2_profile.id)}
                                ),
                            }
                        )
                    )
                else:
                    await ws.send(js.dumps({
                    "id": i.id,
                    "source": js.dumps(await get_edge_info(i.source)),
                    "destination": js.dumps(await get_edge_info(i.destination)),
                    "start_timestamp": i.start_timestamp.strftime("%m/%d/%Y %H:%M:%S"),
                    "end_timestamp": i.end_timestamp.strftime("%m/%d/%Y %H:%M:%S") if i.end_timestamp is not None else None,
                    "direction": i.direction,
                    "metadata": i.metadata,
                    "c2_profile": i.c2_profile.name,
                    })
                    )
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/graph_edges/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def get_edge_info(callback: Callback):
    return {
        "user": callback.user,
        "host": callback.host,
        "pid": callback.pid,
        "id": callback.id,
        "ip": callback.ip,
        "description": callback.description,
        "integrity_level": callback.integrity_level,
        "os": callback.os
    }


# -------------- FILE BROWSER INFORMATION ----------------------
async def filebrowser_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            if "filemeta" in channel:
                i = await app.db_objects.get(
                    db_model.filemeta_query, id=msg_id, operation=operation
                )
                if i.file_browser is not None:
                    j = await app.db_objects.prefetch(
                        db_model.filebrowserobj_query.where(
                            (db_model.FileBrowserObj.id == i.file_browser) &
                            (db_model.FileBrowserObj.operation == operation)),
                        db_model.filemeta_query.where(db_model.FileMeta.file_browser == i.file_browser)
                    )
                    ij = i.to_json()
                    ij["files"] = []
                    for f in j[0].files:
                        fjson = f.to_json()
                        if (
                                f.task is not None
                                and f.task.comment != ""
                        ):
                            fjson["comment"] = f.task.comment
                        ij["files"].append(fjson)
                else:
                    ij = i.to_json()
                    ij["files"] = []
            else:
                i = await app.db_objects.prefetch(
                    db_model.filebrowserobj_query.where(
                        (db_model.FileBrowserObj.id == msg_id) &
                        (db_model.FileBrowserObj.operation == operation)),
                    db_model.filemeta_query
                )
                ij = i[0].to_json()
                ij["files"] = []
                for f in i[0].files:
                    fjson = f.to_json()
                    if f.task is not None and f.task.comment != "":
                        fjson["comment"] = f.task.comment
                    ij["files"].append(fjson)
            await ws.send(js.dumps(ij))
        except Exception as e:
            logger.warning("exception in filebrowser_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/file_browser/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_file_browser_objects(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await filebrowser_data_callback(ws, operation)
            await conn.add_listener("newfilebrowserobj", callback_func)
            await conn.add_listener("updatedfilebrowserobj", callback_func)
            await conn.add_listener("newfilemeta", callback_func)
            await conn.add_listener("updatedfilemeta", callback_func)
            from app.api.file_browser_api import (
                get_filebrowser_tree_for_operation,
            )

            burst = await get_filebrowser_tree_for_operation(
                user["current_operation"]
            )
            await ws.send(js.dumps(burst["output"]))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/file_browser/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# -------------- Token INFORMATION ----------------------
async def token_data_callback(ws, operation):
    async def callback_func(connection, pid, channel, msg_id):
        try:
            token = await app.db_objects.get(db_model.token_query, id=msg_id)
            if token.callback.operation == operation:
                await ws.send(js.dumps(token.to_json()))
        except Exception as e:
            logger.warning("exception in token_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/tokens/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_token_objects(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        if user["current_operation"] != "":
            operation = await app.db_objects.get(
                db_model.operation_query, name=user["current_operation"]
            )
        else:
            await ws.send("no_operation")
            while True:
                await ws.send("")
                await asyncio.sleep(0.5)
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            cb = await token_data_callback(ws, operation)
            await conn.add_listener("newtoken", callback_func)
            await conn.add_listener("updatedtoken", callback_func)
            tokens = await app.db_objects.execute(db_model.token_query.where(
                db_model.Token.callback != None
            ))
            for t in tokens:
                if t.callback.operation == operation:
                    await ws.send(js.dumps(t.to_json()))
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/tokens/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


# -------------- Callback Tasking  ----------------------
async def got_task_data_for_agent_message_data_callback(ws, callback, num_tasks, request, enc_key):
    from app.api.callback_api import get_agent_tasks, get_routable_messages, create_final_message_from_data_and_profile_info
    async def callback_func(connection, pid, channel, msg_id):
        try:
            task = await app.db_objects.get(db_model.task_query, id=msg_id)
            if task.callback.operation == callback.operation and task.status == "submitted":
                # this is a candidate to see if we need to send this down the websocket
                print("got new task, checking to see if targeted for our websocket or linked agents")
                response_data = await get_agent_tasks({"action": "get_tasking", "tasking_size": num_tasks},
                                                      callback)
                delegates = await get_routable_messages(callback, request)
                if delegates is not None:
                    response_data["delegates"] = delegates
                if len(response_data["tasks"]) > 0 or delegates is not None:
                    print("got message or delegate message for us, create final message")
                    final_msg = await create_final_message_from_data_and_profile_info(response_data,
                                                                                      enc_key,
                                                                                      callback.agent_callback_id,
                                                                                      request)
                    if final_msg is None:
                        return
                    print("sending final message to websocket")
                    await ws.send(final_msg)
        except Exception as e:
            logger.warning("exception in got_task_data_for_agent_message_data_callback: " + str(sys.exc_info()[-1].tb_lineno) +str(e))
            return
    return callback_func


@mythic.websocket("/ws/agent_message/<num_tasks:int>")
async def ws_agent_messages(request, ws, num_tasks):
    from app.api.callback_api import parse_agent_message, get_agent_tasks, get_routable_messages, create_final_message_from_data_and_profile_info, get_encryption_data
    from app.api.operation_api import send_all_operations_message
    if "Mythic" in request.headers:
        profile = request.headers["Mythic"]
    else:
        asyncio.create_task(send_all_operations_message(
            message=f"Failed to find Mythic header in: {request.socket} as {request.method} method, URL {request.url} and with headers: \n{request.headers}",
            level="warning", source="websocket_c2_connection"))
        return
    callback = None
    try:
        cb = None

        def callback_func(*args):
            asyncio.create_task(cb(*args))

        async with app.websocket_pool.acquire() as conn:
            checkinMsg = await ws.recv()
            message, code, new_callback, msg_uuid = await parse_agent_message(checkinMsg, request, profile)
            await ws.send(message)
            print("sent checkin response message")
            print(msg_uuid)
            print(new_callback)
            if code == 404:
                logger.error("websocket route message got 404 trying to process checkin")
                return
            if new_callback != "":
                callback = await app.db_objects.get(db_model.callback_query, agent_callback_id=new_callback)
            else:
                callback = await app.db_objects.get(db_model.callback_query, agent_callback_id=msg_uuid)
            try:
                enc_key = await get_encryption_data(callback.agent_callback_id, profile)
            except Exception as e:
                asyncio.create_task(send_all_operations_message(
                    message=f"Failed to correlate UUID to something mythic knows: {new_callback}\nfrom websocket method with headers: \n{request.headers}",
                    level="warning", source="parse_agent_message_uuid"))
                print("failed to get encryption data")
                return
            # now that we have a checkin message, iterate to see if there are any tasks
            #   for that callback or any of its routable agents
            print("trying to get any backlogged tasks")
            response_data = await get_agent_tasks({"action": "get_tasking", "tasking_size": num_tasks}, callback)
            print("got agent tasks if any")
            delegates = await get_routable_messages(callback, request)
            print("got routable messages, if any")
            if delegates is not None:
                response_data["delegates"] = delegates
            print(response_data)
            if (len(response_data["tasks"]) > 0) or (delegates is not None):
                print("creating final message")
                final_msg = await create_final_message_from_data_and_profile_info(response_data, enc_key, callback.agent_callback_id,
                                                                              request)
                if final_msg is None:
                    logger.error("websocket route message got no final message from create_final_message")
                    return
                print("sending final message")
                await ws.send(final_msg)
                print("about to create task query")
                print("creating getMessagesFromWebsocket task")
                asyncio.create_task(getMessagesFromWebsocket(ws, request, profile, callback, enc_key))
                print("now about to enter while loop")
            cb = await got_task_data_for_agent_message_data_callback(ws, callback, num_tasks, request, enc_key)
            await conn.add_listener("updatedtask", callback_func)
            while True:
                await ws.send("")
                await asyncio.sleep(1)
    except Exception as d:
        logger.warning("closed /ws/tasks/current_operation error - " + str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d))


async def getSocksMessagesForWebsocket(ws, request, enc_key, callback):
    from app.api.callback_api import cached_socks, create_final_message_from_data_and_profile_info
    while True:
        if callback.id in cached_socks and "queue" in cached_socks[callback.id]:
            try:
                data = [ cached_socks[callback.id]["queue"].pop() ]
                while cached_socks[callback.id]["queue"]:
                    data.append( cached_socks[callback.id]["queue"].pop() )
                msg = {"action": "get_tasking", "tasks": [], "socks": data}
                final_msg = await create_final_message_from_data_and_profile_info(msg,
                                                                                  enc_key, callback.id,
                                                                                  request)
                if final_msg is None:
                    logger.error("final_msg is none in getSocksMessagesForWebsocket")
                    return
                await ws.send(final_msg)
            except Exception as e:
                logger.error("getSocksMessagesForWebsocket route: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                return
        else:
            await asyncio.sleep(2)


async def getMessagesFromWebsocket(ws, request, profile, callback, enc_key):
    from app.api.callback_api import parse_agent_message
    print("creating task for getSocksMessages")
    task = asyncio.create_task(getSocksMessagesForWebsocket(ws, request, enc_key, callback))
    while True:
        try:
            # blocking receive call
            print("in getMessagesFromWebsocket, blocking on receive")
            data = await ws.recv()
            print("got message in getMessagesFromWebsocket")
            print(data)
            message, code, new_callback, msg_uuid = await parse_agent_message(data, request, profile)
            await ws.send(message)
            if code == 404:
                logger.error("websocket route message getMessagesFromWebsocket got 404")
                return
        except Exception as e:
            logger.error("websocket route getMessagesFromWebsocket: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            task.cancel()
            return


# CHECK ORIGIN HEADERS FOR WEBSOCKETS
async def valid_origin_header(request):
    if "origin" in request.headers:
        return True
    elif "apitoken" in request.headers:
        return True
    else:
        return False
