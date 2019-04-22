#!/usr/bin/env python3
import pika
import socket
import time


hostname = socket.gethostname()
credentials = pika.PlainCredentials('apfell_user', 'apfell_password')
connection_params = pika.ConnectionParameters(host='127.0.0.1', credentials=credentials, virtual_host='apfell_vhost')

while(True):
    try:
        connection = pika.BlockingConnection(connection_params)
        channel = connection.channel()
        # declare our heartbeat exchange that everybody will publish to, but only the apfell server will are about
        channel.exchange_declare(exchange='apfell_traffic', exchange_type='topic')
        # channel.queue_declare(queue='heartbeat', durable=True)
    except Exception as e:
        time.sleep( 2 )
        continue
    while(True):
        try:
            # routing key is ignored for fanout, it'll go to anybody that's listening, which will only be the server
            channel.basic_publish(exchange='apfell_traffic', routing_key='c2.heartbeat.{}'.format(hostname), body="heartbeat")
            time.sleep( 5 )
        except Exception as e:
            # if we get an exception here, break out to the bigger loop and try to connect again
            break

