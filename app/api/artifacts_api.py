from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Artifact, ArtifactTemplate, TaskArtifact, Operation, Task, Callback
from sanic_jwt.decorators import protected, inject_user


@apfell.route(apfell.config['API_BASE'] + "/artifacts", methods=['GET'])
@inject_user()
@protected()
async def get_all_artifacts(request, user):
    artifacts = await db_objects.execute(Artifact.select())
    return json({'status': 'success', 'artifacts': [a.to_json() for a in artifacts]})


@apfell.route(apfell.config['API_BASE'] + "/artifacts", methods=['POST'])
@inject_user()
@protected()
async def create_artifact(request, user):
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
@protected()
async def update_artifact(request, user, id):
    data = request.json
    try:
        artifact = await db_objects.get(Artifact, id=id)
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
@protected()
async def update_artifact(request, user, id):
    try:
        artifact = await db_objects.get(Artifact, id=id)
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
@protected()
async def get_all_artifact_tasks(request, user):
    # get all of the artifact tasks for the current operation
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except:
        return json({'status': 'error', 'error': "failed to get current operation"})
    callbacks = Callback.select().where(Callback.operation == operation)
    artifact_tasks = await db_objects.execute(TaskArtifact.select().join(Task).where(Task.callback.in_(callbacks)))

    return json({'status': 'success', 'tasks': [a.to_json() for a in artifact_tasks]})


@apfell.route(apfell.config['API_BASE'] + "/artifact_tasks/<aid:int>", methods=['DELETE'])
@inject_user()
@protected()
async def remove_artifact_tasks(request, user, aid):
    try:
        artifact_task = await db_objects.get(TaskArtifact, id=aid)
    except:
        return json({'status': 'error', 'error': 'failed to find that artifact task'})
    try:
        artifact_task_json = artifact_task.to_json()
        await db_objects.delete(artifact_task)
        return json({'status': 'success', **artifact_task_json})
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to delete that task: ' + str(e)})