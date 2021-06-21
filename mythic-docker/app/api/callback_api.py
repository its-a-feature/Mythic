from collections import deque

from app import mythic
import app
from sanic.response import json, raw
from app.database_models.model import (
    Callback,
    Task,
    LoadedCommands,
    PayloadCommand,
)
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
from math import ceil
import aiohttp
import base64
from sanic.log import logger
import ujson as js
import app.crypto as crypt
from app.api.task_api import get_agent_tasks, update_edges_from_checkin
from app.api.response_api import post_agent_response
from app.api.file_api import download_agent_file
from app.api.crypto_api import staging_rsa
from app.api.operation_api import send_all_operations_message
from app.api.rabbitmq_api import MythicBaseRPC
import urllib.parse
from datetime import datetime
from dijkstar import Graph, find_path
from dijkstar.algorithm import NoPathError
import threading
import socket
from app.api.siem_logger import log_to_siem
import sys
import asyncio
import uuid
from time import sleep as tsleep
import json as jsonlib


@mythic.route(mythic.config["API_BASE"] + "/callbacks/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_callbacks(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] != "":
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        callbacks = await app.db_objects.prefetch(
            db_model.callback_query.where(Callback.operation == operation),
            db_model.callbacktoken_query
        )
        return json([c.to_json() for c in callbacks])
    else:
        return json([])


@mythic.route(mythic.config["API_BASE"] + "/callbacks/<eid:int>/edges", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_edges_for_callback(request, user, eid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] != "":
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        callback = await app.db_objects.get(db_model.callback_query, id=eid, operation=operation)
        edges = await app.db_objects.execute(db_model.callbackgraphedge_query.where(
            (db_model.CallbackGraphEdge.source == callback) |
            (db_model.CallbackGraphEdge.destination == callback)
        ))
        edge_info = []
        for edge in edges:
            if edge.c2_profile.is_p2p:
                info = edge.to_json()
                c2instances = await app.db_objects.execute(db_model.c2profileparametersinstance_query.where(
                    (db_model.C2ProfileParametersInstance.callback == edge.destination) &
                    (db_model.C2ProfileParametersInstance.c2_profile == edge.c2_profile)
                ))
                info["c2_parameters"] = [{"name": c.c2_profile_parameters.name, "value": c.value} for c in c2instances]
                edge_info.append(info)
        return json(edge_info)
    else:
        return json([])


cached_keys = {}
translator_rpc = MythicBaseRPC()


@mythic.route(mythic.config["API_BASE"] + "/agent_message", methods=["GET", "POST"])
async def get_agent_message(request):
    # get the raw data first
    profile = None
    data = None
    request_url = request.headers['x-forwarded-url'] if 'x-forwarded-url' in request.headers else request.url
    request_ip = request.headers['x-forwarded-for'] if 'x-forwarded-for' in request.headers else request.ip
    if "Mythic" in request.headers:
        profile = request.headers["Mythic"]
    else:
        error_message = f"Failed to find Mythic header in headers: \n{request.headers}\nConnection to: "
        error_message += f"{request_url} via {request.method}\nFrom: "
        error_message += f"{request_ip}\n"
        error_message += f"With query string: {request.headers['x-forwarded-query'] if 'x-forwarded-query' in request.headers else request.query_string}"
        asyncio.create_task(send_all_operations_message(
            message=error_message,
            level="warning", source="get_agent_message_mythic_header:" + request_ip))
        return raw(b"", 404)
    if request.body != b"":
        data = request.body
        # print("Body: " + str(data))
    elif len(request.cookies) != 0:
        for key, val in request.cookies.items():
            if data is None:
                data = val
        # print("Cookies: " + str(data))
    elif len(request.query_args) != 0:
        data = urllib.parse.unquote(request.query_args[0][1])
        # print("Query: " + str(data))
    else:
        error_message = f"Failed to find message in body, cookies, or query args\nConnection to: "
        error_message += f"{request_url} via {request.method}\nFrom: "
        error_message += f"{request_ip}\n"
        error_message += f"With query string: {request.headers['x-forwarded-query'] if 'x-forwarded-query' in request.headers else request.query_string}\n"
        error_message += f"With extra headers: {request.headers}"
        asyncio.create_task(send_all_operations_message(
            message=error_message,
            level="warning", source="get_agent_message_body" + request_ip))
        return raw(b"", 404)
    if app.debugging_enabled:
        await send_all_operations_message(message=f"Parsing agent message - step 1 (get data): \n{data}", level="info", source="debug")
    message, code, new_callback, msg_uuid = await parse_agent_message(data, request, profile)
    return raw(message, code)


async def get_payload_c2_info(payload_uuid=None, payload=None):
    if payload_uuid is not None:
        payload = await app.db_objects.get(db_model.payload_query, uuid=payload_uuid)
    c2_profiles = await app.db_objects.execute(
        db_model.payloadc2profiles_query.where(db_model.PayloadC2Profiles.payload == payload)
    )
    c2info = {}
    for c in c2_profiles:
        c2info[c.c2_profile.name] = {
            "is_p2p": c.c2_profile.is_p2p,
            "mythic_encrypts": payload.payload_type.mythic_encrypts,
            "translation_container": payload.payload_type.translation_container.name if payload.payload_type.translation_container is not None else None,
            "profile": c.c2_profile.name,
            "payload": payload
        }
        c2_params = await app.db_objects.execute(
            db_model.c2profileparametersinstance_query.where(
                (db_model.C2ProfileParametersInstance.payload == payload) &
                (db_model.C2ProfileParametersInstance.c2_profile == c.c2_profile)
            )
        )
        for cp in c2_params:
            # loop through all of the params associated with the payload and find ones that are crypt_type
            #  currently doesn't really make sense to have more than one crypto_type parameter for this purpose
            #  in a single c2 profile
            if cp.c2_profile_parameters.crypto_type:
                c2info[c.c2_profile.name] = {**c2info[c.c2_profile.name],
                                             "enc_key": bytes(cp.enc_key) if cp.enc_key is not None else None,
                                             "type": cp.value,
                                             "dec_key": bytes(cp.dec_key) if cp.dec_key is not None else None,
                                             "stage": "payload",
                                             "profile": c.c2_profile.name,
                                             "payload": payload
                                             }
        if "enc_key" not in c2info[c.c2_profile.name]:
            # we didn't find a crypto_type parameter that matched something mythic knows where mythic
            #   was also supposed to encrypt
            c2info[c.c2_profile.name] = {**c2info[c.c2_profile.name],
                                         "enc_key": None,
                                         "type": "",
                                         "dec_key": None,
                                         "stage": "payload",
                                         "profile": c.c2_profile.name,
                                         "payload": payload
                                         }
    return c2info


async def get_encryption_data(UUID: str, profile: str):
    # this function tries to retrieve a cached key for a given UUID
    # if the key doesn't exist, it queries the database for the key to use if one exists
    if UUID not in cached_keys or profile not in cached_keys[UUID]:
        # we need to look up the key to see if it exists
        try:
            # first check to see if it's some staging piece
            staging_info = await app.db_objects.get(db_model.staginginfo_query, staging_uuid=UUID)
            c2info = await get_payload_c2_info(payload_uuid=None, payload=staging_info.payload)
            cached_keys[staging_info.payload.uuid] = c2info
            cached_keys[UUID] = {
                profile: {
                    "enc_key": bytes(staging_info.enc_key) if staging_info.enc_key is not None else None,
                    "type": staging_info.crypto_type,
                    "dec_key": bytes(staging_info.dec_key) if staging_info.dec_key is not None else None,
                    "stage": "staging",
                    "is_p2p": c2info[profile]["is_p2p"],
                    "translation_container": staging_info.payload.payload_type.translation_container.name if staging_info.payload.payload_type.translation_container is not None else None,
                    "mythic_encrypts": staging_info.payload.payload_type.mythic_encrypts,
                    "profile": profile,
                    "payload": staging_info.payload
                }
            }

        except Exception as a:
            # if it's not a staging key, check if it's a payload uuid and get c2 profile AESPSK
            try:
                payload = await app.db_objects.get(db_model.payload_query, uuid=UUID)
                if payload.deleted:
                    await send_all_operations_message(operation=payload.operation,
                                            level="warning",
                                            source="deleted_payload_checking_in" + payload.uuid,
                                            message=f"Deleted payload trying to spawn callback - {js.dumps(payload.to_json(), indent=4)}")
                    raise Exception(FileNotFoundError)
                cached_keys[UUID] = await get_payload_c2_info(None, payload)
            except Exception as b:
                # finally check to see if it's an agent checking in
                try:
                    callback = await app.db_objects.prefetch(db_model.callback_query.where(db_model.Callback.agent_callback_id == UUID),
                                                         db_model.callbacktoken_query)
                    callback = list(callback)[0]
                    c2_profiles = await app.db_objects.execute(
                        db_model.callbackc2profiles_query.where(db_model.CallbackC2Profiles.callback == callback)
                    )
                    c2info = {}
                    for c in c2_profiles:
                        c2info[c.c2_profile.name] = {
                            "is_p2p": c.c2_profile.is_p2p,
                            "translation_container": callback.registered_payload.payload_type.translation_container.name if callback.registered_payload.payload_type.translation_container is not None else None,
                            "mythic_encrypts": callback.registered_payload.payload_type.mythic_encrypts,
                            "dec_key": bytes(callback.dec_key) if callback.dec_key is not None else None,
                            "type": callback.crypto_type,
                            "enc_key": bytes(callback.enc_key) if callback.enc_key is not None else None,
                            "stage": "callback",
                            "payload": callback.registered_payload,
                            "profile": c.c2_profile.name,
                            "callback": callback
                        }
                    cached_keys[UUID] = c2info
                except Exception as c:
                    logger.error(
                        "Failed to find UUID in staging, payload's with AESPSK c2 param, or callback: " + UUID
                    )
                    raise c
        return cached_keys[UUID][profile]
    else:
        return cached_keys[UUID][profile]


# returns a base64 encoded response message
async def parse_agent_message(data: str, request, profile: str):
    new_callback = ""
    agent_uuid = ""
    request_url = request.headers['x-forwarded-url'] if 'x-forwarded-url' in request.headers else request.url
    request_ip = request.headers['x-forwarded-for'] if 'x-forwarded-for' in request.headers else request.ip
    try:
        decoded = base64.b64decode(data)
        # print(decoded)
        if app.debugging_enabled:
            await send_all_operations_message(message=f"Parsing agent message - step 2 (base64 decode): \n {decoded}", level="info", source="debug")
    except Exception as e:
        error_message = f"Failed to base64 decode message\nConnection to: "
        error_message += f"{request_url} via {request.method}\nFrom: "
        error_message += f"{request_ip}\n"
        error_message += f"With extra headers: {request.headers}"
        asyncio.create_task(send_all_operations_message(message=error_message,
                                          level="warning", source="get_agent_message" + request_ip))
        return "", 404, new_callback, agent_uuid
    try:
        try:
            UUID = decoded[:36].decode()  # first 36 characters are the UUID
            UUID_length = 36
            # print(UUID)
        except Exception as e:
            # if we get here, then we're not looking at a string-based UUID, check if it's a 16B representation
            UUID = uuid.UUID(bytes_le=decoded[:16])
            UUID = str(UUID)
            UUID_length = 16
        if app.debugging_enabled:
            await send_all_operations_message(message=f"Parsing agent message - step 3 (get uuid): \n {UUID} with length {str(UUID_length)}", level="info", source="debug")
    except Exception as e:
        error_message = f"Failed to get UUID in first 36 or 16 bytes for base64 input\nConnection to: "
        error_message += f"{request_url} via {request.method}\nFrom: "
        error_message += f"{request_ip}\n"
        error_message += f"With extra headers: {request.headers}\nData: "
        error_message += f"{str(decoded)}"
        asyncio.create_task(send_all_operations_message(message= error_message,
                                          level="warning", source="get_agent_message" + request_ip))
        return "", 404, new_callback, agent_uuid
    try:
        enc_key = await get_encryption_data(UUID, profile)
    except Exception as e:
        error_message = f"Failed to correlate UUID, {UUID}, to something mythic knows\nConnection to: "
        error_message += f"{request_url} via {request.method}\nFrom: "
        error_message += f"{request_ip}\n"
        error_message += f"With extra headers: {request.headers}"
        asyncio.create_task(send_all_operations_message(message= error_message, level="warning",
                                                        source="get_agent_message_uuid:" + UUID + request_ip))
        return "", 404, new_callback, agent_uuid
    # now we have cached_keys[UUID] is the right AES key to use with this payload, now to decrypt
    if enc_key["stage"] == "callback":
        asyncio.create_task(update_edges_from_checkin(UUID, profile))
    decrypted = None
    try:
        # print(decoded[36:])
        if enc_key["mythic_encrypts"]:
            # mythic handles encryption/decryption, but maybe not parsing
            if enc_key["translation_container"] is None:
                # format is in standard mythic JSON, so parse the decrypted version normally
                decrypted = await crypt.decrypt_message(decoded, enc_key, return_json=True, length=UUID_length)
                if app.debugging_enabled:
                    await send_all_operations_message(
                        message=f"Parsing agent message - step 4 (mythic decrypted a mythic message): \n{decrypted}", level="info", source="debug")
            else:
                decrypted = await crypt.decrypt_message(decoded, enc_key, return_json=False, length=UUID_length)
                if app.debugging_enabled:
                    await send_all_operations_message(
                        message=f"Parsing agent message - step 4 (mythic decrypted a message that needs translated): \n{str(decrypted)}", level="info", source="debug")
                # format isn't standard mythic JSON, after decrypting send to container for processing
                decrypted, successfully_sent = await translator_rpc.call(message={
                    "action": "translate_from_c2_format",
                    "message": base64.b64encode(decrypted).decode(),
                    "uuid": UUID,
                    "profile": profile,
                    "mythic_encrypts": enc_key["mythic_encrypts"],
                    "enc_key": base64.b64encode(enc_key["enc_key"]).decode() if enc_key["enc_key"] is not None else None,
                    "dec_key": base64.b64encode(enc_key["dec_key"]).decode() if enc_key["dec_key"] is not None else None,
                    "type": enc_key["type"]
                }, receiver="{}_rpc_queue".format(enc_key["translation_container"]))
                if decrypted == b"":
                    if successfully_sent:
                        asyncio.create_task(send_all_operations_message(
                            message=f"Failed to have {enc_key['translation_container']} container process translate_from_c2_format. check the container's logs for error information",
                            level="warning", source="translate_from_c2_format_success", operation=enc_key["payload"].operation))
                    else:
                        asyncio.create_task(send_all_operations_message(
                            message=f"Failed to have {enc_key['translation_container']} container process translate_from_c2_format because it's offline",
                            level="warning", source="translate_from_c2_format_error", operation=enc_key["payload"].operation))
                    return "", 404, new_callback, agent_uuid
                else:
                    # we should get back JSON from the translation container
                    if app.debugging_enabled:
                        await send_all_operations_message(
                            message=f"Parsing agent message - step 4 (translation container returned): \n{decrypted}", level="info", source="debug")
                    decrypted = js.loads(decrypted)
        else:
            # mythic doesn't encrypt, so could already be decrypted or require a trip to a container
            if enc_key["translation_container"] is None:
                # there's no registered container, so it must be in plaintext
                decrypted = decoded
                if app.debugging_enabled:
                    await send_all_operations_message(
                        message=f"Parsing agent message - step 4 (mythic isn't decrypting and no associated translation container): \n {decrypted}", level="info", source="debug")
            else:
                # mythic doesn't encrypt and a container is specified, ship it off to the container for processing
                decrypted, successfully_sent = await translator_rpc.call(message={
                    "action": "translate_from_c2_format",
                    "message": base64.b64encode(decoded).decode(),
                    "uuid": UUID,
                    "profile": profile,
                    "mythic_encrypts": enc_key["mythic_encrypts"],
                    "enc_key": base64.b64encode(enc_key["enc_key"]).decode() if enc_key["enc_key"] is not None else None,
                    "dec_key": base64.b64encode(enc_key["dec_key"]).decode() if enc_key["dec_key"] is not None else None,
                    "type": enc_key["type"]
                }, receiver="{}_rpc_queue".format(enc_key["translation_container"]))
                if decrypted == b"":
                    if successfully_sent:
                        asyncio.create_task(send_all_operations_message(
                            message=f"Failed to have {enc_key['translation_container']} container process translate_from_c2_format and decrypt. check the container's logs for error information",
                            level="warning", source="translate_from_c2_format_successfully_sent_but_error", operation=enc_key["payload"].operation))
                    else:
                        asyncio.create_task(send_all_operations_message(
                            message=f"Failed to have {enc_key['translation_container']} container process translate_from_c2_format because it's offline.",
                            level="warning", source="translate_from_c2_format_error", operation=enc_key["payload"].operation))
                    return "", 404, new_callback, agent_uuid
                else:
                    if app.debugging_enabled:
                        await send_all_operations_message(
                            message=f"Parsing agent message - step 4 (translation container returned): \n {decrypted}", level="info", source="debug", operation=enc_key["payload"].operation)
                    decrypted = js.loads(decrypted)
        #print(decrypted)
    except Exception as e:
        logger.warning("callback_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        if decrypted is not None:
            msg = str(decrypted)
        else:
            msg = str(decoded)
        asyncio.create_task(send_all_operations_message(message=f"Failed to decrypt/load message with error: {str(sys.exc_info()[-1].tb_lineno) + ' ' + str(e)}\n from {request.method} method with URL {request.url} with headers: \n{request.headers}",
                                          level="warning", source="parse_agent_message_decrypt_load", operation=enc_key["payload"].operation))
        return "", 404, new_callback, agent_uuid
    """
    JSON({
        "action": "", //staging-rsa, get_tasking ...
                    //  staging_info stored in db on what step in the process
        "...": ... // JSON data relating to the action
        "delegates":[
            {"UUID": base64(agentMessage from a forwarded agent),
            "c2_profile": "name of c2 profile used to connect the two agents"}
        ]
    })
    """
    try:
        if "action" not in decrypted:
            asyncio.create_task(send_all_operations_message(message="Error in handling a callback message: Missing 'action' in parsed JSON",
                                                            level="warning", source="no_action_in_message", operation=enc_key["payload"].operation))
            return "", 404, new_callback, agent_uuid
        # now to parse out what we're doing, everything is decrypted at this point
        # shuttle everything out to the appropriate api files for processing
        # print(decrypted)
        response_data = {}
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"Parsing agent message - step 5 (processing message action): \n {decrypted['action']}",
                level="info", source="debug", operation=enc_key["payload"].operation)
        if decrypted["action"] == "get_tasking":
            response_data = await get_agent_tasks(decrypted, enc_key["callback"])
            if "get_delegate_tasks" not in decrypted or decrypted["get_delegate_tasks"] is True:
                delegates = await get_routable_messages(enc_key["callback"], request)
                if delegates is not None:
                    response_data["delegates"] = delegates
            agent_uuid = UUID
        elif decrypted["action"] == "post_response":
            response_data = await post_agent_response(decrypted, enc_key["callback"])
            agent_uuid = UUID
        elif decrypted["action"] == "upload":
            response_data = await download_agent_file(decrypted, enc_key["callback"])
            agent_uuid = UUID
        elif decrypted["action"] == "delegate":
            # this is an agent message that is just requesting or forwarding along delegate messages
            # this is common in server_routed traffic after the first hop in the mesh
            agent_uuid = UUID
        elif decrypted["action"] == "checkin":
            if enc_key["stage"] != "callback":
                # checkin message with a staging uuid
                if (
                    "enc_key" not in decrypted
                    or decrypted["enc_key"] == ""
                ):
                    decrypted["enc_key"] = enc_key["enc_key"]
                if (
                    "dec_key" not in decrypted
                    or decrypted["dec_key"] == ""
                ):
                    decrypted["dec_key"] = enc_key["dec_key"]
                if (
                    "crypto_type" not in decrypted
                    or decrypted["crypto_type"] == ""
                ):
                    decrypted["crypto_type"] = enc_key["type"]
            if enc_key["stage"] == "callback":
                # if the UUID is for a callback doing a checkin message, just update the callback instead
                await update_callback(decrypted, UUID)
                response_data = {"action": "checkin", "status": "success", "id": UUID}
                agent_uuid = UUID
            else:
                response_data = await create_callback_func(decrypted, request)
                if response_data["status"] == "success":
                    new_callback = response_data["id"]
        elif decrypted["action"] == "staging_rsa":
            response_data, staging_info = await staging_rsa(decrypted, UUID)
            if staging_info is None:
                return "", 404, new_callback, agent_uuid
        elif decrypted["action"] == "update_info":
            response_data = await update_callback(decrypted, UUID)
            delegates = await get_routable_messages(enc_key["callback"], request)
            if delegates is not None:
                response_data["delegates"] = delegates
            agent_uuid = UUID
        elif decrypted["action"] == "translation_staging":
            # this was already processed as part of our contact to the translation container
            # so now we're just saving this data off for the next message
            response_data = await staging_translator(decrypted, enc_key)
            if response_data is None:
                return "", 404, new_callback, agent_uuid
            else:
                return response_data, 200, new_callback, agent_uuid
        else:
            asyncio.create_task(send_all_operations_message(message="Unknown action:" + str(decrypted["action"]),
                                                            level="warning", source="unknown_action_in_message", operation=enc_key["payload"].operation))
            return "", 404, new_callback, agent_uuid

        if "edges" in decrypted:
            if app.debugging_enabled:
                await send_all_operations_message(
                    message=f"Parsing agent message - step 6 (processing reported p2p edge updates): \n {decrypted['edges']}",
                    level="info", source="debug", operation=enc_key["payload"].operation)
            if decrypted["edges"] != "" and decrypted["edges"] is not None:
                asyncio.create_task(add_p2p_route(decrypted["edges"], None, None))
            response_data.pop("edges", None)
        # now that we have the right response data, format the response message
        if (
            "delegates" in decrypted
            and decrypted["delegates"] is not None
            and decrypted["delegates"] != ""
            and decrypted["delegates"] != []
        ):
            if app.debugging_enabled:
                await send_all_operations_message(
                    message=f"Parsing agent message - step 7 (processing delegate messages): \n {decrypted['delegates']}",
                    level="info", source="debug", operation=enc_key["payload"].operation)
            if "delegates" not in response_data:
                response_data["delegates"] = []
            for d in decrypted["delegates"]:
                # handle messages for all of the delegates
                # d is {"message": agentMessage, "c2_profile": "profile name", "uuid": d_uuid}
                # process the delegate message recursively
                del_message, status, del_new_callback, del_uuid = await parse_agent_message(d["message"],
                                                                                            request,
                                                                                            d["c2_profile"])
                if status == 200:
                    # store the response to send back
                    print("got delegate message: ")
                    print(del_message)
                    if not isinstance(del_message, str):
                        del_message = del_message.decode()
                    if del_new_callback != "":
                        # the delegate message caused a new callback, to report the changing UUID
                        asyncio.create_task(
                            add_p2p_route(
                                agent_message=[{
                                        "source": UUID,
                                        "destination": del_new_callback,
                                        "direction": 1,
                                        "metadata": "",
                                        "action": "add",
                                        "c2_profile": d["c2_profile"]
                                }],
                                callback=None,
                                task=None)
                        )
                        response_data["delegates"].append({"message": del_message,
                                                           "mythic_uuid": del_new_callback,
                                                           "uuid": d["uuid"]})
                    elif del_uuid != "" and del_uuid != d["uuid"]:
                        # there is no new callback
                        # the delegate is a callback (not staging) and the callback uuid != uuid in the message
                        # so send an update message with the rightful callback uuid so the agent can update
                        asyncio.create_task(
                            add_p2p_route(
                                agent_message=[{
                                        "source": UUID,
                                        "destination": del_uuid,
                                        "direction": 1,
                                        "metadata": "",
                                        "action": "add",
                                        "c2_profile": d["c2_profile"]
                                    }],
                                callback=None,
                                task=None)
                        )
                        response_data["delegates"].append({"message": del_message,
                                                           "uuid": d["uuid"],
                                                           "mythic_uuid": del_uuid})
                    else:
                        # there's no new callback and the delegate message isn't a full callback yet
                        # so just proxy through the UUID since it's in some form of staging
                        response_data["delegates"].append({"message": del_message, "uuid": d["uuid"]})
        #print("final message before going to containers:")
        #print(response_data)
        final_msg = await create_final_message_from_data_and_profile_info(response_data, enc_key, UUID, request)
        if final_msg is None:
            return "", 404, new_callback, agent_uuid
        #print("finishing processing loop, returning: ")
        #print(final_msg)
        return final_msg, 200, new_callback, agent_uuid
    except Exception as e:
        logger.warning("callback_api.py - " + str(sys.exc_info()[-1].tb_lineno))
        logger.warning("callback_api.py: " + str(e))
        asyncio.create_task(send_all_operations_message(message=f"Exception dealing with message from {request.host} as {request.method} method with headers: \n{request.headers}\ncallback.py: {str(sys.exc_info()[-1].tb_lineno)} - {str(e)}",
                                          level="warning", source="mythic_error_for_message_parsing"))
        return "", 404, new_callback, agent_uuid


async def create_final_message_from_data_and_profile_info(response_data, enc_key, current_uuid, request):
    if enc_key["translation_container"] is not None:
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"Parsing agent message - step 8 (final mythic response message going to translation container): \n {js.dumps(response_data)}",
                level="info", operation=enc_key["payload"].operation, source="debug")
        final_msg, successfully_sent = await translator_rpc.call(message={
            "action": "translate_to_c2_format",
            "message": response_data,
            "profile": enc_key["profile"],
            "mythic_encrypts": enc_key["mythic_encrypts"],
            "enc_key": base64.b64encode(enc_key["enc_key"]).decode() if enc_key["enc_key"] is not None else None,
            "dec_key": base64.b64encode(enc_key["dec_key"]).decode() if enc_key["dec_key"] is not None else None,
            "uuid": current_uuid,
            "type": enc_key["type"]
        }, receiver="{}_rpc_queue".format(enc_key["translation_container"]))
        # print("received from translate_to_c2_format: ")
        # print(final_msg)
        if final_msg == b"":
            if successfully_sent:
                asyncio.create_task(send_all_operations_message(
                    message=f"Failed to have {enc_key['translation_container']} container process translate_to_c2_format with message: {str(response_data)}",
                    level="warning", source="translate_to_c2_format_success", operation=enc_key["payload"].operation))
            else:
                asyncio.create_task(send_all_operations_message(
                    message=f"Failed to have {enc_key['translation_container']} container process translate_to_c2_format, is it online?",
                    level="warning", source="translate_to_c2_format_error", operation=enc_key["payload"].operation))
            return None
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"Parsing agent message - step 8.5 (response from translation container to c2 format): \n {final_msg}",
                level="info", source="debug", operation=enc_key["payload"].operation)
    else:
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"Parsing agent message - step 8 (final mythic response message): \n {js.dumps(response_data)}",
                level="info", source="debug", operation=enc_key["payload"].operation)
        final_msg = js.dumps(response_data).encode()
    if enc_key["mythic_encrypts"]:
        # if mythic should encrypt this, encrypt it and do our normal stuff
        # print(final_msg)
        final_msg = await crypt.encrypt_message(final_msg, enc_key, current_uuid)
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"Parsing agent message - step 9 (mythic encrypted final message): \n {final_msg}",
                level="info", source="debug", operation=enc_key["payload"].operation)
        # print(final_msg)
    elif enc_key["translation_container"] is None:
        # if mythic shouldn't encrypt it and there's a container,
        #     then the container should have already handled everything
        # otherwise, there's no container and we shouldn't encrypt, so just concat and base64
        final_msg = base64.b64encode((current_uuid.encode() + final_msg)).decode()
        if app.debugging_enabled:
            await send_all_operations_message(
                message=f"Parsing agent message - step 9 (mythic doesn't encrypt and no translation container, just adding uuid and base64 encoding): \n {final_msg}",
                level="info", source="debug", operation=enc_key["payload"].operation)
    return final_msg


