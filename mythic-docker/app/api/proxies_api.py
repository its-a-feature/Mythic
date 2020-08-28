from app import mythic, db_objects
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        callbacks_query = await db_model.callback_query()
        proxies = await db_objects.execute(
            callbacks_query.where(
                (db_model.Callback.operation == operation)
                & (db_model.Callback.port != None)
            )
        )
        return json({"status": "success", "proxies": [p.to_json() for p in proxies]})
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
        query = await db_model.callback_query()
        proxy = await db_objects.get(query, port=pid)
        operator_query = await db_model.operator_query()
        operator = await db_objects.get(operator_query, username=user["username"])
        await stop_socks(proxy, operator)
        return json({"status": "success", **proxy.to_json()})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to find proxy"})
