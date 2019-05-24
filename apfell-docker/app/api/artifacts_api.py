from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Artifact, Task, Callback
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort


@apfell.route(apfell.config['API_BASE'] + "/artifacts", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_artifacts(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    query = await db_model.artifact_query()
    artifacts = await db_objects.execute(query)
    return json({'status': 'success', 'artifacts': [a.to_json() for a in artifacts]})


@apfell.route(apfell.config['API_BASE'] + "/artifacts", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_artifact(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    if "name" not in data:
        return json({'status': 'error', 'error': '"name" is a required parameter'})
    if "description" not in data:
        return json({'status': 'error', 'error': '"description" is a required parameter'})
    try:
        artifact = await db_objects.create(Artifact, name=data['name'], description=data['description'])
        return json({'status': 'success', **artifact.to_json()})
    except:
        return json({'status': 'error', 'error': 'Artifact with that name already exists'})


@apfell.route(apfell.config['API_BASE'] + "/artifacts/<id:int>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_artifact(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    data = request.json
    try:
        query = await db_model.artifact_query()
        artifact = await db_objects.get(query, id=id)
    except Exception as e:
        return json({'status': 'error', 'error': 'Could not find artifact'})
    if "name" in data:
        artifact.name = data['name']
    if "description" in data:
        artifact.description = data['description']
    try:
        await db_objects.update(artifact)
    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to update artifact: {}'.format(str(e))})
    return json({'status': 'success', **artifact.to_json()})


@apfell.route(apfell.config['API_BASE'] + "/artifacts/<id:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_artifact(request, user, id):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.artifact_query()
        artifact = await db_objects.get(query, id=id)
    except Exception as e:
        return json({'status': 'error', 'error': 'Could not find artifact'})
    try:
        artifact_json = artifact.to_json()
        await db_objects.delete(artifact, recursive=True)
    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to delete artifact: {}'.format(str(e))})
    return json({'status': 'success', **artifact_json})


@apfell.route(apfell.config['API_BASE'] + "/artifact_tasks", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_artifact_tasks(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # get all of the artifact tasks for the current operation
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
    except:
        return json({'status': 'error', 'error': "failed to get current operation"})
    query = await db_model.callback_query()
    callbacks = query.where(Callback.operation == operation).select(Callback.id)
    task_query = await db_model.taskartifact_query()
    artifact_tasks = await db_objects.execute(task_query.where(Task.callback.in_(callbacks)))

    return json({'status': 'success', 'tasks': [a.to_json() for a in artifact_tasks]})


@apfell.route(apfell.config['API_BASE'] + "/artifact_tasks/<aid:int>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def remove_artifact_tasks(request, user, aid):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.taskartifact_query()
        artifact_task = await db_objects.get(query, id=aid)
    except:
        return json({'status': 'error', 'error': 'failed to find that artifact task'})
    try:
        artifact_task_json = artifact_task.to_json()
        await db_objects.delete(artifact_task)
        return json({'status': 'success', **artifact_task_json})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to delete that task: ' + str(e)})