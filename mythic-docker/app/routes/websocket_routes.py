from app import mythic, db_objects, use_ssl
import aiopg
import ujson as js
import asyncio
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
import aio_pika
import sys
import base64
from app.api.processlist_api import get_process_tree


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
                    query = await db_model.task_query()
                    tasks_with_all_info = await db_objects.execute(
                        query.order_by(db_model.Task.id)
                    )
                    # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
                    for task in tasks_with_all_info:
                        await ws.send(js.dumps(task.to_json()))
                    await ws.send("")
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            query = await db_model.task_query()
                            tsk = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(tsk.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
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
        op_query = await db_model.operation_query()
        op = await db_objects.get(op_query, name=user["current_operation"])
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    # before we start getting new things, update with all of the old data
                    query = await db_model.task_query()
                    tasks_with_all_info = await db_objects.execute(
                        query.where(db_model.Callback.operation == op).order_by(
                            db_model.Task.id
                        )
                    )
                    # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
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
                            tsk = await db_objects.get(query, id=id)
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
                            print(e)
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
        op_query = await db_model.operation_query()
        op = await db_objects.get(op_query, name=user["current_operation"])
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    # before we start getting new things, update with all of the old data
                    query = await db_model.task_query()
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            tsk = await db_objects.get(query, id=id)
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
                            print(e)
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])

        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedtask";')
                    # before we start getting new things, update with all of the old data
                    query = await db_model.task_query()
                    task = await db_objects.get(query, id=tid)
                    if task.callback.operation == operation:
                        await ws.send(js.dumps(task.to_json()))
                    else:
                        return
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            query = await db_model.task_query()
                            tsk = await db_objects.get(query, id=id)
                            if tsk.id == task.id:
                                await ws.send(js.dumps(tsk.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.task_query()
                        # to avoid being too slow, just get the latest 200
                        initial_tasks = await db_objects.execute(
                            query.where(Callback.operation == operation)
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
                                    }
                                )
                            )
                        await ws.send("")
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload

                                t = await db_objects.get(query, id=id)
                                if t.callback.operation == operation:
                                    await ws.send(
                                        js.dumps(
                                            {
                                                **t.to_json(),
                                                "host": t.callback.host,
                                                "user": t.callback.user,
                                            }
                                        )
                                    )
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
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
                    query = await db_model.response_query()
                    responses_with_tasks = await db_objects.execute(
                        query.order_by(db_model.Response.id)
                    )
                    for resp in responses_with_tasks:
                        await ws.send(js.dumps(resp.to_json()))
                    await ws.send("")
                    # now pull off any new responses we got queued up while processing old responses
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            rsp = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(rsp.to_json()))
                            # print(msg.payload)
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
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
        query = await db_model.operation_query()
        op = await db_objects.get(query, name=user["current_operation"])
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    query = await db_model.response_query()
                    responses_with_tasks = await db_objects.execute(
                        query.where(db_model.Callback.operation == op).order_by(
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
                            rsp = await db_objects.get(query, id=id)
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
                            print(e)
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
        query = await db_model.operation_query()
        op = await db_objects.get(query, name=user["current_operation"])
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    query = await db_model.response_query()
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            rsp = await db_objects.get(query, id=id)
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
                            print(e)
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
                    tquery = await db_model.task_query()
                    task = await db_objects.get(tquery, id=tid)
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
                    query = await db_model.response_query()
                    responses_with_tasks = await db_objects.execute(
                        query.where(db_model.Response.task == task).order_by(
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
                            query = await db_model.response_query()
                            rsp = await db_objects.get(query, id=id)
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
                            print(e)
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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.callback_query()
                        callbackc2profilequery = (
                            await db_model.callbackc2profiles_query()
                        )
                        c2profileparametersinstancequery = (
                            await db_model.c2profileparametersinstance_query()
                        )
                        callbacks_with_operators = await db_objects.execute(
                            query.where(
                                (Callback.operation == operation)
                                & (Callback.active == True)
                            ).order_by(Callback.id)
                        )
                        for cb in callbacks_with_operators:
                            cb_json = cb.to_json()
                            callbackc2profiles = await db_objects.execute(
                                callbackc2profilequery.where(
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
                                c2_profile_params = await db_objects.execute(
                                    c2profileparametersinstancequery.where(
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
                                cb = await db_objects.get(
                                    query, id=id, operation=operation
                                )
                                cb_json = cb.to_json()
                                callbackc2profiles = await db_objects.execute(
                                    callbackc2profilequery.where(
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
                                    c2_profile_params = await db_objects.execute(
                                        c2profileparametersinstancequery.where(
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
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.callback_query()
                        callbackc2profilequery = (
                            await db_model.callbackc2profiles_query()
                        )
                        c2profileparametersinstancequery = (
                            await db_model.c2profileparametersinstance_query()
                        )
                        callbacks_with_operators = await db_objects.execute(
                            query.where(
                                (Callback.operation == operation)
                                & (Callback.active == True)
                            ).order_by(Callback.id)
                        )
                        await ws.send("")
                        # now pull off any new callbacks we got queued up while processing the old data
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                cb = await db_objects.get(
                                    query, id=id, operation=operation
                                )
                                cb_json = cb.to_json()
                                callbackc2profiles = await db_objects.execute(
                                    callbackc2profilequery.where(
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
                                    c2_profile_params = await db_objects.execute(
                                        c2profileparametersinstancequery.where(
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
    finally:
        pool.close()


@mythic.websocket("/ws/unified_callback/<cid:int>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_unified_single_callback_current_operation(request, ws, user, cid):
    if not await valid_origin_header(request):
        return
    try:
        # print("opened socket on webserver for " + str(cid))
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedcallback";')
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    await cur.execute('LISTEN "newresponse";')
                    await cur.execute('LISTEN "newfilemeta";')
                    await cur.execute('LISTEN "updatedfilemeta";')
                    if user["current_operation"] != "":
                        # before we start getting new things, update with all of the old data
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        callbackquery = await db_model.callback_query()
                        callback = await db_objects.get(
                            callbackquery, operation=operation, id=cid
                        )
                        taskquery = await db_model.task_query()
                        filemetaquery = await db_model.filemeta_query()
                        responsequery = await db_model.response_query()
                        await ws.send("")
                        # now pull off any new callbacks we got queued up while processing the old data
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                # only get updates for the callback we specified
                                if msg.channel == "updatedcallback":
                                    if str(id) != str(callback.id):
                                        continue
                                    obj = await db_objects.get(
                                        callbackquery, id=id, operation=operation
                                    )
                                    obj_json = obj.to_json()
                                elif "task" in msg.channel:
                                    obj = await db_objects.get(
                                        taskquery, id=id, callback=callback
                                    )
                                    obj_json = obj.to_json()
                                elif "filemeta" in msg.channel:
                                    obj = await db_objects.get(
                                        filemetaquery, id=id, operation=operation
                                    )
                                    obj_json = obj.to_json()
                                    if obj.task is not None:
                                        obj_json["callback_id"] = obj.task.callback.id
                                    else:
                                        obj_json["callback_id"] = 0
                                else:
                                    obj = await db_objects.get(responsequery, id=id)
                                    if obj.task.callback.id != callback.id:
                                        continue
                                    obj_json = obj.to_json()
                                # print(obj)
                                obj_json["channel"] = msg.channel
                                await ws.send(js.dumps(obj_json))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                if "Notify(" in str(msg):
                                    continue
                                else:
                                    print(
                                        str(sys.exc_info()[-1].tb_lineno)
                                        + str(e)
                                        + " "
                                        + str(msg)
                                    )
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        # print("closed socket on webserver for " + str(cid))
        pool.close()


# notifications for updated callbacks
@mythic.websocket("/ws/updatedcallbacks/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_callbacks_updated_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedcallback";')
                    await cur.execute('LISTEN "newcallbackc2profiles";')
                    if user["current_operation"] != "":
                        # just want updates, not anything else
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        updatedcallbackquery = await db_model.callback_query()
                        newcallbackc2profilequery = (
                            await db_model.callbackc2profiles_query()
                        )
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                # print("got an update for a callback")
                                id = msg.payload
                                if "profiles" in msg.channel:
                                    profile = await db_objects.get(
                                        newcallbackc2profilequery.where(
                                            (db_model.CallbackC2Profiles.id == id)
                                            & (db_model.Callback.operation == operation)
                                        )
                                    )
                                    obj = profile.to_json()
                                    obj["channel"] = "newcallbackc2profiles"
                                else:
                                    callback = await db_objects.get(
                                        updatedcallbackquery, id=id, operation=operation
                                    )
                                    obj = callback.to_json()
                                    obj["channel"] = "updatedcallback"
                                await ws.send(js.dumps(obj))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.payload_query()
                        payloads = await db_objects.execute(
                            query.where(
                                (Payload.operation == operation)
                                & (Payload.deleted == False)
                                & (Payload.auto_generated == False)
                            ).order_by(Payload.id)
                        )
                        for p in payloads:
                            await ws.send(js.dumps(p.to_json()))
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                query = await db_model.payload_query()
                                p = await db_objects.get(query, id=id)
                                if p.operation == operation:
                                    await ws.send(js.dumps(p.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(
                                    "error in websocket for current operation payloads:"
                                    + str(e)
                                )
                                print("Most likely payload was deleted")
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.payload_query()
                        payloads = await db_objects.execute(
                            query.where((Payload.operation == operation)).order_by(
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
                                query = await db_model.payload_query()
                                p = await db_objects.get(query, id=id)
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
                                print(
                                    "error in websocket for current operation payloads:"
                                    + str(e)
                                )
                                print("Most likely payload was deleted")
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


@mythic.websocket("/ws/payloads/<puuid:uuid>")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_updates_for_payload(request, ws, user, puuid):
    if not await valid_origin_header(request):
        return
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])

        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedpayload";')
                    # before we start getting new things, update with all of the old data
                    query = await db_model.payload_query()
                    payload = await db_objects.get(query, uuid=puuid)
                    if payload.operation == operation:
                        await ws.send(js.dumps(payload.to_json()))
                    else:
                        return
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            tsk = await db_objects.get(query, id=id)
                            if tsk.id == payload.id:
                                await ws.send(js.dumps(tsk.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
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
                    query = await db_model.c2profile_query()
                    profiles = await db_objects.execute(
                        query.where(C2Profile.deleted == False)
                    )
                    for p in profiles:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    query = await db_model.c2profile_query()
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            p = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(1)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


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
                    query = await db_model.payloadtypec2profile_query()
                    profiles = await db_objects.execute(query)
                    for p in profiles:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            query = await db_model.payloadtypec2profile_query()
                            p = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


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
                    query = await db_model.operator_query()
                    operators = await db_objects.execute(
                        query.where(db_model.Operator.deleted == False)
                    )
                    for o in operators:
                        await ws.send(js.dumps(o.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            query = await db_model.operator_query()
                            p = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


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
                            query = await db_model.operator_query()
                            cb = await db_objects.get(query, id=id, deleted=False)
                            await ws.send(js.dumps(cb.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


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
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.payloadtype_query()
                    wrappedpayloadtypesquery = (
                        await db_model.wrappedpayloadtypes_query()
                    )
                    build_params_query = await db_model.buildparameter_query()
                    payloadtypes = await db_objects.execute(
                        query.where(db_model.PayloadType.deleted == False).order_by(
                            PayloadType.id
                        )
                    )
                    for p in payloadtypes:
                        wrappedpayloadtypes = await db_objects.execute(
                            wrappedpayloadtypesquery.where(
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
                    query = await db_model.payloadtype_query()
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            if "deleted" in msg.channel:
                                await ws.send("")
                            else:
                                p = await db_objects.get(query, id=id, deleted=False)
                                await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


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
                                query = await db_model.commandparameters_query()
                                p = await db_objects.get(query, id=id)
                            elif "deleted" not in msg.channel:
                                query = await db_model.command_query()
                                p = await db_objects.get(query, id=id)
                            elif "deleted" in msg.channel:
                                # print(msg)
                                query = await db_model.command_query()
                                p = await db_objects.get(
                                    query, id=js.loads(id)["command_id"]
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
                            print(e)
                            continue
    finally:
        pool.close()


# basic info of just new commmands for the payload types page
@mythic.websocket("/ws/commands")
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
                    await cur.execute('LISTEN "newcommand";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.command_query()
                    commands = await db_objects.execute(
                        query.where(db_model.Command.deleted == False)
                    )
                    for c in commands:
                        await ws.send(js.dumps(c.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            p = await db_objects.get(query, id=id, deleted=False)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send(
                                ""
                            )  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.filemeta_query()
                        files = await db_objects.execute(
                            query.where(
                                (FileMeta.operation == operation)
                                & (FileMeta.is_screenshot == True)
                            ).order_by(FileMeta.id)
                        )
                        for f in files:
                            query = await db_model.task_query()
                            task = await db_objects.get(query, id=f.task)
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
                                query = await db_model.filemeta_query()
                                f = await db_objects.get(
                                    query,
                                    id=id,
                                    operation=operation,
                                    is_screenshot=True,
                                )
                                query = await db_model.task_query()
                                task = await db_objects.get(query, id=f.task)
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                query = await db_model.filemeta_query()
                                f = await db_objects.get(
                                    query,
                                    id=id,
                                    is_screenshot=True,
                                    operation=operation,
                                )
                                query = await db_model.task_query()
                                task = await db_objects.get(query, id=f.task)
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.filemeta_query()
                        files = await db_objects.execute(
                            query.where(
                                (FileMeta.operation == operation)
                                & (FileMeta.is_screenshot == False)
                                & (FileMeta.is_payload == False)
                                & (FileMeta.deleted == False)
                            ).order_by(FileMeta.id)
                        )
                        for f in files:
                            if not f.is_download_from_agent:
                                # this means it's an upload, so supply additional information as well
                                if f.task is not None:
                                    query = await db_model.callback_query()
                                    callback = await db_objects.get(
                                        query, id=f.task.callback
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
                                query = await db_model.callback_query()
                                callback = await db_objects.get(
                                    query, id=f.task.callback
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
                                query = await db_model.filemeta_query()
                                f = await db_objects.get(
                                    query,
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
                                            query = await db_model.task_query()
                                            task = await db_objects.get(
                                                query, id=f.task
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
                                        query = await db_model.task_query()
                                        task = await db_objects.get(query, id=f.task)
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                query = await db_model.filemeta_query()
                                f = await db_objects.get(
                                    query,
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
                                            query = await db_model.task_query()
                                            task = await db_objects.get(
                                                query, id=f.task
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
                                        query = await db_model.task_query()
                                        task = await db_objects.get(query, id=f.task)
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.filemeta_query()
                        files = await db_objects.execute(
                            query.where(
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
                                query = await db_model.filemeta_query()
                                f = await db_objects.get(
                                    query, id=id, operation=operation
                                )
                                await ws.send(js.dumps({**f.to_json()}))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.credential_query()
                        creds = await db_objects.execute(
                            query.where(
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
                                    c = await db_objects.get(
                                        query, id=id, operation=operation, deleted=False
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.credential_query()
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                try:
                                    c = await db_objects.get(
                                        query, id=id, operation=operation, deleted=False
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                try:
                                    query = await db_model.keylog_query()
                                    c = await db_objects.get(
                                        query, id=id, operation=operation
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcredential";')
                    await cur.execute('LISTEN "updatedcredential";')
                    await cur.execute('LISTEN "newpayload";')
                    await cur.execute('LISTEN "updatedpayload";')
                    await cur.execute('LISTEN "newpayloadonhost";')
                    await cur.execute('LISTEN "updatedpayloadonhost";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user["current_operation"] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        credquery = await db_model.credential_query()
                        creds = await db_objects.execute(
                            credquery.where(
                                (Credential.operation == operation)
                                & (Credential.deleted == False)
                            )
                        )
                        for c in creds:
                            await ws.send(
                                js.dumps({**c.to_json(), "channel": "newcredential"})
                            )
                        payloadquery = await db_model.payload_query()
                        payloads = await db_objects.execute(
                            payloadquery.where(
                                (Payload.operation == operation)
                                & (Payload.auto_generated == False)
                                & (Payload.deleted == False)
                                & (Payload.build_phase == "success")
                            )
                        )
                        c2profileparameterinstancequery = (
                            await db_model.c2profileparametersinstance_query()
                        )
                        c2profilepayloadquery = await db_model.payloadc2profiles_query()
                        for p in payloads:
                            if p.wrapped_payload is not None:
                                cur_payload = p.wrapped_payload
                            else:
                                cur_payload = p
                            c2profiles = await db_objects.execute(
                                c2profilepayloadquery.where(
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
                                c2profiledata = await db_objects.execute(
                                    c2profileparameterinstancequery.where(
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
                                    }
                                )
                            )
                        payloadonhostquery = await db_model.payloadonhost_query()
                        payloadonhost = await db_objects.execute(
                            payloadonhostquery.where(
                                (db_model.PayloadOnHost.operation == operation)
                                & (db_model.PayloadOnHost.deleted == False)
                            )
                        )
                        for p in payloadonhost:
                            if p.payload.wrapped_payload is not None:
                                cur_payload = p.payload.wrapped_payload
                            else:
                                cur_payload = p.payload
                            c2profiles = await db_objects.execute(
                                c2profilepayloadquery.where(
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
                                c2profiledata = await db_objects.execute(
                                    c2profileparameterinstancequery.where(
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
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                # print(msg)
                                id = msg.payload
                                try:
                                    if "credential" in msg.channel:
                                        obj = await db_objects.get(
                                            credquery, id=id, operation=operation
                                        )
                                        obj_json = obj.to_json()
                                    elif "onhost" in msg.channel:
                                        payloadonhost = await db_objects.get(
                                            payloadonhostquery,
                                            operation=operation,
                                            id=id,
                                        )
                                        if (
                                            payloadonhost.payload.wrapped_payload
                                            is not None
                                        ):
                                            cur_payload = (
                                                payloadonhost.payload.wrapped_payload
                                            )
                                        else:
                                            cur_payload = payloadonhost.payload
                                        c2profiles = await db_objects.execute(
                                            c2profilepayloadquery.where(
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
                                            c2profiledata = await db_objects.execute(
                                                c2profileparameterinstancequery.where(
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
                                        payload = await db_objects.get(
                                            payloadquery.where(
                                                (Payload.operation == operation)
                                                & (Payload.id == id)
                                                & (Payload.deleted == False)
                                                & (Payload.build_phase == "success")
                                            )
                                        )
                                        if payload.wrapped_payload is not None:
                                            cur_payload = payload.wrapped_payload
                                        else:
                                            cur_payload = payload
                                        c2profiles = await db_objects.execute(
                                            c2profilepayloadquery.where(
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
                                            c2profiledata = await db_objects.execute(
                                                c2profileparameterinstancequery.where(
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
                                        }
                                    obj_json["channel"] = msg.channel
                                    await ws.send(js.dumps(obj_json))
                                except Exception as e:
                                    print(e)
                                    pass  # we got a file that's just not part of our current operation, so move on
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(2)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


# ------------- RABBITMQ DATA ---------------------------
# messages back from rabbitmq with key: c2.status.#
@mythic.websocket("/ws/rabbitmq/c2_status")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_c2_status_messages(request, ws, user):
    if not await valid_origin_header(request):
        return

    async def send_data(message: aio_pika.IncomingMessage):
        base_username = base64.b64encode(user["username"].encode()).decode("utf-8")
        with message.process():
            if message.routing_key.split(".")[5] == base_username:
                data = {
                    "status": "success",
                    "body": message.body.decode("utf-8"),
                    "routing_key": message.routing_key,
                }
                try:
                    await ws.send(js.dumps(data))
                except Exception as e:
                    pass

    try:
        connection = await aio_pika.connect(
            host="127.0.0.1",
            login="mythic_user",
            password="mythic_password",
            virtualhost="mythic_vhost",
        )
        channel = await connection.channel()
        # declare our exchange
        await channel.declare_exchange("mythic_traffic", aio_pika.ExchangeType.TOPIC)
        # get a random queue that only the mythic server will use to listen on to catch all heartbeats
        queue = await channel.declare_queue("", exclusive=True)
        await queue.bind(exchange="mythic_traffic", routing_key="c2.status.#")
        await channel.set_qos(prefetch_count=50)
        print(" [*] Waiting for messages in websocket. To exit press CTRL+C")
        await queue.consume(send_data)
        while True:
            try:
                await ws.send("")
                await asyncio.sleep(2)
            except Exception as e:
                return
    except Exception as e:
        print("Exception in ws_c2_status_messages: {}".format(str(sys.exc_info())))
        await ws.send(
            js.dumps(
                {
                    "status": "error",
                    "error": "Failed to connect to rabbitmq, {}".format(str(e)),
                }
            )
        )


# messages back from rabbitmq with key: pt.status.#
@mythic.websocket("/ws/rabbitmq/pt_status")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_payload_type_status_messages(request, ws, user):
    if not await valid_origin_header(request):
        return

    async def send_data(message: aio_pika.IncomingMessage):
        base_username = base64.b64encode(user["username"].encode()).decode("utf-8")
        with message.process():
            # print(message.routing_key)
            if message.routing_key.split(".")[-1] == base_username:
                data = {
                    "status": "success",
                    "body": message.body.decode("utf-8"),
                    "routing_key": message.routing_key,
                }
                try:
                    await ws.send(js.dumps(data))
                except Exception as e:
                    pass

    try:
        connection = await aio_pika.connect(
            host="127.0.0.1",
            login="mythic_user",
            password="mythic_password",
            virtualhost="mythic_vhost",
        )
        channel = await connection.channel()
        # declare our exchange
        await channel.declare_exchange("mythic_traffic", aio_pika.ExchangeType.TOPIC)
        # get a random queue that only the mythic server will use to listen on to catch all heartbeats
        queue = await channel.declare_queue("", exclusive=True)
        # bind the queue to the exchange so we can actually catch messages
        await queue.bind(exchange="mythic_traffic", routing_key="pt.status.#")
        await channel.set_qos(prefetch_count=50)
        print(" [*] Waiting for messages in websocket. To exit press CTRL+C")
        await queue.consume(send_data)
        while True:
            try:
                await ws.send("")
                await asyncio.sleep(2)
            except Exception as e:
                return
    except Exception as e:
        print(
            "Exception in ws_payload_type_status_messages: {}".format(
                str(sys.exc_info())
            )
        )
        await ws.send(
            js.dumps(
                {
                    "status": "error",
                    "error": "Failed to connect to rabbitmq, {}".format(str(e)),
                }
            )
        )


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
                        query = await db_model.operator_query()
                        operator = await db_objects.get(
                            query, username=user["username"]
                        )
                        script_query = await db_model.browserscript_query()
                        all_scripts = await db_objects.execute(
                            script_query.where(
                                db_model.BrowserScript.operator == operator
                            )
                        )
                        for s in all_scripts:
                            await ws.send(
                                js.dumps({"type": "browserscript", **s.to_json()})
                            )
                        try:
                            query = await db_model.operation_query()
                            operation = await db_objects.get(
                                query, name=user["current_operation"]
                            )
                            scriptoperation_query = (
                                await db_model.browserscriptoperation_query()
                            )
                            all_scripts = await db_objects.execute(
                                scriptoperation_query.where(
                                    db_model.BrowserScriptOperation.operation
                                    == operation
                                )
                            )
                            for s in all_scripts:
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
                        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
                                        s = await db_objects.get(
                                            scriptoperation_query,
                                            id=id,
                                            operation=operation,
                                        )
                                        await ws.send(
                                            js.dumps(
                                                {
                                                    "type": "browserscriptoperation",
                                                    **s.to_json(),
                                                }
                                            )
                                        )
                            else:
                                s = await db_objects.get(
                                    script_query, id=id, operator=operator
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
                            print(e)
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
                        query = await db_model.artifact_query()
                        base_artifacts = await db_objects.execute(query)
                        for b in base_artifacts:
                            await ws.send(
                                js.dumps({**b.to_json(), "channel": "artifact"})
                            )
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )

                        query = await db_model.callback_query()
                        callbacks = query.where(Callback.operation == operation).select(
                            Callback.id
                        )
                        task_query = await db_model.taskartifact_query()
                        artifact_tasks = await db_objects.execute(
                            task_query.where(Task.callback.in_(callbacks))
                        )
                        manual_tasks = await db_objects.execute(
                            task_query.where(TaskArtifact.operation == operation)
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
                                    query = await db_model.artifact_query()
                                    artifact = await db_objects.get(query, id=id)
                                    await ws.send(
                                        js.dumps(
                                            {
                                                **artifact.to_json(),
                                                "channel": "artifact",
                                            }
                                        )
                                    )
                                elif msg.channel == "newtaskartifact":
                                    query = await db_model.taskartifact_query()
                                    artifact = await db_objects.get(query, id=id)
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
                                print(e)
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
                    await cur.execute('LISTEN "newprocesslist";')
                    if user["current_operation"] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.callback_query()
                        callback = await db_objects.get(
                            query, operation=operation, id=cid
                        )
                        # now pull off any new tasks we got queued up while processing the old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                process_list = await db_objects.get(
                                    db_model.ProcessList,
                                    id=id,
                                    operation=operation,
                                    host=callback.host,
                                )
                                plist = process_list.to_json()
                                try:
                                    tree = await get_process_tree(
                                        js.loads(plist["process_list"])
                                    )
                                except Exception as e:
                                    print(e)
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        # print("closed /ws/tasks")
        pool.close()


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
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newoperationeventlog";')
                    await cur.execute('LISTEN "updatedoperationeventlog";')
                    if user["current_operation"] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.operationeventlog_query()
                        initial_events = await db_objects.execute(
                            query.where(
                                (db_model.OperationEventLog.operation == operation)
                                & (db_model.OperationEventLog.deleted == False)
                            ).order_by(db_model.OperationEventLog.id)
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
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                t = await db_objects.get(query, id=id)
                                if t.operation == operation:
                                    op_msg = t.to_json()
                                    if op_msg["operator"] is None:
                                        op_msg["operator"] = "Mythic"
                                    await ws.send(js.dumps(op_msg))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


@mythic.websocket("/ws/events_all/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_events_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newoperationeventlog";')
                    await cur.execute('LISTEN "updatedoperationeventlog";')
                    if user["current_operation"] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.operationeventlog_query()
                        initial_events = await db_objects.execute(
                            query.where(
                                (db_model.OperationEventLog.operation == operation)
                                & (db_model.OperationEventLog.deleted == False)
                            ).order_by(db_model.OperationEventLog.id)
                        )
                        for i in initial_events:
                            op_msg = i.to_json()
                            if op_msg["operator"] == "null":
                                op_msg["operator"] = "Mythic"
                            await ws.send(js.dumps(op_msg))
                        await ws.send("")
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                t = await db_objects.get(query, id=id)
                                if t.operation == operation:
                                    op_msg = t.to_json()
                                    if op_msg["operator"] == "null":
                                        op_msg["operator"] = "Mythic"
                                    await ws.send(js.dumps(op_msg))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


# the main operator callback page doesn't need all historic events, just new ones
@mythic.websocket("/ws/events_notifier/current_operation")
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def ws_events_notifier_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(mythic.config["DB_POOL_CONNECT_STRING"]) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newoperationeventlog";')
                    await cur.execute('LISTEN "updatedoperationeventlog";')
                    if user["current_operation"] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        query = await db_model.operationeventlog_query()
                        from app.api.event_message_api import get_old_event_alerts

                        alert_counts = await get_old_event_alerts(user)
                        if alert_counts["status"] == "success":
                            alert_counts.pop("status", None)
                            alert_counts["channel"] = "historic"
                            await ws.send(js.dumps(alert_counts))
                        else:
                            print(alert_counts["error"])
                            return
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                t = await db_objects.get(query, id=id)
                                if t.operation == operation:
                                    op_msg = t.to_json()
                                    if op_msg["operator"] == "null":
                                        op_msg["operator"] = "Mythic"
                                    op_msg["channel"] = msg.channel
                                    await ws.send(js.dumps(op_msg))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        c2query = await db_model.c2profile_query()
                        profiles = await db_objects.execute(
                            c2query.where(db_model.C2Profile.is_p2p == False)
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
                        query = await db_model.callbackgraphedge_query()
                        initial_edges = await db_objects.execute(
                            query.where(
                                (db_model.CallbackGraphEdge.operation == operation)
                                & (db_model.CallbackGraphEdge.end_timestamp == None)
                            ).order_by(db_model.CallbackGraphEdge.id)
                        )
                        for i in initial_edges:
                            if i.source.id == i.destination.id:
                                await ws.send(
                                    js.dumps(
                                        {
                                            **i.to_json(),
                                            "destination": js.dumps(
                                                {"id": "c" + str(i.c2_profile.id)}
                                            ),
                                        }
                                    )
                                )
                            else:
                                await ws.send(js.dumps(i.to_json()))

                        await ws.send("")
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload

                                i = await db_objects.get(
                                    query, id=id, operation=operation
                                )
                                if i.source.id == i.destination.id:
                                    await ws.send(
                                        js.dumps(
                                            {
                                                **i.to_json(),
                                                "destination": js.dumps(
                                                    {"id": "c" + str(i.c2_profile.id)}
                                                ),
                                            }
                                        )
                                    )
                                else:
                                    await ws.send(js.dumps(i.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send(
                                    ""
                                )  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


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
                        query = await db_model.operation_query()
                        operation = await db_objects.get(
                            query, name=user["current_operation"]
                        )
                        from app.api.file_browser_api import (
                            get_filebrowser_tree_for_operation,
                        )

                        burst = await get_filebrowser_tree_for_operation(
                            user["current_operation"]
                        )
                        await ws.send(js.dumps(burst["output"]))
                        await ws.send("")
                        query = await db_model.filebrowserobj_query()
                        filequery = await db_model.filemeta_query()
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = msg.payload
                                if "filemeta" in msg.channel:
                                    i = await db_objects.get(
                                        filequery, id=id, operation=operation
                                    )
                                    if i.file_browser is not None:
                                        i = await db_objects.get(
                                            query,
                                            id=i.file_browser,
                                            operation=operation,
                                        )
                                        ij = i.to_json()
                                        ij["files"] = []
                                        for f in i.files:
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
                                    i = await db_objects.get(
                                        query, id=id, operation=operation
                                    )
                                    ij = i.to_json()
                                    ij["files"] = []
                                    for f in i.files:
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
                                print(e)
                                continue
                    else:
                        await ws.send("no_operation")
                        while True:
                            await ws.send("")
                            await asyncio.sleep(0.5)
    finally:
        pool.close()


# CHECK ORIGIN HEADERS FOR WEBSOCKETS
async def valid_origin_header(request):
    if "origin" in request.headers:
        if use_ssl:
            if request.headers["origin"] == "https://{}".format(
                request.headers["host"]
            ):
                return True
        else:
            if request.headers["origin"] == "http://{}".format(request.headers["host"]):
                return True
        return False
    elif "apitoken" in request.headers:
        return True
    else:
        return False
