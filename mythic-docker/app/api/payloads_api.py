from app import mythic, db_objects
from sanic.response import json, file
from app.database_models.model import (
    Payload,
    C2ProfileParameters,
    C2ProfileParametersInstance,
    PayloadCommand,
    FileMeta,
)
import pathlib
from sanic_jwt.decorators import scoped, inject_user
import os
from urllib.parse import unquote_plus
import base64
import sys
import uuid
import app.database_models.model as db_model
from app.api.rabbitmq_api import send_pt_rabbitmq_message
import ujson as js
from datetime import datetime, timedelta
from sanic.exceptions import abort
from app.api.rabbitmq_api import send_c2_rabbitmq_message
from app.api.operation_api import send_all_operations_message
from app.crypto import create_key_AES256


@mythic.route(mythic.config["API_BASE"] + "/payloads/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_payloads(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["admin"]:
        query = await db_model.payload_query()
        payloads = await db_objects.execute(query)
        return json([p.to_json() for p in payloads])
    else:
        return json(
            {"status": "error", "error": "Must be an admin to see all payloads"}
        )


@mythic.route(
    mythic.config["API_BASE"] + "/payloads/current_operation", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_payloads_current_operation(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.payload_query()
        payloads = await db_objects.execute(
            query.where((Payload.operation == operation) & (Payload.deleted == False))
        )
        return json([p.to_json() for p in payloads])
    else:
        return json({"status": "error", "error": "must be part of a current operation"})


@mythic.route(
    mythic.config["API_BASE"] + "/payloads/current_operation/bytypes", methods=["POST"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_payloads_current_operation(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.payload_query()
        ptype_query = await db_model.payloadtype_query()
        data = request.json
        output = {}
        if "ptypes" not in data:
            return json(
                {"status": "error", "error": "must specify a list of payload types"}
            )
        for p in data["ptypes"]:
            try:
                ptype = await db_objects.get(ptype_query, ptype=p, deleted=False)
                payloads = await db_objects.execute(
                    query.where(
                        (Payload.operation == operation)
                        & (Payload.deleted == False)
                        & (Payload.payload_type == ptype)
                        & (Payload.auto_generated == False)
                        & (Payload.build_phase == "success")
                    )
                )
                output[p] = [info.to_json() for info in payloads]
            except Exception as e:
                continue

        return json({"status": "success", "payloads": output})
    else:
        return json({"status": "error", "error": "must be part of a current operation"})


@mythic.route(
    mythic.config["API_BASE"] + "/payloads/<puuid:string>", methods=["DELETE"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_payload(request, puuid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {"status": "error", "error": "Spectators cannot remove payload"}
            )
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        return json(await remove_payload_func(puuid, operation))
    except Exception as e:
        return json({"status": "error", "error": "Failed to find operation"})


async def remove_payload_func(uuid, operation):
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid, operation=operation)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "specified payload does not exist"}
    try:
        payload.deleted = True
        await db_objects.update(payload)
        if os.path.exists(payload.file_id.path):
            try:
                os.remove(payload.file_id.path)
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        # if we started hosting this payload as a file in our database, we need to remove that as well
        query = await db_model.filemeta_query()
        file_metas = await db_objects.execute(
            query.where(FileMeta.path == payload.file_id.path)
        )
        for fm in file_metas:
            fm.deleted = True
            await db_objects.update(fm)
        success = {"status": "success"}
        return {**success, **payload.to_json()}
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "failed to delete payload: " + uuid}


@mythic.route(mythic.config["API_BASE"] + "/payloads/delete_bulk", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_multiple_payload(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {"status": "error", "error": "Spectators cannot remove payloads"}
            )
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        data = request.json
        errors = {}
        successes = {}
        for pload in data["payloads"]:
            status = await remove_payload_func(pload["uuid"], operation)
            if status["status"] == "error":
                errors[pload["uuid"]] = status["error"]
            else:
                successes[pload["uuid"]] = "success"
        if len(errors) == 0:
            return json({"status": "success", "successes": successes})
        else:
            return json({"status": "error", "errors": errors, "successes": successes})
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "Failed to get operation",
                "errors": {},
                "successes": {},
            }
        )


async def register_new_payload_func(data, user):
    if user["current_operation"] == "":
        return {"status": "error", "error": "must be in an active operation"}
    if "payload_type" not in data:
        return {"status": "error", "error": '"payload_type" field is required'}
    try:
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=data["payload_type"])
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {
            "status": "error",
            "error": "failed to get payload type when registering payload",
        }
    if "c2_profiles" not in data and not payload_type.wrapper:
        return {"status": "error", "error": '"c2_profiles" field is required'}
    # the other parameters are based on the payload_type, c2_profile, or other payloads
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {
            "status": "error",
            "error": "failed to get operator or operation when registering payload",
        }
    # we want to track the parent callbacks of new callbacks if possible
    tag = data["tag"] if "tag" in data else ""
    # if the type of payload is a wrapper, then it doesn't have any commands associated with it
    # otherwise, get all of the commands and make sure they're valid
    if not payload_type.wrapper:
        db_commands = {}
        if "commands" not in data or data["commands"] is None:
            data["commands"] = []
        for cmd in data["commands"]:
            try:
                query = await db_model.command_query()
                db_commands[cmd] = await db_objects.get(
                    query, cmd=cmd, payload_type=payload_type
                )
            except Exception as e:
                return {
                    "status": "error",
                    "error": "failed to get command {}".format(cmd),
                }
    uuid = await generate_uuid()
    filename = data["filename"] if "filename" in data else uuid
    # Register payload
    if "build_container" not in data:
        data["build_container"] = payload_type.ptype
    if not payload_type.wrapper:
        file_meta = await db_objects.create(
            db_model.FileMeta,
            operation=operation,
            operator=operator,
            total_chunks=1,
            is_payload=True,
            complete=True,
            chunks_received=1,
            delete_after_fetch=False,
            filename=filename,
            path="./app/files/{}".format(uuid),
        )
        payload = await db_objects.create(
            Payload,
            operator=operator,
            payload_type=payload_type,
            tag=tag,
            uuid=uuid,
            operation=operation,
            build_container=data["build_container"],
            file_id=file_meta,
        )
        await db_objects.create(
            db_model.OperationEventLog,
            operation=operation,
            message="New payload {} from {} with UUID {} and tag: {}".format(
                payload_type.ptype, operator.username, payload.uuid, payload.tag
            ),
        )

        for cmd in db_commands:
            try:
                pc = await db_objects.create(
                    PayloadCommand,
                    payload=payload,
                    command=db_commands[cmd],
                    version=db_commands[cmd].version,
                )
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                # this should delete any PayloadCommands that managed to get created before the error
                return {
                    "status": "error",
                    "error": "Failed to create payloadcommand: " + str(e),
                }
        # go through each c2 profile and creating payload/c2 mappings and instantiate their parameters
        # Get all of the c2 profile parameters and create their instantiations
        for p in data["c2_profiles"]:
            try:
                query = await db_model.c2profile_query()
                c2_profile = await db_objects.get(query, name=p["c2_profile"])
                if c2_profile.container_running:
                    await send_c2_rabbitmq_message(
                        c2_profile.name, "start", "", user["username"]
                    )
                    await send_all_operations_message(message=f"Starting {c2_profile.name} C2 Profile", level="info")
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                return {
                    "status": "error",
                    "error": "failed to get c2 profile when registering payload",
                }
            query = await db_model.c2profileparameters_query()
            db_c2_profile_parameters = await db_objects.execute(
                query.where(C2ProfileParameters.c2_profile == c2_profile)
            )
            for param in db_c2_profile_parameters:
                # find the matching data in the data['c2_profile_parameters']
                try:
                    if param.name not in p["c2_profile_parameters"]:
                        if param.name == "AESPSK":
                            p["c2_profile_parameters"][
                                param.name
                            ] = await create_key_AES256()
                        elif param.randomize:
                            # generate a random value based on the associated format_string variable
                            from app.api.c2profiles_api import (
                                generate_random_format_string,
                            )

                            p["c2_profile_parameters"][
                                param.name
                            ] = await generate_random_format_string(param.format_string)
                        elif param.parameter_type == "ChooseOne":
                            p["c2_profile_parameters"][
                                param.name
                            ] = param.default_value.split("\n")[0]
                        elif param.parameter_type == "Date":
                            if param.default_value == "":
                                p["c2_profile_parameters"][param.name] = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
                            else:
                                p["c2_profile_parameters"][param.name] = (
                                            datetime.utcnow() + timedelta(days=int(param.default_value))
                                ).strftime("%Y-%m-%d")
                        elif param.parameter_type == "Dictionary":
                            # default for a dictionary type is to just display all those that have "default_show" to true
                            default_dict = js.loads(param.default_value)
                            temp_dict = []
                            for entry in default_dict:
                                if entry.default_show:
                                    temp_dict.append({"key": entry.key, "name": entry.name, "value": entry.default_value})
                            p["c2_profile_parameter"][param.name] = temp_dict
                        else:
                            p["c2_profile_parameters"][param.name] = param.default_value
                    c2p = await db_objects.create(
                        C2ProfileParametersInstance,
                        c2_profile_parameters=param,
                        value=p["c2_profile_parameters"][param.name],
                        payload=payload,
                        c2_profile=c2_profile,
                    )
                except Exception as e:
                    print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    # remove our payload that we managed to create
                    return {
                        "status": "error",
                        "error": "failed to create parameter instance: " + str(e),
                    }
            try:
                payload_c2 = await db_objects.create(
                    db_model.PayloadC2Profiles, payload=payload, c2_profile=c2_profile
                )
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                # remove our payload that we managed to create
                return {
                    "status": "error",
                    "error": "failed to create parameter instance: " + str(e),
                }
    else:
        # this means we're looking at making a wrapped payload, so make sure we can find the right payload
        if "wrapped_payload" not in data:
            return {"status": "error", "error": "missing wrapped_payload UUID"}
        try:
            query = await db_model.payload_query()
            wrapped_payload = await db_objects.get(
                query, uuid=data["wrapped_payload"], operation=operation
            )
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return {
                "status": "error",
                "error": "failed to find the wrapped payload specified in our current operation",
            }
        file_meta = await db_objects.create(
            db_model.FileMeta,
            operation=operation,
            operator=operator,
            total_chunks=1,
            is_payload=True,
            complete=True,
            chunks_received=1,
            delete_after_fetch=False,
            filename=filename,
            path="./app/files/{}".format(uuid),
        )
        payload = await db_objects.create(
            Payload,
            operator=operator,
            payload_type=payload_type,
            tag=tag,
            build_container=data["build_container"],
            file_id=file_meta,
            uuid=uuid,
            operation=operation,
            wrapped_payload=wrapped_payload,
        )
        await db_objects.create(
            db_model.OperationEventLog,
            operation=operation,
            message="New payload {} from {} with UUID {} and tag: {}".format(
                payload_type.ptype, operator.username, payload.uuid, payload.tag
            ),
        )

    # Get all of the build parameters if any and create their instantiations
    query = await db_model.buildparameter_query()
    bparameters = await db_objects.execute(
        query.where(
            (db_model.BuildParameter.payload_type == payload.payload_type)
            & (db_model.BuildParameter.deleted == False)
        )
    )
    # set default values for instances if some aren't supplied
    if "build_parameters" not in data:
        data["build_parameters"] = []
    for build_param in bparameters:
        value = None
        for t in data["build_parameters"]:
            if build_param.name == t["name"] and 'value' in t:
                value = t["value"]
        if value is None:
            if build_param.parameter_type == "ChooseOne":
                value = build_param.parameter.split("\n")[0]
            else:
                value = build_param.parameter
        await db_objects.create(
            db_model.BuildParameterInstance,
            build_parameter=build_param,
            payload=payload,
            parameter=value,
        )
    try:
        os.makedirs(pathlib.Path(file_meta.path).parent, exist_ok=True)
        pathlib.Path(file_meta.path).touch()
    except Exception as e:
        return {"status": "error", "error": "failed to touch file on disk"}
    return {"status": "success", **payload.to_json()}


async def generate_uuid():
    return str(uuid.uuid4())


async def write_payload(uuid, user, data):
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {
            "status": "error",
            "error": "failed to get payload db object to write to disk",
        }

    if not payload.payload_type.container_running:
        return {"status": "error", "error": "build container not running"}
    if payload.payload_type.last_heartbeat < datetime.utcnow() + timedelta(seconds=-30):
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=payload.payload_type.ptype)
        payload_type.container_running = False
        await db_objects.update(payload_type)
        return {
            "status": "error",
            "error": "build container not running, no heartbeat in over 30 seconds",
        }
    query = await db_model.payloadcommand_query()
    commands = await db_objects.execute(query.where(PayloadCommand.payload == payload))
    commands = [c.command.cmd for c in commands]
    build_parameters = {}
    bp_query = await db_model.buildparameterinstance_query()
    build_params = await db_objects.execute(
        bp_query.where(db_model.BuildParameterInstance.payload == payload)
    )
    for bp in build_params:
        build_parameters[bp.build_parameter.name] = bp.parameter
    c2_profile_parameters = []
    query = await db_model.payloadc2profiles_query()
    payloadc2profiles = await db_objects.execute(
        query.where(db_model.PayloadC2Profiles.payload == payload)
    )
    for pc2p in payloadc2profiles:
        # for each profile, we need to get all of the parameters and supplied values for just that profile
        param_dict = {}
        query = await db_model.c2profileparametersinstance_query()
        c2_param_instances = await db_objects.execute(
            query.where(
                (C2ProfileParametersInstance.payload == payload)
                & (C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
            )
        )
        # save all the variables off to a dictionary for easy looping
        for instance in c2_param_instances:
            param = instance.c2_profile_parameters
            param_dict[param.name] = instance.value

        c2_profile_parameters.append(
            {"parameters": param_dict, **pc2p.c2_profile.to_json()}
        )
    wrapped_payload = ""
    try:
        if payload.wrapped_payload is not None:
            if os.path.exists(payload.wrapped_payload.file_id.path):
                wrapped_payload = base64.b64encode(
                    open(payload.wrapped_payload.file_id.path, "rb").read()
                ).decode()
            else:
                return {"status": "error", "error": "Wrapped payload no longer exists"}
    except Exception as e:
        print(str(e))
        return {"status": "error", "error": "Error trying to get wrapped payload"}
    result = await send_pt_rabbitmq_message(
        payload.payload_type.ptype,
        "create_payload_with_code.{}".format(payload.uuid),
        base64.b64encode(
            js.dumps(
                {
                    "build_parameters": build_parameters,
                    "commands": commands,
                    "c2_profile_parameters": c2_profile_parameters,
                    "uuid": payload.uuid,
                    "wrapped_payload": wrapped_payload,
                }
            ).encode()
        ).decode("utf-8"),
        user["username"],
    )
    return {**result, "uuid": payload.uuid}


@mythic.route(mythic.config["API_BASE"] + "/payloads/create", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_payload(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot create payloads"})
    data = request.json
    return json(await (create_payload_func(data, user)))


async def create_payload_func(data, user):
    try:
        if "tag" not in data:
            data["tag"] = (
                "Created by " + user["username"] + " at " + datetime.utcnow().strftime("%m/%d/%Y %H:%M:%S") + " UTC"
            )
        # first we need to register the payload
        rsp = await register_new_payload_func(data, user)
        if rsp["status"] == "success":
            # now that it's registered, write the file, if we fail out here then we need to delete the db object
            query = await db_model.payload_query()
            payload = await db_objects.get(query, uuid=rsp["uuid"])
            create_rsp = await write_payload(payload.uuid, user, data)
            if create_rsp["status"] == "success":
                return {"status": "success", "uuid": rsp["uuid"]}
            else:
                return {"status": "error", "error": create_rsp["error"]}
        else:
            print(rsp["error"])
            return {"status": "error", "error": rsp["error"]}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# needs to not be protected so the implant can call back and get a copy of an agent to run
@mythic.route(
    mythic.config["API_BASE"] + "/payloads/download/<uuid:string>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_payload(request, uuid, user):
    # return a blob of the requested payload
    # the pload string will be the uuid of a payload registered in the system
    try:
        if user["view_mode"] == "spectator":
            return json({"status": "error", "error": "Spectators cannot download payloads"})
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
    except Exception as e:
        return json({"status": "error", "error": "payload not found"})
    if payload.operation.name in user["operations"]:
        try:
            return await file(payload.file_id.path, filename=payload.file_id.filename)
        except Exception as e:
            print(e)
            return json({"status": "error", "error": "failed to open payload"})
    else:
        return json(
            {"status": "error", "error": "you're not part of the right operation"}
        )


@mythic.route(
    mythic.config["API_BASE"] + "/payloads/bytype/<ptype:string>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_payloads_by_type(request, ptype, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    payload_type = unquote_plus(ptype)
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, ptype=payload_type)
    except Exception as e:
        return json({"status": "error", "error": "failed to find payload type"})
    if user["current_operation"] != "":
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    else:
        return json({"status": "error", "error": "must be part of an active operation"})
    query = await db_model.payload_query()
    payloads = await db_objects.execute(
        query.where(
            (Payload.operation == operation)
            & (Payload.payload_type == payloadtype)
            & (Payload.build_phase == "success")
        )
    )
    payloads_json = [p.to_json() for p in payloads]
    return json({"status": "success", "payloads": payloads_json})


@mythic.route(mythic.config["API_BASE"] + "/payloads/<uuid:string>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_payload_info(request, uuid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find payload"})
    if payload.operation.name in user["operations"]:
        config = await get_payload_config(payload)
        if payload.wrapped_payload is not None:
            config["wrapped"] = await get_payload_config(payload.wrapped_payload)
        return json(config)
    else:
        return json(
            {
                "status": "error",
                "error": "you need to be part of the right operation to see this",
            }
        )


async def get_payload_config(payload):
    query = await db_model.payloadcommand_query()
    payloadcommands = await db_objects.execute(
        query.where(PayloadCommand.payload == payload)
    )
    commands = [
        {
            "cmd": c.command.cmd,
            "version": c.version,
            "mythic_version": c.command.version,
        }
        for c in payloadcommands
    ]
    # now we need to get the c2 profile parameters as well
    c2_profiles_data = {}
    query = await db_model.payloadc2profiles_query()
    c2profiles = await db_objects.execute(
        query.where(db_model.PayloadC2Profiles.payload == payload)
    )
    for c2p in c2profiles:
        query = await db_model.c2profileparametersinstance_query()
        c2_profile_params = await db_objects.execute(
            query.where(
                (C2ProfileParametersInstance.payload == payload)
                & (C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
            )
        )
        params = [p.to_json() for p in c2_profile_params]
        c2_profiles_data[c2p.c2_profile.name] = params
    query = await db_model.buildparameterinstance_query()
    build_params = await db_objects.execute(
        query.where((db_model.BuildParameterInstance.payload == payload))
    )
    return {
        "status": "success",
        **payload.to_json(),
        "commands": commands,
        "c2_profiles": c2_profiles_data,
        "build_parameters": [b.to_json() for b in build_params],
    }


@mythic.route(mythic.config["API_BASE"] + "/payloads/<uuid:string>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def edit_one_payload(request, uuid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json({"status": "error", "error": "Spectators cannot edit payloads"})
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find payload"})
    try:
        if payload.operation.name in user["operations"]:
            data = request.json
            if "callback_alert" in data:
                payload.callback_alert = data["callback_alert"]
                await db_objects.update(payload)
            if "filename" in data:
                payload.file_id.filename = data["filename"]
                await db_objects.update(payload.file_id)
            if "description" in data:
                payload.tag = data["description"]
                await db_objects.update(payload)
            return json({"status": "success", **payload.to_json()})
        else:
            return json(
                {
                    "status": "error",
                    "error": "you need to be part of the right operation to see this",
                }
            )
    except Exception as e:
        return json({"status": "error", "error": str(e)})
