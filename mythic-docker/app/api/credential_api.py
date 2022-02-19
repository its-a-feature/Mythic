from app import mythic
import app
from sanic.response import json
from app.database_models.model import Credential
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
from app.api.siem_logger import log_to_siem
import asyncio

@mythic.route(
    mythic.config["API_BASE"] + "/credentials/current_operation", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_current_operation_credentials(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] != "":
        try:
            operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        except Exception as e:
            print(e)
            return json({"status": "error", "error": "Failed to get current operation"})
        creds = await app.db_objects.execute(
            db_model.credential_query.where(
                (Credential.operation == operation) & (Credential.deleted == False)
            )
        )
        return json({"status": "success", "credentials": [c.to_json() for c in creds]})
    else:
        return json({"status": "error", "error": "must be part of a current operation"})


@mythic.route(mythic.config["API_BASE"] + "/credentials", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_credential(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator" or user["current_operation"] == "":
        return json({"status": "error", "error": "Spectators cannot add credentials"})
    if user["current_operation"] != "":
        try:
            operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
            operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        except Exception as e:
            print(e)
            return json({"status": "error", "error": "failed to get operation"})
        data = request.json
        return json(await create_credential_func(operator, operation, data))
    else:
        return json({"status": "error", "error": "must be part of a current operation"})


async def create_credential_func(operator, operation, data):
    status = {"status": "success", "new": True}
    types_list = ["plaintext", "certificate", "hash", "key", "ticket", "cookie", "hex"]
    if "credential_type" not in data or data["credential_type"] not in types_list:
        data["credential_type"] = "plaintext"
    if "realm" not in data or data["realm"] == "" or data["realm"] is None:
        data["realm"] = ""
    if (
        "credential" not in data
        or data["credential"] == ""
        or data["credential"] is None
    ):
        data["credential"] = ""
    if "account" not in data or data["account"] == "" or data["account"] is None:
        data["account"] = ""
    if "comment" not in data:
        data["comment"] = ""
    if "metadata" not in data:
        data["metadata"] = ""
    if "task" not in data or data["task"] == "":
        try:
            # trying to prevent duplication of data in the database
            cred = await app.db_objects.get(
                db_model.credential_query,
                type=data["credential_type"],
                account=data["account"],
                deleted=False,
                realm=data["realm"],
                operation=operation,
                credential=data["credential"].encode(),
            )
            cred.comment = data["comment"] if cred.comment == "" else cred.comment
            cred.metadata =  data["metadata"] if cred.metadata == "" else cred.metadata
            await app.db_objects.update(cred)
            status["new"] = False
        except Exception as e:
            # we got here because the credential doesn't exist, so we need to create it
            cred = await app.db_objects.create(
                Credential,
                type=data["credential_type"],
                account=data["account"],
                realm=data["realm"],
                operation=operation,
                credential=data["credential"].encode(),
                operator=operator,
                comment=data["comment"],
                metadata=data["metadata"]
            )
            asyncio.create_task( log_to_siem(mythic_object=cred, mythic_source="credential_new") )
    else:
        try:
            cred = await app.db_objects.get(
                db_model.credential_query,
                type=data["credential_type"],
                account=data["account"],
                deleted=False,
                realm=data["realm"],
                operation=operation,
                credential=data["credential"].encode(),
            )
            cred.comment = cred.comment + " " + data["comment"] if cred.comment != data["comment"] else cred.comment
            cred.metadata = cred.metadata + " " + data["metadata"] if cred.metadata != data[
                "metadata"] else cred.metadata
            await app.db_objects.update(cred)
            status["new"] = False
        except Exception as e:
            # we got here because the credential doesn't exist, so we need to create it
            cred = await app.db_objects.create(
                Credential,
                type=data["credential_type"],
                account=data["account"],
                task=data["task"],
                realm=data["realm"],
                operation=operation,
                credential=data["credential"].encode(),
                operator=operator,
                comment=data["comment"],
                metadata=data["metadata"]
            )
            asyncio.create_task(log_to_siem(mythic_object=cred, mythic_source="credential_new"))
    return {**status, **cred.to_json()}


@mythic.route(mythic.config["API_BASE"] + "/credentials/<cid:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_credential(request, user, cid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot remove credentials"}
        )
    if user["current_operation"] != "":
        try:
            operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
            credential = await app.db_objects.get(db_model.credential_query, id=cid, operation=operation)
        except Exception as e:
            print(e)
            return json({"status": "error", "error": "failed to find that credential"})
        credential.deleted = True
        await app.db_objects.update(credential)
        return json({"status": "success", **credential.to_json()})
    else:
        return json({"status": "error", "error": "must be part of a current operation"})


@mythic.route(mythic.config["API_BASE"] + "/credentials/<cid:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def modify_credential(request, user, cid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {"status": "error", "error": "Spectators cannot modify credentials"}
        )
    if user["current_operation"] != "":
        try:
            operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
            credential = await app.db_objects.get(db_model.credential_query, id=cid, operation=operation)
        except Exception as e:
            print(e)
            return json({"status": "error", "error": "failed to get credential"})
        data = request.json
        return json(await update_credential_func(credential, data))
    else:
        return json({"status": "error", "error": "must be part of a current operation"})


async def update_credential_func(cred, data):
    types_list = ["plaintext", "certificate", "hash", "key", "ticket", "cookie"]
    try:
        if "type" in data and data["type"] in types_list:
            cred.type = data["type"]
        if "realm" in data:
            cred.realm = data["realm"]
        if "credential" in data and data["credential"] != "":
            cred.credential = data["credential"].encode()
        if "account" in data:
            cred.account = data["account"]
        if "comment" in data:
            cred.comment = data["comment"]
        await app.db_objects.update(cred)
        asyncio.create_task(log_to_siem(mythic_object=cred, mythic_source="credential_modified"))
        return {"status": "success", **cred.to_json()}
    except Exception as e:
        return {"status": "error", "error": str(e)}