async def staging_translator(final_msg, enc_key):
    try:
        # we got a message back, process it and store it for staging information in the future
        await app.db_objects.create(db_model.StagingInfo,
                                session_id=final_msg["session_id"],
                                enc_key=base64.b64decode(final_msg["enc_key"]) if final_msg["enc_key"] is not None else None,
                                dec_key=base64.b64decode(final_msg["dec_key"]) if final_msg["dec_key"] is not None else None,
                                crypto_type=final_msg["type"],
                                staging_uuid=final_msg["next_uuid"],
                                payload=enc_key["payload"]
                                )
        return base64.b64decode(final_msg["message"])

    except Exception as e:
        asyncio.create_task(send_all_operations_message(
            message=f"Failed to translator_staging response from {enc_key['translation_container']} container message: {str(final_msg)}",
            level="warning", source="translator_staging_response_error", operation=enc_key["payload"].operation))
        return None


@mythic.route(mythic.config["API_BASE"] + "/callbacks/", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_manual_callback(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator" or user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Spectators cannot create manual callbacks"}
        )
    try:
        data = request.json
        encryption = await get_encryption_data(data["uuid"], data["profile"])
        if encryption['type'] is None:
            data["crypto_type"] = ""
            data["enc_key"] = None
            data["dec_key"] = None
        else:
            data["crypto_type"] = encryption['type']
            data["enc_key"] = base64.b64encode(encryption['enc_key']).decode()
            data["dec_key"] = base64.b64encode(encryption['dec_key']).decode()
        return json(await create_callback_func(data, request))
    except Exception as e:
        print(e)
        return json(
            {"status": "error", "error": "failed to create callback: " + str(e)}
        )


