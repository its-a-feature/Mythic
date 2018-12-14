from app import apfell, dbloop, apfell_db, db_objects, use_ssl, listen_port, listen_ip, ssl_cert_path, ssl_key_path
import asyncio
import ssl

if __name__ == "__main__":
    asyncio.set_event_loop(dbloop)
    if use_ssl:
        context = ssl.create_default_context(purpose=ssl.Purpose.CLIENT_AUTH)
        context.load_cert_chain(ssl_cert_path, keyfile=ssl_key_path)
        server = apfell.create_server(host=listen_ip, port=listen_port, ssl=context)
    else:
        server = apfell.create_server(host=listen_ip, port=listen_port, debug=False)
    loop = asyncio.get_event_loop()
    task = asyncio.ensure_future(server)
    db_objects.database.allow_sync = True  # raise AssertionError on ANY sync call, needs to be worked out though
    try:
        loop.run_until_complete(apfell_db.connect_async(loop=dbloop))
        loop.run_forever()
    except Exception as e:
        loop.stop()