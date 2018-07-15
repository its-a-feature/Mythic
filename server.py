from app import apfell, dbloop, apfell_db, db_objects
import asyncio

if __name__ == "__main__":
    asyncio.set_event_loop(dbloop)
    server = apfell.create_server(host='0.0.0.0', port=80)
    loop = asyncio.get_event_loop()
    task = asyncio.ensure_future(server)
    db_objects.database.allow_sync = True  # raise AssertionError on ANY sync call
    try:
        loop.run_until_complete(apfell_db.connect_async(loop=dbloop))
        loop.run_forever()
    except:
        loop.stop()

