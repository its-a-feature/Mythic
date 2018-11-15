from app import apfell, db_objects
from app.database_models.model import FileMeta, Task, Operation, Callback, Command
from sanic.response import json, raw, file
import base64
from sanic_jwt.decorators import protected, inject_user
import os
from binascii import unhexlify


@apfell.route(apfell.config['API_BASE'] + "/files", methods=['GET'])
@inject_user()
@protected()
async def get_all_files_meta(request, user):
    try:
        files = await db_objects.execute(FileMeta.select())
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get files'})
    return json([f.to_json() for f in files if f.operation.name in user['operations']])


@apfell.route(apfell.config['API_BASE'] + "/files/<id:int>", methods=['GET'])
async def get_one_file(request, id):
    try:
        file_meta = await db_objects.get(FileMeta, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'file not found'})
    # now that we have the file metadata, get the file if it's done downloading
    if file_meta.complete and not file_meta.deleted:
        encoded_data = open(file_meta.path, 'rb').read()
        encoded_data = base64.b64encode(encoded_data)
        # if this is an auto-generated file from the load command, we should remove the file afterwards
        if "/app/payloads/operations/" in file_meta.path and "load-" in file_meta.path:
            os.remove(file_meta.path)
            file_meta.deleted = True
            await db_objects.update(file_meta)
        return raw(encoded_data)
    else:
        return json({'status': 'error', 'error': 'file not done downloading'})


@apfell.route(apfell.config['API_BASE'] + "/files/", methods=['POST'])
@inject_user()
@protected()
async def create_filemeta_in_database(request, user):
    return await json(create_filemeta_in_database_func(request.json))


async def create_filemeta_in_database_func(data):
    #  create a filemeta object where we will then start uploading our file
    #  expects total_chunks, and task
    if 'total_chunks' not in data:
        return {'status': 'error', 'error': 'total_chunks required'}
    if 'task' not in data:
        return {'status': 'error', 'error': 'corresponding task id required'}
    try:
        task = await db_objects.get(Task, id=data['task'])
        operation = task.callback.operation
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': "failed to find task"}
    try:
        if task.command.cmd not in ["download", "upload", "screencapture"]:
            return {'status': 'error', 'error': "that task wouldn't result in a file being created"}
        filename = os.path.split(task.params)[1]
        if task.command.cmd == "screencapture":
            # we want to save these in a specific folder
            save_path = os.path.abspath(
                './app/files/{}/downloads/{}/{}/{}'.format(operation.name, task.callback.host, "screenshots", filename))
        else:
            save_path = os.path.abspath('./app/files/{}/downloads/{}/{}'.format(operation.name, task.callback.host, filename))
        count = 1
        tmp_path = save_path
        while os.path.exists(tmp_path):
            # the path already exists, so the file needs a new name
            tmp_path = save_path + str(count)
            count = count + 1
        save_path = tmp_path
        if not os.path.exists(os.path.split(save_path)[0]):
            os.makedirs(os.path.split(save_path)[0])
        filemeta = await db_objects.create(FileMeta, total_chunks=data['total_chunks'], task=task, operation=operation,
                                           path=save_path)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': "failed to create file"}
    status = {'status': 'success'}
    print("created file meta")
    return {**status, **filemeta.to_json()}


@apfell.route(apfell.config['API_BASE'] + "/files/<id:int>", methods=['POST'])
@inject_user()
@protected()
async def download_file_to_disk(request, id, user):
    return await json(download_file_to_disk_func({**request.json, "file_id": id}))


async def download_file_to_disk_func(data):
    #  upload content blobs to be associated with filemeta id
    if 'chunk_num' not in data:
        return {'status': 'error', 'error': 'missing chunk_num'}
    if 'chunk_data' not in data:
        return {'status': 'error', 'error': 'missing chunk data'}
    try:
        file_meta = await db_objects.get(FileMeta, id=data['file_id'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get File info'}
    try:
        chunk_data = base64.b64decode(data['chunk_data'])
        f = open(file_meta.path, 'ab')
        f.write(chunk_data)
        f.close()
        file_meta.chunks_received = file_meta.chunks_received + 1
        if file_meta.chunks_received == file_meta.total_chunks:
            file_meta.complete = True
            # if we ended up downloading a file from mac's screencapture utility, we need to fix it a bit
            f = open(file_meta.path, 'rb').read()
            if f[0:8] == "'PNGf'($":
                new_file = open(file_meta.path, 'wb')
                new_file.write(unhexlify(f[8:-2]))
                new_file.close()
        await db_objects.update(file_meta)
    except Exception as e:
        print("Failed to save chunk to disk: " + str(e))
        return {'status': 'error', 'error': 'failed to store chunk'}
    return {'status': 'success', 'chunk': file_meta.chunks_received}


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures")
@inject_user()
@protected()
async def list_all_screencaptures_per_operation(request, user):
    if user['current_operation'] != "":
        operation = await db_objects.get(Operation, name=user['current_operation'])
        screencaptures = await db_objects.execute(FileMeta.select().where(FileMeta.path.regexp(".*{}/downloads/.*/screenshots/".format(operation.name))))
        screencapture_paths = []
        for s in screencaptures:
            screencapture_paths.append(s.to_json())
        return json({'status': 'success', 'files': screencapture_paths})
    else:
        return json({"status": 'error', 'error': 'must be part of a current operation to see an operation\'s screencaptures'})


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures/bycallback/<id:int>")
@inject_user()
@protected()
async def list_all_screencaptures_per_callback(request, user, id):
    try:
        callback = await db_objects.get(Callback, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find callback'})
    screencapture_paths = []
    if callback.operation.name in user['operations']:
        screencaptures = await db_objects.execute(
            FileMeta.select().where(FileMeta.path.regexp(".*{}/downloads/.*/screenshots/".format(callback.operation.name))))
        for s in screencaptures:
            if s.task.callback == callback:
                screencapture_paths.append(s.to_json())
        return json({'status': 'success', 'callback': callback.id, 'files': screencapture_paths})
    else:
        return json({'status': 'error', 'error': 'must be part of that callback\'s operation to see its screenshots'})


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures/<id:int>")
@inject_user()
@protected()
async def get_screencapture(request, user, id):
    try:
        file_meta = await db_objects.get(FileMeta, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find callback'})
    if file_meta.task.callback.operation.name in user['operations']:
        return await file(file_meta.path, filename=file_meta.path.split("/")[-1])
    else:
        return json({"status": 'error', 'error': 'must be part of that callback\'s operation to see its screenshot'})