async def create_callback_func(data, request):
    if not data:
        return {"status": "error", "error": "Data is required for POST"}
    if "user" not in data:
        data["user"] = ""
    if "host" not in data:
        data["host"] = ""
    if "pid" not in data:
        data["pid"] = -1
    if "ip" not in data:
        data["ip"] = ""
    if "uuid" not in data:
        return {"status": "error", "error": "uuid required"}
    # Get the corresponding Payload object based on the uuid
    try:
        payload = await app.db_objects.get(db_model.payload_query, uuid=data["uuid"])
    except Exception as e:
        asyncio.create_task(send_all_operations_message(
            message=f"Failed to create new callback - embedded payload uuid unknown: {data['uuid'] if 'uuid' in data else None}",
            level="warning", source="create_callback"))
        return {"status": "error", "error": "payload not found by uuid"}
    if "integrity_level" not in data:
        data["integrity_level"] = 2  # default medium integrity level
    if "os" not in data:
        data["os"] = ""
    if "domain" not in data:
        data["domain"] = ""
    if "architecture" not in data:
        data["architecture"] = ""
    if "external_ip" not in data:
        if "x-forwarded-for" in request.headers:
            data["external_ip"] = request.headers["x-forwarded-for"].split(",")[-1]
        elif "X-Forwarded-For" in request.headers:
            data["external_ip"] = request.headers["X-Forwarded-For"].split(",")[-1]
        else:
            data["external_ip"] = ""
    if "extra_info" not in data:
        data["extra_info"] = ""
    if "sleep_info" not in data:
        data["sleep_info"] = ""
    if "process_name" not in data:
        data["process_name"] = ""
    try:
        if payload.operation.complete:
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=payload.operation,
                level="warning",
                message="Payload {} trying to checkin with data: {}".format(
                    payload.uuid, js.dumps(data)
                ),
                source=str(uuid.uuid4())
            )
            return {"status": "error", "error": "Failed to create callback"}
        else:
            cal = await app.db_objects.create(
                Callback,
                user=data["user"],
                host=data["host"].upper(),
                pid=data["pid"],
                ip=data["ip"],
                description=payload.tag,
                operator=payload.operator,
                registered_payload=payload,
                operation=payload.operation,
                integrity_level=data["integrity_level"],
                os=data["os"],
                domain=data["domain"],
                architecture=data["architecture"],
                external_ip=data["external_ip"],
                extra_info=data["extra_info"],
                sleep_info=data["sleep_info"],
                process_name=data["process_name"]
            )
            await app.db_objects.create(
                db_model.OperationEventLog,
                operator=None,
                operation=payload.operation,
                message="New Callback ({}) {}@{} with pid {}".format(
                    cal.id, cal.user, cal.host, str(cal.pid)
                ),
                source=str(uuid.uuid4())
            )
            await app.db_objects.get_or_create(
                db_model.PayloadOnHost,
                host=data["host"].upper(),
                payload=payload,
                operation=payload.operation,
            )
        if "crypto_type" in data:
            cal.crypto_type = data["crypto_type"]
        if "dec_key" in data:
            cal.dec_key = data["dec_key"]
        if "enc_key" in data:
            cal.enc_key = data["enc_key"]
        await app.db_objects.update(cal)
        payload_commands = await app.db_objects.execute(
            db_model.payloadcommand_query.where(PayloadCommand.payload == payload)
        )
        # now create a loaded command for each one since they are loaded by default
        for p in payload_commands:
            await app.db_objects.create(
                LoadedCommands,
                command=p.command,
                version=p.version,
                callback=cal,
                operator=payload.operator,
            )
        # now create a callback2profile for each loaded c2 profile in the payload since it's there by default
        pc2profiles = await app.db_objects.execute(
            db_model.payloadc2profiles_query.where(db_model.PayloadC2Profiles.payload == payload)
        )
        for pc2p in pc2profiles:
            if pc2p.c2_profile.is_p2p is False:
                # add in an edge to itself with the associated egress edge
                await app.db_objects.create(
                    db_model.CallbackGraphEdge,
                    source=cal,
                    destination=cal,
                    c2_profile=pc2p.c2_profile,
                    operation=cal.operation,
                    direction=1,
                )
            await app.db_objects.create(
                db_model.CallbackC2Profiles, callback=cal, c2_profile=pc2p.c2_profile
            )
            # now also save off a copy of the profile parameters
            instances = await app.db_objects.execute(
                db_model.c2profileparametersinstance_query.where(
                    (
                        db_model.C2ProfileParametersInstance.payload
                        == cal.registered_payload
                    )
                    & (
                        db_model.C2ProfileParametersInstance.c2_profile
                        == pc2p.c2_profile
                    )
                )
            )
            for i in instances:
                await app.db_objects.create(
                    db_model.C2ProfileParametersInstance,
                    callback=cal,
                    c2_profile_parameters=i.c2_profile_parameters,
                    c2_profile=i.c2_profile,
                    value=i.value,
                    operation=cal.operation,
                )
    except Exception as e:
        asyncio.create_task(send_all_operations_message(
            message=f"Failed to create new callback {str(e)}",
            level="warning", source="create_callback2"))
        return {"status": "error", "error": "Failed to create callback: " + str(e)}
    status = {"status": "success"}
    asyncio.create_task( log_to_siem(mythic_object=cal, mythic_source="callback_new") )
    if cal.operation.webhook != "" and cal.registered_payload.callback_alert:
        # if we have a webhook, send a message about the new callback
        try:
            if cal.integrity_level >= 3:
                int_level = "HIGH"
            elif cal.integrity_level == 2:
                int_level = "MEDIUM"
            else:
                int_level = "LOW"
            message = cal.operation.webhook_message.replace("{channel}", cal.operation.channel)
            message = message.replace("{display_name}", cal.operation.display_name)
            message = message.replace("{icon_emoji}", cal.operation.icon_emoji)
            message = message.replace("{icon_url}", cal.operation.icon_url)
            message = message.replace("{operation}", cal.operation.name)
            message = message.replace("{callback}", str(cal.id))
            message = message.replace("{ip}", str(cal.ip))
            message = message.replace("{payload_type}", cal.registered_payload.payload_type.ptype)
            message = message.replace("{description}", cal.description)
            message = message.replace("{operator}", cal.operator.username)
            message = message.replace("{integrity}", int_level)
            asyncio.create_task(send_webhook_message(cal.operation.webhook, message, cal.operation))
        except Exception as e:
            asyncio.create_task(send_all_operations_message(
                message=f"Failed to create webhook message: {str(e)}",
                level="warning", source="create_callback", operation=cal.operation))
    for k in data:
        if k not in [
            "action",
            "user",
            "host",
            "pid",
            "ip",
            "uuid",
            "sleep_info",
            "integrity_level",
            "os",
            "domain",
            "architecture",
            "external_ip",
            "crypto_type",
            "enc_key",
            "dec_key",
            "delegates",
            "extra_info",
        ]:
            status[k] = data[k]
    return {**status, "id": cal.agent_callback_id, "action": "checkin"}


