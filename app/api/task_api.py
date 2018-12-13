from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Callback, Operator, Task, Command, FileMeta, Operation, Response, ATTACKId
import datetime
from sanic_jwt.decorators import protected, inject_user
from app.api.utils import breakout_quoted_params
from app.api.transform_api import get_transforms_func
from app.api.utils import TransformOperation
import json as js


# This gets all tasks in the database
@apfell.route(apfell.config['API_BASE'] + "/tasks/", methods=['GET'])
@inject_user()
@protected()
async def get_all_tasks(request, user):
    callbacks = Callback.select()
    operators = Operator.select()
    tasks = Task.select()
    full_task_data = await db_objects.prefetch(tasks, callbacks, operators)
    if user['admin']:
        # callbacks_with_operators = await db_objects.prefetch(callbacks, operators)
        return json([c.to_json() for c in full_task_data])
    elif user['current_operation'] != "":
        operation = await db_objects.get(Operation, name=user['current_operation'])
        return json([c.to_json() for c in full_task_data if c.callback.operation == operation])
    else:
        return json({'status': 'error', 'error': 'must be admin to see all tasks or part of a current operation'})


# Get a single response
@apfell.route(apfell.config['API_BASE'] + "/tasks/search", methods=['POST'])
@inject_user()
@protected()
async def search_tasks(request, user):
    try:
        data = request.json
        if 'search' not in data:
            return json({'status': 'error', 'error': 'failed to find search term in request'})
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Cannot get that response'})
    tasks = await db_objects.execute(Task.select().where(Task.params.contains(data['search'])).join(Callback).where(Callback.operation == operation).order_by(Task.id))
    output = []
    for t in tasks:
        responses = await db_objects.execute(Response.select().where(Response.task == t))
        output.append({**t.to_json(), "responses": [r.to_json() for r in responses]})
    return json({'status': 'success', 'output': output})


@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>", methods=['GET'])
@inject_user()
@protected()
async def get_all_tasks_for_callback(request, cid, user):
    try:
        callback = await db_objects.get(Callback, id=cid)
        operation = await db_objects.get(Operation, id=callback.operation)
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Callback does not exist'})
    if operation.name in user['operations']:
        try:
            cb_task_data = await db_objects.execute(Task.select().where(Task.callback == callback).order_by(Task.id))
            return json([c.to_json() for c in cb_task_data])
        except Exception as e:
            return json({'status': 'error',
                         'error': 'No Tasks',
                         'msg': str(e)})
    else:
        return json({'status': 'error', 'error': 'You must be part of the right operation to see this information'})


@apfell.route(apfell.config['API_BASE'] + "/task_report_by_callback")
@inject_user()
@protected()
async def get_all_tasks_by_callback_in_current_operation(request, user):
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Not part of an operation'})
    output = []
    callbacks = await db_objects.execute(Callback.select().where(Callback.operation == operation).order_by(Callback.id))
    for callback in callbacks:
        c = callback.to_json()  # hold this callback, task, and response info to push to our output stack
        c['tasks'] = []
        tasks = await db_objects.execute(Task.select().where(Task.callback == callback).order_by(Task.id))
        for t in tasks:
            t_data = t.to_json()
            t_data['responses'] = []
            t_data['attackids'] = []  # display the att&ck id numbers associated with this task if there are any
            responses = await db_objects.execute(Response.select().where(Response.task == t).order_by(Response.id))
            for r in responses:
                t_data['responses'].append(r.to_json())
            attackids = await db_objects.execute(ATTACKId.select().where(
                (ATTACKId.task == t) | (ATTACKId.cmd == t.command)
            ).order_by(ATTACKId.id))
            for a in attackids:
                t_data['attackids'].append()
            # make it a set so we don't have duplicates from the command and some other method
            t_data['attackids'] = set(t_data['attackids'])
            c['tasks'].append(t_data)
        output.append(c)
    return json({'status': 'success', 'output': output})


