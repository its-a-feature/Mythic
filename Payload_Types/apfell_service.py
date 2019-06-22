#!/usr/bin/env python3
import aio_pika
import os
import sys
import base64
import json
import uuid
import shutil
import asyncio

# set the global hostname variable
hostname = sys.argv[1]
output = ""
exchange = None


async def send_status(message="", command="", status=""):
    global exchange
    # status is success or error
    try:
        message_body = aio_pika.Message(message.encode())
        # Sending the message
        await exchange.publish(
            message_body, routing_key="pt.status.{}.{}.{}".format(hostname, command, status)
        )
    except Exception as e:
        print("Exception in send_status: {}".format(str(e)))


async def callback(message: aio_pika.IncomingMessage):
    with message.process():
        # messages of the form: pt.task.PAYLOAD_TYPE.command
        pieces = message.routing_key.split(".")
        command = pieces[3]
        if command == "create_payload_with_code":
            try:
                # pt.task.PAYLOAD_TYPE.create_payload_with_code.UUID
                message_json = json.loads(base64.b64decode(message.body).decode('utf-8'), strict=False)
                # body is: {"zip": base64 zip of all code, "transforms": [{"name": "func_name", "order": func_order, "param": "param_value}, {}] }
                temp_zip = "/Apfell/" + str(uuid.uuid4()) + ".zip"
                zip_file = open(temp_zip, 'wb')
                zip_file.write(base64.b64decode(message_json['zip'].encode()))
                zip_file.close()
                # make our temporary folder
                working_dir = str(uuid.uuid4())
                os.mkdir(working_dir)
                # extract files to this folder
                shutil.unpack_archive(temp_zip, "/Apfell/" + working_dir)
                # now start going through the transforms
                # make sure we have the most up-to-date transform code loaded
                try:
                    import importlib.util
                    spec = importlib.util.spec_from_file_location("apfell", "/Apfell/apfell/transforms.py")
                    foo = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(foo)
                except Exception as e:
                    print(e)
                transform = foo.TransformOperation(working_dir=working_dir)
                # do step 0, prior_output = path of our newly written file
                transform_output = os.path.abspath(working_dir) + "/" + pieces[2] + "." + message_json['extension']
                transform_output = transform_output.replace("..", ".")  # in case we end up with two "." due to the extension
                if len(message_json['transforms']) == 0:
                    transform_output = open(transform_output, 'rb').read()
                for t in message_json['transforms']:
                    try:
                        transform_output = await getattr(transform, t['name'])(transform_output, t['parameter'])
                    except Exception as e:
                        print(e)
                        shutil.rmtree(working_dir)
                        os.remove(temp_zip)
                        await send_status('failed to apply transform {}, with message: {}'.format(t['name'], str(e)), "create_payload_with_code", "error.{}".format(pieces[4]))
                        return
                if isinstance(transform_output, str):
                    await send_status(base64.b64encode(transform_output.encode()).decode('utf-8'),
                                      "create_payload_with_code", "success.{}".format(pieces[4]))
                else:
                    await send_status(base64.b64encode(transform_output).decode('utf-8'),
                                      "create_payload_with_code", "success.{}".format(pieces[4]))
                shutil.rmtree(working_dir)
                os.remove(temp_zip)
            except Exception as e:
                shutil.rmtree(working_dir)
                os.remove(temp_zip)
                await send_status("{} - {}".format(str(sys.exc_info()[-1].tb_lineno), str(e)), "create_payload_with_code", "error.{}".format(pieces[4]))
                return
        elif command == "create_external_payload":
            await send_status("NOT IMPLEMENTED", "create_external_payload", "error.{}".format(pieces[4]))
        elif command == "load_transform_code":
            # pt.task.PAYLOAD_TYPE.load_transform_code with body of "base64 code"
            try:
                os.makedirs("/Apfell/apfell/", exist_ok=True)
                file = open("/Apfell/apfell/transforms.py", 'wb')
                file.write(base64.b64decode(message.body.decode('utf-8')))
                file.close()
                await send_status("File written", "load_transform_code", "success")
            except Exception as e:
                await send_status("Failed to write file: {}".format(str(e)), "load_transform_code", "error")
        elif command == "command_transform":
            try:
                # pt.task.PAYLOAD_TYPE.command_transform.taskID
                message_json = json.loads(base64.b64decode(message.body).decode('utf-8'), strict=False)
                # now start going through the transforms
                # make sure we have the most up-to-date transform code loaded
                try:
                    import importlib.util
                    spec = importlib.util.spec_from_file_location("apfell", "/Apfell/apfell/transforms.py")
                    foo = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(foo)
                except Exception as e:
                    print(e)
                transform = foo.CommandTransformOperation()
                step_output = {}  # keep track of output at each stage
                step_output["0 - initial params"] = message_json['params']
                for t in message_json['transforms']:
                    if message_json['transform_status'][str(t['order'])]:  # if this is set to active, do it
                        try:
                            message_json['params'] = await getattr(transform, t['name'])(message_json['params'], t['parameter'])
                            step_output[str(t['order']) + " - " + t['name']] = message_json['params']
                        except Exception as e:
                            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                            await send_status('failed to apply transform {}, with message: {}'.format(t['name'], str(e)),
                                              "command_transform", "error.{}".format(pieces[4]))
                            return
                response = {"params": message_json['params'], "test_command": message_json['test_command']}
                if message_json['test_command']:
                    response['step_output'] = json.dumps(step_output, indent=4)
                await send_status(base64.b64encode(json.dumps(response).encode()).decode('utf-8'), "command_transform", "success.{}".format(pieces[4]))
            except Exception as e:
                await send_status("{} - {}".format(str(sys.exc_info()[-1].tb_lineno), str(e)),
                                  "command_transform", "error.{}".format(pieces[4]))
                return
        elif command == "load_transform_with_code":
            try:
                # pt.task.PAYLOAD_TYPE.load_transform.taskID
                message_json = json.loads(base64.b64decode(message.body).decode('utf-8'), strict=False)
                temp_zip = "/Apfell/" + str(uuid.uuid4()) + ".zip"
                zip_file = open(temp_zip, 'wb')
                zip_file.write(base64.b64decode(message_json['zip'].encode()))
                zip_file.close()
                # make our temporary folder
                working_dir = str(uuid.uuid4())
                os.mkdir(working_dir)
                # extract files to this folder
                shutil.unpack_archive(temp_zip, "/Apfell/" + working_dir)
                # now start going through the transforms
                # make sure we have the most up-to-date transform code loaded
                try:
                    import importlib.util
                    spec = importlib.util.spec_from_file_location("apfell", "/Apfell/apfell/transforms.py")
                    foo = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(foo)
                except Exception as e:
                    print(e)
                transform = foo.TransformOperation(working_dir=working_dir)
                transform_output = message_json['loads']
                # do step 0, prior_output = path of our newly written file
                for t in message_json['transforms']:
                    try:
                        transform_output = await getattr(transform, t['name'])(transform_output, t['parameter'])
                    except Exception as e:
                        print(e)
                        shutil.rmtree(working_dir)
                        os.remove(temp_zip)
                        await send_status('failed to apply transform {}, with message: {}'.format(t['name'], str(e)),
                                          "load_transform_with_code", "error.{}".format(pieces[4]))
                if isinstance(transform_output, str):
                    await send_status(base64.b64encode(transform_output.encode()).decode('utf-8'),
                                      "load_transform_with_code", "success.{}".format(pieces[4]))
                else:
                    await send_status(base64.b64encode(transform_output).decode('utf-8'),
                                      "load_transform_with_code", "success.{}".format(pieces[4]))
                shutil.rmtree(working_dir)
                os.remove(temp_zip)
            except Exception as e:
                await send_status("{} - {}".format(str(sys.exc_info()[-1].tb_lineno), str(e)),
                                  "load_transform_with_code", "error.{}".format(pieces[4]))
        elif command == "listfiles":
            files = []
            for (dirpath, dirnames, filenames) in os.walk("/Apfell/"):
                if "__pycache__" not in dirpath and "apfell" not in dirpath:
                    files.append({"folder": dirpath, "dirnames": dirnames, "filenames": filenames})
            await send_status(message=json.dumps(files), command="listfiles", status="success")
        elif command == "getfile":
            try:
                message_json = json.loads(base64.b64decode(message.body).decode('utf-8'), strict=False)
                path = os.path.abspath(message_json['folder'] + "/" + message_json['file'])
                if path.startswith("/Apfell/") and os.path.exists(path):
                    file_data = open(path, 'rb').read()
                else:
                    file_data = b"Not Found"
                encoded_data = base64.b64encode(json.dumps(
                    {"filename": message_json['file'], "data": base64.b64encode(file_data).decode('utf-8')}).encode()).decode('utf-8')
                await send_status(message=encoded_data, command="getfile", status="success")
            except Exception as e:
                file_data = "{} - {}".format(str(sys.exc_info()[-1].tb_lineno), str(e))
                encoded_data = base64.b64encode(json.dumps(
                    {"filename": message_json['file'],
                     "data": base64.b64encode(file_data).decode('utf-8')}).encode()).decode('utf-8')
                await send_status(message=encoded_data, command="getfile", status="error")
        elif command == "writefile":
            try:
                message_json = json.loads(base64.b64decode(message.body).decode('utf-8'), strict=False)
                file = open(message_json['file_path'], 'wb')
                file.write(base64.b64decode(message_json['data']))
                response = "File written"
                await send_status(message=response, command="writefile", status="success")
            except Exception as e:
                file_data = "{} - {}".format(str(sys.exc_info()[-1].tb_lineno), str(e))
                response = "Failed to decode message: {}".format(file_data)
                await send_status(message=response, command="writefile", status="error")
        elif command == "removefile":
            try:
                message_json = json.loads(base64.b64decode(message.body).decode('utf-8'), strict=False)
                path = os.path.abspath(message_json['folder'] + "/" + message_json['file'])
                status = "success"
                if path.startswith("/Apfell/") and os.path.exists(path):
                    os.remove(path)
                    response = json.dumps({"folder": message_json['folder'], "file": message_json['file']})
                else:
                    response = "Failed to remove file"
                    status = "error"
            except Exception as e:
                response = "Failed to find or remove file"
                status = "error"
            await send_status(message=response, command="removefile", status=status)
        else:
            print("Unknown command: {}".format(command))


async def apfell_service():
    global hostname
    global exchange
    connection = None
    while connection is None:
        try:
            connection = await aio_pika.connect_robust(host="127.0.0.1",
                                                       login="apfell_user",
                                                       password="apfell_password",
                                                       virtualhost="apfell_vhost")
        except Exception as e:
            await asyncio.sleep(1)
    try:
        channel = await connection.channel()
        # declare our exchange
        exchange = await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
        # get a random queue that only the apfell server will use to listen on to catch all heartbeats
        queue = await channel.declare_queue('', exclusive=True)
        # bind the queue to the exchange so we can actually catch messages
        await queue.bind(exchange='apfell_traffic', routing_key="pt.task.{}.#".format(hostname))
        await queue.bind(exchange='apfell_traffic', routing_key="pt.task.*.load_transform_code.#")
        # just want to handle one message at a time so we can clean up and be ready
        await channel.set_qos(prefetch_count=10)
        print(' [*] Waiting for messages in apfell_service.')
        task = queue.consume(callback)
        result = await asyncio.wait_for(task, None)
    except Exception as e:
        print(str(e))

# start our service
loop = asyncio.get_event_loop()
loop.create_task(apfell_service())
loop.run_forever()
