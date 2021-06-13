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
# notifications for new tasks
@mythic.websocket("/ws/tasks")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_tasks(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        if not user["admin"]:
            await ws.send(js.dumps({"status": "error", "error": "must be an admin"}))
            return
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    # before we start getting new things, update with all of the old data
                    tasks_with_all_info = await app.db_objects.execute(
                        db_model.task_query.order_by(db_model.Task.id)
                    )
                    # callbacks_with_operators = await app.db_objects.prefetch(callbacks, operators)
                    for task in tasks_with_all_info:
                        await ws.send(js.dumps(task.to_json()))
                    await ws.send("")
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            tsk = await app.db_objects.get(db_model.task_query, id=id)
                            await ws.send(js.dumps(tsk.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


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
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    # before we start getting new things, update with all of the old data
                    tasks_with_all_info = await app.db_objects.execute(
                        db_model.task_query.where(db_model.Callback.operation == op).order_by(
                            db_model.Task.id
                        )
                    )
                    # callbacks_with_operators = await app.db_objects.prefetch(callbacks, operators)
                    for task in tasks_with_all_info:
                        taskj = task.to_json()
                        taskj["callback"] = task.callback.to_json()
                        await ws.send(js.dumps(taskj))
                    await ws.send("")
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            tsk = await app.db_objects.get(db_model.task_query, id=id)
                            if tsk.callback.operation == op:
                                taskj = tsk.to_json()
                                taskj["callback"] = tsk.callback.to_json()
                                await ws.send(js.dumps(taskj))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


@mythic.websocket("/ws/tasks/new/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_tasks(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            tsk = await app.db_objects.get(db_model.task_query, id=id)
                            if tsk.callback.operation == op:
                                taskj = tsk.to_json()
                                taskj["callback"] = tsk.callback.to_json()
                                await ws.send(js.dumps(taskj))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


@mythic.websocket("/ws/task/<tid:int>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_updates_for_task(request, ws, user, tid):
    if not await valid_origin_header(request):
        return
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])

        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedtask";')
                    # before we start getting new things, update with all of the old data
                    task = await app.db_objects.get(db_model.task_query, id=tid)
                    if task.callback.operation == operation:
                        await ws.send(js.dumps(task.to_json()))
                    else:
                        return
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            tsk = await app.db_objects.get(db_model.task_query, id=id)
                            if tsk.id == task.id:
                                await ws.send(js.dumps(tsk.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


@mythic.websocket("/ws/task_feed/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_tasks_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
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
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload

                                t = await app.db_objects.get(db_model.task_query, id=id)
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
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        # print("closed /ws/tasks")
        pool.close()


# --------------- RESPONSES ---------------------------
# notifications for task updates
@mythic.websocket("/ws/responses")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_responses(request, ws, user):
    if not await valid_origin_header(request):
        return
    if not user["admin"]:
        await ws.send(js.dumps({"status": "error", "error": "must be an admin"}))
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    responses_with_tasks = await app.db_objects.execute(
                        db_model.response_query.order_by(db_model.Response.id)
                    )
                    for resp in responses_with_tasks:
                        await ws.send(js.dumps(resp.to_json()))
                    await ws.send("")
                    # now pull off any new responses we got queued up while processing old responses
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            rsp = await app.db_objects.get(db_model.response_query, id=id)
                            await ws.send(js.dumps(rsp.to_json()))
                            # print(msg.payload)
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/task_updates")
        pool.close()


@mythic.websocket("/ws/responses/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_responses(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    responses_with_tasks = await app.db_objects.execute(
                        db_model.response_query.where(db_model.Callback.operation == op).order_by(
                            db_model.Response.id
                        )
                    )
                    for resp in responses_with_tasks:
                        await ws.send(js.dumps(resp.to_json()))
                    await ws.send("")
                    # now pull off any new responses we got queued up while processing old responses
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            rsp = await app.db_objects.get(db_model.response_query, id=id)
                            if rsp.task.callback.operation == op:
                                await ws.send(js.dumps(rsp.to_json()))
                            # print(msg.payload)
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/task_updates")
        pool.close()


@mythic.websocket("/ws/responses/new/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_responses(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        op = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            rsp = await app.db_objects.get(db_model.response_query, id=id)
                            if rsp.task.callback.operation == op:
                                await ws.send(js.dumps(rsp.to_json()))
                            # print(msg.payload)
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/task_updates")
        pool.close()


@mythic.websocket("/ws/responses/by_task/<tid:int>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_responses(request, ws, user, tid):
    if not await valid_origin_header(request):
        return
    if not user["admin"]:
        await ws.send(js.dumps({"status": "error", "error": "must be an admin"}))
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
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
                    responses_with_tasks = await app.db_objects.execute(
                        db_model.response_query.where(db_model.Response.task == task).order_by(
                            db_model.Response.id
                        )
                    )
                    for resp in responses_with_tasks:
                        await ws.send(js.dumps(resp.to_json()))
                    if task.completed:
                        return
                    await ws.send("")
                    # now pull off any new responses we got queued up while processing old responses
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            rsp = await app.db_objects.get(db_model.response_query, id=id)
                            if rsp.task == task:
                                await ws.send(js.dumps(rsp.to_json()))
                                if rsp.task.completed:
                                    return
                            # print(msg.payload)
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/task_updates")
        pool.close()


# --------------------- CALLBACKS ------------------
@mythic.websocket("/ws/callbacks/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_callbacks_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcallback";')
                    if user["current_operation"] != "":
                        # before we start getting new things, update with all of the old data
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
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
                        await ws.send("")
                        # now pull off any new callbacks we got queued up while processing the old data
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                cb = await app.db_objects.prefetch(
                                    db_model.callback_query.where( (db_model.Callback.id == id) & (db_model.Callback.operation == operation) ),
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
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(
                                    "exception in callbacks/current_operation: {}".format(
                                        str(e)
                                    )
                                )
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


@mythic.websocket("/ws/new_callbacks/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_callbacks_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcallback";')
                    if user["current_operation"] != "":
                        # before we start getting new things, update with all of the old data
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        # now pull off any new callbacks we got queued up while processing the old data
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                cb = await app.db_objects.get(
                                    db_model.callback_query, id=id, operation=operation
                                )
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
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(
                                    "exception in callbacks/current_operation: {}".format(
                                        str(e)
                                    )
                                )
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


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
    conn = None
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
        conn = await app.websocket_pool.acquire()
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
            (db_model.Command.script_only == True)
        ))
        for c in scripts_loaded:
            await ws.send(js.dumps({
                "id": 0,
                "command": c.cmd,
                "version": c.version,
                "callback": cid,
                "operator": "",
                "attributes": c.attributes,
                "channel": "newloadedcommand"}))
        await ws.send("")
        while True:
            await ws.send("")
            await asyncio.sleep(1)
    except Exception as e:
        logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
    finally:
        if conn is not None:
            await conn.remove_listener("updatedcallback", callback_func)
            await conn.remove_listener("newtask", callback_func)
            await conn.remove_listener("updatedtask", callback_func)
            await conn.remove_listener("newfilemeta", callback_func)
            await conn.remove_listener("updatedfilemeta", callback_func)
            await conn.remove_listener("newloadedcommands", callback_func)
            await conn.remove_listener("updatedloadedcommands", callback_func)
            await conn.remove_listener("deletedloadedcommands", callback_func)
            await conn.remove_listener("newresponse", callback_func)


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
    conn = None
    cb = None
    def callback_func(*args):
        asyncio.create_task(cb(*args))
    try:
        operation = await app.db_objects.get(
            db_model.operation_query, name=user["current_operation"]
        )
        conn = await app.websocket_pool.acquire()
        cb = await updatedcallback_callback(ws, operation)
        await conn.add_listener("updatedcallback", callback_func)
        while True:
            await ws.send("")
            await asyncio.sleep(1)
    except Exception as t:
        logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(t))
    finally:
        if conn is not None:
            await conn.remove_listener("updatedcallback", callback_func)

# --------------- PAYLOADS -----------------------
# notifications for new payloads
@mythic.websocket("/ws/payloads/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payloads_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayload";')
                    await cur.execute('LISTEN "updatedpayload";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
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
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                p = await app.db_objects.get(db_model.payload_query, id=id)
                                if p.operation == operation:
                                    await ws.send(js.dumps(p.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning(
                                    "websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) + str(e))
                                print("Most likely payload was deleted")
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


@mythic.websocket("/ws/payloads/info/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payloads_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayload";')
                    await cur.execute('LISTEN "updatedpayload";')
                    from app.api.payloads_api import get_payload_config

                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        payloads = await app.db_objects.execute(
                            db_model.payload_query.where((Payload.operation == operation)).order_by(
                                Payload.id
                            )
                        )
                        for p in payloads:
                            pinfo = await get_payload_config(p)
                            pinfo.pop("status", None)
                            await ws.send(js.dumps(pinfo))
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                p = await app.db_objects.get(db_model.payload_query, id=id)
                                if p.operation == operation:
                                    pinfo = await get_payload_config(p)
                                    pinfo.pop("status", None)
                                    await ws.send(js.dumps(pinfo))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                print("Most likely payload was deleted")
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


@mythic.websocket("/ws/payloads/<puuid:uuid>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_updates_for_payload(request, ws, user, puuid):
    if not await valid_origin_header(request):
        return
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])

        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedpayload";')
                    # before we start getting new things, update with all of the old data
                    payload = await app.db_objects.get(db_model.payload_query, uuid=puuid)
                    if payload.operation == operation:
                        await ws.send(js.dumps(payload.to_json()))
                    else:
                        return
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            tsk = await app.db_objects.get(db_model.payload_query, id=id)
                            if tsk.id == payload.id:
                                await ws.send(js.dumps(tsk.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


# --------------- C2PROFILES -----------------------
# notifications for new c2profiles
@mythic.websocket("/ws/c2profiles")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_c2profile_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newc2profile";')
                    await cur.execute('LISTEN "updatedc2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    profiles = await app.db_objects.execute(
                        db_model.c2profile_query.where(C2Profile.deleted == False)
                    )
                    for p in profiles:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            p = await app.db_objects.get(db_model.c2profile_query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(1)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


@mythic.websocket("/ws/payloadtypec2profile")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payloadtypec2profile(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayloadtypec2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    profiles = await app.db_objects.execute(db_model.payloadtypec2profile_query)
                    for p in profiles:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            p = await app.db_objects.get(db_model.payloadtypec2profile_query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# ---------------- OPERATORS --------------------------
# notifications for new operators
@mythic.websocket("/ws/operators")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_operators(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newoperator";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    operators = await app.db_objects.execute(
                        db_model.operator_query.where(db_model.Operator.deleted == False)
                    )
                    for o in operators:
                        await ws.send(js.dumps(o.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            p = await app.db_objects.get(db_model.operator_query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# notifications for updated operators
@mythic.websocket("/ws/updatedoperators")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_updated_operators(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedoperator";')
                    # just want updates, not anything else
                    while True:
                        # msg = await conn.notifies.get()
                        try:
                            msg = conn.notifies.get_nowait()
                            # print("got an update for a callback")
                            id = msg.payload
                            cb = await app.db_objects.get(db_model.operator_query, id=id, deleted=False)
                            await ws.send(js.dumps(cb.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# ---------------- PAYLOADTYPES --------------------------
# notifications for new payloadtypes
@mythic.websocket("/ws/payloadtypes")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payloadtypes(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayloadtype";')
                    await cur.execute('LISTEN "updatedpayloadtype";')
                    await cur.execute('LISTEN "newwrappedpayloadtypes";')
                    await cur.execute('LISTEN "updatedwrappedpayloadtypes";')
                    await cur.execute('LISTEN "deletedwrappedpayloadtypes";')
                    await cur.execute('LISTEN "updatedtranslationcontainer";')
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
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            if "deleted" in msg.channel:
                                await ws.send("")
                            else:
                                if "translation" in msg.channel:
                                    p = await app.db_objects.prefetch(db_model.payloadtype_query.where(
                                    (PayloadType.translation_container != None) & (PayloadType.deleted == False)
                                ), db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False))
                                else:
                                    p = await app.db_objects.prefetch(db_model.payloadtype_query.where(
                                        (PayloadType.id == id) & (PayloadType.deleted == False)
                                    ), db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False))
                                for element in p:
                                    await ws.send(js.dumps(element.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# ---------------- COMMANDS --------------------------
# notifications for new commands
@mythic.websocket("/ws/all_command_info")
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_commands(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcommandparameters";')
                    await cur.execute('LISTEN "updatedcommandparameters";')
                    await cur.execute('LISTEN "deletedcommandparameters";')
                    await cur.execute('LISTEN "newcommand";')
                    await cur.execute('LISTEN "updatedcommand";')
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            msg_dict = {}
                            if (
                                "parameters" in msg.channel
                                and "deleted" not in msg.channel
                            ):
                                p = await app.db_objects.get(db_model.commandparameters_query, id=id)
                            elif "deleted" not in msg.channel:
                                p = await app.db_objects.get(db_model.command_query, id=id)
                            elif "deleted" in msg.channel:
                                # print(msg)
                                p = await app.db_objects.get(
                                    db_model.command_query, id=js.loads(id)["command_id"]
                                )
                                msg_dict = {**js.loads(id)}
                            await ws.send(
                                js.dumps(
                                    {**p.to_json(), **msg_dict, "notify": msg.channel}
                                )
                            )
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(1)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


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
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcommand";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    commands = await app.db_objects.execute(
                        db_model.command_query.where(db_model.Command.deleted == False)
                    )
                    for c in commands:
                        await ws.send(js.dumps(c.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            p = await app.db_objects.get(db_model.command_query, id=id, deleted=False)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# ------------- FILEMETA ---------------------------
# notifications for new screenshots
@mythic.websocket("/ws/screenshots")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_screenshots(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
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
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                f = await app.db_objects.get(
                                    db_model.filemeta_query,
                                    id=id,
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
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(2)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


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
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                f = await app.db_objects.get(
                                    db_model.filemeta_query,
                                    id=id,
                                    is_screenshot=True,
                                    operation=operation,
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
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(2)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


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
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilemeta";')
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
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
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                f = await app.db_objects.get(
                                    db_model.filemeta_query,
                                    id=id,
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
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


@mythic.websocket("/ws/files/new/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_new_files_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilemeta";')
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                f = await app.db_objects.get(
                                    db_model.filemeta_query,
                                    id=id,
                                    operation=operation,
                                    is_screenshot=False,
                                    is_payload=False,
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
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


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
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilemeta";')
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
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
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                f = await app.db_objects.get(
                                    db_model.filemeta_query, id=id, operation=operation
                                )
                                await ws.send(js.dumps({**f.to_json()}))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# ------------- CREDENTIAL ---------------------------
# notifications for new credentials
@mythic.websocket("/ws/credentials/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_credentials_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcredential";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        creds = await app.db_objects.execute(
                            db_model.credential_query.where(
                                (Credential.operation == operation)
                                & (Credential.deleted == False)
                            ).order_by(db_model.Credential.id)
                        )
                        for c in creds:
                            await ws.send(js.dumps({**c.to_json()}))
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                try:
                                    c = await app.db_objects.get(
                                        db_model.credential_query, id=id, operation=operation, deleted=False
                                    )
                                    await ws.send(js.dumps({**c.to_json()}))
                                except Exception as e:
                                    pass  # we got a file that's just not part of our current operation, so move on
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(2)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


@mythic.websocket("/ws/credentials/new/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_credentials_new_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcredential";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                try:
                                    c = await app.db_objects.get(
                                        db_model.credential_query, id=id, operation=operation, deleted=False
                                    )
                                    await ws.send(js.dumps({**c.to_json()}))
                                except Exception as e:
                                    pass  # we got a file that's just not part of our current operation, so move on
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(2)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# ------------- KEYLOG ---------------------------
# notifications for new keylogs
@mythic.websocket("/ws/keylogs/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_keylogs_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newkeylog";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                try:
                                    c = await app.db_objects.get(
                                        db_model.keylog_query, id=id, operation=operation
                                    )
                                    await ws.send(js.dumps({**c.to_json()}))
                                except Exception as e:
                                    pass  # we got a file that's just not part of our current operation, so move on
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(2)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


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
    conn = None
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
        conn = await app.websocket_pool.acquire()
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
    finally:
        if conn is not None:
            await conn.remove_listener("newcredential", callback_func)
            await conn.remove_listener("updatedcredential", callback_func)
            await conn.remove_listener("newpayload", callback_func)
            await conn.remove_listener("updatedpayload", callback_func)
            await conn.remove_listener("newpayloadonhost", callback_func)
            await conn.remove_listener("updatedpayloadonhost", callback_func)


# ============= BROWSER SCRIPTING WEBSOCKETS ===============
@mythic.websocket("/ws/browser_scripts")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_browserscripts(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newbrowserscript";')
                    await cur.execute('LISTEN "updatedbrowserscript";')
                    await cur.execute('LISTEN "newbrowserscriptoperation";')
                    await cur.execute('LISTEN "updatedbrowserscriptoperation";')
                    await cur.execute('LISTEN "deletedbrowserscriptoperation";')
                    # before we start getting new things, update with all of the old data
                    try:
                        operator = await app.db_objects.get(
                            db_model.operator_query, username=user["username"]
                        )
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
                            operation = await app.db_objects.get(
                                db_model.operation_query, name=user["current_operation"]
                            )
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
                        await ws.send("")
                    except Exception as e:
                        logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                        return
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            if "operation" in msg.channel:
                                if operation is not None:
                                    if "deleted" in msg.channel:
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
                                            id=id,
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
                                    db_model.browserscript_query, id=id, operator=operator, for_new_ui=False
                                )
                                await ws.send(
                                    js.dumps({"type": "browserscript", **s.to_json()})
                                )
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


# ============= ARTIFACT WEBSOCKETS ===============
@mythic.websocket("/ws/artifacts")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_artifacts(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newartifact";')
                    await cur.execute('LISTEN "newtaskartifact";')
                    if user["current_operation"] != "":
                        # before we start getting new things, update with all of the old data
                        base_artifacts = await app.db_objects.execute(db_model.artifact_query)
                        for b in base_artifacts:
                            await ws.send(
                                js.dumps({**b.to_json(), "channel": "artifact"})
                            )
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
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
                        await ws.send("")

                        # now pull off any new tasks we got queued up while processing the old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                if msg.channel == "newartifact":
                                    artifact = await app.db_objects.get(db_model.artifact_query, id=id)
                                    await ws.send(
                                        js.dumps(
                                            {
                                                **artifact.to_json(),
                                                "channel": "artifact",
                                            }
                                        )
                                    )
                                elif msg.channel == "newtaskartifact":
                                    artifact = await app.db_objects.get(db_model.taskartifact_query, id=id)
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
                                await ws.send("")
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(2)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        # print("closed /ws/tasks")
        pool.close()


# ============= PROCESS LIST WEBSOCKETS ===============
@mythic.websocket("/ws/process_list/<cid:int>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_process_list(request, ws, user, cid):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newprocess";')
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        callback = await app.db_objects.get(
                            db_model.callback_query, operation=operation, id=cid
                        )
                        # now pull off any new tasks we got queued up while processing the old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                proc = await app.db_objects.get(
                                    db_model.process_query,
                                    id=id,
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
                                    logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                    tree = {}
                                await ws.send(
                                    js.dumps({"process_list": plist, "tree_list": tree})
                                )
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(2)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        # print("closed /ws/tasks")
        pool.close()


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

# -------------- EVENT LOGS ----------------------
@mythic.websocket("/ws/events/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_events_current_operation(request, ws, user):
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
                await asyncio.sleep(2)
        async with app.websocket_pool.acquire() as conn:
            cb = await events_current_operation_callback(ws, operation)
            await conn.add_listener("newoperationeventlog", lambda *args: asyncio.get_event_loop().create_task(cb(*args)))
            await conn.add_listener("updatedoperationeventlog",
                                    lambda *args: asyncio.get_event_loop().create_task(cb(*args)))

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
    conn = None
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
        conn = await app.websocket_pool.acquire()
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
    finally:
        if conn is not None:
            await conn.remove_listener("newoperationeventlog",
                                    callback_func)
            await conn.remove_listener("updatedoperationeventlog",
                                    callback_func)


# -------------- CALLBACK GRAPH EDGE CONNECTIONS ----------------------
@mythic.websocket("/ws/graph_edges/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_graph_edges_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcallbackgraphedge";')
                    await cur.execute('LISTEN "updatedcallbackgraphedge";')
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
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

                        await ws.send("")
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload

                                i = await app.db_objects.get(
                                    db_model.callbackgraphedge_query, id=id, operation=operation
                                )
                                if i.source.id == i.destination.id:
                                    await ws.send(
                                        js.dumps(
                                            {
                                                "id": i.id,
                                                "start_timestamp": i.start_timestamp.strftime("%m/%d/%Y %H:%M:%S"),
                                                "end_timestamp": i.end_timestamp.strftime("%m/%d/%Y %H:%M:%S") if i.end_timestamp is not None else None,
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
                                        "end_timestamp": i.end_timestamp.strftime("%m/%d/%Y %H:%M:%S") if i.end_timestamp is not None else None,
                                        "direction": i.direction,
                                        "metadata": i.metadata,
                                        "c2_profile": i.c2_profile.name,
                                    })
                                    )
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("here")
        logger.warning("websocket_routes.py error: " + str(t))


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
@mythic.websocket("/ws/file_browser/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_file_browser_objects(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilebrowserobj";')
                    await cur.execute('LISTEN "updatedfilebrowserobj";')
                    await cur.execute('LISTEN "newfilemeta";')
                    await cur.execute('LISTEN "updatedfilemeta";')
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        from app.api.file_browser_api import (
                            get_filebrowser_tree_for_operation,
                        )

                        burst = await get_filebrowser_tree_for_operation(
                            user["current_operation"]
                        )
                        await ws.send(js.dumps(burst["output"]))
                        await ws.send("")
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                if "filemeta" in msg.channel:
                                    i = await app.db_objects.get(
                                        db_model.filemeta_query, id=id, operation=operation
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
                                            (db_model.FileBrowserObj.id == id) &
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
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# -------------- Token INFORMATION ----------------------
@mythic.websocket("/ws/tokens/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_token_objects(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtoken";')
                    await cur.execute('LISTEN "updatedtoken";')
                    if user["current_operation"] != "":
                        operation = await app.db_objects.get(
                            db_model.operation_query, name=user["current_operation"]
                        )
                        tokens = await app.db_objects.execute(db_model.token_query.where(
                            db_model.Token.callback != None
                        ))
                        for t in tokens:
                            if t.callback.operation == operation:
                                await ws.send(js.dumps(t.to_json()))
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                token = await app.db_objects.get(db_model.token_query, id=id)
                                if token.callback.operation == operation:
                                    await ws.send(js.dumps(token.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                logger.warning("websocket_routes.py error - " + str(sys.exc_info()[-1].tb_lineno) +str(e))
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    except Exception as t:
        logger.warning("websocket_routes.py error: " + str(t))


# -------------- Callback Tasking  ----------------------
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
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedtask";')
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
                    while True:
                        try:
                            # blocking get call
                            print("wait for new events")
                            msg = await conn.notifies.get()
                            print(msg)
                            id = msg.payload
                            task = await app.db_objects.get(db_model.task_query, id=id)
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
                                                                                                      enc_key, callback.agent_callback_id,
                                                                                                      request)
                                    if final_msg is None:
                                        return
                                    print("sending final message to websocket")
                                    await ws.send(final_msg)

                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(0.5)
                        except Exception as e:
                            logger.error("websocket route: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                            continue
    except Exception as d:
        str(sys.exc_info()[-1].tb_lineno) + " " + str(d)


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
