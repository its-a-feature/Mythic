from app import mythic
import app
from sanic_jwt.decorators import inject_user, scoped
import app.database_models.model as db_model
from sanic.response import json
from sanic.exceptions import abort
from app.api.callback_api import stop_socks


# -------  Proxies FUNCTION -----------------
@mythic.route(mythic.config["API_BASE"] + "/proxies", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_c2", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_proxies(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        proxies = await app.db_objects.execute(
            db_model.callback_query.where(
                (db_model.Callback.operation == operation)
                & (db_model.Callback.port != None)
            )
        )
        return json({"status": "success", "proxies": [p.to_json(False) for p in proxies]})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to find proxies or operation"})


@mythic.route(mythic.config["API_BASE"] + "/proxies/<pid:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def stop_socks_in_callback(request, user, pid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json({"status": "error", "error": "Spectators cannot stop socks"})
        proxy = await app.db_objects.get(db_model.callback_query, port=pid)
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        await stop_socks(proxy, operator)
        return json({"status": "success", **proxy.to_json(False)})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to find proxy"})


@mythic.route(mythic.config["API_BASE"] + "/stop_proxy_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def stop_socks_in_callback_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json({"status": "error", "error": "Spectators cannot stop socks"})
        data = request.json["input"]
        proxy = await app.db_objects.get(db_model.callback_query, id=data["callback_id"])
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        await stop_socks(proxy, operator)
        return json({"status": "success"})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to find proxy"})
