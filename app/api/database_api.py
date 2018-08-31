from app import apfell
import shutil
from sanic.response import json
import aiopg
from sanic_jwt.decorators import protected, inject_user


@apfell.route(apfell.config['API_BASE'] + "/database/clear_entries", methods=['GET'])
@inject_user()
@protected()
async def database_clear_entries(request, user):
    response = {}
    try:
        # purposefully not deleting operators right here. might need special flag for it?
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('TRUNCATE payload CASCADE;')
                    await cur.execute('TRUNCATE callback CASCADE;')
                    await cur.execute('TRUNCATE task CASCADE;')
                    await cur.execute('TRUNCATE response CASCADE;')
                    await cur.execute('TRUNCATE c2profile CASCADE;')
                    response = {'status': 'success'}
    except Exception as e:
        print(e)
        response = {'status': 'error', 'error': 'failed to clear database entries'}
    finally:
        pool.close()
        return json(response)


@apfell.route(apfell.config['API_BASE'] + "/database/clear_all_files", methods=['GET'])
@inject_user()
@protected()
async def database_clear_all_files(request, user):
    # just remove the operational files
    try:
        shutil.rmtree("./payloads/operations/default")
        return json({'status': 'success'})
    except OSError as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to delete files in operations folder'})


@apfell.route(apfell.config['API_BASE'] + "/database/clear_operators", methods=['GET'])
@inject_user()
@protected()
async def databaes_clear_operators(request, user):
    # just remove the operators
    response = {}
    try:
        async with aiopg.create_pool(apfell.config['DB_POOL_CONNECT_STRING']) as pool:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute('TRUNCATE operator CASCADE;')
                    response = {'status': 'success'}
    except Exception as e:
        print(e)
        response = {'status': 'error', 'error': 'failed to clear operator database entries'}
    finally:
        pool.close()
        return json(response)