# We don't put @protected or @inject_user here since the callback needs to be able to call this function
@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>/nextTask", methods=['GET'])
async def get_next_task(request, cid):
    # gets the next task by time for the callback to do
    try:
        callback = await db_objects.get(Callback, id=cid)
    except Exception as e:
        print("Callback did not exist, tasking to exit")
        return json({'command': "exit", "params": ""})  # if the callback doesn't exist for some reason, task it to exit
    try:
        callback.last_checkin = datetime.datetime.utcnow()
        callback.active = True  # always set this to true regardless of what it was before because it's clearly active
        await db_objects.update(callback)  # update the last checkin time
        operation = await db_objects.get(Operation, name=callback.operation.name)
        if not operation.complete:
            tasks = await db_objects.get(Task.select().join(Callback).where(
                (Task.callback == callback) & (Task.status == "submitted")).order_by(Task.timestamp))
        else:
            #  if the operation is done, kill anything that still tries to get tasking
            return json({"command": "exit", "params": ""})
    except Exception as e:
        print(e)
        return json({'command': 'none'})  # return empty if there are no tasks that meet the criteria
    tasks.status = "processing"
    await db_objects.update(tasks)
    return json({"command": tasks.command.cmd, "params": tasks.params, "id": tasks.id})


# create a new task to a specific callback
@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>", methods=['POST'])
@inject_user()
@protected()
async def add_task_to_callback(request, cid, user):
    # some commands can optionally upload files or indicate files for use
    # if they are uploaded here, process them first and substitute the values with corresponding file_id numbers
    if user['current_operation'] == "":
        return json({'status': 'error', 'error': 'Must be part of a current operation first'})
    try:
        operator = await db_objects.get(Operator, username=user['username'])
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get the current user's info from the database"})
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': "failed to get the current operation"})
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    file_updates_with_task = []  # if we create new files throughout this process, be sure to tag them with the right task at the end
    if request.files:
        # this means we got files as part of our task, so handle those first
        params = js.loads(data['params'])
        for k in params:
            if params[k] == 'FILEUPLOAD':
                # this means we need to handle a file upload scenario and replace this value with a file_id
                code = request.files['file' + k][0].body
                path = "./app/files/{}/{}".format(user['current_operation'], request.files['file' + k][0].name)
                code_file = open(path, "wb")
                code_file.write(code)
                code_file.close()
                new_file_meta = await db_objects.create(FileMeta, total_chunks=1, chunks_received=1, complete=True,
                                                  path=path, operation=operation, operator=operator)
                params[k] = new_file_meta.id
                file_updates_with_task.append(new_file_meta)
        data['params'] = js.dumps(params)
    data['operator'] = user['username']
    data['file_updates_with_task'] = file_updates_with_task
    return json(await add_task_to_callback_func(data, cid, user))


