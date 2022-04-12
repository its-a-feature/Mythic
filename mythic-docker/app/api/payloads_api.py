from app import mythic
import app
from sanic.response import json, file_stream
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
from app.api.c2profiles_api import start_stop_c2_profile
from app.api.operation_api import send_all_operations_message
from app.api.crypto_api import generate_enc_dec_keys
import logging
import asyncio
from app.api.c2profiles_api import c2_rpc


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
        payloads = await app.db_objects.execute(db_model.payload_query)
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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        c2profile_payloads = await app.db_objects.execute(
            db_model.c2profileparametersinstance_query.where(
                (db_model.Payload.operation == operation) &
                (db_model.C2ProfileParametersInstance.payload != None)
            )
        )
        results = {}
        for cp in c2profile_payloads:
            if cp.payload.operation == operation:
                if cp.payload.id not in results:
                    results[cp.payload.id] = {'payload': cp.payload, "c2": []}
                if cp.c2_profile.name not in results[cp.payload.id]["c2"]:
                    results[cp.payload.id]["c2"].append(cp.c2_profile.name)
        payloads = []
        for k, v in results.items():
            payloads.append({**v["payload"].to_json(), "c2profiles": v["c2"]})
        return json(payloads)
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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        data = request.json
        output = {}
        if "ptypes" not in data:
            return json(
                {"status": "error", "error": "must specify a list of payload types"}
            )
        for p in data["ptypes"]:
            try:
                ptype = await app.db_objects.get(db_model.payloadtype_query, ptype=p, deleted=False)
                payloads = await app.db_objects.execute(
                    db_model.payload_query.where(
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


@mythic.route(mythic.config["API_BASE"] + "/payloads/<puuid:str>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_payload_info(request, puuid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        payload = await app.db_objects.get(db_model.payload_query, uuid=puuid)
    except Exception as e:
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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


@mythic.route(
    mythic.config["API_BASE"] + "/payloads/<puuid:str>", methods=["DELETE"]
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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        return json(await remove_payload_func(puuid, operation))
    except Exception as e:
        return json({"status": "error", "error": "Failed to find operation"})


async def remove_payload_func(uuid, operation):
    try:
        payload = await app.db_objects.get(db_model.payload_query, uuid=uuid, operation=operation)
    except Exception as e:
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": "specified payload does not exist"}
    try:
        payload.deleted = True
        await app.db_objects.update(payload)
        if os.path.exists(payload.file.path):
            try:
                os.remove(payload.file.path)
            except Exception as e:
                logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        # if we started hosting this payload as a file in our database, we need to remove that as well
        file_metas = await app.db_objects.execute(
            db_model.filemeta_query.where(FileMeta.path == payload.file.path)
        )
        for fm in file_metas:
            fm.deleted = True
            await app.db_objects.update(fm)
        success = {"status": "success"}
        return {**success, **payload.to_json()}
    except Exception as e:
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
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
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
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
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {
                "status": "error",
                "error": "Failed to get operation",
                "errors": {},
                "successes": {},
            }
        )


async def register_new_payload_func(data, user):
    try:
        if user["current_operation"] == "":
            return {"status": "error", "error": "must be in an active operation"}
        if "payload_type" not in data:
            return {"status": "error", "error": '"payload_type" field is required'}
        try:
            payload_type = await app.db_objects.get(db_model.payloadtype_query, ptype=data["payload_type"])
        except Exception as e:
            logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return {
                "status": "error",
                "error": "failed to get payload type when registering payload",
            }
        if "c2_profiles" not in data and not payload_type.wrapper:
            return {"status": "error", "error": '"c2_profiles" field is required'}
        # the other parameters are based on the payload_type, c2_profile, or other payloads
        if "selected_os" not in data:
            return {"status": "error", "error": "Must supply a 'selected_os' operating system value"}
        try:
            operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
            operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        except Exception as e:
            logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return {
                "status": "error",
                "error": "failed to get operator or operation when registering payload",
            }
        # we want to track the parent callbacks of new callbacks if possible
        tag = data["tag"] if "tag" in data else ""
        # if the type of payload is a wrapper, then it doesn't have any commands associated with it
        # otherwise, get all of the commands and make sure they're valid
        uuid = await generate_uuid()
        if "uuid" in data:
            uuid = data["uuid"]
            await send_all_operations_message(message=f"Creating payload using user supplied payload UUID - {uuid}",
                                              level="info", source="starting_c2_profile", operation=operation)

        filename = data["filename"] if "filename" in data else uuid
        # Register payload
        if "build_container" not in data:
            data["build_container"] = payload_type.ptype
        if not payload_type.wrapper:
            file_meta = await app.db_objects.create(
                db_model.FileMeta,
                operation=operation,
                operator=operator,
                total_chunks=1,
                is_payload=True,
                complete=True,
                chunks_received=1,
                delete_after_fetch=False,
                filename=filename.encode("utf-8"),
                path="./app/files/{}".format(uuid),
            )
            payload = await app.db_objects.create(
                Payload,
                operator=operator,
                payload_type=payload_type,
                tag=tag,
                uuid=uuid,
                operation=operation,
                os=data["selected_os"],
                build_container=data["build_container"],
                file=file_meta,
            )
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="Creating new payload {} from {} with UUID {} and tag: {}".format(
                    payload_type.ptype, operator.username, payload.uuid, payload.tag
                ),
            )
            # go through each c2 profile and creating payload/c2 mappings and instantiate their parameters
            # Get all of the c2 profile parameters and create their instantiations
            for p in data["c2_profiles"]:
                try:
                    c2_profile = await app.db_objects.get(db_model.c2profile_query, name=p["c2_profile"])
                    if c2_profile.container_running and not c2_profile.running and not c2_profile.is_p2p:
                        await send_all_operations_message(message=f"Starting {c2_profile.name} C2 Profile when creating payload", level="info", source="starting_c2_profile")
                        c2status, successfully_sent = await start_stop_c2_profile(c2_profile, "start")
                        if not successfully_sent:
                            await send_all_operations_message(message=f"Failed to contact and start {c2_profile.name} C2 Profile",
                                                              level="warning", source="starting_c2_profile")
                        else:
                            status = js.loads(c2status)
                            if "running" in status:
                                if status["running"]:
                                    await send_all_operations_message(message=f"Successfully started {c2_profile.name} C2 Profile\n{status['output']}",
                                                                      level="info", source="starting_c2_profile")
                                else:
                                    await send_all_operations_message(message=f"Failed to start {c2_profile.name} C2 Profile\n{status['output']}",
                                                                      level="warning", source="starting_c2_profile")
                                c2_profile.running = status.pop("running")
                                await app.db_objects.update(c2_profile)

                except Exception as e:
                    logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    payload.build_phase = "error"
                    payload.build_stderr = f"failed to get c2 profile when registering payload"
                    await app.db_objects.update(payload)
                    return {
                        "status": "error",
                        "error": "failed to get c2 profile when registering payload",
                    }
                db_c2_profile_parameters = await app.db_objects.execute(
                    db_model.c2profileparameters_query.where( (C2ProfileParameters.c2_profile == c2_profile) & (C2ProfileParameters.deleted == False))
                )
                for param in db_c2_profile_parameters:
                    # find the matching data in the data['c2_profile_parameters']
                    try:
                        if param.name not in p["c2_profile_parameters"]:
                            if param.randomize:
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
                                ] = param.default_value.split("\n")[0] if len(param.default_value.split("\n")) > 0 else ""
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
                                    if entry["default_show"]:
                                        temp_dict.append({"name": entry["name"].strip(),
                                                          "value": entry["default_value"].strip(),
                                                          "key": entry["name"].strip(),
                                                          "custom": True if entry["name"] == "*" else False})
                                p["c2_profile_parameters"][param.name] = temp_dict
                            else:
                                p["c2_profile_parameters"][param.name] = param.default_value
                        elif param.randomize and "randomize" in data and data["randomize"]:
                            from app.api.c2profiles_api import (
                                generate_random_format_string,
                            )
                            p["c2_profile_parameters"][
                                param.name
                            ] = await generate_random_format_string(param.format_string)
                        if param.parameter_type in ["Array", "Dictionary"]:
                            p["c2_profile_parameters"][param.name] = js.dumps(p["c2_profile_parameters"][param.name])
                        c2p = await app.db_objects.create(
                            C2ProfileParametersInstance,
                            c2_profile_parameters=param,
                            value=str(p["c2_profile_parameters"][param.name]).strip(),
                            payload=payload,
                            c2_profile=c2_profile,
                        )
                        if param.crypto_type:
                            if payload.payload_type.mythic_encrypts:
                                keys = await generate_enc_dec_keys(p["c2_profile_parameters"][param.name])
                                c2p.enc_key = keys["enc_key"]
                                c2p.dec_key = keys["dec_key"]
                                await app.db_objects.update(c2p)
                                if c2p.enc_key is None:
                                    await app.db_objects.create(db_model.OperationEventLog, level="warning", operation=payload.operation,
                                                            message=f"Using no encryption for payload {bytes(payload.file.filename).decode('utf-8')} ({payload.uuid}) in {c2_profile.name}! Specified encryption type of {c2p.value}")
                            else:
                                # mythic doesn't handle the encryption, so send this data off to the payload's
                                #   translation_container to gen the appropriate enc/dec keys
                                if payload.payload_type.translation_container is not None:
                                    from app.api.callback_api import translator_rpc
                                    keys, successfully_sent = await translator_rpc.call(message={
                                        "action": "generate_keys",
                                        "message": c2p.to_json(),
                                    }, receiver="{}_rpc_queue".format(payload.payload_type.translation_container.name))
                                    if keys == b"":
                                        if successfully_sent:
                                            # we successfully sent the message, but got blank bytes back, raise an error
                                            asyncio.create_task(send_all_operations_message(
                                                message=f"Failed to have {payload.payload_type.translation_container.name} container process generate_keys. Check the container's logs with './mythic-cli logs {payload.payload_type.translation_container.name}",
                                                level="warning", source="generate_keys_success", operation=payload.operation))
                                            payload.build_phase = "error"
                                            payload.build_stderr = f"Failed to have {payload.payload_type.translation_container.name} container process generate_keys. Check the container's logs with './mythic-cli logs {payload.payload_type.translation_container.name}"
                                            await app.db_objects.update(payload)
                                            return {"status": "error", "error": "Failed to create payload parameters"}
                                        else:
                                            asyncio.create_task(send_all_operations_message(
                                                message=f"Failed to contact {payload.payload_type.translation_container.name} container. Is it running? Check with './mythic-cli status' or check the container's logs",
                                                level="warning", source="generate_keys_error", operation=payload.operation))
                                            payload.build_phase = "error"
                                            payload.build_stderr = f"Failed to contact {payload.payload_type.translation_container.name} container. Is it running? Check with './mythic-cli status' or check the container's logs"
                                            await app.db_objects.update(payload)
                                            return {"status": "error", "error": "Failed to generate crypto keys in " + payload.payload_type.translation_container.name}
                                    else:
                                        try:
                                            keys = js.loads(keys)
                                            if keys["enc_key"] is not None:
                                                c2p.enc_key = base64.b64decode(keys["enc_key"])
                                            else:
                                                c2p.enc_key = None
                                                asyncio.create_task(send_all_operations_message(
                                                    message=f"Using no encryption for payload {bytes(payload.file.filename).decode('utf-8')} ({payload.uuid}) in {c2_profile.name}! Specified encryption type of {c2p.value}",
                                                    level="warning", operation=payload.operation))
                                            if keys["dec_key"] is not None:
                                                c2p.dec_key = base64.b64decode(keys["dec_key"])
                                            await app.db_objects.update(c2p)
                                        except Exception as e:
                                            asyncio.create_task(send_all_operations_message(
                                                message=f"Failed to parse {payload.payload_type.translation_container.name} container's returned keys for a payload. Expected JSON, got: {keys}",
                                                level="warning", source="generate_keys_load_from_container", operation=payload.operation))
                                            payload.build_phase = "error"
                                            payload.build_stderr = f"Failed to parse {payload.payload_type.translation_container.name} container's returned keys for a payload. Expected JSON with base64 encoded 'enc_key' and 'dec_key' key values, got: {keys}"
                                            await app.db_objects.update(payload)
                                            return {"status": "error", "error": "Failed to load crypto keys returned from " + payload.payload_type.translation_container.name}
                                else:
                                    # somehow have crypto fields, no translation container, and we don't translate
                                    asyncio.create_task(send_all_operations_message(
                                        message=f"Parameter has crypto_type {c2p.value}, but {payload.payload_type.ptype} has no translation_container and {payload.payload_type.ptype} doesn't want Mythic to handle encryption",
                                        level="warning", source="generate_keys_no_generator", operation=payload.operation))
                                    payload.build_phase = "error"
                                    payload.build_stderr = f"Parameter has crypto_type {c2p.value}, but {payload.payload_type.ptype} has no translation_container and {payload.payload_type.ptype} doesn't want Mythic to handle encryption"
                                    await app.db_objects.update(payload)
                                    return {"status": "error", "error": f"Got crypto parameters, but {payload.payload_type.ptype} has no translation_container and {payload.payload_type.ptype} doesn't want Mythic to handle encryption"}
                    except Exception as e:
                        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                        # remove our payload that we managed to create
                        return {
                            "status": "error",
                            "error": "failed to create parameter instance: " + str(e),
                        }
                try:
                    payload_c2 = await app.db_objects.create(
                        db_model.PayloadC2Profiles, payload=payload, c2_profile=c2_profile
                    )
                except Exception as e:
                    logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    payload.build_phase = "error"
                    payload.build_stderr = f"failed to create parameter instance: " + str(e)
                    await app.db_objects.update(payload)
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
                wrapped_payload = await app.db_objects.get(
                    db_model.payload_query, uuid=data["wrapped_payload"], operation=operation
                )
            except Exception as e:
                logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                return {
                    "status": "error",
                    "error": "failed to find the wrapped payload specified in our current operation",
                }
            data["selected_os"] = wrapped_payload.os
            file_meta = await app.db_objects.create(
                db_model.FileMeta,
                operation=operation,
                operator=operator,
                total_chunks=1,
                is_payload=True,
                complete=True,
                chunks_received=1,
                delete_after_fetch=False,
                filename=filename.encode("utf-8"),
                path="./app/files/{}".format(uuid),
            )
            payload = await app.db_objects.create(
                Payload,
                operator=operator,
                payload_type=payload_type,
                tag=tag,
                build_container=data["build_container"],
                os=data["selected_os"],
                file=file_meta,
                uuid=uuid,
                operation=operation,
                wrapped_payload=wrapped_payload,
            )
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="Creating new payload {} from {} with UUID {} and tag: {}".format(
                    payload_type.ptype, operator.username, payload.uuid, payload.tag
                ),
            )

        # Get all of the build parameters if any and create their instantiations
        bparameters = await app.db_objects.execute(
            db_model.buildparameter_query.where(
                (db_model.BuildParameter.payload_type == payload.payload_type)
                & (db_model.BuildParameter.deleted == False)
            )
        )
        # set default values for instances if some aren't supplied
        if "build_parameters" not in data:
            data["build_parameters"] = []
        final_build_parameters = {}
        for build_param in bparameters:
            value = None
            for t in data["build_parameters"]:
                if build_param.name == t["name"] and 'value' in t:
                    if isinstance(t["value"], str):
                        value = t["value"].strip()
                    else:
                        value = t["value"]
            if value is None:
                if build_param.parameter_type == "ChooseOne":
                    value = build_param.parameter.split("\n")[0]
                else:
                    value = build_param.parameter.strip()
            final_build_parameters[build_param.name] = value
            await app.db_objects.create(
                db_model.BuildParameterInstance,
                build_parameter=build_param,
                payload=payload,
                parameter=value,
            )
        if not payload_type.wrapper:
            db_commands = {}
            if "commands" not in data or data["commands"] is None:
                data["commands"] = []
            all_commands = await app.db_objects.execute(db_model.command_query.where(
                db_model.Command.payload_type == payload_type
            ))
            for all_command in all_commands:
                if payload_type.supports_dynamic_loading:
                    command_attributes = js.loads(all_command.attributes)
                    if len(command_attributes["supported_os"]) == 0 or data["selected_os"] in command_attributes["supported_os"]:
                        # only potentially include the command if it matches the os we're building for
                        if "builtin" in command_attributes and command_attributes["builtin"] is True:
                            # if the command is built in, we have to include it
                            db_commands[all_command.cmd] = all_command
                            continue
                        if "load_only" in command_attributes and command_attributes["load_only"] is True:
                            # this command must be loaded later and cannot be included initially, skip it
                            continue
                        if len(data["commands"]) == 0:
                            if "suggested" in command_attributes and command_attributes["suggested"] == True:
                                # add in suggested commands if the user didn't actually pick anything
                                # typically this would be through scripting
                                db_commands[all_command.cmd] = all_command
                        if "filter_by_build_parameter" in command_attributes and len(
                                command_attributes["filter_by_build_parameter"]) > 0:
                            # there are potentially build parameters that would exclude us from including this command
                            include_command = True
                            for key, value in command_attributes["filter_by_build_parameter"].items():
                                if key in final_build_parameters and final_build_parameters[key] != value:
                                    include_command = False
                            if include_command and all_command.cmd in data["commands"]:
                                db_commands[all_command.cmd] = all_command
                            continue
                        if all_command.cmd in data["commands"]:
                            db_commands[all_command.cmd] = all_command
                else:
                    # the payload_type doesn't support dynamic loading, so all must be added
                    # regardless of what the user submitted
                    if all_command.cmd not in db_commands:
                        db_commands[all_command.cmd] = all_command
            for cmd in db_commands:
                try:
                    await app.db_objects.create(
                        PayloadCommand,
                        payload=payload,
                        command=db_commands[cmd],
                        version=db_commands[cmd].version,
                    )
                except Exception as e:
                    payload.build_phase = "error"
                    payload.build_stderr = "Failed to associate command with payload - " + str(e)
                    await app.db_objects.update(payload)
                    return {"status": "error", "error": "failed to add command to payload"}
        try:
            os.makedirs(pathlib.Path(file_meta.path).parent, exist_ok=True)
            pathlib.Path(file_meta.path).touch()
        except Exception as e:
            payload.build_phase = "error"
            payload.build_stderr = "Failed to touch file on disk - " + str(file_meta.path)
            await app.db_objects.update(payload)
            return {"status": "error", "error": "failed to touch file on disk"}
        return {"status": "success", **payload.to_json()}
    except Exception as e:
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": str(e)}


