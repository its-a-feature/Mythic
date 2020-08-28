from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import Artifact, Task, Callback, TaskArtifact
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
from math import ceil
from peewee import fn


@mythic.route(mythic.config["API_BASE"] + "/artifacts", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_artifacts(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    query = await db_model.artifact_query()
    artifacts = await db_objects.execute(query)
    return json({"status": "success", "artifacts": [a.to_json() for a in artifacts]})


@mythic.route(mythic.config["API_BASE"] + "/artifacts", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_artifact(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot add base artifacts"}
        )
    data = request.json
    if "name" not in data:
        return json({"status": "error", "error": '"name" is a required parameter'})
    if "description" not in data:
        return json(
            {"status": "error", "error": '"description" is a required parameter'}
        )
    try:
        artifact = await db_objects.create(
            Artifact, name=data["name"], description=data["description"]
        )
        return json({"status": "success", **artifact.to_json()})
    except:
        return json(
            {"status": "error", "error": "Artifact with that name already exists"}
        )


@mythic.route(mythic.config["API_BASE"] + "/artifacts/<id:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_artifact(request, user, id):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot modify base artifacts"}
        )
    data = request.json
    try:
        query = await db_model.artifact_query()
        artifact = await db_objects.get(query, id=id)
    except Exception as e:
        return json({"status": "error", "error": "Could not find artifact"})
    if "name" in data:
        artifact.name = data["name"]
    if "description" in data:
        artifact.description = data["description"]
    try:
        await db_objects.update(artifact)
    except Exception as e:
        return json(
            {"status": "error", "error": "Failed to update artifact: {}".format(str(e))}
        )
    return json({"status": "success", **artifact.to_json()})


@mythic.route(mythic.config["API_BASE"] + "/artifacts/<id:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_artifact(request, user, id):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot remove base artifacts"}
        )
    try:
        query = await db_model.artifact_query()
        artifact = await db_objects.get(query, id=id)
    except Exception as e:
        return json({"status": "error", "error": "Could not find artifact"})
    try:
        artifact_json = artifact.to_json()
        query = await db_model.taskartifact_query()
        task_artifacts = await db_objects.execute(
            query.where(TaskArtifact.artifact == artifact)
        )
        for t in task_artifacts:
            await db_objects.delete(t)
        await db_objects.delete(artifact)
    except Exception as e:
        return json(
            {"status": "error", "error": "Failed to delete artifact: {}".format(str(e))}
        )
    return json({"status": "success", **artifact_json})


@mythic.route(mythic.config["API_BASE"] + "/artifact_tasks", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_artifact_tasks(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # get all of the artifact tasks for the current operation
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operation"})
    query = await db_model.callback_query()
    callbacks = query.where(Callback.operation == operation).select(Callback.id)
    task_query = await db_model.taskartifact_query()
    tasks = await db_objects.execute(
        task_query.where(
            (Task.callback.in_(callbacks)) | (TaskArtifact.operation == operation)
        )
    )
    return json({"status": "success", "tasks": [a.to_json() for a in tasks]})


@mythic.route(
    mythic.config["API_BASE"] + "/artifact_tasks/<page:int>/<size:int>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_pageinate_artifact_tasks(request, user, page, size):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # get all of the artifact tasks for the current operation
    if page <= 0 or size <= 0:
        return json({"status": "error", "error": "page or size must be greater than 0"})
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operation"})
    query = await db_model.callback_query()
    callbacks = query.where(Callback.operation == operation).select(Callback.id)
    task_query = await db_model.taskartifact_query()
    count = await db_objects.count(
        task_query.where(
            (Task.callback.in_(callbacks)) | (TaskArtifact.operation == operation)
        )
    )
    if page * size > count:
        page = ceil(count / size)
        if page == 0:
            page = 1
    tasks = await db_objects.execute(
        task_query.where(
            (Task.callback.in_(callbacks)) | (TaskArtifact.operation == operation)
        )
        .order_by(-TaskArtifact.timestamp)
        .paginate(page, size)
    )
    return json(
        {
            "status": "success",
            "tasks": [a.to_json() for a in tasks],
            "total_count": count,
            "page": page,
            "size": size,
        }
    )


@mythic.route(mythic.config["API_BASE"] + "/artifact_tasks/search", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def search_artifact_tasks(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
        if "search" not in data:
            return json({"status": "error", "error": "must supply a search term"})
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "Cannot find operation"})
    query = await db_model.callback_query()
    callbacks = query.where(Callback.operation == operation).select(Callback.id)
    task_query = await db_model.taskartifact_query()
    try:
        count = await db_objects.count(
            task_query.where(
                ((Task.callback.in_(callbacks)) | (TaskArtifact.operation == operation))
                & fn.encode(TaskArtifact.artifact_instance, "escape").regexp(
                    data["search"]
                )
            )
        )
        if "page" not in data:
            tasks = await db_objects.execute(
                task_query.where(
                    (
                        (Task.callback.in_(callbacks))
                        | (TaskArtifact.operation == operation)
                    )
                    & fn.encode(TaskArtifact.artifact_instance, "escape").regexp(
                        data["search"]
                    )
                ).order_by(-TaskArtifact.timestamp)
            )
            data["page"] = 1
            data["size"] = count
        else:
            if (
                "page" not in data
                or "size" not in data
                or int(data["size"]) <= 0
                or int(data["page"]) <= 0
            ):
                return json(
                    {
                        "status": "error",
                        "error": "size and page must be supplied and be greater than 0",
                    }
                )
            data["size"] = int(data["size"])
            data["page"] = int(data["page"])
            if data["page"] * data["size"] > count:
                data["page"] = ceil(count / data["size"])
                if data["page"] == 0:
                    data["page"] = 1
            tasks = await db_objects.execute(
                task_query.where(
                    (
                        (Task.callback.in_(callbacks))
                        | (TaskArtifact.operation == operation)
                    )
                    & fn.encode(TaskArtifact.artifact_instance, "escape").regexp(
                        data["search"]
                    )
                )
                .order_by(-TaskArtifact.timestamp)
                .paginate(data["page"], data["size"])
            )
        return json(
            {
                "status": "success",
                "tasks": [a.to_json() for a in tasks],
                "total_count": count,
                "page": data["page"],
                "size": data["size"],
            }
        )
    except Exception as e:
        return json({"status": "error", "error": "Bad regex"})


@mythic.route(
    mythic.config["API_BASE"] + "/artifact_tasks/<aid:int>", methods=["DELETE"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_artifact_tasks(request, user, aid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot remove task artifacts"}
        )
    try:
        query = await db_model.taskartifact_query()
        artifact_task = await db_objects.get(query, id=aid)
    except Exception as e:
        return json({"status": "error", "error": "failed to find that artifact task"})
    try:
        artifact_task_json = artifact_task.to_json()
        await db_objects.delete(artifact_task)
        return json({"status": "success", **artifact_task_json})
    except Exception as e:
        return json(
            {"status": "error", "error": "failed to delete that task: " + str(e)}
        )


@mythic.route(mythic.config["API_BASE"] + "/artifact_tasks", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_artifact_task_manually(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot create task artifacts"}
        )
    # get all of the artifact tasks for the current operation
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        data = request.json
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operation"})
    if "task_id" in data:
        try:
            query = await db_model.task_query()
            task = await db_objects.get(query, id=data["task_id"])
            # make sure this task belongs to a callback in the current operation
            if operation.name != task.callback.operation.name:
                return json(
                    {"status": "error", "error": "task isn't in the current operation"}
                )
            data["host"] = task.callback.host
        except Exception as e:
            return json(
                {"status": "error", "error": "task isn't in the current operation"}
            )
    else:
        task = None
    if "artifact_instance" not in data:
        return json(
            {"status": "error", "error": "must supply an artifact_instance value"}
        )
    if "artifact" not in data:
        return json(
            {
                "status": "error",
                "error": "must supply a base artifact to associate with the instance",
            }
        )
    if "host" not in data:
        data["host"] = ""
    try:
        query = await db_model.artifact_query()
        artifact = await db_objects.get(query, name=data["artifact"].encode())
    except Exception as e:
        return json({"status": "error", "error": "failed to find the artifact"})
    try:
        task_artifact = await db_objects.create(
            TaskArtifact,
            task=task,
            artifact_instance=data["artifact_instance"].encode(),
            artifact=artifact,
            operation=operation,
            host=data["host"],
        )
        return json({"status": "success", **task_artifact.to_json()})
    except Exception as e:
        return json({"status": "error", "error": str(e)})
