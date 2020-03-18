from app import apfell, db_objects, use_ssl
import aiopg
import json as js
import asyncio
from app.database_models.model import Callback, Payload, PayloadType, C2Profile, Credential, FileMeta, Task, Command, TaskArtifact
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
import aio_pika
import sys
import base64
from app.api.processlist_api import get_process_tree


# --------------- TASKS --------------------------
# notifications for new tasks
@apfell.websocket('/ws/tasks')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_tasks(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    # before we start getting new things, update with all of the old data
                    query = await db_model.task_query()
                    tasks_with_all_info = await db_objects.prefetch(query, Command.select())
                    # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
                    for task in tasks_with_all_info:
                        await ws.send(js.dumps(task.to_json()))
                    await ws.send("")
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.task_query()
                            tsk = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(tsk.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


@apfell.websocket('/ws/task_feed/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_tasks_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.task_query()
                        # to avoid being too slow, just get the latest 200
                        initial_tasks = await db_objects.execute(query.where(Callback.operation == operation).order_by(Task.timestamp).limit(200))
                        for t in initial_tasks:
                            await ws.send(js.dumps({**t.to_json(), 'host': t.callback.host, 'user': t.callback.user}))
                        await ws.send("")
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)

                                t = await db_objects.get(query, id=id)
                                if t.callback.operation == operation:
                                    await ws.send(js.dumps({**t.to_json(), 'host': t.callback.host, 'user': t.callback.user}))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("")  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


# --------------- RESPONSES ---------------------------
# notifications for task updates
@apfell.websocket('/ws/responses')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_responses(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    query = db_model.response_query()
                    responses_with_tasks = await db_objects.prefetch(query)
                    for resp in responses_with_tasks:
                        await ws.send(js.dumps(resp.to_json()))
                    await ws.send("")
                    # now pull off any new responses we got queued up while processing old responses
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.response_query()
                            rsp = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(rsp.to_json()))
                            # print(msg.payload)
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("") # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        # print("closed /ws/task_updates")
        pool.close()


# notifications for task updates
@apfell.websocket('/ws/responses/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_responses_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    viewing_callbacks = set()  # this is a list of callback IDs that the operator is viewing, so only update those
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)
                                query = await db_model.response_query()
                                rsp = await db_objects.get(query, id=id)
                                query = await db_model.callback_query()
                                callback = await db_objects.get(query, id=rsp.task.callback)
                                if callback.operation == operation and callback.id in viewing_callbacks:
                                    await ws.send(js.dumps(rsp.to_json()))
                                # print(msg.payload)
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("") # this is our test to see if the client is still there
                            except Exception as e:
                                print("exception in /ws/responses/current_operation: " + str(e))
                            try:
                                msg = await ws.recv()
                                if msg != "":
                                    if msg[0] == "a":
                                        viewing_callbacks.add(int(msg[1:]))
                                    elif msg[0] == "r":
                                        # throws an error if we try to remove what's not there, but that's fine
                                        viewing_callbacks.remove(int(msg[1:]))
                            except Exception as e:
                                print("exception while updating the viewing section in /ws/responses/current_operation: " + str(e))
    finally:
        # print("closed /ws/task_updates")
        pool.close()


# --------------------- CALLBACKS ------------------
@apfell.websocket('/ws/callbacks/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_callbacks_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcallback";')
                    if user['current_operation'] != "":
                        # before we start getting new things, update with all of the old data
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.callback_query()
                        callbackc2profilequery = await db_model.callbackc2profiles_query()
                        c2profileparametersinstancequery = await db_model.c2profileparametersinstance_query()
                        callbacks_with_operators = await db_objects.execute(query.where(
                            (Callback.operation == operation) & (Callback.active == True)
                        ).order_by(Callback.id))
                        for cb in callbacks_with_operators:
                            cb_json = cb.to_json()
                            callbackc2profiles = await db_objects.execute(
                                callbackc2profilequery.where(db_model.CallbackC2Profiles.callback == cb))
                            c2_profiles_info = []
                            for c2p in callbackc2profiles:
                                profile_info = {"name": c2p.c2_profile.name, "is_p2p": c2p.c2_profile.is_p2p, "parameters": {}}
                                c2_profile_params = await db_objects.execute(c2profileparametersinstancequery.where(
                                    (db_model.C2ProfileParametersInstance.callback == cb) &
                                    (db_model.C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
                                ))
                                for param in c2_profile_params:
                                    profile_info['parameters'][param.c2_profile_parameters.key] = param.value
                                c2_profiles_info.append(profile_info)
                            cb_json['supported_profiles'] = c2_profiles_info
                            await ws.send(js.dumps(cb_json))
                        await ws.send("")
                        # now pull off any new callbacks we got queued up while processing the old data
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)
                                cb = await db_objects.get(query, id=id, operation=operation)
                                cb_json = cb.to_json()
                                callbackc2profiles = await db_objects.execute(
                                    callbackc2profilequery.where(db_model.CallbackC2Profiles.callback == cb))
                                c2_profiles_info = []
                                for c2p in callbackc2profiles:
                                    profile_info = {"name": c2p.c2_profile.name, "is_p2p": c2p.c2_profile.is_p2p, "parameters": {}}
                                    c2_profile_params = await db_objects.execute(c2profileparametersinstancequery.where(
                                        (db_model.C2ProfileParametersInstance.callback == cb) &
                                        (db_model.C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
                                    ))
                                    for param in c2_profile_params:
                                        profile_info['parameters'][param.c2_profile_parameters.key] = param.value
                                    c2_profiles_info.append(profile_info)
                                cb_json['supported_profiles'] = c2_profiles_info
                                await ws.send(js.dumps(cb_json))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("") # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print("exception in callbacks/current_operation: {}".format(str(e)))
                                continue
    finally:
        pool.close()


@apfell.websocket('/ws/unified_callback/<cid:int>')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_unified_single_callback_current_operation(request, ws, user, cid):
    if not await valid_origin_header(request):
        return
    try:
        # print("opened socket on webserver for " + str(cid))
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedcallback";')
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    await cur.execute('LISTEN "newresponse";')
                    await cur.execute('LISTEN "newfilemeta";')
                    await cur.execute('LISTEN "updatedfilemeta";')
                    if user['current_operation'] != "":
                        # before we start getting new things, update with all of the old data
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        callbackquery = await db_model.callback_query()
                        callback = await db_objects.get(callbackquery, operation=operation, id=cid)
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
                                    obj = await db_objects.get(callbackquery, id=id, operation=operation)
                                    obj_json = obj.to_json()
                                elif "task" in msg.channel:
                                    obj = await db_objects.get(taskquery, id=id, callback=callback)
                                    obj_json = obj.to_json()
                                elif "filemeta" in msg.channel:
                                    obj = await db_objects.get(filemetaquery, id=id, operation=operation)
                                    obj_json = obj.to_json()
                                    if obj.task is not None:
                                        obj_json['callback_id'] = obj.task.callback.id
                                    else:
                                        obj_json['callback_id'] = 0
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
                                await ws.send("")  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                if 'Notify(' in str(msg):
                                    continue
                                else:
                                    print(str(sys.exc_info()[-1].tb_lineno) + str(e) + " " + str(msg))
                                continue
    finally:
        # print("closed socket on webserver for " + str(cid))
        pool.close()


# notifications for updated callbacks
@apfell.websocket('/ws/updatedcallbacks')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_updated_callbacks(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedcallback";')
                    # just want updates, not anything else
                    while True:
                        # msg = await conn.notifies.get()
                        try:
                            msg = conn.notifies.get_nowait()
                            # print("got an update for a callback")
                            id = (msg.payload)
                            query = await db_model.callback_query()
                            cb = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(cb.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("") # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# notifications for updated callbacks
@apfell.websocket('/ws/updatedcallbacks/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_callbacks_updated_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedcallback";')
                    await cur.execute('LISTEN "newcallbackc2profiles";')
                    if user['current_operation'] != "":
                        # just want updates, not anything else
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        updatedcallbackquery = await db_model.callback_query()
                        newcallbackc2profilequery = await db_model.callbackc2profiles_query()
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                # print("got an update for a callback")
                                id = (msg.payload)
                                if 'profiles' in msg.channel:
                                    profile = await db_objects.get(newcallbackc2profilequery.where(
                                        (db_model.CallbackC2Profiles.id == id) &
                                        (db_model.Callback.operation == operation)
                                    ))
                                    obj = profile.to_json()
                                    obj['channel'] = 'newcallbackc2profiles'
                                else:
                                    callback = await db_objects.get(updatedcallbackquery, id=id, operation=operation)
                                    obj = callback.to_json()
                                    obj['channel'] = 'updatedcallback'
                                await ws.send(js.dumps(obj))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("") # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(e)
                                continue
    finally:
        pool.close()


# --------------- PAYLOADS -----------------------
# notifications for new payloads
@apfell.websocket('/ws/payloads')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_payloads(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayload";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.payload_query()
                    payloads = await db_objects.execute(query.where(
                        Payload.auto_generated == False
                    ).order_by(Payload.id))
                    for p in payloads:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.payload_query()
                            p = await db_objects.get(query, id=id, auto_generated=False)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# notifications for new payloads
@apfell.websocket('/ws/payloads/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_payloads_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayload";')
                    await cur.execute('LISTEN "updatedpayload";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.payload_query()
                        payloads = await db_objects.execute(query.where(
                            (Payload.operation == operation) &
                            (Payload.deleted == False) &
                            (Payload.auto_generated == False)
                        ).order_by(Payload.id))
                        for p in payloads:
                            await ws.send(js.dumps(p.to_json()))
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)
                                query = await db_model.payload_query()
                                p = await db_objects.get(query, id=id)
                                if p.operation == operation:
                                    await ws.send(js.dumps(p.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send("")  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print("error in websocket for current operation payloads:" + str(e))
                                print("Most likely payload was deleted")
                                continue
    finally:
        pool.close()


# --------------- C2PROFILES -----------------------
# notifications for new c2profiles
@apfell.websocket('/ws/c2profiles')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_c2profiles(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newc2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.c2profile_query()
                    profiles = await db_objects.execute(query.order_by(C2Profile.id))
                    for p in profiles:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.c2profile_query()
                            p = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# notifications for new c2profiles
@apfell.websocket('/ws/c2profiles/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_c2profile_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newc2profile";')
                    await cur.execute('LISTEN "updatedc2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.c2profile_query()
                        profiles = await db_objects.execute(query.where(C2Profile.deleted == False))
                        for p in profiles:
                            await ws.send(js.dumps(p.to_json()))
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        query = await db_model.c2profile_query()
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)
                                p = await db_objects.get(query, id=id)
                                await ws.send(js.dumps(p.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send("")  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(e)
                                continue
    finally:
        pool.close()


@apfell.websocket('/ws/payloadtypec2profile')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_payloadtypec2profile(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
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
                            id = (msg.payload)
                            query = await db_model.payloadtypec2profile_query()
                            p = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# ---------------- OPERATORS --------------------------
# notifications for new operators
@apfell.websocket('/ws/operators')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_operators(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newoperator";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operator_query()
                    operators = await db_objects.execute(query.where(db_model.Operator.deleted == False))
                    for o in operators:
                        await ws.send(js.dumps(o.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.operator_query()
                            p = await db_objects.get(query, id=id)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# notifications for updated operators
@apfell.websocket('/ws/updatedoperators')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_updated_operators(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedoperator";')
                    # just want updates, not anything else
                    while True:
                        # msg = await conn.notifies.get()
                        try:
                            msg = conn.notifies.get_nowait()
                            # print("got an update for a callback")
                            id = (msg.payload)
                            query = await db_model.operator_query()
                            cb = await db_objects.get(query, id=id, deleted=False)
                            await ws.send(js.dumps(cb.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("") # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# ---------------- PAYLOADTYPES --------------------------
# notifications for new payloadtypes
@apfell.websocket('/ws/payloadtypes')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_payloadtypes(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayloadtype";')
                    await cur.execute('LISTEN "updatedpayloadtype";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.payloadtype_query()
                    payloadtypes = await db_objects.execute(query.where(db_model.PayloadType.deleted == False).order_by(PayloadType.id))
                    for p in payloadtypes:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.payloadtype_query()
                            p = await db_objects.get(query, id=id, deleted=False)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# ---------------- COMMANDS --------------------------
# notifications for new commands
@apfell.websocket('/ws/commands')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_commands(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcommand";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.command_query()
                    commands = await db_objects.execute(query.where(Command.deleted == False))
                    for c in commands:
                        await ws.send(js.dumps(c.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            p = await db_objects.get(query, id=id, deleted=False)
                            await ws.send(js.dumps(p.to_json()))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# notifications for new commands
@apfell.websocket('/ws/all_command_info')
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_commands(request, ws):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcommandparameters";')
                    await cur.execute('LISTEN "updatedcommandparameters";')
                    await cur.execute('LISTEN "deletedcommandparameters";')
                    await cur.execute('LISTEN "newcommandtransform";')
                    await cur.execute('LISTEN "updatedcommandtransform";')
                    await cur.execute('LISTEN "deletedcommandtransform";')
                    await cur.execute('LISTEN "newcommand";')
                    await cur.execute('LISTEN "updatedcommand";')
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = msg.payload
                            msg_dict = {}
                            if "parameters" in msg.channel and "deleted" not in msg.channel:
                                query = await db_model.commandparameters_query()
                                p = await db_objects.get(query, id=id)
                            elif "transform" in msg.channel and "deleted" not in msg.channel:
                                query = await db_model.commandtransform_query()
                                p = await db_objects.get(query, id=id)
                            elif "deleted" not in msg.channel:
                                query = await db_model.command_query()
                                p = await db_objects.get(query, id=id)
                            elif "deleted" in msg.channel:
                                # print(msg)
                                query = await db_model.command_query()
                                p = await db_objects.get(query, id=js.loads(id)['command_id'])
                                msg_dict = {**js.loads(id)}
                            await ws.send(js.dumps({**p.to_json(), **msg_dict, "notify": msg.channel}))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(1)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# ------------ TRANSFORMS -------------------------
@apfell.websocket('/ws/transform_code')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_transform_code(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtransformcode";')
                    await cur.execute('LISTEN "updatedtransformcode";')
                    query = await db_model.transformcode_query()
                    tc = await db_objects.execute(query)
                    for transform in tc:
                        await ws.send(js.dumps({**transform.to_json(), 'channel': "newtransformcode"}))
                    await ws.send("")
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            transform = await db_objects.get(query, id=id)
                            await ws.send(js.dumps({**transform.to_json(), 'channel': msg.channel}))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# ------------- FILEMETA ---------------------------
# notifications for new screenshots
@apfell.websocket('/ws/screenshots')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_screenshots(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    query = await db_model.filemeta_query()
                    files = await db_objects.prefetch(query.where(FileMeta.operation == operation).order_by(FileMeta.id), Task.select(), Command.select(), Callback.select())
                    for f in files:
                        if "{}/downloads/".format(user['current_operation']) in f.path and "/screenshots/" in f.path:
                            if f.task:
                                query = await db_model.task_query()
                                task = await db_objects.get(query, id=f.task)
                                await ws.send(js.dumps({**task.callback.to_json(), **f.to_json(), 'callback_id': task.callback.id, 'comment': task.comment}))
                            else:
                                await ws.send(js.dumps({**f.to_json(), 'callback_id': 0, 'comment': ''}))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.filemeta_query()
                            f = await db_objects.get(query, id=id)
                            if "{}/downloads/".format(user['current_operation']) in f.path and "/screenshots" in f.path:
                                if f.task:
                                    query = await db_model.task_query()
                                    task = await db_objects.get(query, id=f.task)
                                    callback_id = task.callback.id
                                    await ws.send(js.dumps({**task.callback.to_json(), **f.to_json(), 'callback_id': callback_id, 'comment': task.comment}))
                                else:
                                    await ws.send(js.dumps({**f.to_json(), 'callback_id': 0, 'comment': ''}))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# notifications for updated screenshots
@apfell.websocket('/ws/updated_screenshots')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_updated_screenshots(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.filemeta_query()
                            f = await db_objects.get(query, id=id)
                            if "{}/downloads/".format(user['current_operation']) in f.path and "/screenshots" in f.path:
                                if f.task:
                                    query = await db_model.task_query()
                                    task = await db_objects.get(query, id=f.task)
                                    callback_id = task.callback.id
                                    await ws.send(js.dumps({**task.callback.to_json(), **f.to_json(), 'callback_id': callback_id, 'comment': task.comment}))
                                else:
                                    await ws.send(js.dumps({**f.to_json(), 'callback_id': 0, 'comment': ''}))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# notifications for new files in the current operation
@apfell.websocket('/ws/files/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_files_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilemeta";')
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    query = await db_model.filemeta_query()
                    files = await db_objects.prefetch(query.where(
                        (FileMeta.operation == operation)).order_by(FileMeta.id), Task.select(), Command.select(), Callback.select())
                    for f in files:
                        if "/screenshots/" not in f.path:
                            #print(f)
                            if "/{}/downloads/".format(user['current_operation']) not in f.path:
                                # this means it's an upload, so supply additional information as well
                                if f.full_remote_path != "":
                                    if f.task is not None:
                                        query = await db_model.callback_query()
                                        callback = await db_objects.get(query, id=f.task.callback)
                                        await ws.send(js.dumps(
                                            {**f.to_json(), 'comment': f.task.comment, 'host': callback.host, "upload": f.task.params}))
                            else:
                                # this is a file download, so it's straight forward
                                query = await db_model.callback_query()
                                callback = await db_objects.get(query, id=f.task.callback)
                                await ws.send(js.dumps({**f.to_json(), 'comment': f.task.comment, 'host': callback.host, 'params': f.task.params}))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.filemeta_query()
                            f = await db_objects.get(query, id=id, operation=operation, deleted=False)
                            if "/screenshots" not in f.path:
                                try:
                                    if "/{}/downloads/".format(user['current_operation']) not in f.path:
                                        # this means it's an upload, so supply additional information as well
                                        # could be upload via task or manual
                                        if f.full_remote_path != "":
                                            if f.task is not None:  # this is an upload via gent tasking
                                                query = await db_model.task_query()
                                                task = await db_objects.get(query, id=f.task)
                                                await ws.send(js.dumps(
                                                        {**f.to_json(),'comment': f.task.comment, 'host': task.callback.host, "upload": task.params}))
                                    else:
                                        # this is a file download, so it's straight forward
                                        query = await db_model.task_query()
                                        task = await db_objects.get(query, id=f.task)
                                        await ws.send(js.dumps({**f.to_json(),'comment': f.task.comment, 'host': task.callback.host,
                                                                'params': task.params}))
                                except Exception as e:
                                    pass  # we got a file that's just not part of our current operation, so move on
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(1)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()

# notifications for new files in the current operation
@apfell.websocket('/ws/manual_files/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_manual_files_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilemeta";')
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    query = await db_model.filemeta_query()
                    files = await db_objects.prefetch(query.where(
                        (FileMeta.operation == operation) & (FileMeta.deleted == False)).order_by(FileMeta.id), Task.select(), Command.select(), Callback.select())
                    for f in files:
                        if f.task is None:
                            await ws.send(js.dumps({**f.to_json()}))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.filemeta_query()
                            f = await db_objects.get(query, id=id, operation=operation, deleted=False)
                            await ws.send(js.dumps({**f.to_json()}))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(1)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# ------------- CREDENTIAL ---------------------------
# notifications for new credentials
@apfell.websocket('/ws/credentials/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_credentials_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcredential";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    query = await db_model.credential_query()
                    creds = await db_objects.execute(query.where(Credential.operation == operation))
                    for c in creds:
                        await ws.send(js.dumps({**c.to_json()}))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            try:
                                query = await db_model.credential_query()
                                c = await db_objects.get(query, id=id, operation=operation)
                                await ws.send(js.dumps({**c.to_json()}))
                            except Exception as e:
                                pass  # we got a file that's just not part of our current operation, so move on
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()

# ------------- KEYLOG ---------------------------
# notifications for new keylogs
@apfell.websocket('/ws/keylogs/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_keylogs_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newkeylog";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            try:
                                query = await db_model.keylog_query()
                                c = await db_objects.get(query, id=id, operation=operation)
                                await ws.send(js.dumps({**c.to_json()}))
                            except Exception as e:
                                pass  # we got a file that's just not part of our current operation, so move on
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()


# ------ OPERATING COMMAND POPUP INFORMATION --------------------
# ----- INCLUDES CREDENTIALS, PAYLOADS, PAYLOADSONHOST ------------
# notifications for new credentials
@apfell.websocket('/ws/parameter_hints/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_parameter_hints_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcredential";')
                    await cur.execute('LISTEN "updatedcredential";')
                    await cur.execute('LISTEN "newpayload";')
                    await cur.execute('LISTEN "updatedpayload";')
                    await cur.execute('LISTEN "newpayloadonhost";')
                    await cur.execute('LISTEN "updatedpayloadonhost";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    credquery = await db_model.credential_query()
                    creds = await db_objects.execute(credquery.where(Credential.operation == operation))
                    for c in creds:
                        await ws.send(js.dumps({**c.to_json(), 'channel': 'newcredential'}))
                    payloadquery = await db_model.payload_query()
                    payloads = await db_objects.execute(payloadquery.where(
                        (Payload.operation == operation) &
                        (Payload.auto_generated == False) &
                        (Payload.deleted == False)
                    ))
                    c2profileparameterinstancequery = await db_model.c2profileparametersinstance_query()
                    c2profilepayloadquery = await db_model.payloadc2profiles_query()
                    for p in payloads:
                        c2profiles = await db_objects.execute(c2profilepayloadquery.where(db_model.PayloadC2Profiles.payload == p))
                        supported_profiles = []
                        for c2p in c2profiles:
                            profile_info = {"name": c2p.c2_profile.name, "is_p2p": c2p.c2_profile.is_p2p, "parameters": {}}
                            c2profiledata = await db_objects.execute(c2profileparameterinstancequery.where(
                                (db_model.C2ProfileParametersInstance.payload == p) &
                                (db_model.C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
                            ))
                            for c in c2profiledata:
                                profile_info['parameters'][c.c2_profile_parameters.key] = c.value
                            supported_profiles.append(profile_info)
                        await ws.send(js.dumps({**p.to_json(), 'supported_profiles': supported_profiles, 'channel': 'newpayload'}))
                    payloadonhostquery = await db_model.payloadonhost_query()
                    payloadonhost = await db_objects.execute(payloadonhostquery.where(
                        (db_model.PayloadOnHost.operation == operation) &
                        (db_model.PayloadOnHost.deleted == False)))
                    for p in payloadonhost:
                        c2profiles = await db_objects.execute(
                            c2profilepayloadquery.where(db_model.PayloadC2Profiles.payload == p.payload))
                        supported_profiles = []
                        for c2p in c2profiles:
                            profile_info = {"name": c2p.c2_profile.name, "is_p2p": c2p.c2_profile.is_p2p,
                                            "parameters": {}}
                            c2profiledata = await db_objects.execute(c2profileparameterinstancequery.where(
                                (db_model.C2ProfileParametersInstance.payload == p.payload) &
                                (db_model.C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
                            ))
                            for c in c2profiledata:
                                profile_info['parameters'][c.c2_profile_parameters.key] = c.value
                            supported_profiles.append(profile_info)
                        await ws.send(js.dumps({**p.to_json(), 'supported_profiles': supported_profiles, 'channel': 'newpayloadonhost'}))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            #print(msg)
                            id = (msg.payload)
                            try:
                                if 'credential' in msg.channel:
                                    obj = await db_objects.get(credquery, id=id, operation=operation)
                                    obj_json = obj.to_json()
                                elif 'onhost' in msg.channel:
                                    payloadonhost = await db_objects.get(payloadonhostquery, operation=operation, id=id)
                                    c2profiles = await db_objects.execute(
                                        c2profilepayloadquery.where(db_model.PayloadC2Profiles.payload == payloadonhost.payload))
                                    supported_profiles = []
                                    for c2p in c2profiles:
                                        profile_info = {"name": c2p.c2_profile.name, "is_p2p": c2p.c2_profile.is_p2p,
                                                        "parameters": {}}
                                        c2profiledata = await db_objects.execute(c2profileparameterinstancequery.where(
                                            (db_model.C2ProfileParametersInstance.payload == payloadonhost.payload) &
                                            (db_model.C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
                                        ))
                                        for c in c2profiledata:
                                            profile_info['parameters'][c.c2_profile_parameters.key] = c.value
                                        supported_profiles.append(profile_info)
                                    obj_json = {**payloadonhost.to_json(), 'supported_profiles': supported_profiles}
                                else:
                                    # this is just for new payloads
                                    payload = await db_objects.get(payloadquery.where(
                                        (Payload.operation == operation) & (Payload.id == id) & (Payload.deleted == False)
                                    ))
                                    c2profiles = await db_objects.execute(
                                        c2profilepayloadquery.where(db_model.PayloadC2Profiles.payload == payload))
                                    supported_profiles = []
                                    for c2p in c2profiles:
                                        profile_info = {"name": c2p.c2_profile.name, "is_p2p": c2p.c2_profile.is_p2p,
                                                        "parameters": {}}
                                        c2profiledata = await db_objects.execute(c2profileparameterinstancequery.where(
                                            (db_model.C2ProfileParametersInstance.payload == payload) &
                                            (db_model.C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
                                        ))
                                        for c in c2profiledata:
                                            profile_info['parameters'][c.c2_profile_parameters.key] = c.value
                                        supported_profiles.append(profile_info)
                                    obj_json = {**payload.to_json(), 'supported_profiles': supported_profiles}
                                obj_json['channel'] = msg.channel
                                await ws.send(js.dumps(obj_json))
                            except Exception as e:
                                print(e)
                                pass  # we got a file that's just not part of our current operation, so move on
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        pool.close()

# ------------- RABBITMQ DATA ---------------------------
# messages back from rabbitmq with key: c2.status.#
@apfell.websocket('/ws/rabbitmq/c2_status')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_c2_status_messages(request, ws, user):
    if not await valid_origin_header(request):
        return

    async def send_data(message: aio_pika.IncomingMessage):
        base_username = base64.b64encode(user['username'].encode()).decode('utf-8')
        with message.process():
            if message.routing_key.split(".")[5] == base_username:
                data = {"status": "success",
                        "body": message.body.decode('utf-8'),
                        "routing_key": message.routing_key}
                try:
                    await ws.send(js.dumps(data))
                except Exception as e:
                    pass

    try:
        connection = await aio_pika.connect(host="127.0.0.1",
                                            login="apfell_user",
                                            password="apfell_password",
                                            virtualhost="apfell_vhost")
        channel = await connection.channel()
        # declare our exchange
        await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
        # get a random queue that only the apfell server will use to listen on to catch all heartbeats
        queue = await channel.declare_queue('', exclusive=True)
        await queue.bind(exchange='apfell_traffic', routing_key="c2.status.#")
        await channel.set_qos(prefetch_count=50)
        print(' [*] Waiting for messages in websocket. To exit press CTRL+C')
        await queue.consume(send_data)
        while True:
            try:
                await ws.send("")
                await asyncio.sleep(2)
            except Exception as e:
                return
    except Exception as e:
        print("Exception in ws_c2_status_messages: {}".format(str(sys.exc_info())))
        await ws.send(js.dumps({"status": "error", "error": "Failed to connect to rabbitmq, {}".format(str(e))}))


# messages back from rabbitmq with key: pt.status.#
@apfell.websocket('/ws/rabbitmq/pt_status')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_payload_type_status_messages(request, ws, user):
    if not await valid_origin_header(request):
        return

    async def send_data(message: aio_pika.IncomingMessage):
        base_username = base64.b64encode(user['username'].encode()).decode('utf-8')
        with message.process():
            # print(message.routing_key)
            if message.routing_key.split(".")[-1] == base_username:
                data = {"status": "success",
                        "body": message.body.decode('utf-8'),
                        "routing_key": message.routing_key}
                try:
                    await ws.send(js.dumps(data))
                except Exception as e:
                    pass

    try:
        connection = await aio_pika.connect(host="127.0.0.1",
                                            login="apfell_user",
                                            password="apfell_password",
                                            virtualhost="apfell_vhost")
        channel = await connection.channel()
        # declare our exchange
        await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
        # get a random queue that only the apfell server will use to listen on to catch all heartbeats
        queue = await channel.declare_queue('', exclusive=True)
        # bind the queue to the exchange so we can actually catch messages
        await queue.bind(exchange='apfell_traffic', routing_key="pt.status.#")
        await channel.set_qos(prefetch_count=50)
        print(' [*] Waiting for messages in websocket. To exit press CTRL+C')
        await queue.consume(send_data)
        while True:
            try:
                await ws.send("")
                await asyncio.sleep(2)
            except Exception as e:
                return
    except Exception as e:
        print("Exception in ws_payload_type_status_messages: {}".format(str(sys.exc_info())))
        await ws.send(js.dumps({"status": "error", "error": "Failed to connect to rabbitmq, {}".format(str(e))}))


# ============= BROWSER SCRIPTING WEBSOCKETS ===============
@apfell.websocket('/ws/browser_scripts')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_tasks(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
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
                        operator = await db_objects.get(query, username=user['username'])
                        script_query = await db_model.browserscript_query()
                        all_scripts = await db_objects.execute(script_query.where(db_model.BrowserScript.operator == operator))
                        for s in all_scripts:
                            await ws.send(js.dumps({'type': 'browserscript', **s.to_json()}))
                        try:
                            query = await db_model.operation_query()
                            operation = await db_objects.get(query, name=user['current_operation'])
                            scriptoperation_query = await db_model.browserscriptoperation_query()
                            all_scripts = await db_objects.execute(scriptoperation_query.where(db_model.BrowserScriptOperation.operation == operation))
                            for s in all_scripts:
                                await ws.send(js.dumps({'type': 'browserscriptoperation', **s.to_json()}))
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
                            id = (msg.payload)
                            if 'operation' in msg.channel:
                                if operation is not None:
                                    if 'deleted' in msg.channel:
                                        await ws.send(js.dumps({'type': 'deletedbrowserscriptoperation', 'info':id}))
                                    else:
                                        s = await db_objects.get(scriptoperation_query, id=id, operation=operation)
                                        await ws.send(js.dumps({'type': 'browserscriptoperation', **s.to_json()}))
                            else:
                                s = await db_objects.get(script_query, id=id, operator=operator)
                                await ws.send(js.dumps({'type': 'browserscript', **s.to_json()}))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


# ============= ARTIFACT WEBSOCKETS ===============
@apfell.websocket('/ws/artifacts')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_artifacts(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newartifact";')
                    await cur.execute('LISTEN "newtaskartifact";')
                    # before we start getting new things, update with all of the old data
                    query = await db_model.artifact_query()
                    base_artifacts = await db_objects.execute(query)
                    for b in base_artifacts:
                        await ws.send(js.dumps({**b.to_json(), "channel": "artifact"}))
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])

                    query = await db_model.callback_query()
                    callbacks = query.where(Callback.operation == operation).select(Callback.id)
                    task_query = await db_model.taskartifact_query()
                    artifact_tasks = await db_objects.execute(task_query.where(Task.callback.in_(callbacks)))
                    manual_tasks = await db_objects.execute(task_query.where(TaskArtifact.operation == operation))
                    for a in artifact_tasks:
                        await ws.send(js.dumps({**a.to_json(), "channel": "taskartifact"}))
                    for m in manual_tasks:
                        await ws.send(js.dumps({**m.to_json(), "channel": "taskartifact"}))
                    await ws.send("")

                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            if msg.channel == "newartifact":
                                query = await db_model.artifact_query()
                                artifact = await db_objects.get(query, id=id)
                                await ws.send(js.dumps({**artifact.to_json(), "channel": "artifact"}))
                            elif msg.channel == "newtaskartifact":
                                query = await db_model.taskartifact_query()
                                artifact = await db_objects.get(query, id=id)
                                if artifact.operation == operation or (artifact.task is not None and artifact.task.callback.operation == operation):
                                    await ws.send(js.dumps({**artifact.to_json(), "channel": "taskartifact"}))
                            await ws.send("")
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


# ============= PROCESS LIST WEBSOCKETS ===============
@apfell.websocket('/ws/process_list/<cid:int>')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_process_list(request, ws, user, cid):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newprocesslist";')
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    query = await db_model.callback_query()
                    callback = await db_objects.get(query, operation=operation, id=cid)
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            process_list = await db_objects.get(db_model.ProcessList, id=id, operation=operation, host=callback.host)
                            plist = process_list.to_json()
                            try:
                                tree = await get_process_tree(js.loads(plist['process_list']))
                            except Exception as e:
                                print(e)
                                tree = {}
                            await ws.send(js.dumps({'process_list': plist, 'tree_list': tree}))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            continue
    finally:
        # print("closed /ws/tasks")
        pool.close()


# -------------- EVENT LOGS ----------------------
@apfell.websocket('/ws/events/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_events_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newoperationeventlog";')
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.operationeventlog_query()
                        initial_events = await db_objects.execute(query.where(db_model.OperationEventLog.operation == operation))
                        for i in initial_events:
                            await ws.send(js.dumps(i.to_json()))
                        await ws.send("")
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)

                                t = await db_objects.get(query, id=id)
                                if t.operation == operation:
                                    await ws.send(js.dumps(t.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("")  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
    finally:
        pool.close()


@apfell.websocket('/ws/events_new/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_events_new_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newoperationeventlog";')
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.operationeventlog_query()
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)

                                t = await db_objects.get(query, id=id)
                                if t.operation == operation:
                                    await ws.send(js.dumps(t.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("")  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
    finally:
        pool.close()


# -------------- EVENT LOGS ----------------------
@apfell.websocket('/ws/graph_edges/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_graph_edges_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcallbackgraphedge";')
                    await cur.execute('LISTEN "updatedcallbackgraphedge";')
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.callbackgraphedge_query()
                        initial_edges = await db_objects.execute(query.where(
                            (db_model.CallbackGraphEdge.operation == operation) &
                            (db_model.CallbackGraphEdge.end_timestamp == None)
                        ))
                        for i in initial_edges:
                            await ws.send(js.dumps(i.to_json()))
                        await ws.send("")
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)

                                t = await db_objects.get(query, id=id, operation=operation)
                                if t.operation == operation:
                                    await ws.send(js.dumps(t.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("")  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
    finally:
        pool.close()


# CHECK ORIGIN HEADERS FOR WEBSOCKETS
async def valid_origin_header(request):
    if 'origin' in request.headers:
        if use_ssl:
            if request.headers['origin'] == "https://{}".format(request.headers['host']):
                return True
        else:
            if request.headers['origin'] == "http://{}".format(request.headers['host']):
                return True
        return False
    elif 'apitoken' in request.headers:
        return True
    else:
        return False
