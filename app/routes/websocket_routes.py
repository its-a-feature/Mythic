from app import apfell, db_objects
import aiopg
import json as js
import asyncio
from app.database_models.model import Operator, Callback, Task, Response, Payload, PayloadType, C2Profile, PayloadTypeC2Profile, Operation, OperatorOperation, Command, FileMeta
from sanic_jwt.decorators import protected, inject_user


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
                    callbacks = Callback.select()
                    operators = Operator.select()
                    tasks = Task.select()
                    tasks_with_all_info = await db_objects.prefetch(tasks, callbacks, operators)
                    # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
                    for task in tasks_with_all_info:
                        await ws.send(js.dumps(task.to_json()))
                    await ws.send("")
                    # now pull off any new tasks we got queued up while processing the old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (js.loads(msg.payload))['id']
                            tsk = await db_objects.get(Task, id=id)
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
async def ws_tasks(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newtask";')
                    if user['current_operation'] != "":
                        operation = await db_objects.get(Operation, name=user['current_operation'])
                        # before we start getting new things, update with all of the old data
                        callbacks = Callback.select().where(Callback.operation == operation)
                        operators = Operator.select()
                        tasks = Task.select()
                        tasks_with_all_info = await db_objects.prefetch(tasks, callbacks, operators)
                        # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
                        for task in tasks_with_all_info:
                            await ws.send(js.dumps(task.to_json()))
                        await ws.send("")
                        # now pull off any new tasks we got queued up while processing the old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (js.loads(msg.payload))['id']
                                tsk = await db_objects.get(Task, id=id)
                                if tsk.callback.operation == operation:
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


# --------------- RESPONSES ---------------------------
# notifications for task updates
@apfell.websocket('/ws/responses')
@protected()
async def ws_task_updates(request, ws):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    responses = Response.select()
                    tasks = Task.select()
                    responses_with_tasks = await db_objects.prefetch(responses, tasks)
                    for resp in responses_with_tasks:
                        await ws.send(js.dumps(resp.to_json()))
                    await ws.send("")
                    # now pull off any new responses we got queued up while processing old responses
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (msg.payload)
                            rsp = await db_objects.get(Response, id=id)
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
async def ws_task_updates(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newresponse";')
                    if user['current_operation'] != "":
                        operation = await db_objects.get(Operation, name=user['current_operation'])
                        responses = Response.select()
                        tasks = Task.select()
                        callbacks = Callback.select().where(Callback.operation == operation)
                        responses_with_tasks = await db_objects.prefetch(responses, tasks, callbacks)
                        for resp in responses_with_tasks:
                            await ws.send(js.dumps(resp.to_json()))
                        await ws.send("")
                        # now pull off any new responses we got queued up while processing old responses
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (msg.payload)
                                rsp = await db_objects.get(Response, id=id)
                                if rsp.task.callback.operation.name == user['current_operation']:
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


# --------------------- CALLBACKS ------------------
@apfell.websocket('/ws/callbacks')
@protected()
async def ws_callbacks(request, ws):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcallback";')
                    # before we start getting new things, update with all of the old data
                    callbacks = Callback.select()
                    operators = Operator.select()
                    callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
                    for cb in callbacks_with_operators:
                        await ws.send(js.dumps(cb.to_json()))
                    await ws.send("")
                    # now pull off any new callbacks we got queued up while processing the old data
                    while True:
                        # msg = await conn.notifies.get()
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (js.loads(msg.payload))['id']
                            cb = await db_objects.get(Callback, id=id)
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


@apfell.websocket('/ws/callbacks/current_operation')
@inject_user()
@protected()
async def ws_callbacks(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcallback";')
                    if user['current_operation'] != "":
                        # before we start getting new things, update with all of the old data
                        operation = await db_objects.get(Operation, name=user['current_operation'])
                        callbacks = Callback.select().where(Callback.operation == operation)
                        operators = Operator.select()
                        callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
                        for cb in callbacks_with_operators:
                            await ws.send(js.dumps(cb.to_json()))
                        await ws.send("")
                        # now pull off any new callbacks we got queued up while processing the old data
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (js.loads(msg.payload))['id']
                                cb = await db_objects.get(Callback, id=id)
                                if cb.operation.name == user['current_operation']:
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
@apfell.websocket('/ws/updatedcallbacks')
@protected()
async def ws_callbacks(request, ws):
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
                            id = (js.loads(msg.payload))['id']
                            cb = await db_objects.get(Callback, id=id)
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
async def ws_callbacks(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedcallback";')
                    if user['current_operation'] != "":
                        # just want updates, not anything else
                        while True:
                            # msg = await conn.notifies.get()
                            try:
                                msg = conn.notifies.get_nowait()
                                # print("got an update for a callback")
                                id = (js.loads(msg.payload))['id']
                                cb = await db_objects.get(Callback, id=id)
                                if cb.operation.name == user['current_operation']:
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
                    payloads = await db_objects.execute(Payload.select())
                    for p in payloads:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (js.loads(msg.payload))['id']
                            p = await db_objects.get(Payload, id=id)
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
async def ws_payloads(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayload";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user['current_operation'] != "":
                        operation = await db_objects.get(Operation, name=user['current_operation'])
                        payloads = await db_objects.execute(Payload.select().where(Payload.operation == operation))
                        for p in payloads:
                            await ws.send(js.dumps(p.to_json()))
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (js.loads(msg.payload))['id']
                                p = await db_objects.get(Payload, id=id)
                                if p.operation == operation:
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


# --------------- C2PROFILES -----------------------
# notifications for new c2profiles
@apfell.websocket('/ws/c2profiles')
@inject_user()
@protected()
async def ws_payloads(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newc2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    profiles = await db_objects.execute(C2Profile.select())
                    for p in profiles:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (js.loads(msg.payload))['id']
                            p = await db_objects.get(C2Profile, id=id)
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
async def ws_payloads(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newc2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    if user['current_operation'] != "":
                        operation = await db_objects.get(Operation, name=user['current_operation'])
                        profiles = await db_objects.execute(C2Profile.select().where(C2Profile.operation == operation))
                        for p in profiles:
                            await ws.send(js.dumps(p.to_json()))
                        await ws.send("")
                        # now pull off any new payloads we got queued up while processing old data
                        while True:
                            try:
                                msg = conn.notifies.get_nowait()
                                id = (js.loads(msg.payload))['id']
                                p = await db_objects.get(C2Profile, id=id)
                                if p.operation == operation:
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


@apfell.websocket('/ws/payloadtypec2profile')
@protected()
async def ws_payloadtypec2profile(request, ws):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newpayloadtypec2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    profiles = await db_objects.execute(PayloadTypeC2Profile.select())
                    for p in profiles:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (js.loads(msg.payload))['id']
                            p = await db_objects.get(PayloadTypeC2Profile, id=id)
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
async def ws_payloads(request, ws):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newoperator";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    operators = await db_objects.execute(Operator.select())
                    for o in operators:
                        await ws.send(js.dumps(o.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (js.loads(msg.payload))['id']
                            p = await db_objects.get(Operator, id=id)
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
async def ws_callbacks(request, ws):
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
                            id = (js.loads(msg.payload))['id']
                            cb = await db_objects.get(Operator, id=id)
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
                    payloadtypes = await db_objects.execute(PayloadType.select())
                    for p in payloadtypes:
                        await ws.send(js.dumps(p.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (js.loads(msg.payload))['id']
                            p = await db_objects.get(PayloadType, id=id)
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
async def ws_payloads(request, ws):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newcommand";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    commands = await db_objects.execute(Command.select())
                    for c in commands:
                        await ws.send(js.dumps(c.to_json()))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            id = (js.loads(msg.payload))['id']
                            p = await db_objects.get(Command, id=id)
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


# ------------- FILEMETA ---------------------------
# notifications for new screenshots
@apfell.websocket('/ws/screenshots')
@inject_user()
@protected()
async def ws_payloads(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    operation = await db_objects.get(Operation, name=user['current_operation'])
                    files = await db_objects.execute(FileMeta.select().where(FileMeta.operation == operation))
                    for f in files:
                        if "{}/downloads/".format(user['current_operation']) in f.path and "/screenshots/" in f.path:
                            await ws.send(js.dumps({**f.to_json(), 'callback_id': f.task.callback.id, 'operator': f.task.operator.username}))
                    await ws.send("")
                    # now pull off any new payloads we got queued up while processing old data
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            blob = js.loads(msg.payload)
                            if "{}/downloads/".format(user['current_operation']) in blob['path'] and "/screenshots" in blob['path']:
                                f = await db_objects.get(FileMeta, id=blob['id'])
                                callback_id = f.task.callback.id
                                await ws.send(js.dumps({**f.to_json(), 'callback_id': callback_id, 'operator': f.task.operator.username}))
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
async def ws_payloads(request, ws, user):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "updatedfilemeta";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    operation = await db_objects.get(Operation, name=user['current_operation'])
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            blob = js.loads(msg.payload)
                            if "{}/downloads/".format(user['current_operation']) in blob['path'] and "/screenshots" in blob['path']:
                                f = await db_objects.get(FileMeta, id=blob['id'])
                                callback_id = f.task.callback.id
                                await ws.send(js.dumps({**f.to_json(), 'callback_id': callback_id, 'operator': f.task.operator.username}))
                        except asyncio.QueueEmpty as e:
                            await asyncio.sleep(2)
                            await ws.send("")  # this is our test to see if the client is still there
                            continue
                        except Exception as e:
                            print(e)
                            return
    finally:
        pool.close()