from app import apfell, db_objects
from app.database_models.model import FileMeta, Callback, Payload, Task, Command
from sanic.response import json, raw, file
import base64
from sanic_jwt.decorators import scoped, inject_user
import os
from binascii import unhexlify
import json as js
import app.crypto as crypt
import sys
import app.database_models.model as db_model
from sanic.exceptions import abort
import shutil


@apfell.route(apfell.config['API_BASE'] + "/files", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_files_meta(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.filemeta_query()
        files = await db_objects.prefetch(query, Task.select(), Command.select(), Callback.select())
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get files'})
    return json([f.to_json() for f in files if f.operation.name in user['operations']])


@apfell.route(apfell.config['API_BASE'] + "/files/current_operation", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_current_operations_files_meta(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if user['current_operation'] != "":
        try:
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user['current_operation'])
            query = await db_model.filemeta_query()
            files = await db_objects.prefetch(query.where(FileMeta.operation == operation), Task.select(), Command.select(), Callback.select())
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to get files'})
        return json([f.to_json() for f in files if not "screenshots" in f.path ])
    else:
        return json({"status": 'error', 'error': 'must be part of an active operation'})


@apfell.route(apfell.config['API_BASE'] + "/files/<fid:string>/callbacks/<cid:string>", methods=['GET'])
async def get_one_file(request, fid, cid):
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, agent_file_id=fid)
        query = await db_model.callback_query()
        callback = await db_objects.get(query, agent_callback_id=cid)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
        if callback.encryption_type != "" and callback.encryption_type is not None:
            # encrypt the message before returning it
            if callback.encryption_type == "AES256":
                raw_encrypted = await crypt.encrypt_AES256(data=encoded_data,
                                                           key=base64.b64decode(callback.encryption_key))
                return raw(base64.b64encode(raw_encrypted), status=200)
        return raw(encoded_data)
    elif file_meta.deleted:
        return json({'status': 'error', 'error': 'temporary file deleted'})
    else:
        return json({'status': 'error', 'error': 'file not done downloading'})


@apfell.route(apfell.config['API_BASE'] + "/files/download/<id:string>", methods=['GET'])
async def download_file(request, id):
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, agent_file_id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'file not found'})
    # now that we have the file metadata, get the file if it's done downloading
    if file_meta.complete and not file_meta.deleted:
        try:
            return await file(file_meta.path, filename=file_meta.path.split("/")[-1])
        except Exception as e:
            print("File not found")
            return raw('', status=404)
    elif not file_meta.complete:
        print("File not done downloading")
        return raw('', status=404)
    else:
        print("File was deleted")
        return raw('', status=404)


