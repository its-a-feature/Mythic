import re
from app.database_models.model import FileMeta, FileData
from app import db_objects
import os
from math import ceil


async def breakout_quoted_params(input):
    # return an array of the broken out params as if they were on the command line
    # or return an error
    regex = re.compile(r'((?<![\\])[\'"])((?:.(?!(?<![\\])\1))*.?)\1')
    potential_groups = regex.findall(input)
    return [x[1] for x in potential_groups]


async def store_local_file_into_db(params):
    # params must specify:
    #  origin_location (location on local disk)
    #  origin_host (for now this will always be the server)
    chunk_size = 512000  # (512KB) is arbitrary
    try:
        file = open(params['origin_location'], 'rb')
        size = os.path.getsize(params['origin_location'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to open local file'}
    try:
        total_chunks = ceil(size/chunk_size)
        filemeta = await db_objects.create(FileMeta, total_chunks=total_chunks)
        for i in range(0, total_chunks):
            data = file.read(chunk_size)
            file = await db_objects.create(FileData, meta_data=filemeta,
                                           chunk_num=i, chunk_data=data)
        return {'status': 'success', 'filemeta_id': filemeta.id}
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to upload file to db'}

