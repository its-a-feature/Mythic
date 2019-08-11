from app import apfell, db_objects
from sanic.response import json, raw
from app.database_models.model import Callback, Task, FileMeta, Response, LoadedCommands, ATTACKCommand, ATTACKTask, TaskArtifact, ArtifactTemplate, OperatorOperation, Payload, Command
from datetime import datetime, timedelta
from sanic_jwt.decorators import scoped, inject_user
from app.api.transform_api import get_transforms_func, get_commandtransforms_func
import json as js
import sys
import shutil, os, glob
from app.api.payloads_api import generate_uuid, write_c2
import app.crypto as crypt
import base64
import app.database_models.model as db_model
from app.api.rabbitmq_api import send_pt_rabbitmq_message
from sanic.exceptions import abort
from math import ceil


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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot get that response'})
    query = await db_model.task_query()
    count = await db_objects.count(query
                                     .where((Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search'])))
                                     .switch(Callback).where(Callback.operation == operation).order_by(Task.id), Command.select())
    if 'page' not in data:
        data['page'] = 1
        data['size'] = count
        tasks = await db_objects.prefetch(query
                                     .where((Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search'])))
                                     .switch(Callback).where(Callback.operation == operation).order_by(Task.id), Command.select())
    else:
        if 'page' not in data or 'size' not in data or int(data['size']) <= 0 or int(data['page']) <= 0:
            return json({'status': 'error', 'error': 'size and page must be supplied and be greater than 0'})
        data['size'] = int(data['size'])
        data['page'] = int(data['page'])
        if data['page'] * data['size'] > count:
            data['page'] = ceil(count / data['size'])
            if data['page'] == 0:
                data['page'] = 1
        tasks = await db_objects.prefetch(query
                                          .where(
            (Task.params.regexp(data['search'])) | (Task.original_params.regexp(data['search'])))
                                          .switch(Callback).where(Callback.operation == operation).order_by(Task.id).paginate(data['page'], data['size']),
                                          Command.select())
    output = []
    for t in tasks:
        query = await db_model.response_query()
        responses = await db_objects.execute(query.where(Response.task == t))
        output.append({**t.to_json(), "responses": [r.to_json() for r in responses]})
    return json({'status': 'success', 'output': output, "total_count": count, 'page': data['page'], 'size': data['size']})


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


# We don't put @protected or @inject_user here since the callback needs to be able to call this function
@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:string>/nextTask", methods=['GET'])
async def get_next_task(request, cid):
    # gets the next task by time for the callback to do
    try:
        query = await db_model.callback_query()
        callback = await db_objects.get(query, agent_callback_id=cid)
    except Exception as e:
        print("Callback did not exist, returning 404")
        return abort(404)
    command_string = ""
    params_string = ""
    task_id = ""
    try:
        callback.last_checkin = datetime.utcnow()
        callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await db_objects.update(callback)  # update the last checkin time
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=callback.operation)
        if not operation.complete:
            query = await db_model.task_query()
            task = await db_objects.prefetch(query.where(
                (Task.callback == callback) & (Task.status == "submitted")).order_by(Task.timestamp).limit(1), Command.select())
            tasks = list(task)
            if len(tasks) != 0:
                tasks = tasks[0]
                tasks.status = "processing"
                tasks.status_timestamp_processing = datetime.utcnow()
                tasks.timestamp = datetime.utcnow()
                await db_objects.update(tasks)
                command_string = tasks.command.cmd
                params_string = tasks.params
                task_id = tasks.agent_task_id
            else:
                command_string = "none"
        else:
            # operation is complete, just return blank for now, potentially an exit command later
            try:
                query = await db_model.command_query()
                exit_command = await db_objects.get(query, is_exit=True, payload_type=callback.registered_payload.payload_type)
                command_string = exit_command.cmd
            except Exception as e:
                command_string = "none"
                #return json({})
                print("Got a request from an operation that's done")
    except Exception as e:
        print("no command: {}".format(str(e)))
        command_string = "none"
    if callback.encryption_type != "" and callback.encryption_type is not None:
        # encrypt the message before returning it
        string_message = js.dumps({"command": command_string, "params": params_string, "id": task_id})
        if callback.encryption_type == "AES256":
            raw_encrypted = await crypt.encrypt_AES256(data=string_message.encode(),
                                                       key=base64.b64decode(callback.encryption_key))
            return raw(base64.b64encode(raw_encrypted), status=200)
    else:
        return json({"command": command_string, "params": params_string, "id": task_id})


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

    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    if cb.locked:
        if cb.locked_operator != operator:
            return json({'status': 'error', 'error': 'Callback is locked by another user - Cannot task',
                         'cmd': data['command'], 'params': data['params'], "callback": cid})
    query = await db_model.operatoroperation_query()
    operatoroperation = await db_objects.get(query, operator=operator, operation=operation)
    query = await db_model.callback_query()
    cb = await db_objects.get(query, id=cid, operation=operation)
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
    file_updates_with_task = []  # if we create new files throughout this process, be sure to tag them with the right task at the end
    if request.files:
        # this means we got files as part of our task, so handle those first
        params = js.loads(data['params'])
        for k in params:
            if params[k] == 'FILEUPLOAD':
                # this means we need to handle a file upload scenario and replace this value with a file_id
                code = request.files['file' + k][0].body
                path = "./app/files/{}/{}".format(user['current_operation'], request.files['file' + k][0].name)
                os.makedirs("./app/files/{}".format(user['current_operation']), exist_ok=True)
                code_file = open(path, "wb")
                code_file.write(code)
                code_file.close()
                new_file_meta = await db_objects.create(FileMeta, total_chunks=1, chunks_received=1, complete=True,
                                                  path=path, operation=operation, operator=operator)
                params[k] = new_file_meta.agent_file_id
                file_updates_with_task.append(new_file_meta)
        data['params'] = js.dumps(params)
    data['operator'] = user['username']
    data['file_updates_with_task'] = file_updates_with_task
    if 'test_command' not in data:
        data['test_command'] = False
    if 'transform_status' not in data:
        data['transform_status'] = []
    return json(await add_task_to_callback_func(data, cid, user, operator, operation, cb))


async def add_task_to_callback_func(data, cid, user, op, operation, cb):
    try:
        # first see if the operator and callback exists

        original_params = None
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
                                               status="processed", original_params=data['command'])
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
                            'params': data['params'], "callback": cid}
            elif data['command'] == "clear":
                # this means we're going to be clearing out some tasks depending on our access levels
                task = await db_objects.create(Task, callback=cb, operator=op, params="clear " + data['params'],
                                               status="processed", original_params="clear " + data['params'])
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
                            'params': data['params'], 'callback': cid}
            # it's not tasks/clear, so return an error
            return {'status': 'error', 'error': data['command'] + ' is not a registered command', 'cmd': data['command'],
                    'params': data['params'], "callback": cid}
        file_meta = ""
        # some tasks require a bit more processing, so we'll handle that here so it's easier for the agent
        if cmd.cmd == "upload":
            upload_config = js.loads(data['params'])
            # we need to get the file into the database before we can signal for the callback to pull it down
            try:
                # see if we actually submitted "file_id /remote/path/here"
                # if upload_config['file'] is still FILEUPLOAD, then we didn't swap it out with an actual file_id
                if 'file_id' in upload_config and upload_config['file'] == "FILEUPLOAD":
                    if isinstance(upload_config['file_id'], str):
                        try:
                            f = await db_objects.get(FileMeta, agent_file_id=upload_config['file_id'])
                        except Exception as e:
                            return {'status': 'error', 'error': "cannot find specified file_id",
                                         'cmd': data['command'],
                                         'params': data['params'], "callback": cid
                                         }
                    elif isinstance(upload_config['file_id'], int) and upload_config['file_id'] > 0:
                        try:
                            f = await db_objects.get(FileMeta, id=upload_config['file_id'])
                        except Exception as e:
                            return {'status': 'error', 'error': "cannot find specified file_id",
                                         'cmd': data['command'],
                                         'params': data['params'], "callback": cid
                                         }
                    else:
                        return {'status': 'error', 'error': "cannot find specified file_id",
                                'cmd': data['command'],
                                'params': data['params'], "callback": cid
                                }
                    # we don't want to lose our tracking on this file, so we'll create a new database entry
                    file_meta = await db_objects.create(FileMeta, total_chunks=f.total_chunks, chunks_received=f.chunks_received,
                                                        complete=f.complete, path=f.path, operation=f.operation, operator=op)
                    data['file_updates_with_task'].append(file_meta)
                elif 'file' in upload_config:
                    # we just made the file for this instance, so just use it as the file_meta
                    # in this case it's already added to data['file_updates_with_task']
                    query = await db_model.filemeta_query()
                    file_meta = await db_objects.get(query, agent_file_id=upload_config['file'])
                # now normalize the data for the agent since it doesn't care if it was an old or new file_id to upload
                data['params'] = js.dumps({'remote_path': upload_config['remote_path'], 'file_id': file_meta.agent_file_id})
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                return {'status': 'error', 'error': 'failed to get file info from the database: ' + str(e), 'cmd': data['command'], 'params': data['params'], "callback": cid}
        elif cmd.cmd == "download":
            if '"' in data['params']:
                data['params'] = data['params'][1:-1]  # remove "" around the string at this point if they are there
        elif cmd.cmd == "screencapture":
            if data['params'] == "" or data['params'] is None:
                data['params'] = datetime.utcnow().strftime('%Y-%m-%d-%H:%M:%S') + ".png"
        elif cmd.cmd == "load":
            try:
                if cb.registered_payload.payload_type.external:
                    task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'],
                                                   original_params=data['params'], status="submitted")
                else:
                    if not cb.registered_payload.payload_type.container_running:
                        return {"status": "error",
                                'error': 'build container not running, so cannot task to do load transforms',
                                'cmd': data['command'], 'params': data['params'], 'callback': cid}
                    if cb.registered_payload.payload_type.last_heartbeat < datetime.utcnow() + timedelta(seconds=-30):
                        query = await db_model.payloadtype_query()
                        payload_type = await db_objects.get(query, ptype=cb.registered_payload.payload_type.ptype)
                        payload_type.container_running = False
                        await db_objects.update(payload_type)
                        return {"status": "error", 'error': 'build container not running, no heartbeat in over 30 seconds'}
                    task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'],
                                                   original_params=data['params'])
                    await db_objects.update(task)
                    status = await perform_load_transforms(data, cb, operation, op, task)
                    if status['status'] == "error":
                        return {'status': 'error', 'error': status['error'], 'cmd': data['command'], 'params': data['params'], 'callback': cid}
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                return {'status': 'error', 'error': 'failed to open and encode new function', 'cmd': data['command'], 'params': data['params'], 'callback': cid}
        # now actually run through all of the command transforms
        original_params = data['params']
        cmd_transforms = await get_commandtransforms_func(cmd.id, operation.name)
        if cmd_transforms['status'] == 'success':
            rabbit_message = {"transforms": cmd_transforms['transforms'], "params": data['params'],
                              "transform_status": data['transform_status']}
            if 'test_command' in data and data['test_command']:
                rabbit_message['test_command'] = True
            else:
                rabbit_message['test_command'] = False
        else:
            return {'status': 'error', 'error': 'failed to get command transforms with message: {}'.format(
                            str(cmd_transforms['error'])), 'cmd': data['command'], 'params': original_params}
        if "test_command" in data and data['test_command']:
            # we just wanted to test out how things would end up looking, but don't actually create a Task for this
            # remove all of the fileMeta objects we created in prep for this since it's not a real issuing
            for update_file in data['file_updates_with_task']:
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
            try:
                await db_objects.delete(file_meta)
                query = await db_model.filemeta_query()
                file_count = await db_objects.count(query.where( (FileMeta.path == file_meta.path) & (FileMeta.deleted == False)))
                query = await db_model.payload_query()
                file_count += await db_objects.count(query.where( (Payload.location == file_meta.path) & (Payload.deleted == False)))
                if file_count == 0:
                    os.remove(file_meta.path)
            except Exception as e:
                pass
            #return {'status': 'success', 'cmd': data['command'], 'params': original_params, 'test_output': step_output}
        if original_params is None:
            original_params = data['params']
        # check and update if the corresponding container is running or not
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=cb.registered_payload.payload_type.ptype)
        if cb.registered_payload.payload_type.last_heartbeat < datetime.utcnow() + timedelta(seconds=-30):
            payload_type.container_running = False
            await db_objects.update(payload_type)
        result = {'status': 'success'}  # we are successful now unless the rabbitmq service is down
        if task is not None:
            await add_command_attack_to_task(task, cmd)
        if task is None:
            # only create the task if there are no cmd_transforms, or there are and the container is up
            if len(cmd_transforms['transforms']) == 0 or len(["a" for v in data['transform_status'].values() if v]) == 0 and not data['test_command']:
                task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'], original_params=original_params, status="submitted")
                task.status_timestamp_submitted = task.timestamp
                await db_objects.update(task)
                await add_command_attack_to_task(task, cmd)
            elif payload_type.container_running:
                # by default tasks are created in a preprocessing state so an agent won't get them as they're tasked to the corresponding build-servers for potential modifications
                task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'],
                                               original_params=original_params)
                # we don't want to add ATT&CK and ArtifactTask yet since we need the final results to come back from rabbitmq first
                result = await send_pt_rabbitmq_message(cb.registered_payload.payload_type.ptype,
                                                        "command_transform.{}".format(task.id),
                                                        base64.b64encode(
                                                            js.dumps(rabbit_message).encode()
                                                        ).decode('utf-8'))
            else:
                return {"status": "error",
                        'error': 'payload\'s container not running, no heartbeat in over 30 seconds, so it cannot be tasked to do transforms or tests',
                        "cmd": cmd.cmd, "params": data['params'], 'callback': cid}

        for update_file in data['file_updates_with_task']:
            # now we can associate the task with the filemeta object
            update_file.task = task
            await db_objects.update(update_file)
        task_json = task.to_json()
        task_json['task_status'] = task_json['status']  # we don't want the two status keys to conflict
        task_json.pop('status')

        return {**result, **task_json}
    except Exception as e:
        print("failed to get something in add_task_to_callback_func " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {'status': 'error', 'error': 'Failed to create task: ' +str(sys.exc_info()[-1].tb_lineno) + " " + str(e), 'cmd': data['command'], 'params': data['params'], 'callback': cid}


async def perform_load_transforms(data, cb, operation, op, task):
    try:
        # in the end this returns a dict of status and either a final file path or an error message
        load_transforms = await get_transforms_func(cb.registered_payload.payload_type.ptype, "load")
        if load_transforms['status'] == "success":
            # if we need to do something like compile or put code in a specific format
            #   we should have a temp working directory for whatever needs to be done, similar to payload creation
            uuid = await generate_uuid()
            working_path = "./app/payloads/operations/{}/{}".format(operation.name, uuid)
            # copy the payload type's files there
            shutil.copytree("./app/payloads/{}/payload/".format(cb.registered_payload.payload_type.ptype), working_path)
            # now that we copied files here, do the same replacement we do for creating a payload
            for base_file in glob.iglob(working_path + "/*", recursive=False):
                base = open(base_file, 'r')
                # write to the new file, then copy it over when we're done
                custom = open(working_path + "/" + uuid, 'w')  # make sure our temp file won't exist
                for line in base:
                    if 'C2PROFILE_NAME_HERE' in line:
                        # optional directive to insert the name of the c2 profile
                        replaced_line = line.replace("C2PROFILE_NAME_HERE", cb.registered_payload.c2_profile.name)
                        custom.write(replaced_line)
                    elif 'UUID_HERE' in line:
                        replaced_line = line.replace("UUID_HERE", uuid)
                        custom.write(replaced_line)
                    else:
                        custom.write(line)
                base.close()
                custom.close()
                os.remove(base_file)
                os.rename(working_path + "/" + uuid, base_file)
            # also copy over and handle the c2 profile files just in case they have header files or anything needed
            for file in glob.glob(r'./app/c2_profiles/{}/{}/*'.format(cb.registered_payload.c2_profile.name,
                                                                      cb.registered_payload.payload_type.ptype)):
                # once we copy a file over, try to replace some c2 params in it
                try:
                    base_c2 = open(file, 'r')
                    base_c2_new = open(working_path + "/{}".format(file.split("/")[-1]), 'w')
                except Exception as e:
                    shutil.rmtree(working_path)
                    return {'status': 'error', 'error': 'failed to open c2 code'}
                await write_c2(base_c2_new, base_c2, cb.registered_payload)
                base_c2.close()
                base_c2_new.close()
            transform_output = {}
            # always start with a list of paths for all of the things we want to load
            # check if somebody submitted {'cmds':'shell,load, etc', 'file_id': 4} instead of list of commands
            try:
                replaced_params = data['params'].replace("'", '"')
                funcs = js.loads(replaced_params)['cmds']
            except Exception as e:
                funcs = data['params']
            data['params'] = funcs
            for p in data['params'].split(","):
                # register this command as one that we're going to have loaded into the callback
                if os.path.exists("./app/payloads/{}/commands/{}".format(cb.registered_payload.payload_type.ptype, p.strip())):
                    transform_output[p.strip()] = base64.b64encode(open("./app/payloads/{}/commands/{}".format(cb.registered_payload.payload_type.ptype, p.strip()), 'rb').read()).decode('utf-8')
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
                else:
                    shutil.rmtree(working_path)
                    await db_objects.create(Response, task=task, response="failed to find command: {}. Aborting load".format(p))
                    return {'status': 'error', 'error': 'failed to find command: {}'.format(p),
                            'cmd': data['command'],
                            'params': data['params'], 'callback': cb.id}
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
                                                             "loads": transform_output}
                                                        ).encode()
                                                    ).decode('utf-8'))
            shutil.rmtree(working_path)
            os.remove("./app/payloads/operations/{}/{}".format(operation.name, load_uuid) + ".zip")
            return result
        else:
            return {'status': 'error', 'error': 'failed to get transforms for this payload type', 'cmd': data['command'],
                    'params': data['params'], 'callback': cb.id}
    except Exception as e:
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
            temp_string = artifact.artifact_string
            if artifact.command_parameter is not None and artifact.command_parameter != 'null':
                # we need to swap out temp_string's replace_string with task's param's command_parameter.name value
                parameter_dict = js.loads(task.params)
                temp_string = temp_string.replace(artifact.replace_string, str(parameter_dict[artifact.command_parameter.name]))
            else:
                # we need to swap out temp_string's replace_string with task's params value
                if artifact.replace_string != "":
                    temp_string = temp_string.replace(artifact.replace_string, str(task.params))
            await db_objects.create(TaskArtifact, task=task, artifact_template=artifact, artifact_instance=temp_string)

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
            (Task.callback == callback) & (Task.status != "processed")).order_by(Task.timestamp), Command.select())
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
        return json({'status': 'error', 'error': 'failed to find that task'})


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