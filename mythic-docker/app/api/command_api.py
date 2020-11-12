from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import Command, CommandParameters, ATTACKCommand
from sanic_jwt.decorators import scoped, inject_user
from urllib.parse import unquote_plus
import app.database_models.model as db_model
from sanic.exceptions import abort


# commands aren't inherent to an operation, they're unique to a payloadtype
@mythic.route(mythic.config["API_BASE"] + "/commands/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_commands(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] == "":
        return json({"status": "error", "error": "Must be part of a current operation to see this"})
    all_commands = []
    query = await db_model.command_query()
    commands = await db_objects.execute(
        query.where(
            (Command.deleted == False) & (db_model.PayloadType.deleted == False)
        ).order_by(Command.id)
    )
    for cmd in commands:
        query = await db_model.commandparameters_query()
        params = await db_objects.execute(
            query.where(CommandParameters.command == cmd).order_by(CommandParameters.id)
        )
        all_commands.append({**cmd.to_json(), "params": [p.to_json() for p in params]})
    return json(all_commands)


# Get information about a specific command, including its code, if it exists (used in checking before creating a new command)
@mythic.route(
    mythic.config["API_BASE"] + "/commands/<ptype:int>/check/<cmd:string>",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def check_command(request, user, ptype, cmd):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] == "":
        return json({"status": "error", "error": "Must be part of a current operation to see this"})
    status = {"status": "success"}
    cmd = unquote_plus(cmd)
    try:
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, id=ptype)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to get payload type"})
    try:
        query = await db_model.command_query()
        command = await db_objects.get(
            query, cmd=cmd, payload_type=payload_type, deleted=False
        )
        query = await db_model.commandparameters_query()
        params = await db_objects.execute(
            query.where(CommandParameters.command == command)
        )
        query = await db_model.attackcommand_query()
        attacks = await db_objects.execute(
            query.where(ATTACKCommand.command == command)
        )
        status = {
            **status,
            **command.to_json(),
            "params": [p.to_json() for p in params],
            "attack": [a.to_json() for a in attacks],
        }
    except Exception as e:
        # the command doesn't exist yet, which is good
        status = {"status": "error"}
        pass
    return json(status)


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<id:int>/parameters/", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_parameters_for_command(request, user, id):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] == "":
        return json({"status": "error", "error": "Must be part of a current operation to see this"})
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    query = await db_model.commandparameters_query()
    params = await db_objects.execute(query.where(CommandParameters.command == command))
    return json([p.to_json() for p in params])


# ################# COMMAND ATT&CK ROUTES ############################


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<id:int>/mitreattack/", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_attack_mappings_for_command(request, user, id):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] == "":
        return json({"status": "error", "error": "Must be part of a current operation to see this"})
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    query = await db_model.attackcommand_query()
    attacks = await db_objects.execute(query.where(ATTACKCommand.command == command))
    return json({"status": "success", "attack": [a.to_json() for a in attacks]})


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<id:int>/mitreattack/<t_num:string>",
    methods=["DELETE"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_attack_mapping_for_command(request, user, id, t_num):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator" or user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Spectators cannot remove MITRE mappings"}
        )
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
        query = await db_model.attack_query()
        attack = await db_objects.get(query, t_num=t_num)
        query = await db_model.attackcommand_query()
        attackcommand = await db_objects.get(query, command=command, attack=attack)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    await db_objects.delete(attackcommand)
    return json({"status": "success", "t_num": attack.t_num, "command_id": command.id})


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<id:int>/mitreattack/<t_num:string>",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_attack_mappings_for_command(request, user, id, t_num):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator" or user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Spectators cannot add MITRE mappings"}
        )
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
        query = await db_model.attack_query()
        attack = await db_objects.get(query, t_num=t_num)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    try:
        query = await db_model.attackcommand_query()
        attackcommand = await db_objects.get(query, attack=attack, command=command)
    except Exception as e:
        attackcommand = await db_objects.create(
            ATTACKCommand, attack=attack, command=command
        )
    return json({"status": "success", **attackcommand.to_json()})


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<id:int>/mitreattack/<t_num:string>",
    methods=["PUT"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def adjust_attack_mappings_for_command(request, user, id, t_num):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator" or user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Spectators cannot modify MITRE mappings"}
        )
    data = request.json
    try:
        query = await db_model.command_query()
        command = await db_objects.get(query, id=id)
        query = await db_model.attack_query()
        newattack = await db_objects.get(query, t_num=t_num)
        query = await db_model.attackcommand_query()
        attackcommand = await db_objects.get(query, id=data["id"], command=command)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    attackcommand.attack = newattack
    await db_objects.update(attackcommand)
    return json({"status": "success", **attackcommand.to_json()})
