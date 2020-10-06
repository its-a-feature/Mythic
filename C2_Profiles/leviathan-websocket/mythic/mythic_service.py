#!/usr/bin/env python3
import aio_pika
import os
import time
import sys
import subprocess
import _thread
import base64
import json
import socket
import asyncio
import pathlib
import traceback
from C2ProfileBase import *
from importlib import import_module, invalidate_caches
from functools import partial

credentials = None
connection_params = None
running = False
process = None
thread = None
hostname = ""
output = ""
exchange = None
container_files_path = None


def deal_with_stdout():
    global process
    global output
    while True:
        try:
            for line in iter(process.stdout.readline, b""):
                output += line.decode("utf-8")
        except Exception as e:
            print("Exiting thread due to: {}\n".format(str(e)))
            sys.stdout.flush()
            break


def import_all_c2_functions():
    import glob

    # Get file paths of all modules.
    modules = glob.glob("c2_functions/*.py")
    invalidate_caches()
    for x in modules:
        if not x.endswith("__init__.py") and x[-3:] == ".py":
            module = import_module("c2_functions." + pathlib.Path(x).stem, package=None)
            for el in dir(module):
                if "__" not in el:
                    globals()[el] = getattr(module, el)


async def send_status(message="", routing_key=""):
    global exchange
    try:
        message_body = aio_pika.Message(message.encode())
        await exchange.publish(message_body, routing_key=routing_key)
    except Exception as e:
        print("Exception in send_status: {}".format(str(e)))
        sys.stdout.flush()


async def callback(message: aio_pika.IncomingMessage):
    global running
    global process
    global output
    global thread
    global hostname
    global container_files_path
    with message.process():
        # messages of the form: c2.modify.PROFILE NAME.command
        try:
            command = message.routing_key.split(".")[3]
            username = message.routing_key.split(".")[4]
            server_path = container_files_path / "server"
            # command = body.decode('utf-8')
            if command == "start":
                if not running:
                    # make sure to start the /Apfell/server in the background
                    os.chmod(server_path, mode=0o777)
                    output = ""
                    process = subprocess.Popen(
                        str(server_path),
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        cwd=str(container_files_path),
                    )
                    thread = _thread.start_new_thread(deal_with_stdout, ())
                    time.sleep(3)
                    process.poll()
                    if process.returncode is not None:
                        # this means something went wrong and the process is dead
                        running = False
                        await send_status(
                            message="Failed to start\nOutput: {}".format(output),
                            routing_key="c2.status.{}.stopped.start.{}".format(
                                hostname, username
                            ),
                        )
                        output = ""
                    else:
                        running = True
                        await send_status(
                            message="Started with pid: {}...\nOutput: {}".format(
                                str(process.pid), output
                            ),
                            routing_key="c2.status.{}.running.start.{}".format(
                                hostname, username
                            ),
                        )
                        output = ""
                else:
                    await send_status(
                        message="Already running...\nOutput: {}".format(output),
                        routing_key="c2.status.{}.running.start.{}".format(
                            hostname, username
                        ),
                    )
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
                    await send_status(
                        message="Process killed...\nOld Output: {}".format(output),
                        routing_key="c2.status.{}.stopped.stop.{}".format(
                            hostname, username
                        ),
                    )
                    output = ""
                else:
                    await send_status(
                        message="Process not running...\nOld Output: {}".format(output),
                        routing_key="c2.status.{}.stopped.stop.{}".format(
                            hostname, username
                        ),
                    )
                    output = ""
                # make sure to stop the /Apfell/server in the background
            elif command == "status":
                if running:
                    await send_status(
                        message="Output: {}".format(output),
                        routing_key="c2.status.{}.running.status.{}".format(
                            hostname, username
                        ),
                    )
                    output = ""
                else:
                    await send_status(
                        message="C2 is not running",
                        routing_key="c2.status.{}.stopped.status.{}".format(
                            hostname, username
                        ),
                    )
            elif command == "get_config":
                try:
                    path = container_files_path / "config.json"
                    file_data = open(path, "rb").read()
                except Exception as e:
                    file_data = b"File not found"
                encoded_data = json.dumps(
                    {
                        "filename": "config.json",
                        "data": base64.b64encode(file_data).decode("utf-8"),
                    }
                )
                await send_status(
                    message=encoded_data,
                    routing_key="c2.status.{}.{}.get_config.{}".format(
                        hostname, "running" if running else "stopped", username
                    ),
                )
            elif command == "writefile":
                try:
                    message = json.loads(message.body.decode("utf-8"))
                    file_path = container_files_path / message["file_path"]
                    file_path = file_path.resolve()
                    if container_files_path not in file_path.parents:
                        response = {
                            "status": "error",
                            "error": "trying to break out of path",
                        }
                    else:
                        file = open(file_path, "wb")
                        file.write(base64.b64decode(message["data"]))
                        file.close()
                        response = {"status": "success", "file": message["file_path"]}
                except Exception as e:
                    response = {"status": "error", "error": str(e)}
                await send_status(
                    message=json.dumps(response),
                    routing_key="c2.status.{}.{}.writefile.{}".format(
                        hostname, "running" if running else "stopped", username
                    ),
                )
            elif command == "sync_classes":
                try:
                    import_all_c2_functions()
                    # c2profile = {}
                    for cls in C2Profile.__subclasses__():
                        c2profile = cls().to_json()
                        break
                    await send_status(
                        message=json.dumps(c2profile),
                        routing_key="c2.status.{}.{}.sync_classes.{}".format(
                            hostname, "running" if running else "stopped", username
                        ),
                    )
                except Exception as e:
                    await send_status(
                        message='{"message": "Error while syncing info: {}"}'.format(
                            str(traceback.format_exc())
                        ),
                        routing_key="c2.status.{}.{}.sync_classes.{}".format(
                            hostname, "running" if running else "stopped", username
                        ),
                    )
            else:
                print("Unknown command: {}".format(command))
                sys.stdout.flush()
        except Exception as e:
            print("Failed overall message processing: " + str(e))
            sys.stdout.flush()