async def send_webhook_message(webhook, message, operation):
    try:
        message = js.loads(message)
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook, json=message) as resp:
                return await resp.text()
    except Exception as e:
        await send_all_operations_message(f"Failed to send webhook message: {str(e)}",
                                          level="warning", source="new_callback_webhook", operation=operation)


async def load_commands_func(command_dict, callback, task):
    try:
        cmd = await app.db_objects.get(db_model.command_query, cmd=command_dict["cmd"],
                                   payload_type=callback.registered_payload.payload_type)
        if command_dict["action"] == "add":
            try:
                lc = await app.db_objects.get(db_model.loadedcommands_query, command=cmd, callback=callback)
                lc.version = cmd.version
                lc.operator = task.operator
                await app.db_objects.update(lc)
            except Exception as e:
                await app.db_objects.create(db_model.LoadedCommands,
                                             command=cmd,
                                             version=cmd.version,
                                             callback=callback,
                                             operator=task.operator)
        else:
            lc = await app.db_objects.get(db_model.loadedcommands_query, callback=callback, command=cmd)
            await app.db_objects.delete(lc)
        return {"status": "success"}
    except Exception as e:
        print(e)
        asyncio.create_task(send_all_operations_message(
            message=f"Failed to update loaded command: {str(e)}",
            level="warning", source="load_commands", operation=callback.operation))
        return {"status": "error", "error": str(e)}


async def update_callback(data, UUID):
    # { INPUT
    #   "action": "update_info",
    #   ... info to update, same as checkin data
    # }
    # { RESPONSE
    #   "action":  "update_info",
    #   "status":  "success",
    #   "error": "error message" (optional)
    # }
    cal = await app.db_objects.get(db_model.callback_query, agent_callback_id=UUID)
    try:
        if "user" in data:
            cal.user = data["user"]
        if "ip" in data:
            cal.ip = data["ip"]
        if "host" in data:
            cal.host = data["host"].upper()
        if "external_ip" in data:
            cal.external_ip = data["external_ip"]
        if "integrity_level" in data:
            cal.integrity_level = data["integrity_level"]
        if "domain" in data:
            cal.domain = data["domain"]
        if "extra_info" in data:
            cal.extra_info = data["extra_info"]
        if "os" in data:
            cal.os = data["os"]
        if "architecture" in data:
            cal.architecture = data["architecture"]
        if "pid" in data:
            cal.pid = data["pid"]
        if "sleep_info" in data:
            cal.sleep_info = data["sleep_info"]
        if "description" in data:
            cal.description = data["description"]
        if "process_name" in data:
            cal.process_name = data["process_name"]
        await app.db_objects.update(cal)
        return {"action": "update_info", "status": "success"}
    except Exception as e:
        asyncio.create_task(send_all_operations_message(
            message=f"Failed to update callback information {str(e)}",
            level="warning", source="update_callback", operation=cal.operation))
        return {"action": "update_info", "status": "error", "error": str(e)}


def cost_func(u, v, edge, prev_edge):
    return 1

# https://pypi.org/project/Dijkstar/


