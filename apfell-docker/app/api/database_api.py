from app import apfell, db_objects
import shutil
from sanic.response import json
from sanic_jwt.decorators import scoped, inject_user
from app.database_models.model import Payload, Callback, FileMeta, Keylog, Credential, Task
import os
import app.database_models.model as db_model
from sanic.exceptions import abort


@apfell.route(apfell.config['API_BASE'] + "/database/clear", methods=['POST'])
@inject_user()
@scoped('auth:user')
async def database_clears(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        if operation.name not in user['admin_operations'] or not user['admin']:
            return json({'status': 'error', 'error': "you must be the admin of the operation to clear the database"})
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get the operation and operation: " + str(e)})
    data = request.json
    if 'object' not in data:
        return json({'status': 'error', 'error': '"object" is a required parameter'})
    deleted_obj_info = {'dbnumber': 0}
    if data['object'] == "payloads":
        deleted_obj_info['dbnumber'] += await delete_payloads(user, operation)
    elif data['object'] == "callbacks":
        deleted_obj_info['dbnumber'] += await delete_callbacks(user, operation)
    elif data['object'] == "screencaptures":
        deleted_obj_info['dbnumber'] += await delete_screencaptures(user, operation)
    elif data['object'] == "downloads":
        deleted_obj_info['dbnumber'] += await delete_downloads(user, operation)
    elif data['object'] == "uploads":
        deleted_obj_info['dbnumber'] += await delete_uploads(user, operation)
    elif data['object'] == "keylogs":
        deleted_obj_info['dbnumber'] += await delete_keylogs(user, operation)
    elif data['object'] == "credentials":
        deleted_obj_info['dbnumber'] += await delete_credentials(user, operation)
    elif data['object'] == "tasks":
        deleted_obj_info['dbnumber'] += await delete_tasks(user, operation)
    elif data['object'] == "responses":
        deleted_obj_info['dbnumber'] += await delete_responses(user, operation)
    elif data['object'] == "artifacts":
        deleted_obj_info['dbnumber'] += await delete_task_artifacts(user, operation)
    return json({"status": "success", 'stats': deleted_obj_info})


async def delete_responses(user, operation):
    # delete all responses
    objects_deleted = 0
    try:
        query = await db_model.response_query()
        responses = await db_objects.execute(query.switch(Callback).where(Callback.operation == operation))
        for r in responses:
            print("removing response")
            await db_objects.delete(r, recursive=True)
            objects_deleted += 1
    except Exception as e:
        print("failed to delete something in responses: {}".format(str(e)))
    return objects_deleted


async def delete_task_artifacts(user, operation):
    # delete task artifacts
    objects_deleted = 0
    try:
        query = await db_model.callback_query()
        callbacks = query.where(Callback.operation == operation).select(Callback.id)
        task_query = await db_model.taskartifact_query()
        artifact_tasks = await db_objects.execute(
            task_query.where((db_model.Task.callback.in_(callbacks)) | (db_model.TaskArtifact.operation == operation)))
        for a in artifact_tasks:
            await db_objects.delete(a, recursive=True)
            objects_deleted += 1
    except Exception as e:
        print("failed to delete something in delete_task_artifacts: {}".format(str(e)))
    return objects_deleted


async def delete_task_attacks(user, operation):
    objects_deleted = 0
    try:
        query = await db_model.callback_query()
        callbacks = query.where(Callback.operation == operation).select(Callback.id)
        query = await db_model.attacktask_query()
        mappings = await db_objects.execute(query.where(db_model.Task.callback.in_(callbacks) ))
        for m in mappings:
            await db_objects.delete(m, recursive=True)
            objects_deleted += 1
    except Exception as e:
        print("failed to delete something in delete_task_attacks: {}".format(str(e)))
    return objects_deleted


async def delete_tasks(user, operation):
    # delete responses, task_artifacts, task_attack mappings, then tasks
    objects_deleted = 0
    try:
        # first delete the responses
        objects_deleted += await delete_responses(user, operation)
        # then delete the task artifacts
        objects_deleted += await delete_task_artifacts(user, operation)
        # then delete the att&ck mappings for issued tasks
        objects_deleted += await delete_task_attacks(user, operation)
        # then delete files
        objects_deleted += await delete_downloads(user, operation)
        objects_deleted += await delete_uploads(user, operation)
        objects_deleted += await delete_screencaptures(user, operation)
        # delete keylogs
        objects_deleted += await delete_keylogs(user, operation)
        # finally delete tasks
        query = await db_model.task_query()
        tasks = await db_objects.execute(query.where(Callback.operation == operation))
        for t in tasks:
            await db_objects.delete(t, recursive=True)
            objects_deleted += 1
    except Exception as e:
        print("failed to delete something in delete_tasks: {}".format(str(e)))
    return objects_deleted


async def delete_credentials(user, operation):
    objects_deleted = 0
    query = await db_model.credential_query()
    credentials = await db_objects.execute(query.where(Credential.operation == operation))
    for c in credentials:
        await db_objects.delete(c, recursive=True)
        objects_deleted += 1
    return objects_deleted


async def delete_keylogs(user, operation):
    objects_deleted = 0
    query = await db_model.keylog_query()
    keylogs = await db_objects.execute(query.where(Keylog.operation == operation))
    for k in keylogs:
        await db_objects.delete(k, recursive=True)
        objects_deleted += 1
    return objects_deleted


async def delete_uploads(user, operation):
    objects_deleted = 0
    query = await db_model.filemeta_query()
    uploads = await db_objects.execute(query.where(
        (FileMeta.operation == operation) & (FileMeta.path.contains("/files/{}/".format(operation.name))) & ~(
            FileMeta.path.contains("/downloads/"))))
    for u in uploads:
        try:
            os.remove(u.path)
        except Exception as e:
            print(e)
        await db_objects.delete(u, recursive=True)
        objects_deleted += 1
    return objects_deleted


async def delete_downloads(user, operation):
    objects_deleted = 0
    query = await db_model.filemeta_query()
    downloads = await db_objects.execute(
        query.where((FileMeta.operation == operation) & (FileMeta.path.contains("/files/{}/downloads/".format(operation.name)))))
    for d in downloads:
        try:
            os.remove(d.path)
        except Exception as e:
            print(e)
        await db_objects.delete(d, recursive=True)
        objects_deleted += 1
    shutil.rmtree("./app/files/{}/downloads".format(operation.name))  # remove the downloads folder from disk
    return objects_deleted


async def delete_callbacks(user, operation):
    objects_deleted = 0
    objects_deleted += await delete_tasks(user, operation)
    query = await db_model.callback_query()
    callbacks = await db_objects.execute(query.where(Callback.operation == operation))
    for c in callbacks:
        await db_objects.delete(c, recursive=True)
        objects_deleted += 1
    return objects_deleted


async def delete_screencaptures(user, operation):
    objects_deleted = 0
    query = await db_model.filemeta_query()
    screencaptures = await db_objects.execute(
        query.where((FileMeta.operation == operation) & (FileMeta.path.contains("/screenshots/"))))
    for s in screencaptures:
        try:
            os.remove(s.path)
        except Exception as e:
            print(e)
        await db_objects.delete(s, recursive=True)
        objects_deleted += 1
    return objects_deleted


async def delete_payloads(user, operation):
    objects_deleted = 0
    # delete callbacks first
    objects_deleted += await delete_callbacks(user, operation)
    query = await db_model.payload_query()
    payloads = await db_objects.execute(query.where(Payload.operation == operation))
    for p in payloads:
        try:
            os.remove(p.location)  # delete it from disk first
        except Exception as e:
            print(e)  # that's ok, payload might already be deleted from disk
        await db_objects.delete(p, recursive=True)
        objects_deleted += 1
    return objects_deleted