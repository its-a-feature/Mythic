#!/usr/bin/env python3
import pika
import os
import time
import sys
import subprocess
import _thread
import base64
import json
import socket

credentials = None # pika.PlainCredentials('apfell_user', 'apfell_password')
connection_params = None # pika.ConnectionParameters( host='127.0.0.1', credentials=credentials, virtual_host="apfell_vhost")
running = False
process = None
thread = None
hostname = ""
output = ""
channel2 = None
container_files_path = None


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
    global container_files_path
    # messages of the form: c2.modify.PROFILE NAME.command
    command = method.routing_key.split(".")[3]
    server_path = os.path.join(container_files_path, 'server')
    #command = body.decode('utf-8')
    if command == "start":
        if not running:
            # make sure to start the /Apfell/server in the background
            os.chmod(server_path, mode=0o777)
            output = ""
            process = subprocess.Popen(server_path, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=container_files_path)
            thread = _thread.start_new_thread(deal_with_stdout, ())
            time.sleep(3)
            process.poll()
            if process.returncode is not None:
                # this means something went wrong and the process is dead
                running = False
                send_status(message="Failed to start\nOutput: {}".format(output), routing_key="c2.status.{}.stopped.start".format(hostname))
                output = ""
            else:
                running = True
                send_status(message="Started with pid: {}...\nOutput: {}".format(str(process.pid), output), routing_key="c2.status.{}.running.start".format(hostname))
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
        for (dirpath, dirnames, filenames) in os.walk(container_files_path):
            files.append({"folder": dirpath, "dirnames": dirnames, "filenames": filenames})
        send_status(message=json.dumps(files), routing_key="c2.status.{}.{}.listfiles".format(hostname, "running" if running else "stopped"))
    elif command == "getfile":
        message = json.loads(body.decode('utf-8'))
        try:
            path = os.path.join(container_files_path, message['folder'], message['file'])
            # path = os.path.abspath(message['folder'] + "/" + message['file'])
            if path.startswith(container_files_path) and os.path.exists(path):
                file_data = open(path, 'rb').read()
            else:
                file_data = b""
        except Exception as e:
            file_data = b"File not found"
        encoded_data = json.dumps(
            {"filename": message['file'], "data": base64.b64encode(file_data).decode('utf-8')})
        send_status(message=encoded_data, routing_key="c2.status.{}.{}.getfile".format(hostname, "running" if running else "stopped"))
    elif command == "writefile":
        try:
            message = json.loads(body.decode('utf-8'))
            if 'folder' in message and 'folder' != "":
                file_path = os.path.join(container_files_path, message['folder'],  message['file_path'])
            else:
                file_path = os.path.join(container_files_path, message['file_path'])
            file = open(file_path, 'wb')
            file.write(base64.b64decode(message['data']))
            file.close()
            if 'folder' not in message:
                message['folder'] = container_files_path
            if container_files_path not in message['file_path']:
                message['file_path'] = file_path
            response = {"status": "success", "folder": message['folder'], "file": message['file_path']}
        except Exception as e:
            response = {"status": "error", "error": str(e)}
        send_status(message=json.dumps(response),
                    routing_key="c2.status.{}.{}.writefile".format(hostname, "running" if running else "stopped"))
    elif command == "removefile":
        try:
            message = json.loads(body.decode('utf-8'))
            # path = os.path.abspath(message['folder'] + "/" + message['file'])
            path = os.path.join(container_files_path, message['folder'], message['file'])
            response = ""
            if path.startswith(container_files_path):
                os.remove(path)
                response = json.dumps({"status": "success", "folder": message['folder'], "file": message['file']})
            else:
                response = json.dumps({"status": "error", "error": "Failed to remove file"})
        except Exception as e:
            response = json.dumps({"status": "error", "error": str(e)})
        send_status(message=response,
                    routing_key="c2.status.{}.{}.removefile".format(hostname, "running" if running else "stopped"))
    elif command == "removefolder":
        try:
            message = json.loads(body.decode('utf-8'))
            # path = os.path.abspath(message['folder'] + "/" + message['file'])
            path = os.path.join(container_files_path, message['folder'])
            response = ""
            if path.startswith(container_files_path) and path != container_files_path:
                os.rmdir(path)
                response = json.dumps({"folder": message['folder'], "status": "success"})
            else:
                response = response = json.dumps({"status": "error", "error": "Failed to remove folder"})
        except Exception as e:
            response = response = json.dumps({"status": "error", "error": str(e)})
        send_status(message=response,
                    routing_key="c2.status.{}.{}.removefolder".format(hostname, "running" if running else "stopped"))
    elif command == "addfolder":
        try:
            message = json.loads(body.decode('utf-8'))
            # path = os.path.abspath(message['folder'] + "/" + message['file'])
            path = os.path.join(container_files_path, message['folder'], message['sub_folder'])
            response = ""
            if path.startswith(container_files_path) and path != container_files_path:
                os.mkdir(path)
                response = json.dumps({"folder": message['folder'], "sub_folder": message['sub_folder'], "status": "success"})
            else:
                response = response = json.dumps({"status": "error", "error": "Failed to add folder"})
        except Exception as e:
            response = response = json.dumps({"status": "error", "error": str(e)})
        send_status(message=response,
                    routing_key="c2.status.{}.{}.addfolder".format(hostname, "running" if running else "stopped"))
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
            send_status(message="", routing_key="c2.status.{}.stopped.stop".format(hostname))
            channel.start_consuming()
        except Exception as e:
            print(str(e))


if __name__ == "__main__":
    config_file = open("rabbitmq_config.json", 'rb')
    main_config = json.loads(config_file.read().decode('utf-8'))
    config_file.close()
    credentials = pika.PlainCredentials(main_config['username'], main_config['password'])
    connection_params = pika.ConnectionParameters(host=main_config['host'], credentials=credentials,
                                                  virtual_host=main_config['virtual_host'])
    if main_config['name'] == "hostname":
        hostname = socket.gethostname()
    else:
        hostname = main_config['name']

    container_files_path = os.path.abspath(main_config['container_files_path'])

    if not os.path.exists(container_files_path):
        os.makedirs(container_files_path)

    apfell_service()