async def get_graph(operation: db_model.Operation, directed: bool = True):
    try:
        available_edges = await app.db_objects.execute(
            db_model.callbackgraphedge_query.where(
                (db_model.CallbackGraphEdge.operation == operation)
                & (db_model.CallbackGraphEdge.end_timestamp == None)
            )
        )
        temp = Graph(undirected=not directed)
        # dijkstra is directed, so if we have a bidirectional connection (type 3) account for that as well
        for e in available_edges:
            if e.source == e.destination:
                temp.add_edge(e.source, e.c2_profile, e)
            elif e.direction == 1:
                temp.add_edge(e.source, e.destination, e)
            elif e.direction == 2:
                temp.add_edge(e.destination, e.source, e)
            elif e.direction == 3:
                temp.add_edge(e.source, e.destination, e)
                temp.add_edge(e.destination, e.source, e)
        profiles = await app.db_objects.execute(
            db_model.c2profile_query.where(db_model.C2Profile.is_p2p == False)
        )
        for p in profiles:
            temp.add_edge(p, "Mythic", 1)
        return temp
    except Exception as e:
        asyncio.create_task(send_all_operations_message(message=f"Failed to create graph:\n{str(e)}", level="warning", operation=operation))
        return Graph()


async def get_routable_messages(requester, request):
    # are there any messages sitting in the database in the "submitted" stage that have routes from the requester
    # 1. get all CallbackGraphEdge entries that have an end_timestamp of Null (they're still active)
    # 2. feed into dijkstar and do shortest path
    # 3. for each element in the shortest path, see if there's any tasking stored
    # 4.   if there's tasking, wrap it up in a message:
    #        content is the same of that of a "get_tasking" reply with a a -1 request
    try:
        delegates = []
        operation = requester.operation
        graph = await get_graph(operation)
        if graph.edge_count == 0:
            return None  # graph for this operation has no edges
        submitted_tasks = await app.db_objects.execute(
            db_model.task_query.where(
                (db_model.Task.status == "submitted")
                & (db_model.Callback.operation == operation)
            )
        )
        temp_callback_tasks = {}
        for t in submitted_tasks:
            # print(t.to_json())
            try:
                path = find_path(graph, requester, t.callback, cost_func=cost_func)
            except NoPathError:
                # print("No path from {} to {}".format(requester.id, t.callback.id))
                continue
            if len(path.nodes) > 1 and path.nodes[-1] != requester:
                # this means we have some sort of path longer than 1
                # make a tasking message for this
                # print(t.to_json())
                if path.nodes[-1].agent_callback_id in temp_callback_tasks:
                    temp_callback_tasks[path.nodes[-1].agent_callback_id]["tasks"].append(t)
                else:
                    temp_callback_tasks[path.nodes[-1].agent_callback_id] = {
                        "tasks": [t],
                        "path": path.nodes[::-1],
                        "edges": path.edges[::-1]
                    }
        # now actually construct the tasks
        for k, v in temp_callback_tasks.items():
            #print(k)
            #print(v)
            tasks = []
            for t in v["tasks"]:
                t.status = "processing"
                t.status_timestamp_processing = datetime.utcnow()
                t.timestamp = t.status_timestamp_processing
                t.callback.last_checkin = datetime.utcnow()
                await app.db_objects.update(t.callback)
                await app.db_objects.update(t)
                tasks.append(
                    {
                        "command": t.command.cmd,
                        "parameters": t.params,
                        "id": t.agent_task_id,
                        "timestamp": t.timestamp.timestamp(),
                    }
                )
            # now that we have all the tasks we're going to send, make the message
            message = {"action": "get_tasking", "tasks": tasks}
            # now wrap this message up like it's going to be sent out, first level is just normal
            #print(v["edges"])
            #print(v["path"])
            enc_key = await get_encryption_data(v["path"][0].agent_callback_id, v["edges"][0].c2_profile.name)
            logger.info(
                "Got encryption data for linked callback, about to send off {} to create_final_message".format(
                    str(message)))
            final_msg = await create_final_message_from_data_and_profile_info(message,
                                                                              enc_key,
                                                                              v["path"][0].agent_callback_id,
                                                                              request)
            if final_msg is None:
                message = {}
            else:
                if not isinstance(final_msg, str):
                    final_msg = final_msg.decode()
                message = {
                    "message": final_msg,
                    "uuid": v["path"][0].agent_callback_id
                }
            # we don't need to do this wrapping for the last in the list since that's the egress node asking for tasking
            for cal in v["edges"][1:]:
                message = {"action": "get_tasking", "tasks": [], "delegates": [message]}
                logger.info("destination agent: " + cal.destination.agent_callback_id)
                logger.info("source agent: " + cal.source.agent_callback_id)
                enc_key = await get_encryption_data(cal.destination.agent_callback_id, cal.c2_profile.name)
                logger.info(
                    "Got encryption data for linked callback in for loop, about to send off {} to create_final_message".format(
                        str(message)))
                final_msg = await create_final_message_from_data_and_profile_info(message,
                                                                                  enc_key,
                                                                                  cal.destination.agent_callback_id,
                                                                                  request)
                if final_msg is None:
                    message = {}
                else:
                    if not isinstance(final_msg, str):
                        final_msg = final_msg.decode()
                    logger.info("setting final target uuid of message: " + cal.destination.agent_callback_id)
                    message = {
                        "message": final_msg,
                        "uuid": cal.destination.agent_callback_id
                    }
            #print(message)
            delegates.append(message)
        # print(delegates)
        if len(delegates) == 0:
            return None
        else:
            return delegates
    except Exception as e:
        asyncio.create_task(send_all_operations_message(
            message=f"Failed to get delegate messages {str(sys.exc_info()[-1].tb_lineno) +str(e)}",
            level="warning", source="get_delegate_messages", operation=requester.operation))
        return None


