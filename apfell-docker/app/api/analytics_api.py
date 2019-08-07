from app import apfell, db_objects
from app.database_models.model import Callback, Payload, ArtifactTemplate, Task, TaskArtifact, FileMeta
from sanic.response import json
from anytree import Node, find_by_attr, RenderTree, DoubleStyle
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort


# ------- ANALYTIC-BASED API FUNCTION -----------------
@apfell.route(apfell.config['API_BASE'] + "/analytics/callback_tree", methods=['GET', 'POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def analytics_callback_tree_api(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # look at the current callbacks and return their data in a more manageable tree format
    # http://anytree.readthedocs.io/en/latest/
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.callback_query()
        dbcallbacks = await db_objects.execute(query.where(Callback.operation == operation))
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get operation or callbacks'})
    callbacks = []
    # Default values here
    display_config = {}
    display_config['inactive'] = False
    display_config['strikethrough'] = False
    # The POST version of this API function will provide modifiers for what specific information to provide in the callback tree, but the main logic remains the same
    if request.method == 'POST':
        data = request.json
        if 'inactive' in data:
            display_config['inactive'] = data['inactive']
        if 'strikethrough' in data:
            display_config['strikethrough'] = data['strikethrough']
    
    for dbc in dbcallbacks:
        if dbc.active:
            callbacks.append(dbc.to_json())
        else:
            json_val = dbc.to_json()
            json_val['description'] = "CALLBACK DEAD " + json_val['description']
            callbacks.append(json_val)
    # every callback with a pcallback of null should be at the root (remove them from list as we place them)
    tree = []
    while len(callbacks) != 0:  # when we hit 0 we are done processing
        for c in callbacks:
            # this is the root of a 'tree'
            if c['pcallback'] == 'null':
                display = await analytics_callback_tree_api_function(c, display_config)
                tree.append(Node(str(c['id']), display=display))
                callbacks.remove(c)  # remove the one we just processed from our list
            else:
                for t in tree:
                    # for each tree in our list, see if we can find the parent
                    leaf = find_by_attr(t, str(c['pcallback']))
                    if leaf:
                        display = await analytics_callback_tree_api_function(c, display_config)
                        Node(str(c['id']), parent=leaf, display=display)
                        callbacks.remove(c)
                        break
    output = ""
    for t in tree:
        tmp_output = str(RenderTree(t, style=DoubleStyle).by_attr("display")) + "\n"
        # if we don't want to see inactive ones, but an inactive one has a living child, still show it
        # if we don't want to see inactive ones and it's a tree of inactive, remove it
        if not display_config['inactive']:
            lines = tmp_output.split("\n")
            for line in lines:
                if "CALLBACK DEAD " not in line and line != "":
                    output += tmp_output
        else:
            output += tmp_output
    return json({'status': 'success', 'output': output})


async def analytics_callback_tree_api_function(callback, config):
    # this takes in a configuration dictionary and returns a specific pretty-printed
    #  string for use in the analytics_callback_tree_api function
    # the callback parameter is a dictionary
    display = ""
    display += callback['user'] + "@" + callback['host'] + "(" + str(callback['pid']) + "): " + callback['description']
    if config['strikethrough'] and not callback['active']:
        display = "<del>" + display + "</del>"

    return display


async def analytics_payload_tree_api_function(payload, config):
    display = ""
    display += payload.operator.username + "'s " + payload.payload_type.ptype + " payload with " + payload.c2_profile.name + " c2 profile with tag: "
    display += payload.tag
    if config['strikethrough'] and payload.deleted:
        display = "<del>" + display + "</del>"
    return display


@apfell.route(apfell.config['API_BASE'] + "/analytics/payload_tree", methods=['GET', 'POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def analytics_payload_tree_api(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # each payload is the root of a tree, all of the corresponding callbacks that use it are under that tree
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.payload_query()
        dbpayloads = await db_objects.execute(query.where(Payload.operation == operation))
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find operation or payloads'})
    display_config = {}
    display_config['inactive'] = False  # by default, include only active callbacks
    display_config['strikethrough'] = False
    if request.method == 'POST':
        data = request.json
        if 'inactive' in data:
            display_config['inactive'] = data['inactive']
        if 'strikethrough' in data:
            display_config['strikethrough'] = data['strikethrough']
    tree = []
    for p in dbpayloads:
        display = await analytics_payload_tree_api_function(p, display_config)
        if display_config['inactive'] or (not display_config['inactive'] and not p.deleted):
            ptree = Node(str(p.id), display=display)
            # now get all callbacks that have this payload tied to it
            query = await db_model.callback_query()
            if display_config['inactive']:
                # we want to display the inactive ones as well
                using_callbacks = await db_objects.execute(query.where(Callback.registered_payload==p))
            else:
                using_callbacks = await db_objects.execute(query.where( (Callback.registered_payload==p) &
                                                                                    (Callback.active == True)))
            tree.append(ptree)
            for c in using_callbacks:
                # each of these callbacks has ptree as an associated payload
                callback_display = await analytics_callback_tree_api_function(c.to_json(), display_config)
                Node(str(c.id), parent=ptree, display=callback_display)
    output = ""
    for t in tree:
        # this is iterating over each payload-based tree
        output += str(RenderTree(t, style=DoubleStyle).by_attr("display")) + "\n"
    return json({'status': 'success', 'output': output})


@apfell.route(apfell.config['API_BASE'] + "/analytics/command_frequency", methods=['GET', 'POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def analytics_command_frequency_api(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find operation or payloads'})
    request_format = {"order": "operator"}  # can order by operator or command
    if request.method == "POST":
        data = request.json
        if 'order' in data and data['order'] in ['operator', 'command']:
            request_format['order'] = data['order']
    query = await db_model.task_query()
    tasks = await db_objects.execute(query.where(Callback.operation == operation))
    output = {}
    if request_format['order'] == 'operator':
        # {"apfell_admin": {"apfell-jxa": {"shell": 2, "ls": 5}, "viper": {"shell": 1} } }
        for t in tasks:
            if t.operator.username not in output:
                output[t.operator.username] = {}
            if t.command is None:
                # this is the case with things like clear or tasks commands that don't go to the agent
                payload_type = t.callback.registered_payload.payload_type.ptype
                command = t.params.split()[0]
            else:
                payload_type = t.command.payload_type.ptype
                command = t.command.cmd
            if payload_type not in output[t.operator.username]:
                output[t.operator.username][payload_type] = {"total_count": 0}
            if command not in output[t.operator.username][payload_type]:
                output[t.operator.username][payload_type][command] = 1
            else:
                output[t.operator.username][payload_type][command] += 1
            output[t.operator.username][payload_type]['total_count'] += 1
    elif request_format['order'] == 'command':
        # {"apfell-jxa": { "shell": 10, "ls": 15} }
        for t in tasks:
            if t.command is None:
                # this is the case with things like clear or tasks commands that don't go to the agent
                payload_type = t.callback.registered_payload.payload_type.ptype
                command = t.params.split()[0]
            else:
                payload_type = t.command.payload_type.ptype
                command = t.command.cmd
            if payload_type not in output:
                output[payload_type] = {}
            if command not in output[payload_type]:
                output[payload_type][command] = 1
            else:
                output[payload_type][command] += 1
    return json({'status': 'success', 'output': output})


@apfell.route(apfell.config['API_BASE'] + "/analytics/artifact_creation_analysis", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def analytics_artifact_creation_analysis_api(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.artifacttemplate_query()
        artifacts = await db_objects.execute(query.where(ArtifactTemplate.deleted == False))
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get artifact templates'})
    output = {}
    for a in artifacts:
        if a.artifact.name not in output:
            output[a.artifact.name] = {"total_count": 0}
        if a.command.payload_type.ptype not in output[a.artifact.name]:
            output[a.artifact.name][a.command.payload_type.ptype] = {}
        if a.command.cmd not in output[a.artifact.name][a.command.payload_type.ptype]:
            output[a.artifact.name][a.command.payload_type.ptype][a.command.cmd] = []
        output[a.artifact.name][a.command.payload_type.ptype][a.command.cmd].append(a.to_json())
        output[a.artifact.name]['total_count'] += 1

    return json({'status': 'success', 'output': output})


@apfell.route(apfell.config['API_BASE'] + "/analytics/callback_analysis", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def analytics_callback_analysis_api(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        query = await db_model.callback_query()
        callbacks = await db_objects.execute(query.where(Callback.operation == operation))
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get artifact templates'})
    output = {"date": {}, "host": {}, "total_count": 0}
    for c in callbacks:
        if c.host not in output['host']:
            output['host'][c.host] = []
        output['host'][c.host].append(c.to_json())
        cdate = c.init_callback.strftime("%Y-%m-%d")
        if cdate not in output['date']:
            output['date'][cdate] = []
        output['date'][cdate].append(c.to_json())
        output['total_count'] += 1
    return json({'status': 'success', 'output': output})


@apfell.route(apfell.config['API_BASE'] + "/analytics/artifact_overview", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def analytics_artifact_overview_api(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to get current operation'})
    output = {"artifact_counts": {"total_count": 0},
              "files": {
                  "manual_uploads": {
                      "total_count": 0,
                      "operators": {}
                  },
                  "staged_files": 0,
                  "download_files": {
                      "total_count": 0,
                      "total_size": 0,
                      "operators": {}
                  },
                  "upload_files": {
                      "total_count": 0,
                      "operators": {}
                  }
              }}
    # totals for each artifact type (15 process creates, 5 file writes)
    query = await db_model.callback_query()
    callbacks = query.where(Callback.operation == operation).select(Callback.id)
    task_query = await db_model.taskartifact_query()
    artifact_tasks = await db_objects.execute(task_query.where(Task.callback.in_(callbacks)))
    manual_tasks = await db_objects.execute(task_query.where(TaskArtifact.operation == operation))
    for t in artifact_tasks:
        if t.artifact_template is None:
            if t.artifact.name not in output['artifact_counts']:
                output['artifact_counts'][t.artifact.name] = {"automatic": 0, "manual": 0}
            output['artifact_counts'][t.artifact.name]['manual'] += 1
        elif t.artifact_template.artifact.name not in output['artifact_counts']:
            output['artifact_counts'][t.artifact_template.artifact.name] = {"automatic": 0, "manual": 0}
        elif t.artifact_template is not None:
            output['artifact_counts'][t.artifact_template.artifact.name]['automatic'] += 1
        output['artifact_counts']['total_count'] += 1
    for t in manual_tasks:
        if t.artifact.name not in output['artifact_counts']:
            output['artifact_counts'][t.artifact.name] = {"automatic": 0, "manual": 0}
        output['artifact_counts'][t.artifact.name]['manual'] += 1
        output['artifact_counts']['total_count'] += 1
    # # of files manually uploaded to Apfell
    # # of files staged/loaded through Apfell
    # # of files downloaded and total file size
    query = await db_model.filemeta_query()
    files = await db_objects.execute(query.where(FileMeta.operation == operation))
    for f in files:
        if f.task is None:
            # this means it was a manual upload
            if f.operator.username not in output['files']['manual_uploads']['operators']:
                output['files']['manual_uploads']['operators'][f.operator.username] = 0
            output['files']['manual_uploads']['operators'][f.operator.username] += 1
            output['files']['manual_uploads']['total_count'] += 1
        elif "/files/{}/downloads/".format(operation.name) in f.path:
            if f.operator.username not in output['files']['download_files']['operators']:
                output['files']['download_files']['operators'][f.operator.username] = 0
            output['files']['download_files']['operators'][f.operator.username] += 1
            output['files']['download_files']['total_count'] += 1
        elif '/operations/{}/load-'.format(operation.name) in f.path:
            output['files']['staged_files'] += 1
        else:
            if f.operator.username not in output['files']['upload_files']['operators']:
                output['files']['upload_files']['operators'][f.operator.username] = 0
            output['files']['upload_files']['operators'][f.operator.username] += 1
            output['files']['upload_files']['total_count'] += 1
    return json({'status': 'success', 'output': output})
