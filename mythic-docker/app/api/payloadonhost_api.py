from app import mythic
import app
from sanic_jwt.decorators import inject_user, scoped
import app.database_models.model as db_model
from sanic.response import json
from sanic.exceptions import abort
import base64


# -------  payloads on hosts FUNCTION -----------------
@mythic.route(mythic.config["API_BASE"] + "/payloadonhost", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_c2", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_payloadsonhost(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        poh = await app.db_objects.execute(
            db_model.payloadonhost_query.where(
                (db_model.PayloadOnHost.operation == operation)
                & (db_model.PayloadOnHost.deleted == False)
            )
        )
        return json({"status": "success", "payloads": [p.to_json() for p in poh]})
    except Exception as e:
        print(str(e))
        return json(
            {"status": "error", "error": "failed to find payloads or operation"}
        )


@mythic.route(mythic.config["API_BASE"] + "/payloadonhost", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_c2", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def add_payload_to_host(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {
                    "status": "error",
                    "error": "Spectators cannot register payloads on hosts",
                }
            )
        data = request.json
        if "host" not in data or data["host"] == "":
            return json({"status": "error", "error": "host must be supplied"})
        if "uuid" not in data or data["uuid"] == "":
            return json(
                {"status": "error", "error": "uuid of a payload must be supplied"}
            )
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        payload = await app.db_objects.get(db_model.payload_query, uuid=data["uuid"])
        data["host"] = data["host"]
        try:
            payloadonhost = await app.db_objects.get(
                db_model.PayloadOnHost,
                host=data["host"].upper(),
                payload=payload,
                operation=operation,
                deleted=False,
            )
        except Exception as e:
            payloadonhost = await app.db_objects.create(
                db_model.PayloadOnHost,
                host=data["host"].upper(),
                payload=payload,
                operation=operation,
            )
        return json({"status": "success", "payload": payloadonhost.to_json()})
    except Exception as e:
        print(str(e))
        return json(
            {"status": "error", "error": "failed to find payloads, host, or operation"}
        )


@mythic.route(
    mythic.config["API_BASE"] + "/payloadonhost/payload/<poh_id:int>",
    methods=["DELETE"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_c2", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_payloadonhost(request, user, poh_id):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {
                    "status": "error",
                    "error": "Spectators cannot remove payloads from hosts",
                }
            )
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        poh = await app.db_objects.get(db_model.payloadonhost_query, operation=operation, id=poh_id)
        poh.deleted = True
        await app.db_objects.update(poh)
        return json({"status": "success", "payload": poh.to_json()})
    except Exception as e:
        print(str(e))
        return json(
            {"status": "error", "error": "failed to find payloads, host, or operation"}
        )


@mythic.route(
    mythic.config["API_BASE"] + "/payloadonhost/host/<host:str>", methods=["DELETE"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_c2", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_payloadonhost_by_host(request, user, host: str):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {
                    "status": "error",
                    "error": "Spectators cannot remove payloads on hosts",
                }
            )
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        hostname = base64.b64decode(host).decode().upper()
        poh = await app.db_objects.execute(
            db_model.payloadonhost_query.where(
                (db_model.PayloadOnHost.operation == operation)
                & (db_model.PayloadOnHost.deleted == False)
                & (db_model.PayloadOnHost.host == hostname)
            )
        )
        deleted = []
        for p in poh:
            p.deleted = True
            await app.db_objects.update(p)
            deleted.append(p.to_json())
        return json({"status": "success", "payload": deleted})
    except Exception as e:
        print(str(e))
        return json(
            {"status": "error", "error": "failed to find payloads, host, or operation"}
        )
