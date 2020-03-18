from app import db_objects
import datetime
import app.database_models.model as db_model
import aio_pika
import asyncio
import base64
import json
import sys
import os
from sanic.log import logger
from app.crypto import hash_SHA1, hash_MD5


async def rabbit_c2_callback(message: aio_pika.IncomingMessage):
    with message.process():
        pieces = message.routing_key.split(".")
        # print(" [x] %r:%r" % (message.routing_key,message.body))
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
                logger.exception("Exception in rabbit_c2_callback (status): {}, {}".format(pieces, str(e)))
                # print("Exception in rabbit_c2_callback (status): {}, {}".format(pieces, str(e)))


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
                        if payload.auto_generated:
                            payload.task.status = "error"
                            await db_objects.create(db_model.Response, task=payload.task,
                                                    response="Error building payload {}".format(payload.build_message))
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
                        if payload.auto_generated:
                            # if this is an auto generated payload we need to:
                            # 1. create a file_id for the payload
                            # 2. edit the tasking parameters with the new file
                            file_id = await db_objects.create(db_model.FileMeta, total_chunks=1, chunks_received=1,
                                                              task=payload.task, complete=True, path=payload.location,
                                                              operation=payload.operation, deleted=False,
                                                              operator=payload.task.operator, temp_file=True)
                            file_id.md5 = await hash_MD5(base64.b64decode(message.body.decode('utf-8')))
                            file_id.sha1 = await hash_SHA1(base64.b64decode(message.body.decode('utf-8')))
                            payload.file_id = file_id
                            await db_objects.update(file_id)
                            await db_objects.update(payload)
                            try:
                                param_json = json.loads(payload.task.params)
                                param_json['template'] = file_id.agent_file_id
                                payload.task.params = json.dumps(param_json)
                                payload.task.status = "submitted"
                                await db_objects.update(payload.task)
                            except Exception as e:
                                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                                payload.task.status = "error"
                                await db_objects.create(db_model.Response, task=payload.task,
                                                        response="Error building payload {}".format(str(e)))
                                await db_objects.update(payload.task)
                elif pieces[3] == "command_transform":
                    query = await db_model.task_query()
                    task = await db_objects.get(query, id=pieces[5])
                    if pieces[4] == "error":
                        # create a response that there was an error and set task to processed
                        task.status = "error"
                        task.completed = True
                        task.timestamp = datetime.datetime.utcnow()
                        task.status_timestamp_processed = task.timestamp
                        await db_objects.update(task)
                        await db_objects.create(db_model.Response, task=task, response=message.body.decode('utf-8'))
                    else:
                        message_body = json.loads(base64.b64decode(message.body).decode('utf-8'), strict=False)
                        # check to see if there are any special transforms that need to be done
                        # check for swapping shortnames (i.e. Seatbelt.exe swapped for a file id after uploading it)
                        message_body['params'] = await resolve_shortnames_to_file_ids(message_body['params'], task)
                        if not message_body['test_command']:
                            # this wasn't a test command, so see if we need to save off any files that were transformed
                            #   or added by a transform
                            message_body['params'] = await save_params_to_file_ids(task.callback.operation, task.operator, message_body['file_updates_with_task'], message_body['params'], task)
                            # if this command is supposed to generate a new payload, deal with that
                            task.params = message_body['params']
                            if task.command.is_agent_generator:
                                task.status = "registering..."
                                task.timestamp = datetime.datetime.utcnow()
                                await start_build_process(message_body['params'], task)
                                await add_command_attack_to_task(task, task.command)
                            else:
                                task.params = message_body['params']
                                task.status = "submitted"
                                task.timestamp = datetime.datetime.utcnow()
                                task.status_timestamp_submitted = task.timestamp
                                await add_command_attack_to_task(task, task.command)
                        else:
                            # this is a test command, so mark it as done with a response
                            task.status = "processed"
                            task.completed = True
                            task.timestamp = datetime.datetime.utcnow()
                            task.status_timestamp_processed = task.timestamp
                            await db_objects.create(db_model.Response, task=task, response="TEST COMMAND RESULTS:\n{}".format(message_body['step_output']))
                        await db_objects.update(task)
                elif pieces[3] == "load_transform_with_code":
                    query = await db_model.task_query()
                    task = await db_objects.get(query, id=pieces[5])
                    if pieces[4] == "error":
                        task.status = "error"
                        task.completed = True
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
                                                            operator=task.operator, task=task, temp_file=True)
                        task.status = "submitted"
                        task.timestamp = datetime.datetime.utcnow()
                        task.status_timestamp_submitted = task.timestamp
                        task.params = json.dumps({"cmds": task.params, "file_id": file_meta.agent_file_id})
                        await db_objects.update(task)
            except Exception as e:
                logger.exception("Exception in rabbit_pt_callback: " + str(e))
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                # print("Exception in rabbit_pt_callback: " + str(e))


