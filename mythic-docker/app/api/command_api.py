from app import mythic
import app
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
    commands = await app.db_objects.execute(
        db_model.command_query.where(
            (Command.deleted == False) & (db_model.PayloadType.deleted == False)
        ).order_by(Command.id)
    )
    for cmd in commands:
        params = await app.db_objects.execute(
            db_model.commandparameters_query.where(CommandParameters.command == cmd).order_by(CommandParameters.id)
        )
        all_commands.append({**cmd.to_json(), "params": [p.to_json() for p in params]})
    return json(all_commands)


# Get information about a specific command, including its code, if it exists (used in checking before creating a new command)
@mythic.route(
    mythic.config["API_BASE"] + "/commands/<ptype:int>/check/<cmd:str>",
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
        payload_type = await app.db_objects.get(db_model.payloadtype_query, id=ptype)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to get payload type"})
    try:
        command = await app.db_objects.get(
            db_model.command_query, cmd=cmd, payload_type=payload_type, deleted=False
        )
        params = await app.db_objects.execute(
            db_model.commandparameters_query.where(CommandParameters.command == command)
        )
        attacks = await app.db_objects.execute(
            db_model.attackcommand_query.where(ATTACKCommand.command == command)
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
    mythic.config["API_BASE"] + "/commands/<cid:int>/parameters/", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_parameters_for_command(request, user, cid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] == "":
        return json({"status": "error", "error": "Must be part of a current operation to see this"})
    try:
        command = await app.db_objects.get(db_model.command_query, id=cid)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    params = await app.db_objects.execute(db_model.commandparameters_query.where(CommandParameters.command == command))
    return json([p.to_json() for p in params])


# ################# COMMAND ATT&CK ROUTES ############################


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<cid:int>/mitreattack/", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_attack_mappings_for_command(request, user, cid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] == "":
        return json({"status": "error", "error": "Must be part of a current operation to see this"})
    try:
        command = await app.db_objects.get(db_model.command_query, id=cid)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    attacks = await app.db_objects.execute(db_model.attackcommand_query.where(ATTACKCommand.command == command))
    return json({"status": "success", "attack": [a.to_json() for a in attacks]})


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<cid:int>/mitreattack/<t_num:str>",
    methods=["DELETE"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_attack_mapping_for_command(request, user, cid, t_num):
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
        command = await app.db_objects.get(db_model.command_query, id=cid)
        attack = await app.db_objects.get(db_model.attack_query, t_num=t_num)
        attackcommand = await app.db_objects.get(db_model.attackcommand_query, command=command, attack=attack)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    await app.db_objects.delete(attackcommand)
    return json({"status": "success", "t_num": attack.t_num, "command_id": command.id})


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<cid:int>/mitreattack/<t_num:str>",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_attack_mappings_for_command(request, user, cid, t_num):
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
        command = await app.db_objects.get(db_model.command_query, id=cid)
        attack = await app.db_objects.get(db_model.attack_query, t_num=t_num)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    try:
        attackcommand = await app.db_objects.get(db_model.attackcommand_query, attack=attack, command=command)
    except Exception as e:
        attackcommand = await app.db_objects.create(
            ATTACKCommand, attack=attack, command=command
        )
    return json({"status": "success", **attackcommand.to_json()})


@mythic.route(
    mythic.config["API_BASE"] + "/commands/<cid:int>/mitreattack/<t_num:string>",
    methods=["PUT"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def adjust_attack_mappings_for_command(request, user, cid, t_num):
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
        command = await app.db_objects.get(db_model.command_query, id=cid)
        newattack = await app.db_objects.get(db_model.attack_query, t_num=t_num)
        attackcommand = await app.db_objects.get(db_model.attackcommand_query, id=data["id"], command=command)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find that command"})
    attackcommand.attack = newattack
    await app.db_objects.update(attackcommand)
    return json({"status": "success", **attackcommand.to_json()})