@mythic.route(
    mythic.config["API_BASE"] + "/callbacks/edges/<eid:int>", methods=["DELETE"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_graph_edge(request, eid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator" or user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Spectators cannot remove graph edges"}
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        edge = await app.db_objects.get(db_model.callbackgraphedge_query, id=eid, operation=operation)
        edge.end_timestamp = datetime.utcnow()
        await app.db_objects.update(edge)
        return json({"status": "success"})
    except Exception as e:
        return json({"status": "error", "error": "Failed to update: " + str(e)})


cached_socks = {}
cached_rportfwd = {}
callback_port = {}


async def start_rportfwd(port: int, rport: int, rip: str, callback: Callback, task: Task):
    try:
        if port in callback_port:
            return {"status": "error", "error": "Port Forward already started on that port"}
    except:
        # we're not using this port, so we can use it
        pass
    try:
        #print("starting rportfwd")
        server_address = ('0.0.0.0', port)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(server_address)
        if (callback.id not in cached_rportfwd):
            cached_rportfwd[callback.id] = {}
        cached_rportfwd[callback.id][port] = {
            "connections": [],
            #list of dictionary: connection, thread_read, queue
            "thread_handle": threading.Thread(
                target=thread_handle_connections,
                kwargs={"port": port,"sock": sock, "callback_id": callback.id},
            ),
            "state": 1,
            "sock":sock,
            "rport": rport,
            "rip": rip
        }
        callback_port[port] = callback
        #callback.port = port
        #callback.rportfwd_task = task
        cached_rportfwd[callback.id][port]["thread_handle"].start()
        app.redis_pool.set(f"RPORTFWD_RUNNING:{callback.id}_{port}", "True")
    except Exception as e:
        return {"status":"error", "error":str(e)}
    return {"status": "success"}

async def stop_rportfwd(port: int, callback: Callback, task: Task):
    app.redis_pool.delete(f"RPORTFWD_RUNNING:{callback.id}_{port}")
    if callback.id in cached_rportfwd:
        if port in cached_rportfwd[callback.id]:
            cached_rportfwd[callback.id][port]["state"] = 0
        for connection in cached_rportfwd[callback.id][port]["connections"]:
            try:
                connection["connection"].shutdown(socket.SHUT_RDWR)
                connection["connection"].close()
            except:
                pass
        try:
            cached_rportfwd[callback.id][port]["sock"].shutdown(socket.SHUT_RDWR)
            cached_rportfwd[callback.id][port]["sock"].close()
        except:
            pass
        del cached_rportfwd[callback.id][port]
        if bool(cached_rportfwd[callback.id]) == False:
            del cached_rportfwd[callback.id]

        del callback_port[port]

    try:
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": "failed to find socks instance: " + str(e)}


async def flush_rportfwd(callback: Callback, task: Task):
    try:
        if callback.id in cached_rportfwd:
            for port in cached_rportfwd[callback.id]:
                cached_rportfwd[callback.id][port]["state"] = 0
                try:
                    for connection in cached_rportfwd[callback.id][port]["connections"]:
                        try:
                            connection["connection"].shutdown(socket.SHUT_RDWR)
                            connection["connection"].close()
                        except:
                            pass
                    cached_rportfwd[callback.id][port]["sock"].shutdown(socket.SHUT_RDWR)
                    cached_rportfwd[callback.id][port]["sock"].close()
                    del callback_port[port]
                except:
                    pass
        try:
            del cached_rportfwd[callback.id]
        except:
            pass

        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": "failed to find rportfwd instance: " + str(e)}

def thread_handle_connections(port: int,sock: socket, callback_id: int) -> None:
    sock.listen(1)
    id = 0

    try:
        while cached_rportfwd[callback_id][port]["state"] == 1:
            connection, client_address = sock.accept()
            conn_sock = {
                "connection": connection,
                "thread_read": threading.Thread(
                    target=thread_read_rportfwd,
                    kwargs={"port": port,"connection": connection, "id": id, "callback_id": callback_id},
                ),
                "thread_write": threading.Thread(
                    target=thread_write_rportfwd,
                    kwargs={"port": port,"connection": connection, "id": id, "callback_id": callback_id},
                ),
                "toAgentThread":threading.Thread(target=thread_send_rportfwds_data,
                                                 kwargs={"callback_id": callback_id,"port": port}),
                "queue": deque(),
                "queue_send":{},
                "last_msg":0,
                "last_msg_send":0
            }
            cached_rportfwd[callback_id][port]["connections"].append(conn_sock)
            cached_rportfwd[callback_id][port]["connections"][id]["thread_read"].start()
            cached_rportfwd[callback_id][port]["connections"][id]["thread_write"].start()
            id = id + 1
    except:
        pass
        #connection closd


def thread_write_rportfwd(port: int,connection: socket, id: int, callback_id: int) -> None:
    try:
        while (cached_rportfwd[callback_id][port]["state"] == 1):
            if cached_rportfwd[callback_id][port]["connections"][id]["last_msg"] in cached_rportfwd[callback_id][port]["connections"][id]["queue_send"]:
                last_msg = cached_rportfwd[callback_id][port]["connections"][id]["last_msg"]
                msg = base64.b64decode(cached_rportfwd[callback_id][port]["connections"][id]["queue_send"][last_msg])
                cached_rportfwd[callback_id][port]["connections"][id]["connection"].sendall(msg)
                del cached_rportfwd[callback_id][port]["connections"][id]["queue_send"][last_msg]
                cached_rportfwd[callback_id][port]["connections"][id]["last_msg"] = last_msg + 1
    except Exception as e:
        print("Thread Error: "+str(e))
        try:
            cached_rportfwd[callback_id][port]["connections"][id]["last_msg_send"] = -1
            connection.close()
        except:
            pass
        tsleep(1)

def thread_read_rportfwd(port: int,connection: socket, id: int, callback_id: int) -> None:
    try:
        data = connection.recv(8192)
        while (data and cached_rportfwd[callback_id][port]["state"] == 1):
            data = base64.b64encode(data)
            data = data.decode('ascii')
            cached_rportfwd[callback_id][port]["connections"][id]["queue"].append(data)
            data = connection.recv(8192)
    except Exception as e:
            #print("*" * 10 + "Got exception from reading socket data" + "*" * 10)
        try:
            cached_rportfwd[callback_id][port]["connections"][id]["last_msg_send"] = -1
            connection.close()
        except:
            pass
        tsleep(1)


async def get_rportfwd_data(callback: Callback):
    default_struct = []
    if (bool(cached_rportfwd) == False):
        return default_struct
    dict_conn = {}
    if callback.id in cached_rportfwd:
        for port in cached_rportfwd[callback.id]:
            id = 0
            rport = cached_rportfwd[callback.id][port]["rport"]
            rip = cached_rportfwd[callback.id][port]["rip"]
            dict_conn[str(port)] = {}
            dict_conn[str(port)][str(rport)] = {}
            dict_conn[str(port)][str(rport)][str(rip)] = {}
            if len(cached_rportfwd[callback.id][port]["connections"]) > 0:
                for connection in cached_rportfwd[callback.id][port]["connections"]:
                    deq = 0
                    dict_conn[str(port)][str(rport)][str(rip)][str(id)] = {}
                    while (len(cached_rportfwd[callback.id][port]["connections"][id]["queue"]) > 0):
                        try:
                            dict_conn[str(port)][str(rport)][str(rip)][str(id)][
                                cached_rportfwd[callback.id][port]["connections"][id]["last_msg_send"]] = connection[
                                "queue"].popleft()
                            cached_rportfwd[callback.id][port]["connections"][id]["last_msg_send"] = \
                            cached_rportfwd[callback.id][port]["connections"][id]["last_msg_send"] + 1
                        except Exception as e:
                            print("Get Forwarded data error: " + str(e))
                    # deque the rest for the next time, this avoids hanging connections
                    id = id + 1

    # if len(data) > 0:
    # print("******* SENDING THE FOLLOWING TO THE AGENT ******")
    # print(data)
    # json data in format:
    # {"9090":{"445":{"10.0.0.1":{
    #           "1":["base64Str","base64Str","base64Str"]
    #           "2":["base64Str","base64Str","base64Str"]
    #           "3":["base64Str","base64Str","base64Str"]
    #         }}}
    #  "9091":{"3389":{"10.0.0.2":{
    #           "1":["base64Str","base64Str","base64Str"]
    #           "2":["base64Str","base64Str","base64Str"]
    #           "3":["base64Str","base64Str","base64Str"]
    #         }}}
    #   }
    # }
    if (bool(dict_conn) == False):
        return default_struct
    dict_conn = jsonlib.dumps(dict_conn)
    default_struct.append(dict_conn)
    return default_struct

def thread_send_rportfwds_data(callback_id: int,port: int):
    #data = agent_message["rportfwd"]
    while cached_rportfwd[callback_id][port]["state"] == 1:
        try:
            sub_class = app.redis_pool.pubsub(ignore_subscribe_messages=True)
            sub_class.subscribe(f"RPORTFWD:{callback_id}:FromAgent")
            for message in sub_class.listen():
                print("******* MESSAGE REDIS ******* "+"\n"+message)
                if message["type"] == "message":
                    data = js.loads(message["data"])
                    data = data[0]
                    id = 0
                    try:
                        for data_key in data:
                            for port in data[data_key]:
                                for rport in data[data_key][port]:
                                    for rip in data[data_key][port][rport]:
                                        id = 0
                                        for i in data[data_key][port][rport][rip]:
                                            total_msg = b''
                                            for d in data[data_key][port][rport][rip][i]:
                                                cached_rportfwd[callback_id][int(port)]["connections"][int(i)]["queue_send"][int(d)] = data[data_key][port][rport][rip][i][d]
                                                                                    #else:
                                                    #print("****** NO CACHED PORTFWD, MUST BE CLOSED *******")
                    except:
                        pass
        except Exception as e:
            #print("******** EXCEPTION IN SEND RPORTFWD DATA *****\n{}".format(str(e)))
            print(str(e))
            return {"status": "error", "error": str(e)}



async def start_socks(port: int, callback: Callback, task: Task):
    print("starting socks")
    try:
        socks_instance = await app.db_objects.get(db_model.callback_query, port=port)
        return {"status": "error", "error": "socks already started on that port"}
    except:
        # we're not using this port, so we can use it
        if app.redis_pool.exists(f"SOCKS_RUNNING:{callback.id}"):
            app.redis_pool.delete(f"SOCKS_RUNNING:{callback.id}")
            kill_socks_processes(callback.id)
        pass
    server_address = ("0.0.0.0", port)
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(server_address)
    except Exception as e:
        return {"status": "error", "error": "failed to bind to socket: " + str(e)}
    try:
        app.redis_pool.set(f"SOCKS_RUNNING:{callback.id}", "True")
        callback.port = port
        callback.socks_task = task
        await app.db_objects.update(callback)
        cached_socks[callback.id] = {
            "socket": sock,
            "connections": {},
            "thread": threading.Thread(
                target=thread_read_socks,
                kwargs={"port": port, "callback_id": callback.id, "sock": sock},
            ),
        }
        cached_socks[callback.id]["thread"].start()
        await app.db_objects.create(
            db_model.OperationEventLog,
            operator=task.operator,
            operation=callback.operation,
            message="Started socks proxy on port {} in callback {}".format(
                str(port), str(callback.id)
            ),
        )

        print("started socks")
    except Exception as e:
        return {"status": "error", "error": str(e)}
    return {"status": "success"}


def kill_socks_processes(callback_id: int):
    try:
        cached_socks[callback_id]["thread"].exit()
    except:
        pass
    try:
        for key, con in cached_socks[callback_id]["connections"].items():
            try:
                con["connection"].shutdown(socket.SHUT_RDWR)
                con["connection"].close()
            except Exception:
                print("failed to close a connection from proxychains")
    except Exception as e:
        logger.warning("exception in looping through connections in kill_socks_processes: " + str(e))
    try:
        cached_socks[callback_id]["socket"].shutdown(socket.SHUT_RDWR)
        cached_socks[callback_id]["socket"].close()
    except Exception as e:
        logger.warning("exception trying to kill socket in kill_socks_processes: " + str(e))
    try:
        del cached_socks[callback_id]
    except:
        pass
    try:
        app.redis_pool.delete(f"SOCKS:{callback_id}:ToAgent")
    except:
        pass
    try:
        app.redis_pool.delete(f"SOCKS:{callback_id}:FromAgent")
    except:
        pass


async def stop_socks(callback: Callback, operator):
    app.redis_pool.delete(f"SOCKS_RUNNING:{callback.id}")
    kill_socks_processes(callback.id)
    try:
        port = callback.port
        callback.port = None
        await app.db_objects.update(callback)
        await app.db_objects.create(
            db_model.OperationEventLog,
            operator=operator,
            operation=callback.operation,
            message="Stopped socks proxy on port {} in callback {}".format(
                str(port), str(callback.id)
            ),
        )
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0)
                s.connect( ("127.0.0.1", port))
                s.shutdown(socket.SHUT_RDWR)
                s.close()
        except Exception as s:
            logger.warning("Failed to connect to current socket to issue a kill: " + str(s))

        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "error": "failed to find socks instance: " + str(e)}


def thread_send_socks_data(callback_id: int):
    while True:
        try:
            if not app.redis_pool.exists(f"SOCKS_RUNNING:{callback_id}"):
                kill_socks_processes(callback_id)
                return
            sub_class = app.redis_pool.pubsub(ignore_subscribe_messages=True)
            sub_class.subscribe(f"SOCKS:{callback_id}:FromAgent")
            for message in sub_class.listen():
                if not app.redis_pool.exists(f"SOCKS_RUNNING:{callback_id}"):
                    kill_socks_processes(callback_id)
                    return
                print("******* SENDING THE FOLLOWING TO PROXYCHAINS *******")
                print(message)
                if message["type"] == "message":
                    data = js.loads(message["data"])
                    for d in data:
                        print("processing the following to go to proxychains")
                        print(d)
                        if callback_id in cached_socks:
                            if d["server_id"] in cached_socks[callback_id]["connections"]:
                                conn = cached_socks[callback_id]["connections"][d["server_id"]]
                                if d["exit"]:
                                    print("agent tasked mythic to close connection")
                                    cached_socks[callback_id]["connections"].pop(d["server_id"], None)
                                    try:
                                        conn["connection"].shutdown(socket.SHUT_RDWR)
                                        conn["connection"].close()
                                    except Exception as d:
                                        print("error trying to close connection that agent told me to close: " + str(d))
                                        pass
                                else:
                                    conn["connection"].sendall(base64.b64decode(d["data"]))
                            else:
                                # we don't have d["server_id"] tracked as an active connection, so unless they said to kill it, tell them to kill it
                                #print("got message for something we aren't tracking")
                                if not d["exit"]:
                                    print("telling agent to kill connection")
                                    app.redis_pool.rpush(f"SOCKS:{callback_id}:ToAgent", js.dumps({
                                        "exit": True,
                                        "server_id": d["server_id"],
                                        "data": ""
                                    }))
                        else:
                            # we no longer have that callback_id in our cache, so we tried to exit, so exit this
                            return
        except Exception as e:
            print("******** EXCEPTION IN SEND SOCKS DATA *****\n{}".format(str(e)))
            #print(cached_socks[callback.id]["connections"])


