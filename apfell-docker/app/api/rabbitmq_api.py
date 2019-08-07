from app import apfell, db_objects
import datetime
import app.database_models.model as db_model
import aio_pika
import asyncio
import base64
import json
import sys


async def rabbit_c2_callback(message: aio_pika.IncomingMessage):
    with message.process():
        pieces = message.routing_key.split(".")
        print(" [x] %r:%r" % (
            message.routing_key,
            message.body
        ))
        if pieces[1] == "status":
            try:
                query = await db_model.c2profile_query()
                profile = await db_objects.get(query, name=pieces[2])
                if pieces[3] == "running":
                    profile.running = True
                else:
                    profile.running = False
                await db_objects.update(profile)
            except Exception as e:
                print("Exception in rabbit_c2_callback (status): {}, {}".format(pieces, str(e)))


async def rabbit_pt_callback(message: aio_pika.IncomingMessage):
    with message.process():
        pieces = message.routing_key.split(".")
        #print(" [x] %r:%r" % (
        #    message.routing_key,
        #    message.body.decode('utf-8')
        #))
        if pieces[1] == "status":
            try:
                if pieces[3] == "create_payload_with_code":
                    # this means we should be getting back the finished payload or an error
                    if pieces[4] == "error":
                        # we need to update the payload with the error
                        query = await db_model.payload_query()
                        payload = await db_objects.get(query, uuid=pieces[5])
                        payload.build_phase = "error"
                        payload.build_message = message.body.decode('utf-8')
                        await db_objects.update(payload)
                    else:
                        # we need to update the payload with success and write the payload to disk
                        query = await db_model.payload_query()
                        payload = await db_objects.get(query, uuid=pieces[5])
                        payload.build_phase = "success"
                        payload.build_message = payload.payload_type.execute_help
                        await db_objects.update(payload)
                        file = open(payload.location, 'wb')
                        file.write(base64.b64decode(message.body.decode('utf-8')))
                        file.close()
                elif pieces[3] == "command_transform":
                    query = await db_model.task_query()
                    task = await db_objects.get(query, id=pieces[5])
                    if pieces[4] == "error":
                        # create a response that there was an error and set task to processed
                        task.status = "processed"
                        task.timestamp = datetime.datetime.utcnow()
                        task.status_timestamp_processed = task.timestamp
                        await db_objects.update(task)
                        await db_objects.create(db_model.Response, task=task, response=message.body.decode('utf-8'))
                    else:
                        message_body = json.loads(base64.b64decode(message.body).decode('utf-8'), strict=False)
                        task.params = message_body['params']
                        if not message_body['test_command']:
                            task.status = "submitted"
                            task.timestamp = datetime.datetime.utcnow()
                            task.status_timestamp_submitted = task.timestamp
                            await add_command_attack_to_task(task, task.command)
                        else:
                            task.status = "processed"
                            task.timestamp = datetime.datetime.utcnow()
                            task.status_timestamp_processed = task.timestamp
                            await db_objects.create(db_model.Response, task=task, response="TEST COMMAND RESULTS:\n{}".format(message_body['step_output']))
                        await db_objects.update(task)
                elif pieces[3] == "load_transform_with_code":
                    query = await db_model.task_query()
                    task = await db_objects.get(query, id=pieces[5])
                    if pieces[4] == "error":
                        task.status = "processed"
                        task.timestamp = datetime.datetime.now()
                        task.status_timestamp_processed = task.timestamp
                        await db_objects.update(task)
                        await db_objects.create(db_model.Response, task=task, response=message.body.decode('utf-8'))
                    else:
                        # we created the new code to load, so write it to disk, create fileMeta, update task
                        file_name = "./app/payloads/operations/{}/load-{}".format(task.callback.operation.name, datetime.datetime.utcnow())
                        file = open(file_name, 'wb')
                        file.write(base64.b64decode(message.body))
                        file.close()
                        file_meta = await db_objects.create(db_model.FileMeta, total_chunks=1, chunks_received=1,
                                                            complete=True, path=file_name, operation=task.callback.operation,
                                                            operator=task.operator, task=task)
                        task.status = "submitted"
                        task.timestamp = datetime.datetime.utcnow()
                        task.status_timestamp_submitted = task.timestamp
                        task.params = json.dumps({"cmds": task.params, "file_id": file_meta.agent_file_id})
                        await db_objects.update(task)
            except Exception as e:
                print("Exception in rabbit_pt_callback: " + str(e))


async def add_command_attack_to_task(task, command):
    try:
        query = await db_model.attackcommand_query()
        attack_mappings = await db_objects.execute(query.where(db_model.ATTACKCommand.command == command))
        for attack in attack_mappings:
            try:
                query = await db_model.attacktask_query()
                # try to get the query, if it doens't exist, then create it in the exception
                await db_objects.get(query, task=task, attack=attack.attack)
            except Exception as e:
                await db_objects.create(db_model.ATTACKTask, task=task, attack=attack.attack)
        # now do the artifact adjustments as well
        query = await db_model.artifacttemplate_query()
        artifacts = await db_objects.execute(query.where( (db_model.ArtifactTemplate.command == command) & (db_model.ArtifactTemplate.deleted == False)))
        for artifact in artifacts:
            temp_string = artifact.artifact_string
            if artifact.command_parameter is not None and artifact.command_parameter != 'null':
                # we need to swap out temp_string's replace_string with task's param's command_parameter.name value
                parameter_dict = json.loads(task.params)
                temp_string = temp_string.replace(artifact.replace_string, str(parameter_dict[artifact.command_parameter.name]))
            else:
                # we need to swap out temp_string's replace_string with task's params value
                if artifact.replace_string != "":
                    temp_string = temp_string.replace(artifact.replace_string, str(task.params))
            await db_objects.create(db_model.TaskArtifact, task=task, artifact_template=artifact, artifact_instance=temp_string)

    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        raise e