async def add_task_to_callback_func(data, cid, user):
    try:
        # first see if the operator and callback exists
        op = await db_objects.get(Operator, username=data['operator'])
        cb = await db_objects.get(Callback, id=cid)
        # now check the task and add it if it's valid and valid for this callback's payload type
        try:
            cmd = await db_objects.get(Command, cmd=data['command'], payload_type=cb.registered_payload.payload_type)
        except Exception as e:
            return {'status': 'error', 'error': data['command'] + ' is not a registered command', 'cmd': data['command'],
                    'params': data['params']}
        file_meta = ""
        # some tasks require a bit more processing, so we'll handle that here so it's easier for the implant
        if cmd.cmd == "upload":
            upload_config = js.loads(data['params'])
            # we need to get the file into the database before we can signal for the callback to pull it down
            try:
                # see if we actually submitted "file_id /remote/path/here"
                if 'file_id' in upload_config and upload_config['file_id'] > 0:
                    f = await db_objects.get(FileMeta, id=upload_config['file_id'])
                    # we don't want to lose our tracking on this file, so we'll create a new database entry
                    file_meta = await db_objects.create(FileMeta, total_chunks=f.total_chunks, chunks_received=f.chunks_received,
                                                        complete=f.complete, path=f.path, operation=f.operation, operator=op)
                    data['file_updates_with_task'].append(file_meta)
                elif 'file' in upload_config:
                    # we just made the file for this instance, so just use it as the file_meta
                    # in this case it's already added to data['file_updates_with_task']
                    file_meta = await db_objects.get(FileMeta, id=upload_config['file'])
                # now normalize the data for the agent since it doesn't care if it was an old or new file_id to upload
                data['params'] = js.dumps({'remote_path': upload_config['remote_path'], 'file_id': file_meta.id})
            except Exception as e:
                print(e)
                return {'status': 'error', 'error': 'failed to get file info from the database: ' + str(e), 'cmd': data['command'], 'params': data['params']}

        elif cmd.cmd == "download":
            if '"' in data['params']:
                data['params'] = data['params'][1:-1]  # remove "" around the string at this point if they are there
        elif cmd.cmd == "screencapture":
            # we need to specify here the name of the file that we'll be creating
            # since it'll already be saved in a directory structure that indicates the computer name, we'll indicate time
            data['params'] = data['params'] + " " + datetime.datetime.utcnow().strftime('%Y-%m-%d-%H:%M:%S') + ".png"
        # if the task is for something that doesn't actually go down to the client, we'll handle it a little differently
        if cmd.cmd == "tasks":
            # this means we're just listing out the not-completed tasks, so nothing actually goes to the agent
            task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'], status="processed")
            raw_rsp = await get_all_not_completed_tasks_for_callback_func(cb.id, user)
            if raw_rsp['status'] == 'success':
                rsp = ""
                for t in raw_rsp['tasks']:
                    rsp += "\nOperator: " + t['operator'] + "\nTask " + str(t['id']) + ": " + t['command'] + " " + t['params']
                await db_objects.create(Response, task=task, response=rsp)
            else:
                return {'status': 'error', 'error': 'failed to get tasks', 'cmd': data['command'], 'params': data['params']}
        elif cmd.cmd == "clear":
            # this means we're going to be clearing out some tasks depending on our access levels
            task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'],
                                           status="processed")
            raw_rsp = await clear_tasks_for_callback_func({"task": data['params']}, cb.id, user)
            if raw_rsp['status'] == 'success':
                rsp = "Removed the following:"
                for t in raw_rsp['tasks_removed']:
                    rsp += "\nOperator: " + t['operator'] + "\nTask " + str(t['id']) + ": " + t['command'] + " " + t['params']
                await db_objects.create(Response, task=task, response=rsp)
            else:
                return {'status': 'error', 'error': raw_rsp['error'], 'cmd': data['command'], 'params': data['params']}
        elif cmd.cmd == "load":
            try:
                # open the file that contains the code we're going to load in
                # see how many things we're trying to load and either perform the
                transforms = TransformOperation()
                load_transforms = await get_transforms_func(cb.registered_payload.payload_type.ptype, "load")
                if load_transforms['status'] == "success":
                    transform_output = []
                    # always start with a list of paths for all of the things we want to load
                    # check if somebody submitted {'cmds':'shell,load, etc', 'file_id': 4} instead of list of commands
                    try:
                        replaced_params = data['params'].replace("'", '"')
                        funcs = js.loads(replaced_params)['cmds']
                    except Exception as e:
                        funcs = data['params']
                    data['params'] = funcs
                    for p in data['params'].split(","):
                        transform_output.append("./app/payloads/{}/{}".format(cb.registered_payload.payload_type.ptype, p.strip()))
                    for t in load_transforms['transforms']:
                        try:
                            transform_output = await getattr(transforms, t['name'])(cb.registered_payload,
                                                                                    transform_output, t['parameter'])
                        except Exception as e:
                            print(e)
                            return {'status': 'error', 'error': 'failed to apply transform {}, with message: {}'.format(
                                t['name'], str(e)), 'cmd': data['command'], 'params': data['params']}
                    # now create a corresponding file_meta
                    file_meta = await db_objects.create(FileMeta, total_chunks=1, chunks_received=1, complete=True,
                                                        path=transform_output, operation=cb.operation)
                    data['file_updates_with_task'].append(file_meta)
                    params = {"cmds": data['params'], "file_id": file_meta.id}
                    task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=params)
                else:
                    return {'status': 'error', 'error': 'failed to get transforms for this payload type', 'cmd': data['command'], 'params': data['params']}
            except Exception as e:
                print(e)
                return {'status': 'error', 'error': 'failed to open and encode new function', 'cmd': data['command'], 'params': data['params']}
        else:
            task = await db_objects.create(Task, callback=cb, operator=op, command=cmd, params=data['params'])
        for update_file in data['file_updates_with_task']:
            # now we can associate the task with the filemeta object
            update_file.task = task
            await db_objects.update(update_file)
        status = {'status': 'success'}
        task_json = task.to_json()
        task_json['task_status'] = task_json['status']  # we don't want the two status keys to conflict
        task_json.pop('status')
        return {**status, **task_json}
    except Exception as e:
        print("failed to get something in add_task_to_callback_func " + str(e))
        return {'status': 'error', 'error': 'Failed to create task: ' + str(e), 'cmd': data['command'], 'params': data['params']}