async def generate_uuid():
    return str(uuid.uuid4())


async def write_payload(uuid, user, data):
    try:
        payload = await app.db_objects.get(db_model.payload_query, uuid=uuid)
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {
            "status": "error",
            "error": "failed to get payload db object to write to disk",
        }

    if not payload.payload_type.container_running:
        payload.build_phase = "error"
        payload.build_stderr = f"{payload.payload_type.ptype} container is not running. Check with './mythic-cli status'"
        await app.db_objects.update(payload)
        return {"status": "error", "error": "build container not running"}
    if payload.payload_type.last_heartbeat < datetime.utcnow() + timedelta(seconds=-30):
        payload_type = await app.db_objects.get(db_model.payloadtype_query, ptype=payload.payload_type.ptype)
        payload_type.container_running = False
        await app.db_objects.update(payload_type)
        payload.build_phase = "error"
        payload.build_stderr = f"{payload.payload_type.ptype} container is not running. Check with './mythic-cli status'"
        await app.db_objects.update(payload)
        return {
            "status": "error",
            "error": "build container not running, no heartbeat in over 30 seconds.\nCheck that it's running with `./mythic-cli status`",
        }
    commands = await app.db_objects.execute(db_model.payloadcommand_query.where(PayloadCommand.payload == payload))
    commands = [c.command.cmd for c in commands]
    build_parameters = {}
    build_params = await app.db_objects.execute(
        db_model.buildparameterinstance_query.where(db_model.BuildParameterInstance.payload == payload)
    )
    for bp in build_params:
        build_parameters[bp.build_parameter.name] = bp.parameter
    c2_profile_parameters = []
    payloadc2profiles = await app.db_objects.execute(
        db_model.payloadc2profiles_query.where(db_model.PayloadC2Profiles.payload == payload)
    )
    for pc2p in payloadc2profiles:
        # for each profile, we need to get all of the parameters and supplied values for just that profile
        param_dict = {}
        c2_param_instances = await app.db_objects.execute(
            db_model.c2profileparametersinstance_query.where(
                (C2ProfileParametersInstance.payload == payload)
                & (C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
            )
        )
        # save all the variables off to a dictionary for easy looping
        for instance in c2_param_instances:
            param = instance.c2_profile_parameters
            if param.crypto_type:
                param_dict[param.name] = {
                    "value": instance.value,
                    "enc_key": base64.b64encode(instance.enc_key).decode() if instance.enc_key is not None else None,
                    "dec_key": base64.b64encode(instance.dec_key).decode() if instance.dec_key is not None else None,
                }
            elif param.parameter_type in ["Array", "Dictionary"]:
                try:
                    param_dict[param.name] = js.loads(instance.value)
                except Exception as f:
                    param_dict[param.name] = instance.value
            else:
                param_dict[param.name] = instance.value
        status, successfully_sent = await c2_rpc.call(message={
            "action": "opsec",
            "parameters": param_dict
        }, receiver="{}_mythic_rpc_queue".format(pc2p.c2_profile.name))
        if not successfully_sent:
            pc2p.c2_profile.running = False
            await app.db_objects.update(pc2p.c2_profile)
            payload.build_phase = "error"
            payload.build_stderr = f"C2 Profile {pc2p.c2_profile.name}'s container is not running, so it cannot be tasked with an OPSEC check"
            await app.db_objects.update(payload)
            return {
                "status": "error",
                "error": f"C2 Profile {pc2p.c2_profile.name}'s container not running, no heartbeat in over 30 seconds.\nCheck that it's running with `./mythic-cli status`",
            }
        status = js.loads(status)
        if status["status"] == "error":
            if status["error"] == "'opsec'":
                # this is fine, just means the profile never implemented an opsec function
                pass
            else:
                payload.build_phase = "error"
                payload.build_stderr = f"\nFailed to pass OPSEC check for {pc2p.c2_profile.name}:\n{status['error']}"
                await app.db_objects.update(payload)
                return {"status": "error", "error": payload.build_stderr}
        else:
            if "message" not in status:
                status["message"] = "OPSEC Check executed, but provided no output"
            payload.build_message = payload.build_message + f"\nOPSEC message from {pc2p.c2_profile.name}:\n{status['message']}"
            await app.db_objects.update(payload)
        # perform config_check for c2 profile
        status, successfully_sent = await c2_rpc.call(message={
            "action": "config_check",
            "parameters": param_dict
        }, receiver="{}_mythic_rpc_queue".format(pc2p.c2_profile.name))
        if not successfully_sent:
            pc2p.c2_profile.running = False
            await app.db_objects.update(pc2p.c2_profile)
            payload.build_phase = "error"
            payload.build_stderr = f"C2 Profile {pc2p.c2_profile.name}'s container is not running, so it cannot be tasked with a config check"
            await app.db_objects.update(payload)
            return {
                "status": "error",
                "error": f"C2 Profile {pc2p.c2_profile.name}'s container not running, no heartbeat in over 30 seconds.\nCheck that it's running with `./mythic-cli status`",
            }
        status = js.loads(status)
        if status["status"] == "error":
            if status["error"] == "'config_check'":
                # this is fine, just means the profile never implemented a config_check function
                pass
            else:
                payload.build_message = payload.build_message + f"\nFailed to pass a configuration check for {pc2p.c2_profile.name}:\n{status['error']}"
                await app.db_objects.update(payload)
        else:
            if "message" not in status:
                status["message"] = "Configuration Check executed, but provided no output"
            payload.build_message = payload.build_message + f"\nConfiguration Check message from {pc2p.c2_profile.name}:\n{status['message']}"
            await app.db_objects.update(payload)
        c2_profile_parameters.append(
            {"parameters": param_dict, **pc2p.c2_profile.to_json()}
        )
    wrapped_payload = ""
    try:
        if payload.wrapped_payload is not None:
            if os.path.exists(payload.wrapped_payload.file.path):
                wrapped_payload = base64.b64encode(
                    open(payload.wrapped_payload.file.path, "rb").read()
                ).decode()
            else:
                payload.build_phase = "error"
                error_message = "\nSelected Wrapped Payload No Longer Exists, It was Deleted"
                payload.build_stderr = payload.build_stderr + error_message if payload.build_stderr is not None else error_message
                await app.db_objects.update(payload)
                return {"status": "error", "error": "Wrapped payload no longer exists"}
    except Exception as e:
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        payload.build_phase = "error"
        error_message = "\nFailed to Find Payload: " + str(e)
        payload.build_stderr = payload.build_stderr + error_message if payload.build_stderr is not None else error_message
        await app.db_objects.update(payload)
        return {"status": "error", "error": "Error trying to get wrapped payload"}
    result = await send_pt_rabbitmq_message(
        payload.payload_type.ptype,
        "create_payload_with_code",
        js.dumps(
            {
                "build_parameters": build_parameters,
                "commands": commands,
                "selected_os": data["selected_os"],
                "c2_profile_parameters": c2_profile_parameters,
                "uuid": payload.uuid,
                "wrapped_payload": wrapped_payload,
            }
        ),
        user["username"],
        payload.uuid
    )
    if result["status"] == "error" and "type" in result:
        payload.build_phase = "error"
        payload.build_stderr = "Container not online"
        payload.payload_type.container_count = 0
        await app.db_objects.update(payload.payload_type)
        await app.db_objects.update(payload)
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
    return json(await create_payload_func(data, user))


@mythic.route(mythic.config["API_BASE"] + "/rebuild_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_payload_again_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot create payloads"})
    from app.api.rabbitmq_api import get_payload_build_config
    try:
        rebuild_info = request.json["input"]
        data = await get_payload_build_config(payload_uuid=rebuild_info["uuid"], generate_new_random_values=False)
        if data["status"] == "success":
            return json(await create_payload_func(data["data"], user))
        else:
            return json(data)
    except Exception as e:
        return json({"status": "error", "error": "Failed to rebuild payload: " + str(e)})