@apfell.route(apfell.config['API_BASE'] + "/files/<id:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_filemeta_in_database(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.filemeta_query()
        filemeta = await db_objects.get(query, id=id, operation=operation)
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
        query = await db_model.filemeta_query()
        file_count = await db_objects.count(query.where( (FileMeta.path == filemeta.path) & (FileMeta.deleted == False)))
        query = await db_model.payload_query()
        file_count += await db_objects.count(query.where( (Payload.location == filemeta.path) & (Payload.deleted == False)))
        if file_count == 0:
            os.remove(filemeta.path)
    except Exception as e:
        pass
    return json({**status, **filemeta.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/files/", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_filemeta_in_database(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    return await json(create_filemeta_in_database_func(request.json))


async def create_filemeta_in_database_func(data):
    #  create a filemeta object where we will then start uploading our file
    #  expects total_chunks, and task
    if 'total_chunks' not in data:
        return {'status': 'error', 'error': 'total_chunks required'}
    if 'task' not in data:
        return {'status': 'error', 'error': 'corresponding task id required'}
    try:
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.agent_task_id == data['task']), Command.select())
        task = list(task)[0]
        query = await db_model.callback_query()
        callback = await db_objects.get(query.where(Callback.id == task.callback))
        operation = callback.operation
    except Exception as e:
        print("{} {}".format(str(sys.exc_info()[-1].tb_lineno), str(e)))
        return {'status': 'error', 'error': "failed to find task"}
    try:
        filename = os.path.split(task.params)[1].strip()
        if task.command.cmd == "screencapture":
            # we want to save these in a specific folder
            save_path = os.path.abspath(
                './app/files/{}/downloads/{}/{}/{}'.format(operation.name, callback.host, "screenshots", filename))
        else:
            save_path = os.path.abspath('./app/files/{}/downloads/{}/{}'.format(operation.name, callback.host, filename))
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
        open(save_path, 'a').close()
        filemeta = await db_objects.create(FileMeta, total_chunks=data['total_chunks'], task=task, operation=operation,
                                           path=save_path, operator=task.operator)
        if data['total_chunks'] == 0:
            filemeta.complete = True
            await db_objects.update(filemeta)
    except Exception as e:
        print("{} {}".format(str(sys.exc_info()[-1].tb_lineno), str(e)))
        return {'status': 'error', 'error': "failed to create file"}
    status = {'status': 'success'}
    return {**status, **filemeta.to_json()}


@apfell.route(apfell.config['API_BASE'] + "/files/manual", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_filemeta_in_database_manual(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    if 'local_file' not in data:
        return json({'status': 'error', 'error': '"local_file" is a required parameter'})
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
    except Exception as e:
        return {'status': 'error', 'error': "not registered in a current operation"}
    if 'path' not in data:
        return {'status': 'error', 'error': 'file path must be submitted'}
    try:
        if "/" not in data['path']:
            # we were given the name of a payload the use, so we need to make the full path
            try:
                query = await db_model.payload_query()
                payload = await db_objects.get(query, uuid=data['path'], operation=operation)
                if payload.payload_type.external:
                    return {'status': 'error', 'error': 'cannot host payloads that were created externally by UUID. Must upload the file.'}
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
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def download_file_to_disk(request, id, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    return await json(download_file_to_disk_func({**request.json, "file_id": id}))


async def download_file_to_disk_func(data):
    #  upload content blobs to be associated with filemeta id
    if 'chunk_num' not in data:
        return {'status': 'error', 'error': 'missing chunk_num'}
    if 'chunk_data' not in data:
        return {'status': 'error', 'error': 'missing chunk data'}
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, agent_file_id=data['file_id'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get File info'}
    try:
        # print("trying to base64 decode chunk_data")
        chunk_data = base64.b64decode(data['chunk_data'])
        f = open(file_meta.path, 'ab')
        f.write(chunk_data)
        f.close()
        async with db_objects.atomic():
            file_meta = await db_objects.get(query, agent_file_id=data['file_id'])
            file_meta.chunks_received = file_meta.chunks_received + 1
            # print("received chunk num {}".format(data['chunk_num']))
            if file_meta.chunks_received == file_meta.total_chunks:
                file_meta.complete = True
            await db_objects.update(file_meta)
            # if we ended up downloading a file from mac's screencapture utility, we need to fix it a bit
        f = open(file_meta.path, 'rb').read(8)
        if f == b"'PNGf'($":
            f = open(file_meta.path, 'rb').read()
            new_file = open(file_meta.path, 'wb')
            new_file.write(unhexlify(f[8:-2]))
            new_file.close()
    except Exception as e:
        print("Failed to save chunk to disk: " + str(e))
        return {'status': 'error', 'error': 'failed to store chunk: ' + str(e)}
    return {'status': 'success'}


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def list_all_screencaptures_per_operation(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    if user['current_operation'] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.filemeta_query()
        screencaptures = await db_objects.prefetch(query.where(FileMeta.path.regexp(".*{}/downloads/.*/screenshots/".format(operation.name))), Task.select(), Command.select(), Callback.select())
        screencapture_paths = []
        for s in screencaptures:
            screencapture_paths.append(s.to_json())
        return json({'status': 'success', 'files': screencapture_paths})
    else:
        return json({"status": 'error', 'error': 'must be part of a current operation to see an operation\'s screencaptures'})


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures/bycallback/<id:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def list_all_screencaptures_per_callback(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find callback'})
    screencapture_paths = []
    if callback.operation.name in user['operations']:
        query = await db_model.filemeta_query()
        screencaptures = await db_objects.prefetch(
            query.where(FileMeta.path.regexp(".*{}/downloads/.*/screenshots/".format(callback.operation.name))), Task.select(), Command.select(), Callback.select())
        for s in screencaptures:
            if s.task.callback == callback:
                screencapture_paths.append(s.to_json())
        return json({'status': 'success', 'callback': callback.id, 'files': screencapture_paths})
    else:
        return json({'status': 'error', 'error': 'must be part of that callback\'s operation to see its screenshots'})


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures/<id:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_screencapture(request, user, id):
    #if user['auth'] not in ['access_token', 'apitoken']:
    #    abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find callback'})
    if file_meta.operation.name in user['operations']:
        return await file(file_meta.path, filename=file_meta.path.split("/")[-1])
    else:
        return json({"status": 'error', 'error': 'must be part of that callback\'s operation to see its screenshot'})


@apfell.route(apfell.config['API_BASE'] + "/files/screencaptures/<id:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_screencapture(request, user, id):
    #if user['auth'] not in ['access_token', 'apitoken']:
    #    abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.filemeta_query()
        file_meta = await db_objects.get(query, agent_file_id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find callback'})
    if file_meta.operation.name in user['operations']:
        return await file(file_meta.path, filename=file_meta.path.split("/")[-1])
    else:
        return json({"status": 'error', 'error': 'must be part of that callback\'s operation to see its screenshot'})


@apfell.route(apfell.config['API_BASE'] + "/files/host_payload", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def host_payload_file_manually_by_name(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': "not registered in a current operation"})
    if 'uuid' not in data:
        return json({'status': 'error', 'error': 'Payload UUID must be specified'})
    if 'host' not in data:
        return json({'status': 'error', 'error': 'must use "host" to specify to host or unhost the payload'})
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=data['uuid'])
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find payload: ' + data['uuid']})
    if not data['host']:
        try:
            os.remove(payload.hosted_path)
        except Exception as e:
            pass
        payload.hosted_path = ""
        await db_objects.update(payload)
        return json({'status': 'success', **payload.to_json()})
    else:
        if payload.hosted_path != "":
            try:
                os.remove(payload.hosted_path)
            except Exception as e:
                pass
            payload.hosted_path = ""
    if 'name' not in data:
        data['name'] = payload.location.split("/")[-1]

    path = os.path.abspath('./app/payloads/operations/_hosting_dir/{}'.format(data['name']))
    if os.path.abspath('./app/payloads/operations/_hosting_dir/') not in path:
        return json({'status': 'error', 'error': 'final path not in the right directory'})
    if os.path.exists(path):
        save_path = path
        extension = save_path.split(".")[-1] if "." in path else ""
        save_path = ".".join(save_path.split(".")[:-1]) if "." in path else save_path
        count = 1
        tmp_path = save_path + "." + str(extension) if "." in save_path else save_path
        while os.path.exists(tmp_path):
            tmp_path = save_path + str(count) + "." + str(extension) if "." in path else save_path + str(count)
            count += 1
        path = tmp_path
    try:
        shutil.copyfile(payload.location, path)
        payload.hosted_path = path
        await db_objects.update(payload)
        return json({'status': 'success', **payload.to_json()})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to copy file: ' + str(e)})
