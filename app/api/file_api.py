from app import apfell, db_objects
from app.database_models.model import FileMeta, Task, Operation, Callback, Operator, Payload
from sanic.response import json, raw, file
import base64
from sanic_jwt.decorators import protected, inject_user
import os
from binascii import unhexlify
import json as js


@apfell.route(apfell.config['API_BASE'] + "/files", methods=['GET'])
@inject_user()
@protected()
async def get_all_files_meta(request, user):
    try:
        files = await db_objects.execute(FileMeta.select())
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get files'})
    return json([f.to_json() for f in files if f.operation.name in user['operations']])


@apfell.route(apfell.config['API_BASE'] + "/files/current_operation", methods=['GET'])
@inject_user()
@protected()
async def get_current_operations_files_meta(request, user):
    if user['current_operation'] != "":
        try:
            operation = await db_objects.get(Operation, name=user['current_operation'])
            files = await db_objects.execute(FileMeta.select().where(FileMeta.operation == operation))
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to get files'})
        return json([f.to_json() for f in files if not "screenshots" in f.path ])
    else:
        return json({"status": 'error', 'error': 'must be part of an active operation'})


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
    elif file_meta.deleted:
        return json({'status': 'error', 'error': 'temporary file deleted'})
    else:
        return json({'status': 'error', 'error': 'file not done downloading'})


@apfell.route(apfell.config['API_BASE'] + "/files/download/<id:int>", methods=['GET'])
async def download_file(request, id):
    try:
        file_meta = await db_objects.get(FileMeta, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'file not found'})
    # now that we have the file metadata, get the file if it's done downloading
    if file_meta.complete and not file_meta.deleted:
        try:
            return await file(file_meta.path, filename=file_meta.path.split("/")[-1])
        except Exception as e:
            return json({'status': 'error', 'error': 'File not found'})
    elif not file_meta.complete:
        return json({'status': 'error', 'error': 'file not done downloading'})
    else:
        return json({'status': 'error', 'error': 'file was deleted'})


@apfell.route(apfell.config['API_BASE'] + "/files/<id:int>", methods=['DELETE'])
@inject_user()
@protected()
async def create_filemeta_in_database(request, user, id):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        filemeta = await db_objects.get(FileMeta, id=id, operation=operation)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'file does not exist or not part of your current operation'})
    status = {'status': 'success'}
    filemeta.deleted = True
    try:
        await db_objects.update(filemeta)
    except Exception as e:
        status = {'status': 'error', 'error': str(e)}
    try:
        # only remove the file if there's nothing else pointing to it
        # this could be a payload and the user is just asking to remove the hosted aspect
        file_count = await db_objects.count(FileMeta.select().where( (FileMeta.path == filemeta.path) & (FileMeta.deleted == False)))
        file_count += await db_objects.count(Payload.select().where( (Payload.location == filemeta.path) & (Payload.deleted == False)))
        if file_count == 0:
            os.remove(filemeta.path)
    except Exception as e:
        pass
    return json({**status, **filemeta.to_json()})


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
        filename = os.path.split(task.params)[1].strip()
        if task.command.cmd == "screencapture":
            # we want to save these in a specific folder
            save_path = os.path.abspath(
                './app/files/{}/downloads/{}/{}/{}'.format(operation.name, task.callback.host, "screenshots", filename))
        else:
            save_path = os.path.abspath('./app/files/{}/downloads/{}/{}'.format(operation.name, task.callback.host, filename))
        extension = filename.split(".")[-1] if "." in filename else ""
        save_path = save_path[:((len(extension)+1)*-1)] if extension != "" else save_path
        count = 1
        if "." in filename:
            tmp_path = save_path + "." + str(extension)
        else:
            tmp_path = save_path
        while os.path.exists(tmp_path):
            if "." in filename:
                tmp_path = save_path + str(count) + "." + str(extension)
            else:
                tmp_path = save_path + str(count)
            count += 1
        save_path = tmp_path
        if not os.path.exists(os.path.split(save_path)[0]):
            os.makedirs(os.path.split(save_path)[0])
        filemeta = await db_objects.create(FileMeta, total_chunks=data['total_chunks'], task=task, operation=operation,
                                           path=save_path, operator=task.operator)
        if data['total_chunks'] == 0:
            filemeta.complete = True
            await db_objects.update(filemeta)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': "failed to create file"}
    status = {'status': 'success'}
    return {**status, **filemeta.to_json()}


@apfell.route(apfell.config['API_BASE'] + "/files/manual", methods=['POST'])
@inject_user()
@protected()
async def create_filemeta_in_database_manual(request, user):
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    if 'local_file' not in data:
        return json({'status': 'error', 'error': '"local_file" is a required parameter'})
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': "not registered in a current operation"})
    if data['local_file']:
        return json(await create_filemeta_in_database_manual_func(data, user))
    if request.files:
        code = request.files['upload_file'][0].body
        filename = request.files['upload_file'][0].name
    elif "code" in data and "file_name" in data:
        code = base64.b64decode(data["code"])
        filename = data['file_name']
    else:
        return json({'status': 'error', 'error': 'specified remote file, but did not upload anything'})
    # now write the file
    save_path = os.path.abspath('./app/files/{}/{}'.format(operation.name, filename))
    extension = save_path.split(".")[-1]
    save_path = ".".join(save_path.split(".")[:-1])
    count = 1
    tmp_path = save_path + "." + str(extension)
    while os.path.exists(tmp_path):
        tmp_path = save_path + str(count) + "." + str(extension)
        count += 1
    save_path = tmp_path
    code_file = open(save_path, "wb")
    code_file.write(code)
    code_file.close()
    return json(await create_filemeta_in_database_manual_func({"path": save_path}, user))


async def create_filemeta_in_database_manual_func(data, user):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
        operator = await db_objects.get(Operator, username=user['username'])
    except Exception as e:
        return {'status': 'error', 'error': "not registered in a current operation"}
    if 'path' not in data:
        return {'status': 'error', 'error': 'file path must be submitted'}
    try:
        if "/" not in data['path']:
            # we were given the name of a payload the use, so we need to make the full path
            try:
                payload = await db_objects.get(Payload, uuid=data['path'], operation=operation)
                data['path'] = payload.location
            except Exception as e:
                return {'status': 'error', 'error': 'failed to find that payload in your operation'}
        filemeta = await db_objects.create(FileMeta, total_chunks=1, operation=operation, path=data['path'],
                                           complete=True, chunks_received=1, operator=operator)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': str(e)}
    return {'status': 'success', **filemeta.to_json()}


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
            f = open(file_meta.path, 'rb').read(8)
            if f == b"'PNGf'($":
                f = open(file_meta.path, 'rb').read()
                new_file = open(file_meta.path, 'wb')
                new_file.write(unhexlify(f[8:-2]))
                new_file.close()
        await db_objects.update(file_meta)
    except Exception as e:
        print("Failed to save chunk to disk: " + str(e))
        return {'status': 'error', 'error': 'failed to store chunk: ' + str(e)}
    return {'status': 'success'}


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures", methods=['GET'])
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


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures/bycallback/<id:int>", methods=['GET'])
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


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures/<id:int>", methods=['GET'])
@inject_user()
@protected()
async def get_screencapture(request, user, id):
    try:
        file_meta = await db_objects.get(FileMeta, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find callback'})
    if file_meta.operation.name in user['operations']:
        return await file(file_meta.path, filename=file_meta.path.split("/")[-1])
    else:
        return json({"status": 'error', 'error': 'must be part of that callback\'s operation to see its screenshot'})