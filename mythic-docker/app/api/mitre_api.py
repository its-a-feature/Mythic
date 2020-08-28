from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import Task, ATTACKCommand, ATTACKTask, Callback, Command
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort


@mythic.route(mythic.config["API_BASE"] + "/mitreattack/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_mitre_attack_ids(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    query = await db_model.attack_query()
    attack_entries = await db_objects.execute(query)
    matrix = {}
    for entry in attack_entries:
        tactics = entry.tactic.split(" ")
        for t in tactics:
            if t not in matrix:
                matrix[t] = []
            matrix[t].append({**entry.to_json(), "tactic": t, "mappings": {}})
    return json({"status": "success", "attack": matrix})


@mythic.route(mythic.config["API_BASE"] + "/mitreattack/listing", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_mitre_attack_ids(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.attack_query()
        attack_entries = await db_objects.execute(query)
        return json(
            {"status": "success", "attack": [a.to_json() for a in attack_entries]}
        )
    except Exception as e:
        return json({"status": "error", "error": str(e)})


@mythic.route(mythic.config["API_BASE"] + "/mitreattack/bycommand", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_mitre_attack_ids_by_command(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    query = await db_model.attack_query()
    attack_entries = await db_objects.execute(query)
    matrix = {}
    for entry in attack_entries:
        tactics = entry.tactic.split(" ")
        for t in tactics:
            if t not in matrix:
                matrix[t] = []
            entry_json = entry.to_json()
            entry_json[
                "mappings"
            ] = {}  # this is where we'll store payload_type and command mappings
            entry_json["tactic"] = t
            query = await db_model.attackcommand_query()
            mappings = await db_objects.execute(
                query.where(ATTACKCommand.attack == entry)
            )
            for m in mappings:

                if m.command.payload_type.ptype not in entry_json["mappings"]:
                    entry_json["mappings"][m.command.payload_type.ptype] = []
                entry_json["mappings"][m.command.payload_type.ptype].append(m.to_json())
            matrix[t].append(entry_json)
    return json({"status": "success", "attack": matrix})


@mythic.route(mythic.config["API_BASE"] + "/mitreattack/bytask", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_mitre_attack_ids_by_task(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "Must have an operation set as your current operation",
            }
        )
    query = await db_model.attack_query()
    attack_entries = await db_objects.execute(query)
    matrix = {}
    for entry in attack_entries:
        tactics = entry.tactic.split(" ")
        for t in tactics:
            if t not in matrix:
                matrix[t] = []
            entry_json = entry.to_json()
            entry_json[
                "mappings"
            ] = {}  # this is where we'll store payload_type and command mappings
            entry_json["tactic"] = t
            query = await db_model.attacktask_query()
            mappings = await db_objects.execute(
                query.where(
                    (ATTACKTask.attack == entry) & (Callback.operation == operation)
                )
            )
            for m in mappings:
                if m.task.command.payload_type.ptype not in entry_json["mappings"]:
                    entry_json["mappings"][m.task.command.payload_type.ptype] = []
                entry_json["mappings"][m.task.command.payload_type.ptype].append(
                    m.to_json()
                )
            matrix[t].append(entry_json)
    return json({"status": "success", "attack": matrix})


@mythic.route(mythic.config["API_BASE"] + "/mitreattack/regex", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def regex_against_tasks(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    data = request.json
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "Failed to find current operation"})
    if "regex" not in data:
        return json({"status": "error", "error": "regex is a required field"})
    if "apply" not in data:
        return json({"status": "error", "error": "apply is a required field"})
    if "attack" not in data:
        return json({"status": "error", "error": "an attack T# is required"})
    try:
        query = await db_model.attack_query()
        attack = await db_objects.get(query, t_num=data["attack"])
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": 'Failed to find that T#. Make sure you specify "attack": "T1124" for example',
            }
        )
    try:
        query = await db_model.task_query()
        matching_tasks = await db_objects.prefetch(
            query.switch(Callback)
            .where(Callback.operation == operation)
            .switch(Task)
            .where(
                (Task.params.regexp(data["regex"]))
                | (Task.original_params.regexp(data["regex"]))
            )
            .order_by(Task.id),
            Command.select(),
        )
        if data["apply"]:
            # actually apply the specified att&ck id to the matched tasks
            for t in matching_tasks:
                # don't create duplicates
                try:
                    query = await db_model.attacktask_query()
                    attacktask = await db_objects.get(query, attack=attack, task=t)
                except Exception as e:
                    # we didn't find the specific attack-task mapping, so create a new one
                    attacktask = await db_objects.create(
                        ATTACKTask, attack=attack, task=t
                    )
            return json({"status": "success"})
        else:
            # simply return which tasks would have matched
            # for each matching task, also return which other ATT&CK IDs are associated
            tasks = []
            for t in matching_tasks:
                sub_attacks = []
                query = await db_model.attacktask_query()
                matching_attacks = await db_objects.execute(
                    query.where(ATTACKTask.task == t)
                )
                for ma in matching_attacks:
                    sub_attacks.append(
                        {"t_num": ma.attack.t_num, "name": ma.attack.name}
                    )
                tasks.append({**t.to_json(), "attack": sub_attacks})
            return json({"status": "success", "matches": tasks})
    except Exception as e:
        print(e)
        return json({"status": "error", "error": str(e)})


@mythic.route(
    mythic.config["API_BASE"] + "/mitreattack/task/<tid:int>/attack/<tnum:string>",
    methods=["DELETE"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_task_attack_mapping(request, user, tid, tnum):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot remove MITRE from tasks"}
        )
    try:
        query = await db_model.task_query()
        task = await db_objects.get(query, id=tid)
        query = await db_model.attack_query()
        attack = await db_objects.get(query, t_num=tnum)
        query = await db_model.attacktask_query()
        mapping = await db_objects.get(query, task=task, attack=attack)
        await db_objects.delete(mapping)
        return json({"status": "success", "task_id": tid, "attack": tnum})
    except Exception as e:
        print(e)
        return json({"status": "error", "error": str(e)})