async def get_socks_data(callback: Callback):
    # called during a get_tasking function
    data = []
    while True:
        try:
            d = app.redis_pool.lpop(f"SOCKS:{callback.id}:ToAgent")
            if d is None:
                break
            print("agent picking up data from callback queue")
            print(d)
            data.append(js.loads(d))
            #data.append(cached_socks[callback.id]["queue"].popleft())
        except Exception as e:
            print("exception in get_socks_data for an agent: " + str(e))
            break
    if len(data) > 0:
        print("******* SENDING THE FOLLOWING TO THE AGENT ******")
        print(data)
    return data


# accept connections from proxychains clients
def thread_read_socks(port: int, callback_id: int, sock: socket) -> None:
    # print(port)
    # print(callback_id)
    sock.listen(1)
    id = 1
    try:
        #print("waiting to accept connections")
        # spin off a thread to handle messages from agent to connections
        toAgentThread = threading.Thread(target=thread_send_socks_data, kwargs={"callback_id": callback_id})
        toAgentThread.start()
        while callback_id in cached_socks:
            connection, client_address = sock.accept()
            if not app.redis_pool.exists(f"SOCKS_RUNNING:{callback_id}"):
                kill_socks_processes(callback_id)
                return
            #print("got new connection for " + str(id))
            conn_sock = {
                "connection": connection,
                "thread_read": threading.Thread(
                    target=thread_get_socks_data_from_connection,
                    kwargs={"port": port, "connection": connection, "callback_id": callback_id, "connection_id": id}
                ),

            }
            cached_socks[callback_id]["connections"][id] = conn_sock
            cached_socks[callback_id]["connections"][id]["thread_read"].start()
            id = id + 1
    except Exception:
        try:
            kill_socks_processes(callback_id)
        except Exception as e:
            pass
        #print("exception in accepting new socket connections!!!!!")


def thread_get_socks_data_from_connection(port: int, connection: socket, callback_id: int, connection_id: int):
    try:
        #print("reading 4 bytes and sending 05 00")
        data_raw = connection.recv(4)
        #print(str(data))
        connection.sendall(b'\x05\x00')
        #connection.settimeout(2)
        #print("wait to read data from connection for: " + str(connection_id))
        while callback_id in cached_socks and connection_id in cached_socks[callback_id]["connections"]:
            #data = None
            #print("about to call connection.recv on connection " + str(connection_id))
            data_raw = connection.recv(8192)
            if not data_raw:
                # this means our connection just closed, tell the agent to close their end
                #print("data_raw is none for connection " + str(connection_id))
                app.redis_pool.rpush(f"SOCKS:{callback_id}:ToAgent", js.dumps({
                    "exit": True,
                    "server_id": connection_id,
                    "data": ""
                }))
                cached_socks[callback_id]["connections"].pop(connection_id, None)
                try:
                    connection.shutdown(socket.SHUT_RDWR)
                    connection.close()
                except Exception as d:
                    #print("error trying to close connection that agent told me to close: " + str(d))
                    pass
                return
            data = base64.b64encode(data_raw).decode()
            #print("++++++appending data to ToAgent for " + str(connection_id))
            #print(data)
            app.redis_pool.rpush(f"SOCKS:{callback_id}:ToAgent", js.dumps({
                "exit": False,
                "server_id": connection_id,
                "data": data
            }))
            #cached_socks[callback_id]["queue"].append({
            #    "exit": False,
            #    "server_id": connection_id,
            #    "data": data
            #})
            #print("wait to read more data from connection for: " + str(connection_id))
        #print("no longer in while loop for connection: " + str(connection_id))
        #print(cached_socks[callback_id]["connections"])
    except Exception:
        #print("failed to read from proxychains client, sending exit to agent")
        if callback_id in cached_socks and connection_id in cached_socks[callback_id]["connections"]:
            #print("adding exit message to redis")
            app.redis_pool.rpush(f"SOCKS:{callback_id}:ToAgent", js.dumps({
                "exit": True,
                "server_id": connection_id,
                "data": ""
            }))
            #cached_socks[callback_id]["queue"].append({
            #    "exit": True,
            #    "server_id": connection_id,
            #    "data": ""
            #})


