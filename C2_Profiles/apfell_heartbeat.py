#!/usr/bin/env python3
import aio_pika
import socket
import asyncio
hostname = socket.gethostname()


async def main_loop():
    while True:
        try:
            connection = await aio_pika.connect_robust(host="127.0.0.1",
                                                       login="apfell_user",
                                                       password="apfell_password",
                                                       virtualhost="apfell_vhost")
            channel = await connection.channel()
            # declare our heartbeat exchange that everybody will publish to, but only the apfell server will are about
            exchange = await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
        except Exception as e:
            print(str(e))
            await asyncio.sleep( 2 )
            continue
        while True:
            try:
                # routing key is ignored for fanout, it'll go to anybody that's listening, which will only be the server
                await exchange.publish( aio_pika.Message("heartbeat".encode()), routing_key="c2.heartbeat.{}".format(hostname))
                await asyncio.sleep( 5 )
            except Exception as e:
                print(str(e))
                # if we get an exception here, break out to the bigger loop and try to connect again
                break

# start our service
loop = asyncio.get_event_loop()
loop.create_task(main_loop())
loop.run_forever()
