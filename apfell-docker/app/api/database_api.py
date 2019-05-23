from app import apfell, db_objects
import shutil
from sanic.response import json
from sanic_jwt.decorators import scoped, inject_user
from app.database_models.model import Payload, Callback, FileMeta, Keylog, Credential
import os
import app.database_models.model as db_model
from sanic.exceptions import abort


@apfell.route(apfell.config['API_BASE'] + "/database/clear", methods=['POST'])
@inject_user()
@scoped('auth:user')
async def database_clears(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(403)
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        if operation.name not in user['admin_operations']:
            return json({'status': 'error', 'error': "you must be the admin of the operation to clear the database"})
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get the operation and operation: " + str(e)})
    data = request.json
    if 'object' not in data:
        return json({'status': 'error', 'error': '"object" is a required parameter'})
    deleted_obj_info = {'dbnumber': 0}
    if data['object'] == "payloads":
        query = await db_model.payload_query()
        payloads = await db_objects.execute(query.where(Payload.operation == operation))
        for p in payloads:
            try:
                os.remove(p.location)  # delete it from disk first
            except Exception as e:
                print(e)
            await db_objects.delete(p, recursive=True)  # then delete it and everything it relies on from the db
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1

    elif data['object'] == "callbacks":
        query = await db_model.callback_query()
        callbacks = await db_objects.execute(query.where(Callback.operation == operation))
        for c in callbacks:
            await db_objects.delete(c, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "screencaptures":
        query = await db_model.filemeta_query()
        screencaptures = await db_objects.execute(query.where( (FileMeta.operation == operation) & (FileMeta.path.contains("/screenshots/")) ))
        for s in screencaptures:
            try:
                os.remove(s.path)
            except Exception as e:
                print(e)
            await db_objects.delete(s, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "downloads":
        query = await db_model.filemeta_query()
        downloads = await db_objects.execute(query.where( (FileMeta.operation == operation) & (FileMeta.path.contains("/downloads/")) ))
        for d in downloads:
            try:
                os.remove(d.path)
            except Exception as e:
                print(e)
            await db_objects.delete(d, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
        shutil.rmtree("./app/files/{}/downloads".format(operation.name))  # remove the downloads folder from disk
    elif data['object'] == "uploads":
        query = await db_model.filemeta_query()
        uploads = await db_objects.execute(query.where( (FileMeta.operation == operation) & (FileMeta.path.contains("/{}/".format(operation.name))) & ~(FileMeta.path.contains("/downloads")) ))
        for u in uploads:
            try:
                os.remove(u.path)
            except Exception as e:
                print(e)
            await db_objects.delete(u, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "keylogs":
        query = await db_model.keylog_query()
        keylogs = await db_objects.execute(query.where(Keylog.operation == operation))
        for k in keylogs:
            await db_objects.delete(k, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "credentials":
        query = await db_model.credential_query()
        credentials = await db_objects.execute(query.where(Credential.operation == operation))
        for c in credentials:
            await db_objects.delete(c, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "tasks":
        query = await db_model.task_query()
        tasks = await db_objects.execute(query.where(Callback.operation == operation))
        for t in tasks:
            await db_objects.delete(t, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    elif data['object'] == "responses":
        query = await db_model.response_query()
        responses = await db_objects.execute(query.where(Callback.operation == operation))
        for r in responses:
            await db_objects.delete(r, recursive=True)
            deleted_obj_info['dbnumber'] = deleted_obj_info['dbnumber'] + 1
    return json({"status": "success", 'stats': deleted_obj_info})