@mythic.route(mythic.config["API_BASE"] + "/callbacks/<cid:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_callback(request, cid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["current_operation"] == "":
            return json({"status": "error", "error": "must be part of an operation"})
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        callback = await app.db_objects.prefetch(db_model.callback_query.where(
            (db_model.Callback.id == cid) & (db_model.Callback.operation == operation)
        ), db_model.callbacktoken_query)
        callback = list(callback)[0]
        return_json = callback.to_json()
        loaded_commands = await app.db_objects.execute(
            db_model.loadedcommands_query.where(LoadedCommands.callback == callback)
        )
        return_json["loaded_commands"] = [
            {
                "command": lc.command.cmd,
                "version": lc.version,
                "mythic_version": lc.command.version,
            }
            for lc in loaded_commands
        ]
        script_commands = await app.db_objects.execute(db_model.command_query.where(
            (db_model.Command.payload_type == callback.registered_payload.payload_type) &
            (db_model.Command.script_only == True)
        ))
        for c in script_commands:
            return_json["loaded_commands"].append(
                {"command": c.cmd,
                 "version": c.version,
                 "mythic_version": c.version}
            )
        callbackc2profiles = await app.db_objects.execute(
            db_model.callbackc2profiles_query.where(db_model.CallbackC2Profiles.callback == callback)
        )
        c2_profiles_info = {}
        for c2p in callbackc2profiles:
            c2_profile_params = await app.db_objects.execute(
                db_model.c2profileparametersinstance_query.where(
                    (db_model.C2ProfileParametersInstance.callback == callback)
                    & (
                        db_model.C2ProfileParametersInstance.c2_profile
                        == c2p.c2_profile
                    )
                )
            )
            params = [p.to_json() for p in c2_profile_params]
            c2_profiles_info[c2p.c2_profile.name] = params
        return_json["c2_profiles"] = c2_profiles_info
        build_parameters = await app.db_objects.execute(
            db_model.buildparameterinstance_query.where(
                db_model.BuildParameterInstance.payload == callback.registered_payload
            )
        )
        build_params = [t.to_json() for t in build_parameters]
        return_json["build_parameters"] = build_params
        return_json["payload_uuid"] = callback.registered_payload.uuid
        return_json["payload_name"] = bytes(callback.registered_payload.file.filename).decode("utf-8")
        return_json["status"] = "success"
        paths = await path_to_callback(callback, "Mythic")
        return_json["path"] = [str(p) if p == "Mythic" else js.dumps(p.to_json()) for p in paths]
        return json(return_json)
    except Exception as e:
        logger.warning("callback_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {"status": "error", "error": "failed to get callback: " + str(e)}, 200
        )


@mythic.route(mythic.config["API_BASE"] + "/update_callback_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_callback_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # some commands can optionally upload files or indicate files for use
    # if they are uploaded here, process them first and substitute the values with corresponding file_id numbers
    if user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Must be part of a current operation first"}
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot issue tasking"})
    try:
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "failed to get the current user's info from the database",
            }
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get the current operation"})
    try:
        data = request.json["input"]["input"]
        print(data)
        cb = await app.db_objects.get(db_model.callback_query, id=data["callback_id"], operation=operation)
        return json(await update_callback_active_lock(user, request, cb, data))
    except Exception as e:
        return json({"status": "error", "error": "failed to get callback: " + str(e)})


async def update_callback_active_lock(user, request, cal, data):
    if "description" in data:
        if data["description"] == "reset":
            # set the description back to what it was from the payload
            cal.description = cal.registered_payload.tag
        else:
            cal.description = data["description"]
    if "active" in data:
        if data["active"]:
            if not cal.active:
                c2profiles = await app.db_objects.execute(
                    db_model.callbackc2profiles_query.where(db_model.CallbackC2Profiles.callback == cal)
                )
                for c2 in c2profiles:
                    if not c2.c2_profile.is_p2p:
                        try:
                            edge = await app.db_objects.get(
                                db_model.CallbackGraphEdge,
                                source=cal,
                                destination=cal,
                                c2_profile=c2.c2_profile,
                                direction=1,
                                end_timestamp=None,
                                operation=cal.operation,
                            )
                        except Exception as d:
                            print(d)
                            edge = await app.db_objects.create(
                                db_model.CallbackGraphEdge,
                                source=cal,
                                destination=cal,
                                c2_profile=c2.c2_profile,
                                direction=1,
                                end_timestamp=None,
                                operation=cal.operation,
                            )
                cal.active = True
        else:
            if cal.active:
                try:
                    edges = await app.db_objects.execute(
                        db_model.callbackgraphedge_query.where(
                            (db_model.CallbackGraphEdge.source == cal)
                            & (db_model.CallbackGraphEdge.destination == cal)
                            & (db_model.CallbackGraphEdge.end_timestamp == None)
                            & (db_model.CallbackGraphEdge.operation == cal.operation)
                        )
                    )
                    for edge in edges:
                        if not edge.c2_profile.is_p2p:
                            edge.end_timestamp = datetime.utcnow()
                            await app.db_objects.update(edge)
                except Exception as d:
                    logger.warning(
                        "callback_api.py - error trying to add end-timestamps to edges when going inactive"
                    )
                    logger.warning("callback_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(d))
            cal.active = False
    if "locked" in data:
        if cal.locked and not data["locked"]:
            # currently locked and trying to unlock, must be admin, admin of that operation, or the user that did it
            if (
                    user["admin"]
                    or cal.operation.name in user["admin_operations"]
                    or user["username"] == cal.locked_operator.username
            ):
                cal.locked = False
                cal.locked_operator = None
            else:
                await app.db_objects.update(cal)
                return json(
                    {"status": "error", "error": "Not authorized to unlock"}
                )
        elif not cal.locked and data["locked"]:
            # currently unlocked and wanting to lock it
            if (
                    user["admin"]
                    or cal.operation.name in user["operations"]
                    or cal.operation.name in user["admin_operations"]
            ):
                cal.locked = True
                operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
                cal.locked_operator = operator
            else:
                await app.db_objects.update(cal)
                return json({"status": "error", "error": "Not authorized to lock"})
    await app.db_objects.update(cal)
    return {"status": "success"}


@mythic.route(mythic.config["API_BASE"] + "/callbacks/<cid:int>", methods=["PUT"])
@inject_user()
@scoped(["auth:user", "auth:apitoken_user", "auth:apitoken_c2"], False)
async def update_callback_web(request, cid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator" or user["current_operation"] == "":
        return json({"status": "error", "error": "Spectators cannot update callbacks"})
    data = request.json
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        cal = await app.db_objects.prefetch(db_model.callback_query.where(
            (db_model.Callback.id == cid) & (db_model.Callback.operation == operation)
        ), db_model.callbacktoken_query)
        cal = list(cal)[0]
        updated_cal = cal.to_json()
        status = await update_callback_active_lock(user, request, cal, data)
        if status["status"] == "success":
            return json({**status, **updated_cal})
        else:
            return json(status)
    except Exception as e:
        logger.warning("callback_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {"status": "error", "error": "failed to update callback: " + str(e)}
        )


@mythic.route(mythic.config["API_BASE"] + "/callbacks/<cid:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_callback(request, cid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator" or user["current_operation"] == "":
        return json(
            {"status": "error", "error": "Spectators cannot make callbacks inactive"}
        )
    try:
        cal = await app.db_objects.prefetch(db_model.callback_query.where(db_model.Callback.id == cid),
                                            db_model.callbacktoken_query)
        cal = list(cal)[0]
        if user["admin"] or cal.operation.name in user["operations"]:
            cal.active = False
            await app.db_objects.update(cal)
            success = {"status": "success"}
            deleted_cal = cal.to_json()
            return json({**success, **deleted_cal})
        else:
            return json(
                {
                    "status": "error",
                    "error": "must be an admin or part of that operation to mark it as no longer active",
                }
            )
    except Exception as e:
        logger.warning("callback_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json(
            {"status": "error", "error": "failed to delete callback: " + str(e)}
        )


@mythic.route(
    mythic.config["API_BASE"] + "/callbacks/<cid:int>/all_tasking", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def callbacks_get_all_tasking(request, user, cid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # Get all of the tasks and responses so far for the specified agent
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        callback = await app.db_objects.prefetch(db_model.callback_query.where(
            (db_model.Callback.id == cid) & (db_model.Callback.operation == operation)),
            db_model.CallbackToken.select()
        )
        callback = list(callback)[0]
        cb_json = callback.to_json()
        cb_json["tasks"] = []
        cb_json["payload_os"] = callback.registered_payload.os
        tasks = await app.db_objects.execute(
            db_model.task_query.where(Task.callback == callback).order_by(Task.id)
        )
        for t in tasks:
            cb_json["tasks"].append({**t.to_json()})
        return json({"status": "success", **cb_json})
    except Exception as e:
        logger.warning("callback_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": str(e)})


@mythic.route(
    mythic.config["API_BASE"] + "/callbacks/<page:int>/<size:int>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_pageinate_callbacks(request, user, page, size):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # get all of the artifact tasks for the current operation
    if page <= 0 or size <= 0:
        return json({"status": "error", "error": "page or size must be greater than 0"})
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operation"})
    callbacks_query = db_model.callback_query.where(Callback.operation == operation)
    count = await app.db_objects.count(callbacks_query)

    if page * size > count:
        page = ceil(count / size)
        if page == 0:
            page = 1
    cb = await app.db_objects.prefetch(
        callbacks_query.order_by(-Callback.id).paginate(page, size), db_model.CallbackToken.select()
    )
    return json(
        {
            "status": "success",
            "callbacks": [c.to_json() for c in cb],
            "total_count": count,
            "page": page,
            "size": size,
        }
    )


# Get a single response
@mythic.route(mythic.config["API_BASE"] + "/callbacks/search", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def search_callbacks_with_pageinate(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
        if "search" not in data:
            return json({"status": "error", "error": "must supply a search term"})
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
    except Exception as e:
        return json({"status": "error", "error": "Cannot find operation"})
    try:
        count = await app.db_objects.count(
            db_model.callback_query.where(
                (Callback.operation == operation)
                & (Callback.host.regexp(data["search"]))
            )
        )

        if "page" not in data:
            cb = await app.db_objects.execute(
                db_model.callback_query.where(
                    (Callback.operation == operation)
                    & (Callback.host.regexp(data["search"]))
                ).order_by(-Callback.id)
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
            cb = await app.db_objects.execute(
                db_model.callback_query.where(
                    (Callback.operation == operation)
                    & (Callback.host.regexp(data["search"]))
                )
                .order_by(-Callback.id)
                .paginate(data["page"], data["size"])
            )
        return json(
            {
                "status": "success",
                "callbacks": [c.to_json() for c in cb],
                "total_count": count,
                "page": data["page"],
                "size": data["size"],
            }
        )
    except Exception as e:
        logger.warning("callback_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": str(e)})


async def add_p2p_route(agent_message, callback, task):
    # { INPUT
    # "edges": [
    #    {
    #      "source": "uuid of callback",
    #      "destination": "uuid of adjoining callback",
    #      "direction": 1 or 2 or 3,
    #      "metadata": "{ optional metadata json string }",
    #      "action": "add" or "remove"
    #      "c2_profile": "name of the c2 profile"
    #     }
    #   ]
    # }
    # { RESPONSE
    #   "status": "success" or "error"
    # }
    # dijkstra is directed, so if we have a bidirectional connection (type 3) account for that as well
    for e in agent_message:
        if task is None and "task_id" in e and e["task_id"] != "" and e["task_id"] is not None:
            try:
                this_task = await app.db_objects.get(db_model.task_query, agent_task_id=e["task_id"])
            except Exception as e:
                this_task = None
                asyncio.create_task(send_all_operations_message(message="Failed to find specified task for 'edges' message",
                                                                level="warning",
                                                                source="generic_edge_processing"))
        else:
            this_task = task
        if e["action"] == "add":
            try:
                source = await app.db_objects.get(db_model.callback_query, agent_callback_id=e["source"])
                destination = await app.db_objects.get(
                    db_model.callback_query, agent_callback_id=e["destination"]
                )
                if callback is None:
                    callback = source
                if (
                    "c2_profile" in e
                    and e["c2_profile"] is not None
                    and e["c2_profile"] != ""
                ):
                    profile = await app.db_objects.get(db_model.c2profile_query, name=e["c2_profile"])
                else:
                    await app.db_objects.create(db_model.OperationEventLog, operation=callback.operation,
                                            level="warning", message=f"Failed to add route between {source.id} and {destination.id}. No c2_profile specified")
                    return
                # there can only be one source-destination-direction-metadata-c2_profile combination
                try:
                    edge = await app.db_objects.get(
                        db_model.CallbackGraphEdge,
                        source=source,
                        destination=destination,
                        direction=e["direction"],
                        metadata=e["metadata"],
                        operation=callback.operation,
                        c2_profile=profile,
                        end_timestamp=None,
                    )
                    return
                except Exception as error:
                    edge = await app.db_objects.create(
                        db_model.CallbackGraphEdge,
                        source=source,
                        destination=destination,
                        direction=e["direction"],
                        metadata=e["metadata"],
                        operation=callback.operation,
                        c2_profile=profile,
                        task_start=this_task,
                    )
            except Exception as d:
                await app.db_objects.create(db_model.OperationEventLog, operation=callback.operation,
                                        level="warning",
                                        message=f"Failed to add p2p route. {str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d)}")
                return
        if e["action"] == "remove":
            try:
                # find the edge its talking about
                # print(e)
                source = await app.db_objects.get(db_model.callback_query, agent_callback_id=e["source"])
                destination = await app.db_objects.get(
                    db_model.callback_query, agent_callback_id=e["destination"]
                )
                if callback is None:
                    callback = source
                if (
                    "c2_profile" in e
                    and e["c2_profile"] is not None
                    and e["c2_profile"] != ""
                ):
                    profile = await app.db_objects.get(db_model.c2profile_query, name=e["c2_profile"])
                else:
                    await app.db_objects.create(db_model.OperationEventLog, operation=callback.operation,
                                            level="warning",
                                            message=f"Failed to remove route between {source.id} and {destination.id}. c2_profile not specified")
                    return
                edge = await app.db_objects.get(
                    db_model.CallbackGraphEdge,
                    source=source,
                    destination=destination,
                    direction=e["direction"],
                    metadata=e["metadata"],
                    operation=callback.operation,
                    c2_profile=profile,
                    end_timestamp=None,
                )
                edge.end_timestamp = datetime.utcnow()
                edge.task_end = this_task
                await app.db_objects.update(edge)
            except Exception as d:
                await app.db_objects.create(db_model.OperationEventLog, operation=callback.operation,
                                        level="warning",
                                        message=f"Failed to remove route. {str(sys.exc_info()[-1].tb_lineno) + ' ' + str(d)}")
                return
    return


async def path_to_callback(callback, destination):
    try:
        graph = await get_graph(callback.operation, directed=False)
        if graph.edge_count == 0:
            return []  # graph for this operation has no edges
        try:
            path = find_path(
                graph, callback, destination, cost_func=cost_func
            )
        except NoPathError:
            return []
        return path.nodes
    except Exception as e:
        asyncio.create_task(send_all_operations_message(message=f"Error in getting path to callback:\n{str(sys.exc_info()[-1].tb_lineno) + ' ' + str(e)}",
                                                        level="warning", operation=callback.operation))
        return []
