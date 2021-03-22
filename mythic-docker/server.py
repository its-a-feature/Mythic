from app import (
    mythic,
    dbloop,
    mythic_db,
    db_objects,
    listen_ip,
    listen_port,
    keep_logs,
    debugging_enabled,
)
import asyncio
from app.api.rabbitmq_api import start_listening
import traceback


if __name__ == "__main__":
    try:
        asyncio.set_event_loop(dbloop)
        server = mythic.create_server(
                host=listen_ip,
                port=listen_port,
                debug=debugging_enabled,
                return_asyncio_server=True,
                access_log=keep_logs,
            )
        loop = asyncio.get_event_loop()
        task = asyncio.ensure_future(server)
        task2 = asyncio.ensure_future(start_listening())
        # thanks to some awesome people at the sanic community forums,
        # we can now detect when the bound port is already in use
        def callback(fut):
            try:
                fetch_count = fut.result()
            except OSError as e:
                print("probably the port set is being used")
                fut.get_loop().stop()

        task.add_done_callback(callback)

        db_objects.database.allow_sync = True #logging.WARNING # = True  # logging.WARNING
        try:
            loop.run_until_complete(mythic_db.connect_async(loop=dbloop))
            loop.run_forever()
        except Exception as e:
            loop.stop()
    except Exception as e:
        traceback.print_exc()