async def rabbit_heartbeat_callback(message: aio_pika.IncomingMessage):
    with message.process():
        pieces = message.routing_key.split(".")
        #print(" [x] %r:%r" % (
        #    message.routing_key,
        #    message.body
        #))
        try:
            if pieces[0] == "c2":
                query = await db_model.c2profile_query()
                profile = await db_objects.get(query, name=pieces[2])
                profile.container_running = True
                profile.last_heartbeat = datetime.datetime.utcnow()
                await db_objects.update(profile)
            elif pieces[0] == "pt":
                query = await db_model.payloadtype_query()
                payload_type = await db_objects.get(query, ptype=pieces[2])
                payload_type.container_running = True
                payload_type.last_heartbeat = datetime.datetime.utcnow()
                await db_objects.update(payload_type)
                # now send updated PT code to everybody
                transform_code = open("./app/api/transforms/utils.py", 'rb').read()
                await send_pt_rabbitmq_message("*", "load_transform_code",
                                               base64.b64encode(transform_code).decode('utf-8'))
        except Exception as e:
            print("Exception in rabbit_heartbeat_callback: {}, {}".format(pieces, str(e)))


# just listen for c2 heartbeats and update the database as necessary
async def start_listening():
    print("starting to consume")
    try:
        task = asyncio.ensure_future(connect_and_consume_c2())
        task2 = asyncio.ensure_future(connect_and_consume_heartbeats())
        task3 = asyncio.ensure_future(connect_and_consume_pt())
        await asyncio.wait_for([task, task2, task3], None)
    except Exception as e:
        await asyncio.sleep(3)


async def connect_and_consume_c2():
    connection = None
    while connection is None:
        try:
            connection = await aio_pika.connect_robust(host="127.0.0.1",
                                                       login="apfell_user",
                                                       password="apfell_password",
                                                       virtualhost="apfell_vhost")
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
            # get a random queue that only the apfell server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue('', exclusive=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.stopped")
            await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.running")
            await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.running.start")
            await queue.bind(exchange='apfell_traffic', routing_key="c2.status.*.stopped.stop")

            await channel.set_qos(prefetch_count=50)
            print(' [*] Waiting for messages in connect_and_consume_c2.')
            try:
                task = queue.consume(rabbit_c2_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                print("Exception in connect_and_consume .consume: {}".format(str(e)))

        except Exception as e:
            print("Exception in connect_and_consume connect: {}".format(str(e)))
        await asyncio.sleep(2)


async def connect_and_consume_pt():
    connection = None
    while connection is None:
        try:
            connection = await aio_pika.connect_robust(host="127.0.0.1",
                                                       login="apfell_user",
                                                       password="apfell_password",
                                                       virtualhost="apfell_vhost")
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
            # get a random queue that only the apfell server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue('', exclusive=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.create_payload_with_code.#")
            await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.create_external_payload.#")
            await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.load_transform_code.#")
            await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.command_transform.#")
            await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.load_transform_with_code.#")
            await channel.set_qos(prefetch_count=20)
            print(' [*] Waiting for messages in connect_and_consume_pt.')
            try:
                task = queue.consume(rabbit_pt_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except Exception as e:
            print("Exception in connect_and_consume connect: {}".format(str(e)))
        await asyncio.sleep(2)


async def connect_and_consume_heartbeats():
    connection = None
    while connection is None:
        try:
            connection = await aio_pika.connect_robust(host="127.0.0.1",
                                                       login="apfell_user",
                                                       password="apfell_password",
                                                       virtualhost="apfell_vhost")
            channel = await connection.channel()
            # declare our exchange
            await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
            # get a random queue that only the apfell server will use to listen on to catch all heartbeats
            queue = await channel.declare_queue('', exclusive=True)
            # bind the queue to the exchange so we can actually catch messages
            await queue.bind(exchange='apfell_traffic', routing_key="*.heartbeat.#")
            await channel.set_qos(prefetch_count=20)
            print(' [*] Waiting for messages in connect_and_consume_heartbeats.')
            try:
                task = queue.consume(rabbit_heartbeat_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except Exception as e:
            print("Exception in connect_and_consume connect: {}".format(str(e)))
        await asyncio.sleep(2)


async def send_c2_rabbitmq_message(name, command, message_body):
    try:
        connection = await aio_pika.connect(host="127.0.0.1",
                                            login="apfell_user",
                                            password="apfell_password",
                                            virtualhost="apfell_vhost")
        channel = await connection.channel()
        # declare our exchange
        exchange = await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
        message = aio_pika.Message(
            message_body.encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )
        # Sending the message
        await exchange.publish(
            message, routing_key="c2.modify.{}.{}".format(name, command)
        )
        await connection.close()
        return {"status": "success"}
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": 'error', 'error': "Failed to connect to rabbitmq, refresh"}


async def send_pt_rabbitmq_message(payload_type, command, message_body):
    try:
        connection = await aio_pika.connect(host="127.0.0.1",
                                            login="apfell_user",
                                            password="apfell_password",
                                            virtualhost="apfell_vhost")
        channel = await connection.channel()
        # declare our exchange
        exchange = await channel.declare_exchange('apfell_traffic', aio_pika.ExchangeType.TOPIC)
        message = aio_pika.Message(
            message_body.encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )
        # Sending the message
        await exchange.publish(
            message, routing_key="pt.task.{}.{}".format(payload_type, command)
        )
        await connection.close()
        return {"status": "success"}
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": 'error', 'error': "Failed to connect to rabbitmq, refresh"}