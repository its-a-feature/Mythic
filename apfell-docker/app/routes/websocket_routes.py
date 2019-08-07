from app import apfell, db_objects, server_ip, listen_port, use_ssl
import aiopg
import json as js
import asyncio
from app.database_models.model import Callback, Payload, PayloadType, C2Profile, Credential, FileMeta, Task, Command, TaskArtifact
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
import aio_pika
import sys


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


@apfell.websocket('/ws/tasks/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_tasks_current_operation(request, ws, user):
    if not await valid_origin_header(request):
        return

    viewing_callbacks = set()  # this is a list of callback IDs that the operator is viewing, so only update those
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)
                                query = await db_model.task_query()
                                tsk = await db_objects.prefetch(query.where(Task.id == id), Command.select())
                                tsk = list(tsk)[0].to_json()
                                if tsk['callback'] in viewing_callbacks:
                                    await ws.send(js.dumps(tsk))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("")  # this is our test to see if the client is still there
                            except Exception as e:
                                print(e)
                                continue
                            try:
                                msg = await ws.recv()
                                if msg != "":
                                    if msg[0] == "a":
                                        viewing_callbacks.add(int(msg[1:]))
                                    elif msg[0] == "r":
                                        viewing_callbacks.remove(int(msg[1:]))
                            except Exception as e:
                                print(e)


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
                        callbacks_with_operators = await db_objects.execute(query.where(Callback.operation == operation).order_by(Callback.id))
                        for cb in callbacks_with_operators:
                            await ws.send(js.dumps(cb.to_json()))
                        await ws.send("")
                        # now pull off any new callbacks we got queued up while processing the old data
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)
                                query = await db_model.callback_query()
                                cb = await db_objects.get(query, id=id, operation=operation)
                                await ws.send(js.dumps(cb.to_json()))
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
        print("opened socket on webserver for " + str(cid))
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedcallback";')
                    await cur.execute('LISTEN "newtask";')
                    await cur.execute('LISTEN "updatedtask";')
                    await cur.execute('LISTEN "newresponse";')
                    if user['current_operation'] != "":
                        # before we start getting new things, update with all of the old data
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.callback_query()
                        callback = await db_objects.get(query, operation=operation, id=cid)
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
                                    query = await db_model.callback_query()
                                    obj = await db_objects.get(query, id=id, operation=operation)
                                elif "task" in msg.channel:
                                    query = await db_model.task_query()
                                    obj = await db_objects.get(query, id=id)
                                    if obj.callback.id != callback.id:
                                        continue
                                else:
                                    query = await db_model.response_query()
                                    obj = await db_objects.get(query, id=id)
                                    if obj.task.callback.id != callback.id:
                                        continue
                                message = {**obj.to_json(), "channel": msg.channel}
                                await ws.send(js.dumps(message))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(0.5)
                                await ws.send("") # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(msg)
                                print(str(sys.exc_info()[-1].tb_lineno) + str(e))
                                continue
    finally:
        print("closed socket on webserver for " + str(cid))
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
                    if user['current_operation'] != "":
                        # just want updates, not anything else
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                # print("got an update for a callback")
                                id = (msg.payload)
                                query = await db_model.callback_query()
                                cb = await db_objects.get(query, id=id, operation=operation)
                                await ws.send(js.dumps(cb.to_json()))
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
                    payloads = await db_objects.execute(query.order_by(Payload.id))
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
                        payloads = await db_objects.execute(query.where( (Payload.operation == operation) & (Payload.deleted == False)).order_by(Payload.id))
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
                        profiles = await db_objects.execute(query)
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
                    operators = await db_objects.execute(query)
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
                    payloadtypes = await db_objects.execute(query.order_by(PayloadType.id))
                    for p in payloadtypes:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.payloadtype_query()
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
                    commands = await db_objects.execute(query)
                    for c in commands:
                        await ws.send(js.dumps(c.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.command_query()
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
                    await cur.execute('LISTEN "deletedcommand";')
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
                            if msg.channel == "deletedcommand":
                                # this is a special case
                                await ws.send(js.dumps({**js.loads(id), "notify": msg.channel}))
                                continue
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
                                await ws.send(js.dumps({**f.to_json(), 'callback_id': task.callback.id, 'operator': task.operator.username}))
                            else:
                                await ws.send(js.dumps({**f.to_json(), 'callback_id': 0,
                                                        'operator': "null"}))
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
                                    await ws.send(js.dumps({**f.to_json(), 'callback_id': callback_id, 'operator': task.operator.username}))
                                else:
                                    await ws.send(js.dumps({**f.to_json(), 'callback_id': 0,
                                                            'operator': "null"}))
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
                                    await ws.send(js.dumps({**f.to_json(), 'callback_id': callback_id, 'operator': task.operator.username}))
                                else:
                                    await ws.send(js.dumps({**f.to_json(), 'callback_id': 0,
                                                            'operator': "null"}))
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
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    query = await db_model.filemeta_query()
                    files = await db_objects.prefetch(query.where(
                        (FileMeta.operation == operation) & (FileMeta.deleted == False)).order_by(FileMeta.id), Task.select(), Command.select(), Callback.select())
                    for f in files:
                        if "/screenshots/" not in f.path:
                            if "/{}/downloads/".format(user['current_operation']) not in f.path:
                                # this means it's an upload, so supply additional information as well
                                # two kinds of uploads: via task or manual
                                # if load- is in the path, it's a load command that hasn't been pulled down yet
                                if '/operations/{}/load-'.format(operation.name) not in f.path:
                                    if f.task is not None:  # this is an upload via agent tasking
                                        query = await db_model.callback_query()
                                        callback = await db_objects.get(query, id=f.task.callback)
                                        await ws.send(js.dumps(
                                            {**f.to_json(), 'host': callback.host, "upload": f.task.params}))
                                    else:  # this is a manual upload
                                        await ws.send(js.dumps({**f.to_json(), 'host': 'MANUAL FILE UPLOAD',
                                                                "upload": "{\"remote_path\": \"Apfell\", \"file_id\": " + str(f.id) + "}", "task": "null"}))
                            else:
                                query = await db_model.callback_query()
                                callback = await db_objects.get(query, id=f.task.callback)
                                await ws.send(js.dumps({**f.to_json(), 'host': callback.host, 'params': f.task.params}))
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
                                        if f.task is not None:  # this is an upload via gent tasking
                                            query = await db_model.task_query()
                                            task = await db_objects.get(query, id=f.task)
                                            if '/operations/{}/load-'.format(operation.name) not in f.path:
                                                await ws.send(js.dumps(
                                                    {**f.to_json(), 'host': task.callback.host, "upload": task.params}))
                                        else: # this is a manual upload
                                            await ws.send(js.dumps({**f.to_json(), 'host': 'MANUAL FILE UPLOAD',
                                                                    "upload": "{\"remote_path\": \"Apfell\", \"file_id\": " + str(f.id) + "}", "task": "null"}))
                                    else:
                                        query = await db_model.task_query()
                                        task = await db_objects.get(query, id=f.task)
                                        await ws.send(js.dumps({**f.to_json(), 'host': task.callback.host,
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
@apfell.websocket('/ws/updated_files/current_operation')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_updated_files(request, ws, user):
    if not await valid_origin_header(request):
        return

    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    query = await db_model.operation_query()
                    operation = await db_objects.get(query, name=user['current_operation'])
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.filemeta_query()
                            f = await db_objects.get(query, id=id, operation=operation)
                            if "/screenshots" not in f.path:
                                try:
                                    if "/{}/downloads/".format(user['current_operation']) not in f.path:
                                        # this means it's an upload, so supply additional information as well
                                        if f.task is not None:  # this is an upload agent tasking
                                            query = await db_model.task_query()
                                            task = await db_objects.get(query, id=f.task)
                                            await ws.send(js.dumps(
                                                {**f.to_json(), 'host': task.callback.host, "upload": task.params}))
                                        else:
                                            await ws.send(js.dumps({**f.to_json(), 'host': 'MANUAL FILE UPLOAD',
                                                                    "upload": "{\"remote_path\": \"Apfell\", \"file_id\": " + str(f.id) + "}", "task": "null"}))
                                    else:
                                        query = await db_model.task_query()
                                        task = await db_objects.get(query, id=f.task)
                                        await ws.send(js.dumps({**f.to_json(), 'host': task.callback.host, 'params': task.params}))
                                except Exception as e:
                                    pass  # got an update for a file not in this operation
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


# ------------- RABBITMQ DATA ---------------------------
# messages back from rabbitmq with key: c2.status.#
@apfell.websocket('/ws/rabbitmq/c2_status')
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def ws_c2_status_messages(request, ws, user):
    if not await valid_origin_header(request):
        return

    async def send_data(message: aio_pika.IncomingMessage):
        with message.process():
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
        # await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.*.listfiles")
        # await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.*.getfile")
        # await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.*.writefile")
        # await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.*.removefile")
        # await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.running.status")
        # await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.stopped.status")
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
        with message.process():
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
        await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.listfiles.#")
        await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.removefile.#")
        await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.getfile.#")
        await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.writefile.#")
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
                    # before we start getting new things, update with all of the old data
                    try:
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.operator_query()
                        operator = await db_objects.get(query, username=user['username'])
                        query = await db_model.browserscript_query()
                        all_scripts = await db_objects.execute(query.where((db_model.BrowserScript.operator == operator) | (db_model.BrowserScript.operation == operation)
                                                                           | ( (db_model.BrowserScript.command == None) & (db_model.BrowserScript.active == True))))
                        for s in all_scripts:
                            await ws.send(js.dumps(s.to_json()))
                        await ws.send("")
                    except Exception as e:
                        return;
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            query = await db_model.browserscript_query()
                            s = await db_objects.get(query, id=id)
                            # only send off updates for scripts related to the current operation or the current user
                            if (s.operation is not None and s.operation.name == operation.name) or (s.operator.username == operator.username) or (s.command is None and s.active):
                                await ws.send(js.dumps(s.to_json()))
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
async def ws_tasks(request, ws, user):
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
