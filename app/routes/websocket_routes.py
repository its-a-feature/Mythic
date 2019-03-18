from app import apfell, db_objects
import aiopg
import json as js
import asyncio
from app.database_models.model import Callback, Payload, PayloadType, C2Profile, Credential, FileMeta, Task, Command
from sanic_jwt.decorators import protected, inject_user
import app.database_models.model as db_model


# --------------- TASKS --------------------------
# notifications for new tasks
@apfell.websocket('/ws/tasks')
@protected()
async def ws_tasks(request, ws):
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
                            return
    finally:
        # print("closed /ws/tasks")
        pool.close()


@apfell.websocket('/ws/tasks/current_operation')
@inject_user()
@protected()
async def ws_tasks_current_operation(request, ws, user):
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
                                return
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
@protected()
async def ws_responses(request, ws):
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
                            return
    finally:
        # print("closed /ws/task_updates")
        pool.close()


# notifications for task updates
@apfell.websocket('/ws/responses/current_operation')
@inject_user()
@protected()
async def ws_responses_current_operation(request, ws, user):
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
                                        viewing_callbacks.remove(int(msg[1:]))
                            except Exception as e:
                                print("exception while updating the viewing section in /ws/responses/current_operation: " + str(e))
    finally:
        # print("closed /ws/task_updates")
        pool.close()


# --------------------- CALLBACKS ------------------
@apfell.websocket('/ws/callbacks/current_operation')
@inject_user()
@protected()
async def ws_callbacks_current_operation(request, ws, user):
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
                                print(e)
                                return
    finally:
        pool.close()


# notifications for updated callbacks
@apfell.websocket('/ws/updatedcallbacks')
@inject_user()
@protected()
async def ws_updated_callbacks(request, ws, user):
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
                            return
    finally:
        pool.close()


# notifications for updated callbacks
@apfell.websocket('/ws/updatedcallbacks/current_operation')
@inject_user()
@protected()
async def ws_callbacks_updated_current_operation(request, ws, user):
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
                                return
    finally:
        pool.close()


# --------------- PAYLOADS -----------------------
# notifications for new payloads
@apfell.websocket('/ws/payloads')
@protected()
async def ws_payloads(request, ws):
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
                            return
    finally:
        pool.close()


# notifications for new payloads
@apfell.websocket('/ws/payloads/current_operation')
@inject_user()
@protected()
async def ws_payloads_current_operation(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayload";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.payload_query()
                        payloads = await db_objects.execute(query.where(Payload.operation == operation).order_by(Payload.id))
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
                                print(e)
                                return
    finally:
        pool.close()


# --------------- C2PROFILES -----------------------
# notifications for new c2profiles
@apfell.websocket('/ws/c2profiles')
@inject_user()
@protected()
async def ws_c2profiles(request, ws, user):
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
                            return
    finally:
        pool.close()


# notifications for new c2profiles
@apfell.websocket('/ws/c2profiles/current_operation')
@inject_user()
@protected()
async def ws_c2profile_current_operation(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newc2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user['current_operation'] != "":
                        query = await db_model.operation_query()
                        operation = await db_objects.get(query, name=user['current_operation'])
                        query = await db_model.c2profile_query()
                        profiles = await db_objects.execute(query.where(C2Profile.operation == operation).order_by(C2Profile.id))
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
                                if p.operation == operation:
                                    await ws.send(js.dumps(p.to_json()))
                            except asyncio.QueueEmpty as e:
                                await asyncio.sleep(1)
                                await ws.send("")  # this is our test to see if the client is still there
                                continue
                            except Exception as e:
                                print(e)
                                return
    finally:
        pool.close()


@apfell.websocket('/ws/payloadtypec2profile')
@protected()
async def ws_payloadtypec2profile(request, ws):
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
                            return
    finally:
        pool.close()


# ---------------- OPERATORS --------------------------
# notifications for new operators
@apfell.websocket('/ws/operators')
@protected()
async def ws_operators(request, ws):
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
                            return
    finally:
        pool.close()


# notifications for updated operators
@apfell.websocket('/ws/updatedoperators')
@protected()
async def ws_updated_operators(request, ws):
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
                            return
    finally:
        pool.close()


# ---------------- PAYLOADTYPES --------------------------
# notifications for new payloadtypes
@apfell.websocket('/ws/payloadtypes')
@protected()
async def ws_payloadtypes(request, ws):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayloadtype";')
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
                            return
    finally:
        pool.close()


# ---------------- COMMANDS --------------------------
# notifications for new commands
@apfell.websocket('/ws/commands')
@protected()
async def ws_commands(request, ws):
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
                            return
    finally:
        pool.close()


# notifications for new commands
@apfell.websocket('/ws/all_command_info')
@protected()
async def ws_commands(request, ws):
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
                            return
    finally:
        pool.close()


# ------------- FILEMETA ---------------------------
# notifications for new screenshots
@apfell.websocket('/ws/screenshots')
@inject_user()
@protected()
async def ws_screenshots(request, ws, user):
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
                            return
    finally:
        pool.close()


# notifications for updated screenshots
@apfell.websocket('/ws/updated_screenshots')
@inject_user()
@protected()
async def ws_updated_screenshots(request, ws, user):
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
                            return
    finally:
        pool.close()


# notifications for new files in the current operation
@apfell.websocket('/ws/files/current_operation')
@inject_user()
@protected()
async def ws_files_current_operation(request, ws, user):
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
@protected()
async def ws_updated_files(request, ws, user):
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
                            f = await db_objects.get(query, id=id, operation=operation, deleted=False)
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
@protected()
async def ws_credentials_current_operation(request, ws, user):
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