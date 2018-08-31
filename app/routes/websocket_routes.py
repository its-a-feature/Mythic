from app import apfell, db_objects
import aiopg
import json as js
import asyncio
from app.database_models.model import Operator, Callback, Task, Response, Payload, C2Profile
from sanic_jwt.decorators import protected


# --------------- TASKS --------------------------
# notifications for new tasks
@protected()
@apfell.websocket('/ws/tasks')
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


# --------------- RESPONSES ---------------------------
# notifications for task updates
@protected()
@apfell.websocket('/ws/responses')
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
                    # now pull off any new responses we got queued up while processing old responses
                    while True:
                        try:
                            msg = conn.notifies.get_nowait()
                            # print(msg.payload)
                            id = (js.loads(msg.payload))['id']
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


# --------------------- CALLBACKS ------------------
@protected()
@apfell.websocket('/ws/callbacks')
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


# notifications for updated callbacks
@protected()
@apfell.websocket('/ws/updatedcallbacks')
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


# --------------- PAYLOADS -----------------------
# notifications for new payloads
@protected()
@apfell.websocket('/ws/payloads')
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


# --------------- C2PROFILES -----------------------
# notifications for new c2profiles
@protected()
@apfell.websocket('/ws/c2profiles')
async def ws_payloads(request, ws):
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('LISTEN "newc2profile";')
                    # BEFORE WE START GETTING NEW THINGS, UPDATE WITH ALL OF THE OLD DATA
                    profiles = await db_objects.execute(C2Profile.select())
                    for p in profiles:
                        await ws.send(js.dumps(p.to_json()))
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


# ---------------- OPERATORS --------------------------
# notifications for new operators
@protected()
@apfell.websocket('/ws/operators')
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
@protected()
@apfell.websocket('/ws/updatedoperators')
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