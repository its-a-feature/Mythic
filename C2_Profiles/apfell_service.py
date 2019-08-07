#!/usr/bin/env python3
import pika
import os
import time
import sys
import subprocess
import _thread
import base64
import json

credentials = pika.PlainCredentials('apfell_user', 'apfell_password')
connection_params = pika.ConnectionParameters( host='127.0.0.1', credentials=credentials, virtual_host="apfell_vhost")
running = False
process = None
thread = None
hostname = ""
output = ""
channel2 = None


def deal_with_stdout():
    global process
    global output
    while True:
        try:
            for line in iter(process.stdout.readline, b''):
                output += line.decode('utf-8')
        except Exception as e:
            print("Exiting thread due to: {}\n".format(str(e)))
            sys.stdout.flush()
            break


def send_status(message="", routing_key=""):
    global channel2
    try:
        channel2.basic_publish(exchange='apfell_traffic', routing_key=routing_key, body=message)
    except Exception as e:
        print("Exception in send_status: {}".format(str(e)))
        sys.stdout.flush()


def callback(ch, method, properties, body):
    global running
    global process
    global output
    global thread
    global hostname
    # messages of the form: c2.modify.PROFILE NAME.command
    command = method.routing_key.split(".")[3]
    #command = body.decode('utf-8')
    if command == "start":
        if not running:
            # make sure to start the /Apfell/server in the background
            os.chmod("/Apfell/server", mode=0o777)
            output = ""
            process = subprocess.Popen("/Apfell/server", stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd='/Apfell/', preexec_fn=os.setsid)
            thread = _thread.start_new_thread(deal_with_stdout, ())
            time.sleep(3)
            if process.returncode is not None:
                # this means something went wrong and the process is dead
                send_status(message="Failed to start\nOutput: {}".format(output), routing_key="c2.status.{}.stopped".format(hostname))
                output = ""
            else:
                running = True
                send_status(message="Started...\nOutput: {}".format(output), routing_key="c2.status.{}.running".format(hostname))
                output = ""
        else:
            send_status(message="Already running...\nOutput: {}".format(output), routing_key="c2.status.{}.running.start".format(hostname))
            output = ""
    elif command == "stop":
        if running:
            try:
                process.kill()
                process.communicate()
            except Exception as e:
                pass
            try:
                thread.exit()
            except Exception as e:
                pass
            running = False
            send_status(message="Process killed...\nOld Output: {}".format(output), routing_key="c2.status.{}.stopped.stop".format(hostname))
            output = ""
        else:
            send_status(message="Process not running...\nOld Output: {}".format(output), routing_key="c2.status.{}.stopped.stop".format(hostname))
            output = ""
        # make sure to stop the /Apfell/server in the background
    elif command == "status":
        if running:
            send_status(message="Output: {}".format(output), routing_key="c2.status.{}.running.status".format(hostname))
            output = ""
        else:
            send_status(message="C2 is not running", routing_key="c2.status.{}.stopped.status".format(hostname))
    elif command == "listfiles":
        files = []
        for (dirpath, dirnames, filenames) in os.walk("/Apfell/"):
            files.append({"folder": dirpath, "dirnames": dirnames, "filenames": filenames})
        send_status(message=json.dumps(files), routing_key="c2.status.{}.{}.listfiles".format(hostname, "running" if running else "stopped"))
    elif command == "getfile":
        try:
            message = json.loads(body.decode('utf-8'))
            path = os.path.abspath(message['folder'] + "/" + message['file'])
            if path.startswith("/Apfell/") and os.path.exists(path):
                file_data = open(path, 'rb').read()
            else:
                file_data = b""
            encoded_data = json.dumps(
                {"filename": message['file'], "data": base64.b64encode(file_data).decode('utf-8')})
        except Exception as e:
            file_data = b"File not found"
            encoded_data = base64.b64encode(file_data).decode('utf-8')
        send_status(message=encoded_data, routing_key="c2.status.{}.{}.getfile".format(hostname, "running" if running else "stopped"))
    elif command == "writefile":
        try:
            message = json.loads(body.decode('utf-8'))
            file = open(message['file_path'], 'wb')
            file.write(base64.b64decode(message['data']))
            response = "File written"
        except Exception as e:
            response = "Failed to decode message"
        send_status(message=response,
                    routing_key="c2.status.{}.{}.writefile".format(hostname, "running" if running else "stopped"))
    elif command == "removefile":
        try:
            message = json.loads(body.decode('utf-8'))
            path = os.path.abspath(message['folder'] + "/" + message['file'])
            response = ""
            if path.startswith("/Apfell/"):
                os.remove(path)
                response = json.dumps({"folder": message['folder'], "file": message['file']})
            else:
                response = "Failed to remove file"
        except Exception as e:
            response = "Failed to find or remove file"
        send_status(message=response,
                    routing_key="c2.status.{}.{}.removefile".format(hostname, "running" if running else "stopped"))
    else:
        print("Unknown command: {}".format(command))
        sys.stdout.flush()
    ch.basic_ack(delivery_tag=method.delivery_tag)


def apfell_service():
    global hostname
    global channel2
    while True:
        try:
            connection = pika.BlockingConnection(connection_params)
        except Exception as e:
            time.sleep( 2 )
            continue
        try:
            channel = connection.channel()
            channel2 = connection.channel()
            channel.basic_qos(prefetch_count=1)
            channel.exchange_declare(exchange='apfell_traffic', exchange_type='topic')
            result = channel.queue_declare('', exclusive=True)
            queue_name = result.method.queue
            channel.queue_bind(exchange='apfell_traffic', queue=queue_name, routing_key="c2.modify.{}.#".format(hostname))
            channel.basic_consume(queue=queue_name, on_message_callback=callback)
            print("Listening for c2.modify.{}.#".format(hostname))
            sys.stdout.flush()
            channel.start_consuming()
        except Exception as e:
            print(str(e))
# set the global hostname variable
hostname = sys.argv[1]
# start our service
apfell_service() 