async def start_build_process(command, task):
    # check to make sure we have the right parameters (host, template)
    from app.api.payloads_api import register_new_payload_func, write_payload
    from app.api.c2profiles_api import generate_random_format_string
    try:
        task_dict = json.loads(command)
        template = task.callback.registered_payload
        #print(task_dict)
        host = task.callback.host
        if 'template' in task_dict and task_dict['template'] != "" and task_dict['template'] is not None:
            # pull that associated payload
            query = await db_model.payload_query()
            template = await db_objects.get(query, uuid=task_dict['template'])
        if 'host' in task_dict and task_dict['host'] != "" and task_dict['host'] is not None:
            host = task_dict['host']
        # using that payload, generate the following build-tasking data
        data = {"payload_type": template.payload_type.ptype, "c2_profiles": [],
                "commands": [], "transforms": [], "tag": "Autogenerated from task {} on callback {}".format(str(task.id), str(task.callback.id))}
        query = await db_model.payloadcommand_query()
        payloadcommands = await db_objects.execute(query.where(db_model.PayloadCommand.payload == template))
        data['commands'] = [c.command.cmd for c in payloadcommands]
        query = await db_model.transforminstance_query()
        create_transforms = await db_objects.execute(
            query.where(db_model.TransformInstance.payload == template).order_by(db_model.TransformInstance.order))
        data['transforms'] = [t.to_json() for t in create_transforms]
        c2_profiles_data = []
        query = await db_model.payloadc2profiles_query()
        c2profiles = await db_objects.execute(query.where(db_model.PayloadC2Profiles.payload == template))
        for c2p in c2profiles:
            query = await db_model.c2profileparametersinstance_query()
            c2_profile_params = await db_objects.execute(query.where(
                (db_model.C2ProfileParametersInstance.payload == template) &
                (db_model.C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
            ))
            params = {}
            for p in c2_profile_params:
                if p.c2_profile_parameters.randomize:
                    params[p.c2_profile_parameters.key] = await generate_random_format_string(p.c2_profile_parameters.format_string)
                else:
                    params[p.c2_profile_parameters.key] = p.value
            c2_profiles_data.append({"c2_profile": c2p.c2_profile.name, "c2_profile_parameters": params})
        data['c2_profiles'] = c2_profiles_data
        data['location'] = "Task" + str(task.id) + "Copy_" + template.location.split("/")[-1]
        #print(data)
        # upon successfully starting the build process, set pcallback and task
        #   when it's successfully written, it will get a file_id with it
        rsp = await register_new_payload_func(data, {"current_operation": task.callback.operation.name, "username": task.operator.username})
        if rsp['status'] == 'success':
            query = await db_model.payload_query()
            payload = await db_objects.get(query, uuid=rsp['uuid'])
            payload.task = task
            payload.pcallback = task.callback
            payload.auto_generated = True
            payload.callback_alert = False
            await db_objects.update(payload)
            #print(host)
            if payload.payload_type.external is False:
                create_rsp = await write_payload(payload.uuid, {"current_operation": task.callback.operation.name, "username": task.operator.username}, data)
                if create_rsp['status'] != "success":
                    payload.deleted = True
                    await db_objects.update(payload)
                    task.status = "error"
                    await db_objects.create(db_model.Response, task=task,
                                            response="Exception when building payload: {}".format(create_rsp['error']))
                else:
                    task.status = "building..."
                    task.timestamp = datetime.datetime.utcnow()
                    await db_objects.create(db_model.PayloadOnHost, host=host, payload=payload,
                                            operation=payload.operation, task=task)
            else:
                # the payload is built outside of apfell, so the best we can do is give new agent uuid
                payload.build_phase = "success"
                payload.build_message = "Created externally, not hosted in Apfell"
                await db_objects.create(db_model.PayloadOnHost, host=host, payload=payload,
                                        operation=payload.operation, task=task)
                try:
                    param_json = json.loads(payload.task.params)
                    param_json['template'] = payload.uuid
                    payload.task.params = json.dumps(param_json)
                    payload.task.status = "submitted"
                except Exception as e:
                    print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    payload.task.status = "error"
                    await db_objects.create(db_model.Response, task=payload.task,
                                            response="Error building payload {}".format(str(e)))
                    await db_objects.update(payload.task)
                await db_objects.update(payload.task)
                await db_objects.update(payload)
        else:
            task.status = "error"
            await db_objects.create(db_model.Response, task=task,
                                    response="Exception when registering payload: {}".format(rsp['error']))
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        task.status = "error"
        await db_objects.create(db_model.Response, task=task,
                                response="Exception when building payload: {}".format(str(e)))


async def resolve_shortnames_to_file_ids(command, task):
    try:
        task_dict = json.loads(command)
        if 'swap_shortnames' in task_dict:
            del task_dict['swap_shortnames']
            for key in task_dict:
                if key.endswith("_id"):
                    try:
                        query = await db_model.filemeta_query()
                        print(task_dict[key])
                        attempted_path = "./app/files/{}/{}".format(task.callback.operation.name, task_dict[key])
                        print(attempted_path)
                        file = await db_objects.get(query, operation=task.callback.operation, path=attempted_path)
                        task_dict[key] = file.agent_file_id
                    except Exception as e:
                        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                        pass  # move on to the next one and try it
            return json.dumps(task_dict)
        else:
            return command
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return command


async def save_params_to_file_ids(operation, operator, file_updates_with_task, params, task):
    try:
        params = json.loads(params)
        modify_original = True
        try:
            original_params = json.loads(task.original_params)
        except Exception as e:
            modify_original = False
        for file_update in file_updates_with_task:
            if file_update[1] is None:
                # this means params[file_update[0]] is base64 of a file to write out
                count = 1
                path = "./app/files/{}/{}".format(operation.name, file_update[2])
                if "." in file_update[2]:
                    filename = file_update[2].split(".")[-2]
                    extension = file_update[2].split('.')[-1]
                else:
                    filename = file_update[2]
                    extension = ""
                while os.path.exists(path):
                    path = "./app/files/{}/{}{}.{}".format(operation.name, filename, count, extension)
                    if modify_original:
                        original_params[file_update[0]] = "{}{}.{}".format(filename, count, extension)
                    count += 1
                code_file = open(path, "wb")
                code = base64.b64decode( params[file_update[0]])
                code_file.write( code )
                code_file.close()
                md5 = await hash_MD5(code)
                sha1 = await hash_SHA1(code)
                if task.command.cmd == "upload":
                    temp_file = False
                else:
                    temp_file = True
                if len(file_update) == 4:
                    temp_file = file_update[3]
                new_file_meta = await db_objects.create(db_model.FileMeta, total_chunks=1, chunks_received=1, complete=True,
                                                        path=path, operation=operation, operator=operator,
                                                        full_remote_path="", md5=md5, sha1=sha1, task=task, temp_file=temp_file)
                params[file_update[0]] = new_file_meta.agent_file_id
        params = json.dumps(params)
        if modify_original:
            task.original_params = json.dumps(original_params)
            await db_objects.update(task)
        return params
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return params


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
            await db_objects.create(db_model.TaskArtifact, task=task, artifact_template=artifact, artifact_instance=temp_string, host=task.callback.host)

    except Exception as e:
        logger.exception(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        # print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
                if profile.last_heartbeat < datetime.datetime.utcnow() + datetime.timedelta(seconds=-30) or not profile.container_running:
                    profile.running = False  # container just started, clearly the inner service isn't running
                    #print("setting running to false")
                profile.container_running = True
                profile.last_heartbeat = datetime.datetime.utcnow()
                await db_objects.update(profile)
            elif pieces[0] == "pt":
                if pieces[2] != 'external':
                    query = await db_model.payloadtype_query()
                    payload_type = await db_objects.get(query, ptype=pieces[2])
                    payload_type.container_running = True
                    payload_type.last_heartbeat = datetime.datetime.utcnow()
                    await db_objects.update(payload_type)
                # now send updated PT code to everybody
                transform_code = open("./app/api/transforms/transforms.py", 'rb').read()
                await send_pt_rabbitmq_message("*", "load_transform_code",
                                               base64.b64encode(transform_code).decode('utf-8'), "")
        except Exception as e:
            logger.exception("Exception in rabbit_heartbeat_callback: {}, {}".format(pieces, str(e)))
            # print("Exception in rabbit_heartbeat_callback: {}, {}".format(pieces, str(e)))


# just listen for c2 heartbeats and update the database as necessary
async def start_listening():
    logger.debug("starting to consume rabbitmq messages")
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
            await queue.bind(exchange='apfell_traffic', routing_key="c2.status.#")

            await channel.set_qos(prefetch_count=50)
            logger.info(' [*] Waiting for messages in connect_and_consume_c2.')
            try:
                task = queue.consume(rabbit_c2_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception("Exception in connect_and_consume .consume: {}".format(str(e)))
                # print("Exception in connect_and_consume .consume: {}".format(str(e)))

        except Exception as e:
            logger.exception("Exception in connect_and_consume connect: {}".format(str(e)))
            # print("Exception in connect_and_consume connect: {}".format(str(e)))
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
            await queue.bind(exchange='apfell_traffic', routing_key="pt.status.#")
            #await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.create_payload_with_code.#")
            #await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.create_external_payload.#")
            #await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.load_transform_code.#")
            #await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.command_transform.#")
            #await queue.bind(exchange='apfell_traffic', routing_key="pt.status.*.load_transform_with_code.#")
            await channel.set_qos(prefetch_count=50)
            logger.info(' [*] Waiting for messages in connect_and_consume_pt.')
            try:
                task = queue.consume(rabbit_pt_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception("Exception in connect_and_consume .consume: {}".format(str(e)))
                # print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except Exception as e:
            logger.exception("Exception in connect_and_consume connect: {}".format(str(e)))
            # print("Exception in connect_and_consume connect: {}".format(str(e)))
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
            logger.info(' [*] Waiting for messages in connect_and_consume_heartbeats.')
            try:
                task = queue.consume(rabbit_heartbeat_callback)
                result = await asyncio.wait_for(task, None)
            except Exception as e:
                logger.exception("Exception in connect_and_consume .consume: {}".format(str(e)))
                # print("Exception in connect_and_consume .consume: {}".format(str(e)))
        except Exception as e:
            logger.exception("Exception in connect_and_consume connect: {}".format(str(e)))
            # print("Exception in connect_and_consume connect: {}".format(str(e)))
        await asyncio.sleep(2)


async def send_c2_rabbitmq_message(name, command, message_body, username):
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
            message, routing_key="c2.modify.{}.{}.{}".format(name, command, base64.b64encode(username.encode()).decode('utf-8'))
        )
        await connection.close()
        return {"status": "success"}
    except Exception as e:
        logger.exception(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        # print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": 'error', 'error': "Failed to connect to rabbitmq, refresh"}


async def send_pt_rabbitmq_message(payload_type, command, message_body, username):
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
            message, routing_key="pt.task.{}.{}.{}".format(payload_type, command, base64.b64encode(username.encode()).decode('utf-8'))
        )
        await connection.close()
        return {"status": "success"}
    except Exception as e:
        logger.exception(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        # print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": 'error', 'error': "Failed to connect to rabbitmq, refresh"}