@mythic.route(mythic.config["API_BASE"] + "/export_payload_config_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def export_payload_config_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    from app.api.rabbitmq_api import get_payload_build_config
    try:
        jsondata = request.json["input"]
        data = await get_payload_build_config(payload_uuid=jsondata["uuid"], generate_new_random_values=False)
        if data["status"] == "success":
            return json({"status": "success", "config": js.dumps(data["data"], indent=4)})
        else:
            return json(data)
    except Exception as e:
        return json({"status": "error", "error": "Failed to rebuild payload: " + str(e)})


@mythic.route(mythic.config["API_BASE"] + "/createpayload_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_payload_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot create payloads"})
    data = request.json
    try:
        data = js.loads(data["input"]["payloadDefinition"])
        response = await (create_payload_func(data, user))
        return json(response)
    except Exception as e:
        return json({"status": "error", "error": str(e)})


async def create_payload_func(data, user):
    try:
        if "tag" not in data or data["tag"] == "":
            data["tag"] = (
                "Created by " + user["username"] + " at " + datetime.utcnow().strftime("%m/%d/%Y %H:%M:%S") + " UTC"
            )
        # first we need to register the payload
        rsp = await register_new_payload_func(data, user)
        if rsp["status"] == "success":
            # now that it's registered, write the file, if we fail out here then we need to delete the db object
            payload = await app.db_objects.get(db_model.payload_query, uuid=rsp["uuid"])
            create_rsp = await write_payload(payload.uuid, user, data)
            if create_rsp["status"] == "success":
                return {"status": "success", "uuid": rsp["uuid"]}
            else:
                return {"status": "error", "error": create_rsp["error"]}
        else:
            logging.warning("payloads_api.py - Failed to register_new_payload_func: " + rsp["error"])
            return {"status": "error", "error": rsp["error"]}
    except Exception as e:
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {"status": "error", "error": str(e)}


