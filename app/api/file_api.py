from app import apfell, db_objects
from app.database_models.model import FileMeta, FileData, Task
from sanic.response import json, html
import base64
from sanic_jwt.decorators import protected, inject_user


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
async def get_file_from_database(request, id):
    try:
        file_meta = await db_objects.get(FileMeta, id=id)
    except Exception as e:
        print(e)
        return json({}, status=404)
    # now that we have the file metadata, get all the pieces to send back
    try:
        file_pieces = await db_objects.execute(FileData.select().where(FileData.meta_data == file_meta).order_by(FileData.chunk_num))
        data = bytearray()
        for piece in file_pieces:
            data += piece.chunk_data.tobytes()
        encdata = base64.b64encode(data).decode("utf-8")
        return html(encdata)
    except Exception as e:
        print(e)
        return json({}, status=500)


@apfell.route(apfell.config['API_BASE'] + "/files/<id:int>/<chunk:int>", methods=['GET'])
async def get_chunk_from_database(request, id, chunk):
    # get a chunk of a file from the database
    try:
        file_meta = await db_objects.get(FileMeta, id=id)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get file object'})
    try:
        file_chunk = await db_objects.get(FileData, meta_data=file_meta, chunk_num=chunk)
        return json(file_chunk.to_json())
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get chunk'})


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
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': "failed to find task"})
    try:
        filemeta = await db_objects.create(FileMeta, total_chunks=data['total_chunks'], task=task)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': "failed to create file"})
    status = {'status': 'success'}
    return json({**status, **filemeta.to_json()})


# after calling the above path, the implant calls this to upload the content
@apfell.route(apfell.config['API_BASE'] + "/files/<id:int>", methods=['POST'])
async def download_file_to_database(request, id):
    return await download_file_to_database_func({**request.json, "file_id": id})


async def download_file_to_database_func(data):
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
        piece = await db_objects.create(FileData, chunk_num=data['chunk_num'],
                                        chunk_data=chunk_data, meta_data=file_meta)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to store chunk'})
    return json({'status': 'success'})