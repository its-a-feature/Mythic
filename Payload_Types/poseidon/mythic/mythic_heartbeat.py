#!/usr/bin/env python3
import aio_pika
import socket
import asyncio
import json


async def main_loop():
    config_file = open("rabbitmq_config.json", 'rb')
    main_config = json.loads(config_file.read().decode('utf-8'))
    config_file.close()
    if main_config['name'] == "hostname":
        hostname = socket.gethostname()
    else:
        hostname = main_config['name']
    while True:
        try:
            connection = await aio_pika.connect_robust(host=main_config['host'],
                                                       login=main_config['username'],
                                                       password=main_config['password'],
                                                       virtualhost=main_config['virtual_host'])
            channel = await connection.channel()
            # declare our heartbeat exchange that everybody will publish to, but only the mythic server will are about
            exchange = await channel.declare_exchange('mythic_traffic', aio_pika.ExchangeType.TOPIC)
        except Exception as e:
            print(str(e))
            await asyncio.sleep( 2 )
            continue
        while True:
            try:
                # routing key is ignored for fanout, it'll go to anybody that's listening, which will only be the server
                await exchange.publish( aio_pika.Message("heartbeat".encode()), routing_key="pt.heartbeat.{}".format(hostname))
                await asyncio.sleep( 10 )
            except Exception as e:
                print(str(e))
                # if we get an exception here, break out to the bigger loop and try to connect again
                break

# start our service
loop = asyncio.get_event_loop()
loop.create_task(main_loop())
loop.run_forever()
