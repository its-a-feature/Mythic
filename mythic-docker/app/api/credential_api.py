from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import Credential
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort
from app.api.siem_logger import log_to_siem


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
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user["current_operation"])
        except Exception as e:
            print(e)
            return json({"status": "error", "error": "Failed to get current operation"})
        query = await db_model.credential_query()
        creds = await db_objects.execute(
            query.where(
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
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot add credentials"})
    if user["current_operation"] != "":
        try:
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user["current_operation"])
            query = await db_model.operator_query()
            operator = await db_objects.get(query, username=user["username"])
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
    if "task" not in data or data["task"] == "":
        try:
            # trying to prevent duplication of data in the database
            query = await db_model.credential_query()
            cred = await db_objects.get(
                query,
                type=data["credential_type"],
                account=data["account"],
                deleted=False,
                realm=data["realm"],
                operation=operation,
                credential=data["credential"].encode(),
            )
            status["new"] = False
        except Exception as e:
            # we got here because the credential doesn't exist, so we need to create it
            cred = await db_objects.create(
                Credential,
                type=data["credential_type"],
                account=data["account"],
                realm=data["realm"],
                operation=operation,
                credential=data["credential"].encode(),
                operator=operator,
                comment=data["comment"],
            )
            await log_to_siem(cred.to_json(), mythic_object="credential_new")
    else:
        try:
            query = await db_model.credential_query()
            cred = await db_objects.get(
                query,
                type=data["credential_type"],
                account=data["account"],
                deleted=False,
                realm=data["realm"],
                operation=operation,
                credential=data["credential"].encode(),
            )
            status["new"] = False
        except Exception as e:
            # we got here because the credential doesn't exist, so we need to create it
            cred = await db_objects.create(
                Credential,
                type=data["credential_type"],
                account=data["account"],
                task=data["task"],
                realm=data["realm"],
                operation=operation,
                credential=data["credential"].encode(),
                operator=operator,
                comment=data["comment"],
            )
            await log_to_siem(cred.to_json(), mythic_object="credential_new")
    return {**status, **cred.to_json()}


@mythic.route(mythic.config["API_BASE"] + "/credentials/<id:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_credential(request, user, id):
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
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user["current_operation"])
            query = await db_model.credential_query()
            credential = await db_objects.get(query, id=id, operation=operation)
        except Exception as e:
            print(e)
            return json({"status": "error", "error": "failed to find that credential"})
        credential.deleted = True
        await db_objects.update(credential)
        return json({"status": "success", **credential.to_json()})
    else:
        return json({"status": "error", "error": "must be part of a current operation"})


@mythic.route(mythic.config["API_BASE"] + "/credentials/<id:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def modify_credential(request, user, id):
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
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=user["current_operation"])
            query = await db_model.credential_query()
            credential = await db_objects.get(query, id=id, operation=operation)
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
        await db_objects.update(cred)
        await log_to_siem(cred.to_json(), mythic_object="credential_modified")
        return {"status": "success", **cred.to_json()}
    except Exception as e:
        return {"status": "error", "error": str(e)}