@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>/notcompleted", methods=['GET'])
@inject_user()
@protected()
async def get_all_not_completed_tasks_for_callback(request, cid, user):
    return json(await get_all_not_completed_tasks_for_callback_func(cid, user))


async def get_all_not_completed_tasks_for_callback_func(cid, user):
    try:
        callback = await db_objects.get(Callback, id=cid)
        operation = await db_objects.get(Operation, id=callback.operation)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get callback or operation'}
    if operation.name in user['operations']:
        # Get all tasks that have a status of submitted or processing
        tasks = await db_objects.execute(Task.select().join(Callback).where(
            (Task.callback == callback) & (Task.status != "processed")).order_by(Task.timestamp))
        return {'status': 'success', 'tasks': [x.to_json() for x in tasks]}
    else:
        return {'status': 'error', 'error': 'You must be part of the operation to view this information'}


@apfell.route(apfell.config['API_BASE'] + "/tasks/callback/<cid:int>/clear", methods=['POST'])
@inject_user()
@protected()
async def clear_tasks_for_callback(request, cid, user):
    return json(await clear_tasks_for_callback_func(request.json, cid, user))


async def clear_tasks_for_callback_func(data, cid, user):
    try:
        callback = await db_objects.get(Callback, id=cid)
        operation = await db_objects.get(Operation, id=callback.operation)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to get callback or operation'}
    tasks_removed = []
    if "all" == data['task']:
        tasks = await db_objects.execute(Task.select().join(Callback).where(
            (Task.callback == callback) & (Task.status == "submitted")).order_by(Task.timestamp))
    elif len(data['task']) > 0:
        tasks = await db_objects.execute(Task.select().where(Task.id == data['task']))
    else:
        # if you don't actually specify a task, remove the the last task that was entered
        tasks = await db_objects.execute(Task.select().where(
            (Task.status == "submitted") & (Task.callback == callback)
        ).order_by(-Task.timestamp).limit(1))
    for t in tasks:
        if operation.name in user['operations']:
            try:
                t_removed = t.to_json()
                # don't actually delete it, just mark it as completed with a response of "CLEARED TASK"
                t.status = "processed"
                await db_objects.update(t)
                # now create the response so it's easy to track what happened with it
                response = "CLEARED TASK by " + user['username']
                await db_objects.create(Response, task=t, response=response)
                tasks_removed.append(t_removed)
            except Exception as e:
                print(e)
                return {'status': 'error', 'error': 'failed to delete task: ' + t.command.cmd}
    return {'status': 'success', 'tasks_removed': tasks_removed}


@apfell.route(apfell.config['API_BASE'] + "/tasks/<tid:int>", methods=['GET'])
@inject_user()
@protected()
async def get_one_task_and_responses(request, tid, user):
    try:
        task = await db_objects.get(Task, id=tid)
        if task.callback.operation.name in user['operations']:
            responses = await db_objects.execute(Response.select().where(Response.task == task))
            return json({'status': "success", "callback": task.callback.to_json(), "task": task.to_json(), "responses": [r.to_json() for r in responses]})
        else:
            return json({'status': 'error', 'error': 'you don\'t have access to that task'})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find that task'})