@mythic.route(mythic.config["API_BASE"] + "/redirect_rules_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def redirect_rules_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    data = request.json
    output = ""
    try:
        payload_uuid = data["input"]["uuid"]
        payload = await app.db_objects.get(db_model.payload_query, uuid=payload_uuid)
        if payload.build_phase == "error" or payload.build_phase == "building":
            return json({"status": "error", "error": "Can't generate redirect rules unless there's a successful build"})
        payloadc2profiles = await app.db_objects.execute(
            db_model.payloadc2profiles_query.where(db_model.PayloadC2Profiles.payload == payload)
        )
        for pc2p in payloadc2profiles:
            # for each profile, we need to get all of the parameters and supplied values for just that profile
            param_dict = {}
            c2_param_instances = await app.db_objects.execute(
                db_model.c2profileparametersinstance_query.where(
                    (C2ProfileParametersInstance.payload == payload)
                    & (C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
                )
            )
            # save all the variables off to a dictionary for easy looping
            for instance in c2_param_instances:
                param = instance.c2_profile_parameters
                if param.crypto_type:
                    param_dict[param.name] = {
                        "value": instance.value,
                        "enc_key": base64.b64encode(
                            instance.enc_key).decode() if instance.enc_key is not None else None,
                        "dec_key": base64.b64encode(
                            instance.dec_key).decode() if instance.dec_key is not None else None,
                    }
                elif param.parameter_type in ["Array", "Dictionary"]:
                    try:
                        param_dict[param.name] = js.loads(instance.value)
                    except Exception as f:
                        param_dict[param.name] = instance.value
                else:
                    param_dict[param.name] = instance.value
            status, successfully_sent = await c2_rpc.call(message={
                "action": "redirect_rules",
                "parameters": param_dict
            }, receiver="{}_mythic_rpc_queue".format(pc2p.c2_profile.name))
            if not successfully_sent:
                pc2p.c2_profile.running = False
                await app.db_objects.update(pc2p.c2_profile)
                output += "Redirect Rules for " + pc2p.c2_profile.name + ":\n"
                output += f"\tC2 Profile {pc2p.c2_profile.name}'s container not running, no heartbeat in over 30 seconds.\n\tCheck that it's running with `./mythic-cli status`\n"
                continue
            status = js.loads(status)
            if status["status"] == "error":
                if status["error"] == "'redirect_rules'":
                    # this is fine, just means the profile never implemented an opsec function
                    output += "Redirect Rules for " + pc2p.c2_profile.name + ":\n"
                    output += f"\tNot Implemented\n"
                    continue
                else:
                    output += "Redirect Rules for " + pc2p.c2_profile.name + ":\n"
                    output += f"\tError: {status['error']}\n"
                    continue
            else:
                output += "Redirect Rules for " + pc2p.c2_profile.name + ":\n"
                if "message" not in status:
                    output += f"\tNo output from function"
                else:
                    output += f"\t{status['message']}\n"
            # perform config_check for c2 profile
    except Exception as e:
        return json({"status": "error", "error": str(e)})
    return json({"status": "success", "output": output})


@mythic.route(mythic.config["API_BASE"] + "/config_check_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def config_check_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    data = request.json
    output = ""
    try:
        payload_uuid = data["input"]["uuid"]
        payload = await app.db_objects.get(db_model.payload_query, uuid=payload_uuid)
        payloadc2profiles = await app.db_objects.execute(
            db_model.payloadc2profiles_query.where(db_model.PayloadC2Profiles.payload == payload)
        )
        for pc2p in payloadc2profiles:
            # for each profile, we need to get all of the parameters and supplied values for just that profile
            param_dict = {}
            c2_param_instances = await app.db_objects.execute(
                db_model.c2profileparametersinstance_query.where(
                    (C2ProfileParametersInstance.payload == payload)
                    & (C2ProfileParametersInstance.c2_profile == pc2p.c2_profile)
                )
            )
            # save all the variables off to a dictionary for easy looping
            for instance in c2_param_instances:
                param = instance.c2_profile_parameters
                if param.crypto_type:
                    param_dict[param.name] = {
                        "value": instance.value,
                        "enc_key": base64.b64encode(
                            instance.enc_key).decode() if instance.enc_key is not None else None,
                        "dec_key": base64.b64encode(
                            instance.dec_key).decode() if instance.dec_key is not None else None,
                    }
                elif param.parameter_type in ["Array", "Dictionary"]:
                    try:
                        param_dict[param.name] = js.loads(instance.value)
                    except Exception as f:
                        param_dict[param.name] = instance.value
                else:
                    param_dict[param.name] = instance.value
            status, successfully_sent = await c2_rpc.call(message={
                "action": "config_check",
                "parameters": param_dict
            }, receiver="{}_mythic_rpc_queue".format(pc2p.c2_profile.name))
            if not successfully_sent:
                pc2p.c2_profile.running = False
                await app.db_objects.update(pc2p.c2_profile)
                output += "Configuration Check for " + pc2p.c2_profile.name + ":\n"
                output += f"\tC2 Profile {pc2p.c2_profile.name}'s container not running, no heartbeat in over 30 seconds.\n\tCheck that it's running with `./mythic-cli status`\n"
                continue
            status = js.loads(status)
            if status["status"] == "error":
                if status["error"] == "'config_check'":
                    # this is fine, just means the profile never implemented an opsec function
                    output += "Configuration Check for " + pc2p.c2_profile.name + ":\n"
                    output += f"\tNot Implemented\n"
                    continue
                else:
                    output += "Configuration Check for " + pc2p.c2_profile.name + ":\n"
                    output += f"\tError: {status['error']}\n"
                    continue
            else:
                output += "Configuration Check for " + pc2p.c2_profile.name + ":\n"
                if "message" not in status:
                    output += f"\tNo output from function"
                else:
                    output += f"\t{status['message']}\n"
            # perform config_check for c2 profile
    except Exception as e:
        return json({"status": "error", "error": str(e)})
    return json({"status": "success", "output": output})


# needs to not be protected so the implant can call back and get a copy of an agent to run
@mythic.route(
    mythic.config["API_BASE"] + "/payloads/download/<puuid:str>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_payload(request, puuid, user):
    # return a blob of the requested payload
    # the pload string will be the uuid of a payload registered in the system
    try:
        if user["view_mode"] == "spectator":
            return json({"status": "error", "error": "Spectators cannot download payloads"})
        payload = await app.db_objects.get(db_model.payload_query, uuid=puuid)
    except Exception as e:
        return json({"status": "error", "error": "payload not found"})
    if payload.operation.name in user["operations"]:
        try:
            return await file_stream(payload.file.path, filename=bytes(payload.file.filename).decode("utf-8"))
        except Exception as e:
            logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return json({"status": "error", "error": "failed to open payload"})
    else:
        return json(
            {"status": "error", "error": "you're not part of the right operation"}
        )


@mythic.route(
    mythic.config["API_BASE"] + "/payloads/bytype/<ptype:str>", methods=["GET"]
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
        payloadtype = await app.db_objects.get(db_model.payloadtype_query, ptype=payload_type)
    except Exception as e:
        return json({"status": "error", "error": "failed to find payload type"})
    if user["current_operation"] != "":
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    else:
        return json({"status": "error", "error": "must be part of an active operation"})
    payloads = await app.db_objects.execute(
        db_model.payload_query.where(
            (Payload.operation == operation)
            & (Payload.payload_type == payloadtype)
            & (Payload.build_phase == "success")
        )
    )
    payloads_json = [p.to_json() for p in payloads]
    return json({"status": "success", "payloads": payloads_json})


async def get_payload_config(payload):
    payloadcommands = await app.db_objects.execute(
        db_model.payloadcommand_query.where(PayloadCommand.payload == payload)
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
    c2profiles = await app.db_objects.execute(
        db_model.payloadc2profiles_query.where(db_model.PayloadC2Profiles.payload == payload)
    )
    for c2p in c2profiles:
        c2_profile_params = await app.db_objects.execute(
            db_model.c2profileparametersinstance_query.where(
                (C2ProfileParametersInstance.payload == payload)
                & (C2ProfileParametersInstance.c2_profile == c2p.c2_profile)
            )
        )
        param_fields = []
        for p in c2_profile_params:
            p_json = p.to_json()
            if p.enc_key is not None:
                p_json["enc_key"] = base64.b64encode(p.enc_key).decode()
            if p.dec_key is not None:
                p_json["dec_key"] = base64.b64encode(p.dec_key).decode()
            param_fields.append(p_json)
        c2_profiles_data[c2p.c2_profile.name] = param_fields
    build_params = await app.db_objects.execute(
        db_model.buildparameterinstance_query.where((db_model.BuildParameterInstance.payload == payload))
    )
    return {
        "status": "success",
        **payload.to_json(),
        "selected_os": payload.os,
        "commands": commands,
        "c2_profiles": c2_profiles_data,
        "build_parameters": [b.to_json() for b in build_params],
    }


@mythic.route(mythic.config["API_BASE"] + "/payloads/<puuid:str>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def edit_one_payload(request, puuid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json({"status": "error", "error": "Spectators cannot edit payloads"})
        payload = await app.db_objects.get(db_model.payload_query, uuid=puuid)
    except Exception as e:
        logging.warning("payloads_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "failed to find payload"})
    try:
        if payload.operation.name in user["operations"]:
            data = request.json
            if "callback_alert" in data:
                payload.callback_alert = data["callback_alert"]
                await app.db_objects.update(payload)
            if "filename" in data:
                payload.file.filename = data["filename"].encode("utf-8")
                await app.db_objects.update(payload.file)
            if "description" in data:
                payload.tag = data["description"]
                await app.db_objects.update(payload)
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
