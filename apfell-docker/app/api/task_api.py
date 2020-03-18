from app import apfell, db_objects
from sanic.response import json, raw
from app.database_models.model import Callback, Task, FileMeta, Response, LoadedCommands, ATTACKCommand, ATTACKTask, TaskArtifact, ArtifactTemplate, OperatorOperation, Payload, Command, C2ProfileParametersInstance
from datetime import datetime, timedelta
from sanic_jwt.decorators import scoped, inject_user
from app.api.transform_api import get_transforms_func, get_commandtransforms_func
import json as js
import sys
import shutil, os, glob
from app.api.payloads_api import generate_uuid, local_copytree, write_c2_based_on_callback_loaded_c2
import app.crypto as crypt
import base64
import app.database_models.model as db_model
from app.api.rabbitmq_api import send_pt_rabbitmq_message
from sanic.exceptions import abort
from math import ceil
from app.crypto import hash_MD5, hash_SHA1
from sanic.log import logger


# This gets all tasks in the database
@apfell.route(apfell.config['API_BASE'] + "/tasks/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_tasks(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    query = await db_model.task_query()
    full_task_data = await db_objects.prefetch(query, Command.select())
    if user['admin']:
        # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
        return json([c.to_json() for c in full_task_data])
    elif user['current_operation'] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        return json([c.to_json() for c in full_task_data if c.callback.operation == operation])
    else:
        return json({'status': 'error', 'error': 'must be admin to see all tasks or part of a current operation'})


# Get a single response
@apfell.route(apfell.config['API_BASE'] + "/tasks/search", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def search_tasks(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        data = request.json
        if 'search' not in data:
            return json({'status': 'error', 'error': 'failed to find search term in request'})
        if 'type' not in data:
            data['type'] = "cmds"
        if 'export' not in data:
            data['export'] = False
        if 'operator' in data:
            query = await db_model.operator_query()
            operator = await db_objects.get(query, username=data['operator'])
            data['operator'] = operator
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot get that operation'})
    try:
        if data['type'] == "params":
            query = await db_model.task_query()
            if 'operator' in data:
                count = await db_objects.count(query.where(
                    ( (Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search'])) ) & (Task.operator == data['operator'])
                ).switch(Callback).where(Callback.operation == operation).order_by(Task.id), Command.select())
            else:
                count = await db_objects.count(query
                                                 .where((Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search'])))
                                                 .switch(Callback).where(Callback.operation == operation).order_by(Task.id), Command.select())
        else:
            query = await db_model.task_query()
            if 'operator' in data:
                count = await db_objects.count(query.switch(Command).where(Command.cmd.regexp(data['search'])).switch(Callback).where(Callback.operation == operation).switch(Task).where(Task.operator == data['operator']).order_by(Task.id),
                                               Command.select())
            else:
                count = await db_objects.count(query.switch(Command)
                                           .where(Command.cmd.regexp(data['search'])).switch(Callback).where(Callback.operation == operation).order_by(Task.id),
                                           Command.select())
        if 'page' not in data:
            data['page'] = 1
            data['size'] = count
            if data['type'] == "params":
                if 'operator' in data:
                    tasks = await db_objects.prefetch(query.where(
                        ( (Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search'])) ) & (Task.operator == data['operator'])
                    ).switch(Callback).where(Callback.operation == operation).order_by(Task.id), Command.select())
                else:
                    tasks = await db_objects.prefetch(query
                                             .where((Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search'])))
                                             .switch(Callback).where(Callback.operation == operation).order_by(Task.id), Command.select())
            else:
                if 'operator' in data:
                    tasks = await db_objects.prefetch(query.switch(Command).where(Command.cmd.regexp(data['search'])).switch(Callback).where(
                        Callback.operation == operation).switch(Task).where(Task.operator == data['operator']).order_by(Task.id),Command.select())
                else:
                    tasks = await db_objects.prefetch(query.switch(Command)
                                           .where(Command.cmd.regexp(data['search'])).switch(Callback).where(Callback.operation == operation).order_by(Task.id),
                                           Command.select())
        else:
            if 'page' not in data or 'size' not in data or int(data['size']) <= 0 or int(data['page']) <= 0:
                return json({'status': 'error', 'error': 'size and page must be supplied and be greater than 0'})
            data['size'] = int(data['size'])
            data['page'] = int(data['page'])
            if data['page'] * data['size'] > count:
                data['page'] = ceil(count / data['size'])
                if data['page'] == 0:
                    data['page'] = 1
            if data['type'] == "params":
                if 'operator' in data:
                    tasks = await db_objects.prefetch(query.where(
                        ((Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search']))) & (Task.operator == data['operator'])
                    ).switch(Callback).where(Callback.operation == operation).order_by(Task.id).paginate(data['page'], data['size']),Command.select())
                else:
                    tasks = await db_objects.prefetch(query.where(
                    (Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search'])))
                                                  .switch(Callback).where(Callback.operation == operation).order_by(Task.id).paginate(data['page'], data['size']),
                                                  Command.select())
            else:
                if 'operator' in data:
                    tasks = await db_objects.prefetch(query.switch(Command).where(Command.cmd.regexp(data['search'])).switch(Callback).where(
                        Callback.operation == operation).switch(Task).where(Task.operator == data['operator']).order_by(Task.id),
                                                      Command.select())
                else:
                    tasks = await db_objects.prefetch(query.switch(Command)
                                                  .where(Command.cmd.regexp(data['search'])).switch(Callback).where(Callback.operation == operation).order_by(Task.id),
                                                  Command.select())
        output = []
        for t in tasks:
            output.append({**t.to_json(), "responses": [], 'host': t.callback.host})
        return json({'status': 'success', 'output': output, "total_count": count, 'page': data['page'], 'size': data['size']})
    except Exception as e:
        return json({'status': 'error', 'error': 'Bad regex'})


@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_tasks_for_callback(request, cid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=cid)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=callback.operation)
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Callback does not exist'})
    if operation.name in user['operations']:
        try:
            query = await db_model.task_query()
            cb_task_data = await db_objects.prefetch(query.where(Task.callback == callback).order_by(Task.id), Command.select())
            return json([c.to_json() for c in cb_task_data])
        except Exception as e:
            return json({'status': 'error',
                         'error': 'No Tasks',
                         'msg': str(e)})
    else:
        return json({'status': 'error', 'error': 'You must be part of the right operation to see this information'})


@apfell.route(apfell.config['API_BASE'] + "/task_report_by_callback")
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_tasks_by_callback_in_current_operation(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Not part of an operation'})
    output = []
    query = await db_model.callback_query()
    callbacks = await db_objects.execute(query.where(Callback.operation == operation).order_by(Callback.id))
    for callback in callbacks:
        c = callback.to_json()  # hold this callback, task, and response info to push to our output stack
        c['tasks'] = []
        query = await db_model.task_query()
        tasks = await db_objects.prefetch(query.where(Task.callback == callback).order_by(Task.id), Command.select())
        for t in tasks:
            t_data = t.to_json()
            t_data['responses'] = []
            query = await db_model.response_query()
            responses = await db_objects.execute(query.where(Response.task == t).order_by(Response.id))
            for r in responses:
                t_data['responses'].append(r.to_json())
            c['tasks'].append(t_data)
        output.append(c)
    return json({'status': 'success', 'output': output})


async def get_agent_tasks(data, cid):
    # { INPUT
    #    "action": "get_tasking",
    #    "tasking_size": 1, //indicate the maximum number of tasks you want back
    # }
    # { RESPONSE
    #    "action": "get_tasking",
    #    "tasks": [
    #       {
    #           "command": "shell",
    #           "parameters": "whoami",
    #           "task_id": UUID
    #       }
    #    ]
    # }
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, agent_callback_id=cid)
        # get delegate messages if needed
        # await get_routable_messages(callback, callback.operation)
    except Exception as e:
        logger.exception("Failed to get callback in get_agent_tasks: " + cid)
        return {"action": "get_tasking", "tasks": []}
    if 'tasking_size' not in data:
        data['tasking_size'] = 1
    tasks = []
    try:
        cur_time = datetime.utcnow()
        callback.last_checkin = cur_time
        callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await db_objects.update(callback)  # update the last checkin time
        if not callback.operation.complete:
            query = await db_model.task_query()
            if data['tasking_size'] > 0:
                task_list = await db_objects.prefetch(query.where(
                    (Task.callback == callback) & (Task.status == "submitted")).order_by(Task.timestamp).limit(data['tasking_size']), Command.select())
            else:
                task_list = await db_objects.prefetch(query.where(
                    (Task.callback == callback) & (Task.status == "submitted")).order_by(Task.timestamp), Command.select())
            for t in task_list:
                t.status = "processing"
                t.status_timestamp_processing = datetime.utcnow()
                t.timestamp = t.status_timestamp_processing
                await db_objects.update(t)
                tasks.append({"command": t.command.cmd,
                              "parameters": t.params,
                              "id": t.agent_task_id,
                              "timestamp": t.timestamp.timestamp()})
        else:
            # operation is complete, just return blank for now, potentially an exit command later
            try:
                query = await db_model.command_query()
                exit_command = await db_objects.get(query, is_exit=True, payload_type=callback.registered_payload.payload_type)
                tasks.append({"command": exit_command.cmd, "parameters": "", "id": "", "timestamp": 0})
            except Exception as e:
                logger.exception("Got a tasking request from a callback associated with a completed operation: " + cid)
                tasks = []
    except Exception as e:
        logger.exception("Error in getting tasking for : " + cid + ", " + str(e))
        tasks = []
    return {"action": "get_tasking", "tasks": tasks}

# create a new task to a specific callback
@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def add_task_to_callback(request, cid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # some commands can optionally upload files or indicate files for use
    # if they are uploaded here, process them first and substitute the values with corresponding file_id numbers
    if user['current_operation'] == "":
        return json({'status': 'error', 'error': 'Must be part of a current operation first'})
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get the current user's info from the database"})
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get the current operation"})
    try:
        query = await db_model.callback_query()
        cb = await db_objects.get(query, id=cid, operation=operation)
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get callback"})
    # get the tasking data
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    # check if the callback was locked
    if cb.locked:
        if cb.locked_operator != operator:
            return json({'status': 'error', 'error': 'Callback is locked by another user - Cannot task',
                         'cmd': data['command'], 'params': data['params'], "callback": cid})
    # make sure the tasking we're trying to do isn't blocked for our user
    query = await db_model.operatoroperation_query()
    operatoroperation = await db_objects.get(query, operator=operator, operation=operation)
    if operatoroperation.base_disabled_commands is not None:
        query = await db_model.command_query()
        if data['command'] not in ['tasks', 'clear']:
            cmd = await db_objects.get(query, cmd=data['command'], payload_type=cb.registered_payload.payload_type)
            try:
                query = await db_model.disabledcommandsprofile_query()
                disabled_command = await db_objects.get(query, name=operatoroperation.base_disabled_commands.name,
                                                        command=cmd)
                return json({'status': 'error', 'error': "Not authorized to execute that command",
                             'cmd': data['command'],
                             'params': data['params'], 'callback': cid
                             })
            except Exception as e:
                pass
    # if we create new files throughout this process, be sure to tag them with the right task at the end
    file_updates_with_task = []
    data['original_params'] = data['params']
    if request.files:
        # this means we got files as part of our task, so handle those first
        params = js.loads(data['params'])
        original_params_with_names = js.loads(data['params'])
        for k in params:
            if params[k] == 'FILEUPLOAD':
                original_params_with_names[k] = request.files['file' + k][0].name
                # this means we need to handle a file upload scenario and replace this value with a file_id
                code = request.files['file' + k][0].body
                file_updates_with_task.append([k, None, request.files['file' + k][0].name, False])  # add which parameter has file upload data and if there's file meta for it yet
                params[k] = base64.b64encode(code).decode()
        # update data['params'] with new file data or just re-string the old data
        data['params'] = js.dumps(params)
        data['original_params'] = js.dumps(original_params_with_names)
    test_command_status = data['test_command'] if 'test_command' in data else False
    transform_status = data['transform_status'] if 'transform_status' in data else []
    return json(await add_task_to_callback_func(data, cid, user, operator, operation, cb, test_command_status, transform_status, file_updates_with_task))


async def add_task_to_callback_func(data, cid, user, op, operation, cb, test_status, transform_status, file_updates_with_task):
    try:
        # first see if the operator and callback exists
        task = None
        # now check the task and add it if it's valid and valid for this callback's payload type
        try:
            query = await db_model.command_query()
            cmd = await db_objects.get(query, cmd=data['command'], payload_type=cb.registered_payload.payload_type)
        except Exception as e:
            # it's not registered, so check the default tasks/clear
            if data['command'] == "tasks":
                # this means we're just listing out the not-completed tasks, so nothing actually goes to the agent
                task = await db_objects.create(Task, callback=cb, operator=op, params=data['command'],
                                               status="processed", original_params=data['command'], completed=True)
                raw_rsp = await get_all_not_completed_tasks_for_callback_func(cb.id, user)
                if raw_rsp['status'] == 'success':
                    rsp = ""
                    for t in raw_rsp['tasks']:
                        rsp += "\nOperator: " + t['operator'] + "\nTask " + str(t['id']) + ": " + t['command'] + " " + \
                               t['params'] + "\nStatus: " + t['status']
                    if rsp != "":
                        await db_objects.create(Response, task=task, response=rsp)
                    else:
                        await db_objects.create(Response, task=task, response="No tasks are in the \"submitted\" stage")
                    return {'status': 'success', **task.to_json(), 'command': 'tasks'}
                else:
                    return {'status': 'error', 'error': 'failed to get tasks', 'cmd': data['command'],
                            'params': data['original_params'], "callback": cid}
            elif data['command'] == "clear":
                # this means we're going to be clearing out some tasks depending on our access levels
                task = await db_objects.create(Task, callback=cb, operator=op, params="clear " + data['params'],
                                               status="processed", original_params="clear " + data['params'], completed=True)
                raw_rsp = await clear_tasks_for_callback_func({"task": data['params']}, cb.id, user)
                if raw_rsp['status'] == 'success':
                    rsp = "Removed the following:"
                    for t in raw_rsp['tasks_removed']:
                        rsp += "\nOperator: " + t['operator'] + "\nTask " + str(t['id']) + ": " + t['command'] + " " + t['params']
                    await db_objects.create(Response, task=task, response=rsp)
                    return {'status': 'success', **task.to_json()}
                else:
                    await db_objects.create(Response, task=task, response=raw_rsp['error'])
                    return {'status': 'error', 'error': raw_rsp['error'], 'cmd': data['command'],
                            'params': data['original_params'], 'callback': cid}
            # it's not tasks/clear, so return an error
            return {'status': 'error', 'error': data['command'] + ' is not a registered command', 'cmd': data['command'],
                    'params': data['params'], "callback": cid}
        file_meta = ""
        # some tasks require a bit more processing, so we'll handle that here so it's easier for the agent
        if cmd.cmd == "screencapture":
            if data['params'] == "" or data['params'] is None:
                data['params'] = datetime.utcnow().strftime('%Y-%m-%d-%H:%M:%S') + ".png"
        elif cmd.cmd == "load":
            try:
                if cb.registered_payload.payload_type.external:
                    # if the payload type is external, let the agent deal with what needs to be done
                    task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'],
                                                   original_params=data['original_params'], status="submitted")
                else:
                    # first check that the container is running
                    if not cb.registered_payload.payload_type.container_running:
                        return {"status": "error",
                                'error': 'build container not running, so cannot task to do load transforms',
                                'cmd': data['command'], 'params': data['original_params'], 'callback': cid}
                    # make sure we update when we last got a heartbeat to verify it's running
                    if cb.registered_payload.payload_type.last_heartbeat < datetime.utcnow() + timedelta(seconds=-30):
                        query = await db_model.payloadtype_query()
                        payload_type = await db_objects.get(query, ptype=cb.registered_payload.payload_type.ptype)
                        payload_type.container_running = False
                        await db_objects.update(payload_type)
                        return {"status": "error", 'error': 'build container not running, no heartbeat in over 30 seconds',
                                'cmd': data['command'], 'params': data['original_params'], "callback": cid}
                    # create the starting task, it'll go into pre-processing initially
                    task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'],
                                                   original_params=data['original_params'])
                    status = await perform_load_transforms(data, cb, operation, op, task)
                    if status['status'] == "error":
                        return {'status': 'error', 'error': status['error'], 'cmd': data['command'], 'params': data['original_params'], 'callback': cid}
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                return {'status': 'error', 'error': 'failed to open and encode new function', 'cmd': data['command'], 'params': data['original_params'], 'callback': cid}
        # now actually run through all of the command transforms
        # original_params = data['original_params']  # save off what the user originally typed
        cmd_transforms = await get_commandtransforms_func(cmd.id, operation.name)
        if cmd_transforms['status'] == 'success':
            # this means we got the transforms, so start constructing the message to send to the docker container
            # transform status indicates, for each transform, if it's marked active or not
            rabbit_message = {"transforms": cmd_transforms['transforms'], "params": data['params'],
                              "transform_status": data['transform_status'], 'test_command': test_status,
                              'file_updates_with_task': file_updates_with_task}
        else:
            return {'status': 'error', 'error': 'failed to get command transforms with message: {}'.format(
                            str(cmd_transforms['error'])), 'cmd': data['command'], 'params': data['original_params']}
        if "test_command" in data and data['test_command']:
            # we just wanted to test out how things would end up looking, but don't actually create a Task for this
            # remove all of the fileMeta objects we created in prep for this since it's not a real issuing
            for update_file in file_updates_with_task:
                if update_file[1] is not None:
                    await db_objects.delete(update_file)
                    # we only want to delete the file from disk if there are no other db objects pointing to it
                    # so we need to check other FileMeta.paths and Payload.locations
                    query = await db_model.filemeta_query()
                    file_count = await db_objects.count(query.where( (FileMeta.path == update_file.path) & (FileMeta.deleted == False)))
                    query = await db_model.payload_query()
                    file_count += await db_objects.count(query.where( (Payload.location == update_file.path) & (Payload.deleted == False)))
                    try:
                        if file_count == 0:
                            os.remove(update_file.path)
                    except Exception as e:
                        pass
        # check and update if the corresponding container is running or not
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=cb.registered_payload.payload_type.ptype)
        if cb.registered_payload.payload_type.last_heartbeat < datetime.utcnow() + timedelta(seconds=-30):
            payload_type.container_running = False
            await db_objects.update(payload_type)
        result = {'status': 'success'}  # we are successful now unless the rabbitmq service is down
        if task is not None:
            # this means we already created the task for something like load/screencapture/download
            await add_command_attack_to_task(task, cmd)
        if task is None:
            # this means the task is some non-standard function
            # if there are no active transforms and this is not a test command, just submit the task
            #if len(["a" for v in transform_status.values() if v]) == 0 and not test_status:
            #    # first store files in the database first if needed and swap to file_ids
            #    file_updates_with_task, data['params'] = await save_params_to_file_ids(operation, op, file_updates_with_task, data['params'])
            #    task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'], original_params=data['original_params'], status="submitted")
            #    for file_update in file_updates_with_task:
            #        file_update[1].task = task
            #        if task.command.cmd == "upload":
            #            file_update[1].temp_file = False
            #        await db_objects.update(file_update[1])
            #    task.status_timestamp_submitted = task.timestamp
            #    await db_objects.update(task)
            #    await add_command_attack_to_task(task, cmd)
            if payload_type.container_running:
                # by default tasks are created in a preprocessing state,
                # so an agent won't get them as they're tasked to the corresponding build-servers for modifications
                # file objects will be created upon receipt from rabbitmq in rabbitmq_api and assigned to the task
                task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['original_params'],
                                               original_params=data['original_params'])
                for update_file in file_updates_with_task:
                    if update_file[1] is not None:
                        update_file[1].task = task
                        await db_objects.update(update_file[1])
                        update_file[1] = ""  # just needs to be not None

                # we don't want to add ATT&CK and ArtifactTask yet since we need the final results to come back from rabbitmq first
                result = await send_pt_rabbitmq_message(cb.registered_payload.payload_type.ptype,
                                                        "command_transform.{}".format(task.id),
                                                        base64.b64encode(
                                                            js.dumps(rabbit_message).encode()
                                                        ).decode('utf-8'), user['username'])
            elif payload_type.external:
                # if the payload type is external, we can use the generic 'external' container for transforms
                # by default tasks are created in a preprocessing state,
                # so an agent won't get them as they're tasked to the corresponding build-servers for modifications
                task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['original_params'],
                                               original_params=data['original_params'])
                for update_file in file_updates_with_task:
                    if update_file[1] is not None:
                        update_file[1].task = task
                        await db_objects.update(update_file[1])
                        update_file[1] = ""  # just needs to be not None
                # we don't want to add ATT&CK and ArtifactTask yet since we need the final results to come back from rabbitmq first
                result = await send_pt_rabbitmq_message("external",
                                                        "command_transform.{}".format(task.id),
                                                        base64.b64encode(
                                                            js.dumps(rabbit_message).encode()
                                                        ).decode('utf-8'), user['username'])
            else:
                return {"status": "error",
                        'error': 'payload\'s container not running, no heartbeat in over 30 seconds, so it cannot process tasking',
                        "cmd": cmd.cmd, "params": data['original_params'], 'callback': cid}
        task_json = task.to_json()
        task_json['task_status'] = task_json['status']  # we don't want the two status keys to conflict
        task_json.pop('status')
        return {**result, **task_json}
    except Exception as e:
        print("failed to get something in add_task_to_callback_func " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status': 'error', 'error': 'Failed to create task: ' +str(sys.exc_info()[-1].tb_lineno) + " " + str(e), 'cmd': data['command'], 'params': data['params'], 'callback': cid}


async def save_params_to_file_ids(operation, operator, file_updates_with_task, params):
    try:
        params = js.loads(params)
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
                    count += 1
                code_file = open(path, "wb")
                code = base64.b64decode( params[file_update[0]])
                code_file.write( code )
                code_file.close()
                md5 = await hash_MD5(code)
                sha1 = await hash_SHA1(code)
                new_file_meta = await db_objects.create(FileMeta, total_chunks=1, chunks_received=1, complete=True,
                                                        path=path, operation=operation, operator=operator,
                                                        full_remote_path="", md5=md5, sha1=sha1, temp_file=True)
                file_update[1] = new_file_meta
                params[file_update[0]] = new_file_meta.agent_file_id
        params = js.dumps(params)
        return file_updates_with_task, params
    except Exception as e:
        # print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return file_updates_with_task, params


async def perform_load_transforms(data, cb, operation, op, task):
    uuid = await generate_uuid()
    working_path = "./app/payloads/operations/{}/{}".format(operation.name, uuid)
    try:
        # in the end this returns a dict of status and either a final file path or an error message
        load_transforms = await get_transforms_func(cb.registered_payload.payload_type.ptype, "load")
        if load_transforms['status'] == "success":
            # if we need to do something like compile or put code in a specific format
            #   we should have a temp working directory for whatever needs to be done, similar to payload creation

            # copy the payload type's files there
            await local_copytree("./app/payloads/{}/payload/".format(cb.registered_payload.payload_type.ptype), working_path)
            # now that we copied files here, do the same replacement we do for creating a payload
            for base_file in glob.iglob(working_path + "/**", recursive=True):
                try:
                    if os.path.isdir(base_file):
                        continue
                    base = open(base_file, 'r')
                    # write to the new file, then copy it over when we're done
                    custom = open(working_path + "/" + uuid, 'w')  # make sure our temp file won't exist
                    for line in base:
                        # replace c2 parameter values if we see them
                        if 'UUID_HERE' in line:
                            replaced_line = line.replace("UUID_HERE", uuid)
                            custom.write(replaced_line)
                        else:
                            custom.write(line)
                    base.close()
                    custom.close()
                    os.remove(base_file)
                    os.rename(working_path + "/" + uuid, base_file)
                except Exception as e:
                    print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    custom.close()
            # bring over all of the c2 components and stamp in their variables
            await write_c2_based_on_callback_loaded_c2(working_path, cb)
            # always start with a list of paths for all of the things we want to load
            # check if somebody submitted {'cmds':'shell,load, etc', 'file_id': 4} instead of list of commands
            try:
                replaced_params = data['params'].replace("'", '"')
                funcs = js.loads(replaced_params)['cmds']
            except Exception as e:
                funcs = data['params']
            data['params'] = funcs
            # first make sure we can find all of the commands and put them in our working directory
            for p in data['params'].split(","):
                if os.path.exists("./app/payloads/{}/commands/{}".format(cb.registered_payload.payload_type.ptype, p.strip())):
                    await local_copytree(
                        "./app/payloads/{}/commands/{}".format(cb.registered_payload.payload_type.ptype, p.strip()),
                        working_path + "/{}".format(p.strip()))
                else:
                    shutil.rmtree(working_path)
                    await db_objects.create(Response, task=task, response="failed to find command: {}. Aborting load".format(p))
                    return {'status': 'error', 'error': 'failed to find command directory: {}'.format(p),
                            'cmd': data['command'],
                            'params': data['params'], 'callback': cb.id}
            # then add them all to our loaded commands list
            for p in data['params'].split(","):
                try:
                    query = await db_model.command_query()
                    command = await db_objects.get(query, payload_type=cb.registered_payload.payload_type,
                                                   cmd=p.strip())
                    try:
                        query = await db_model.loadedcommands_query()
                        loaded_command = await db_objects.get(query, callback=cb, command=command)
                        loaded_command.version = command.version
                        await db_objects.update(loaded_command)
                    except Exception as e:
                        # we couldn't find it, so we need to create it since this is a new command, not an update
                        loaded_command = await db_objects.create(LoadedCommands, callback=cb, command=command,
                                                                 version=command.version, operator=op)
                except Exception as e:
                    print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            # zip up all of the code and send it off to rabbitmq and the corresponding container for transforms
            load_uuid = await generate_uuid()
            shutil.make_archive("./app/payloads/operations/{}/{}".format(operation.name,load_uuid), 'zip', working_path)
            file_data = open("./app/payloads/operations/{}/{}".format(operation.name,load_uuid) + ".zip", 'rb').read()
            result = await send_pt_rabbitmq_message(cb.registered_payload.payload_type.ptype,
                                                    "load_transform_with_code.{}".format(task.id),
                                                    base64.b64encode(
                                                        js.dumps(
                                                            {"zip": base64.b64encode(file_data).decode('utf-8'),
                                                             "transforms": load_transforms['transforms'],
                                                             "extension": cb.registered_payload.payload_type.file_extension,
                                                             "loads": data['params'].split(",")}
                                                        ).encode()
                                                    ).decode('utf-8'), op.username)
            shutil.rmtree(working_path)
            os.remove("./app/payloads/operations/{}/{}".format(operation.name, load_uuid) + ".zip")
            return result
        else:
            shutil.rmtree(working_path)
            return {'status': 'error', 'error': 'failed to get transforms for this payload type', 'cmd': data['command'],
                    'params': data['params'], 'callback': cb.id}
    except Exception as e:
        shutil.rmtree(working_path)
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        raise e


async def add_command_attack_to_task(task, command):
    try:
        query = await db_model.attackcommand_query()
        attack_mappings = await db_objects.execute(query.where(ATTACKCommand.command == command))
        for attack in attack_mappings:
            try:
                query = await db_model.attacktask_query()
                # try to get the query, if it doens't exist, then create it in the exception
                await db_objects.get(query, task=task, attack=attack.attack)
            except Exception as e:
                await db_objects.create(ATTACKTask, task=task, attack=attack.attack)
        # now do the artifact adjustments as well
        query = await db_model.artifacttemplate_query()
        artifacts = await db_objects.execute(query.where( (ArtifactTemplate.command == command) & (ArtifactTemplate.deleted == False)))
        for artifact in artifacts:
            try:
                temp_string = artifact.artifact_string
                if artifact.command_parameter is not None and artifact.command_parameter != 'null':
                    # we need to swap out temp_string's replace_string with task's param's command_parameter.name value
                    parameter_dict = js.loads(task.params)
                    temp_string = temp_string.replace(artifact.replace_string, str(parameter_dict[artifact.command_parameter.name]))
                else:
                    # we need to swap out temp_string's replace_string with task's params value
                    if artifact.replace_string != "":
                        temp_string = temp_string.replace(artifact.replace_string, str(task.params))
                await db_objects.create(TaskArtifact, task=task, artifact_template=artifact, artifact_instance=temp_string, host=task.callback.host)
            except Exception as e:
                print(e)
                pass

    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        raise e


@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>/notcompleted", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_not_completed_tasks_for_callback(request, cid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    return json(await get_all_not_completed_tasks_for_callback_func(cid, user))


async def get_all_not_completed_tasks_for_callback_func(cid, user):
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=cid)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=callback.operation)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status': 'error', 'error': 'failed to get callback or operation'}
    if operation.name in user['operations']:
        # Get all tasks that have a status of submitted or processing
        query = await db_model.task_query()
        tasks = await db_objects.prefetch(query.where(
            (Task.callback == callback) & (Task.completed != True)).order_by(Task.timestamp), Command.select())
        return {'status': 'success', 'tasks': [x.to_json() for x in tasks]}
    else:
        return {'status': 'error', 'error': 'You must be part of the operation to view this information'}


@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>/clear", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def clear_tasks_for_callback(request, cid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    return json(await clear_tasks_for_callback_func(request.json, cid, user))


async def clear_tasks_for_callback_func(data, cid, user):
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, id=cid)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=callback.operation)

        tasks_removed = []
        if "all" == data['task']:
            query = await db_model.task_query()
            tasks = await db_objects.prefetch(query.where(
                (Task.callback == callback) & (Task.status == "submitted")).order_by(Task.timestamp), Command.select())
        elif len(data['task']) > 0:
            #  if the user specifies a task, make sure that it's not being processed or already done
            query = await db_model.task_query()
            tasks = await db_objects.prefetch(query.where(
                (Task.id == data['task']) & (Task.status == "submitted")), Command.select())
        else:
            # if you don't actually specify a task, remove the the last task that was entered
            query = await db_model.task_query()
            tasks = await db_objects.prefetch(query.where(
                (Task.status == "submitted") & (Task.callback == callback)
            ).order_by(-Task.timestamp).limit(1), Command.select())
        for t in list(tasks):
            if operation.name in user['operations']:
                try:
                    t_removed = t.to_json()
                    # don't actually delete it, just mark it as completed with a response of "CLEARED TASK"
                    t.status = "processed"
                    t.status_processed_timestamp = datetime.utcnow()
                    t.status_processing_timestamp = t.status_processed_timestamp
                    t.completed = True
                    t.timestamp = datetime.utcnow()
                    await db_objects.update(t)
                    # we need to adjust all of the things associated with this task now since it didn't actually happen
                    # find/remove ATTACKTask, TaskArtifact, FileMeta
                    query = await db_model.attacktask_query()
                    attack_tasks = await db_objects.execute(query.where(ATTACKTask.task == t))
                    for at in attack_tasks:
                        await db_objects.delete(at, recursive=True)
                    query = await db_model.taskartifact_query()
                    task_artifacts = await db_objects.execute(query.where(TaskArtifact.task == t))
                    for ta in task_artifacts:
                        await db_objects.delete(ta, recursive=True)
                    query = await db_model.filemeta_query()
                    file_metas = await db_objects.execute(query.where(FileMeta.task == t))
                    for fm in file_metas:
                        os.remove(fm.path)
                        await db_objects.delete(fm, recursive=True)
                    # now create the response so it's easy to track what happened with it
                    response = "CLEARED TASK by " + user['username']
                    await db_objects.create(Response, task=t, response=response)
                    tasks_removed.append(t_removed)
                except Exception as e:
                    print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    return {'status': 'error', 'error': 'failed to delete task: ' + t.command.cmd}
        return {'status': 'success', 'tasks_removed': tasks_removed}
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status': 'error', 'error': 'failed to set up for removing tasks'}


@apfell.route(apfell.config['API_BASE'] + "/tasks/<tid:int>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_task_and_responses(request, tid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.id == tid), Command.select())
        task = list(task)[0]
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({'status': 'error', 'error': 'failed to find that task'})
    try:
        if task.callback.operation.name in user['operations']:
            query = await db_model.response_query()
            responses = await db_objects.execute(query.where(Response.task == task).order_by(Response.id))
            query = await db_model.callback_query()
            callback = await db_objects.get(query.where(Callback.id == task.callback))
            return json({'status': "success", "callback": callback.to_json(), "task": task.to_json(), "responses": [r.to_json() for r in responses]})
        else:
            return json({'status': 'error', 'error': 'you don\'t have access to that task'})
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({'status': 'error', 'error': 'Failed to fetch task: ' + str(sys.exc_info()[-1].tb_lineno) + " " + str(e)})


@apfell.route(apfell.config['API_BASE'] + "/tasks/<tid:int>/raw_output", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_task_and_responses_as_raw_output(request, tid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        if task.callback.operation.name in user['operations']:
            query = await db_model.response_query()
            responses = await db_objects.execute(query.where(Response.task == task).order_by(Response.id))
            output = ''.join([bytes(r.response).decode('utf-8', errors="backslashreplace") for r in responses])
            return json({'status': 'success', 'output': base64.b64encode(output.encode()).decode('utf-8')})
        else:
            return json({'status': 'error', 'error': 'you don\'t have access to that task'})
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({'status': 'error', 'error': 'failed to find that task {}'.format(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))})


@apfell.route(apfell.config['API_BASE'] + "/tasks/comments/<tid:int>", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def add_comment_to_task(request, tid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        data = request.json
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        if task.callback.operation.name in user['operations']:
            if 'comment' in data:
                task.comment = data['comment']
                task.comment_operator = operator
                await db_objects.update(task)
                return json({'status': "success", "task": task.to_json()})
            else:
                return json({'status': 'error', 'error': 'must supply a "comment" to add'})
        else:
            return json({'status': 'error', 'error': 'you don\'t have access to that task'})
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({'status': 'error', 'error': 'failed to find that task'})


@apfell.route(apfell.config['API_BASE'] + "/tasks/comments/<tid:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_task_comment(request, tid, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.task_query()
        task = await db_objects.prefetch(query.where(Task.id == tid), Command.select())
        task = list(task)[0]
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        if task.callback.operation.name in user['operations']:
            task.comment = ""
            task.comment_operator = operator
            await db_objects.update(task)
            return json({'status': "success", "task": task.to_json()})
        else:
            return json({'status': 'error', 'error': 'you don\'t have access to that task'})
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({'status': 'error', 'error': 'failed to find that task'})


@apfell.route(apfell.config['API_BASE'] + "/tasks/comments/by_operator", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_comments_by_operator_in_current_operation(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.operatoroperation_query()
        operator_operation = await db_objects.execute(query.where(OperatorOperation.operation == operation))
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find operator or operation: ' + str(e)})
    operators_list = []
    for mapping in operator_operation:
        operator = mapping.operator
        query = await db_model.task_query()
        tasks = await db_objects.prefetch(query.where( (Task.comment_operator == operator) & (Task.comment != "")).where(Callback.operation == operation).order_by(Task.id), Command.select())
        callbacks = {}
        for t in tasks:
            query = await db_model.response_query()
            responses = await db_objects.execute(query.where(Response.task == t).order_by(Response.id))
            if t.callback.id not in callbacks:
                query = await db_model.callback_query()
                cback = await db_objects.get(query.where(Callback.id == t.callback))
                callbacks[t.callback.id] = cback.to_json()
                callbacks[t.callback.id]['tasks'] = []
            callbacks[t.callback.id]['tasks'].append({**t.to_json(), "responses": [r.to_json() for r in responses]})
        if len(callbacks.keys()) > 0:
            operators_list.append({**operator.to_json(), 'callbacks': list(callbacks.values())})
    return json({'status': 'success', 'operators': operators_list})


@apfell.route(apfell.config['API_BASE'] + "/tasks/comments/by_callback", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_comments_by_callback_in_current_operation(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find operator or operation: ' + str(e)})
    query = await db_model.task_query()
    tasks = await db_objects.prefetch(query.where(Task.comment != "").where(Callback.operation == operation).order_by(Task.id), Command.select())
    callbacks = {}
    for t in tasks:
        query = await db_model.response_query()
        responses = await db_objects.execute(query.where(Response.task == t).order_by(Response.id))
        if t.callback.id not in callbacks:
            query = await db_model.callback_query()
            cback = await db_objects.get(query.where(Callback.id == t.callback))
            callbacks[t.callback.id] = cback.to_json()
            callbacks[t.callback.id]['tasks'] = []
        callbacks[t.callback.id]['tasks'].append({**t.to_json(), "responses": [r.to_json() for r in responses]})
    return json({'status': 'success', 'callbacks': list(callbacks.values())})


@apfell.route(apfell.config['API_BASE'] + "/tasks/comments/search", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def search_comments_by_callback_in_current_operation(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        data = request.json
        if 'search' not in data:
            return json({'status': 'error', 'error': 'search is required'})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find operator or operation: ' + str(e)})
    query = await db_model.task_query()
    tasks = await db_objects.prefetch(query.where(Task.comment.regexp(data['search'])).where(Callback.operation == operation).order_by(Task.id), Command.select())
    callbacks = {}
    for t in tasks:
        query = await db_model.response_query()
        responses = await db_objects.execute(query.where(Response.task == t))
        if t.callback.id not in callbacks:
            query = await db_model.callback_query()
            cback = await db_objects.get(query.where(Callback.id == t.callback))
            callbacks[t.callback.id] = cback.to_json()
            callbacks[t.callback.id]['tasks'] = []
        callbacks[t.callback.id]['tasks'].append({**t.to_json(), "responses": [r.to_json() for r in responses]})
    return json({'status': 'success', 'callbacks': list(callbacks.values())})
