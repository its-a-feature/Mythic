from app import apfell, db_objects
import shutil
from sanic.response import json
from sanic_jwt.decorators import protected, inject_user
from app.database_models.model import Operator, Operation, Payload, Callback, FileMeta, Keylog, Credential, Task, Response
import os


@apfell.route(apfell.config['API_BASE'] + "/database/clear", methods=['POST'])
@inject_user()
@protected()
async def database_clears(request, user):
    try:
        operator = await db_objects.get(Operator, username=user['username'])
        operation = await db_objects.get(Operation, name=user['current_operation'])
        if operation.name not in user['admin_operations']:
            return json({'status': 'error', 'error': "you must be the admin of the operation to clear the database"})
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get the operation and operation: " + str(e)})
    data = request.json
    if 'object' not in data:
        return json({'status': 'error', 'error': '"object" is a required parameter'})
    deleted_obj_info = {'dbnumber': 0}
    if data['object'] == "payloads":
        payloads = await db_objects.execute(Payload.select().where(Payload.operation == operation))
        for p in payloads:
            try:
                os.remove(p.location)  # delete it from disk first
            except Exception as e:
                print(e)
            await db_objects.delete(p, recursive=True)  # then delete it and everything it relies on from the db
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1

    elif data['object'] == "callbacks":
        callbacks = await db_objects.execute(Callback.select().where(Callback.operation == operation))
        for c in callbacks:
            await db_objects.delete(c, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "screencaptures":
        screencaptures = await db_objects.execute(FileMeta.select().where( (FileMeta.operation == operation) & (FileMeta.path.contains("/screenshots/")) ))
        for s in screencaptures:
            try:
                os.remove(s.path)
            except Exception as e:
                print(e)
            await db_objects.delete(s, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "downloads":
        downloads = await db_objects.execute(FileMeta.select().where( (FileMeta.operation == operation) & (FileMeta.path.contains("/downloads/")) ))
        for d in downloads:
            try:
                os.remove(d.path)
            except Exception as e:
                print(e)
            await db_objects.delete(d, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
        shutil.rmtree("./app/files/{}/downloads".format(operation.name))  # remove the downloads folder from disk
    elif data['object'] == "uploads":
        uploads = await db_objects.execute(FileMeta.select().where( (FileMeta.operation == operation) & (FileMeta.path.contains("/{}/".format(operation.name))) & ~(FileMeta.path.contains("/downloads")) ))
        for u in uploads:
            try:
                os.remove(u.path)
            except Exception as e:
                print(e)
            await db_objects.delete(u, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "keylogs":
        keylogs = await db_objects.execute(Keylog.select().where(Keylog.operation == operation))
        for k in keylogs:
            await db_objects.delete(k, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "credentials":
        credentials = await db_objects.execute(Credential.select().where(Credential.operation == operation))
        for c in credentials:
            await db_objects.delete(c, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "tasks":
        callbacks = Callback.select().where(Callback.operation == operation)
        tasks = await db_objects.prefetch(Task.select(), callbacks)
        for t in tasks:
            await db_objects.delete(t, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "responses":
        callbacks = Callback.select().where(Callback.operation == operation)
        tasks = Task.select()
        responses = await db_objects.prefetch(Response.select(), tasks, callbacks)
        for r in responses:
            await db_objects.delete(r, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    return json({"status": "success", 'stats': deleted_obj_info})