async def sync_classes():
    try:
        import_all_c2_functions()
        c2profile = {}
        for cls in C2Profile.__subclasses__():
            c2profile = cls().to_json()
            break
        await send_status(
            message=json.dumps(c2profile),
            routing_key="c2.status.{}.{}.sync_classes.{}".format(
                hostname, "stopped", ""
            ),
        )
    except Exception as e:
        await send_status(
            message='{"message": "Error while syncing info: {}"}'.format(
                str(traceback.format_exc())
            ),
            routing_key="c2.status.{}.{}.sync_classes.{}".format(
                hostname, "stopped", ""
            ),
        )


async def rabbit_c2_rpc_callback(
    exchange: aio_pika.Exchange, message: aio_pika.IncomingMessage
):
    with message.process():
        request = json.loads(message.body.decode())
        if "action" in request:
            response = await globals()[request["action"]](request)
            response = json.dumps(response.to_json()).encode()
        else:
            response = json.dumps(
                {"status": "error", "error": "Missing action"}
            ).encode()
        try:
            await exchange.publish(
                aio_pika.Message(body=response, correlation_id=message.correlation_id),
                routing_key=message.reply_to,
            )
        except Exception as e:
            print(
                "Exception trying to send message back to container for rpc! " + str(e)
            )
            sys.stdout.flush()


async def connect_and_consume_rpc():
    connection = None
    global hostname
    while connection is None:
        try:
            connection = await aio_pika.connect_robust(
                host="127.0.0.1",
                login="mythic_user",
                password="mythic_password",
                virtualhost="mythic_vhost",
            )
            channel = await connection.channel()
            # get a random queue that only the apfell server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue("{}_rpc_queue".format(hostname))
            await channel.set_qos(prefetch_count=50)
            try:
                task = queue.consume(
                    partial(rabbit_c2_rpc_callback, channel.default_exchange)
                )
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                print("Exception in connect_and_consume .consume: {}".format(str(e)))
                sys.stdout.flush()
        except (ConnectionError, ConnectionRefusedError) as c:
            print("Connection to rabbitmq failed, trying again...")
            sys.stdout.flush()
        except Exception as e:
            print("Exception in connect_and_consume_rpc connect: {}".format(str(e)))
            # print("Exception in connect_and_consume connect: {}".format(str(e)))
            sys.stdout.flush()
        await asyncio.sleep(2)


async def mythic_service():
    global hostname
    global exchange
    global container_files_path
    connection = None
    config_file = open("rabbitmq_config.json", "rb")
    main_config = json.loads(config_file.read().decode("utf-8"))
    config_file.close()
    if main_config["name"] == "hostname":
        hostname = socket.gethostname()
    else:
        hostname = main_config["name"]
    container_files_path = pathlib.Path(
        os.path.abspath(main_config["container_files_path"])
    )
    container_files_path = container_files_path / "c2_code"
    while connection is None:
        try:
            connection = await aio_pika.connect_robust(
                host=main_config["host"],
                login=main_config["username"],
                password=main_config["password"],
                virtualhost=main_config["virtual_host"],
            )
        except Exception as e:
            await asyncio.sleep(2)
    try:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            "mythic_traffic", aio_pika.ExchangeType.TOPIC
        )
        queue = await channel.declare_queue("", exclusive=True)
        await queue.bind(
            exchange="mythic_traffic", routing_key="c2.modify.{}.#".format(hostname)
        )
        # just want to handle one message at a time so we can clean up and be ready
        await channel.set_qos(prefetch_count=30)
        print("Listening for c2.modify.{}.#".format(hostname))
        sys.stdout.flush()
        task = queue.consume(callback)
        await sync_classes()
        task4 = asyncio.ensure_future(connect_and_consume_rpc())
        result = await asyncio.gather(task, task4)
        # send_status(message="", routing_key="c2.status.{}.stopped.stop".format(hostname))
    except Exception as e:
        print(str(traceback.format_exc()))
        sys.stdout.flush()


async def heartbeat_loop():
    config_file = open("rabbitmq_config.json", "rb")
    main_config = json.loads(config_file.read().decode("utf-8"))
    config_file.close()
    if main_config["name"] == "hostname":
        hostname = socket.gethostname()
    else:
        hostname = main_config["name"]
    while True:
        try:
            connection = await aio_pika.connect_robust(
                host=main_config["host"],
                login=main_config["username"],
                password=main_config["password"],
                virtualhost=main_config["virtual_host"],
            )
            channel = await connection.channel()
            # declare our heartbeat exchange that everybody will publish to, but only the apfell server will are about
            exchange = await channel.declare_exchange(
                "mythic_traffic", aio_pika.ExchangeType.TOPIC
            )
        except Exception as e:
            print(str(e))
            await asyncio.sleep(2)
            continue
        while True:
            try:
                # routing key is ignored for fanout, it'll go to anybody that's listening, which will only be the server
                await exchange.publish(
                    aio_pika.Message("heartbeat".encode()),
                    routing_key="c2.heartbeat.{}".format(hostname),
                )
                await asyncio.sleep(10)
            except Exception as e:
                print(str(e))
                # if we get an exception here, break out to the bigger loop and try to connect again
                break

# start our service
loop = asyncio.get_event_loop()
loop.create_task(mythic_service())
loop.create_task(heartbeat_loop())
loop.run_forever()
