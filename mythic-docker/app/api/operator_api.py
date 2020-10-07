from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import Operator
from sanic import response
from app import crypto
from urllib.parse import unquote_plus
from sanic_jwt.decorators import inject_user
from sanic_jwt import scoped
import app.database_models.model as db_model
from sanic.exceptions import abort
from app.api.browserscript_api import set_default_scripts


@mythic.route(mythic.config["API_BASE"] + "/operators/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_operators(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    query = await db_model.operator_query()
    ops = await db_objects.execute(query.where(db_model.Operator.deleted == False))
    return json([p.to_json() for p in ops])


@mythic.route(mythic.config["API_BASE"] + "/operators/me", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_my_operator(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
        return json({"status": "success", **operator.to_json()})
    except Exception as e:
        return json({"status": "error", "error": "failed to get current operator"})


@mythic.route(mythic.config["API_BASE"] + "/operators/", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_operator(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    data = request.json
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot create users"})
    if "username" not in data or data["username"] == "":
        return json({"status": "error", "error": '"username" field is required'})
    if not isinstance(data["username"], str) or not len(data["username"]):
        return json(
            {
                "status": "error",
                "error": '"username" must be string with at least one character',
            }
        )
    password = await crypto.hash_SHA512(data["password"])
    admin = False  # cannot create a user initially as admin
    # we need to create a new user
    try:
        new_operator = await db_objects.create(
            Operator, username=data["username"], password=password, admin=admin
        )
        success = {"status": "success"}
        new_user = new_operator.to_json()
        # try to get the browser script code to auto load for the new operator
        await set_default_scripts(new_operator)
        # print(result)
        return response.json({**success, **new_user})
    except Exception as e:
        return json({"status": "error", "error": "failed to add user: " + str(e)})


@mythic.route(mythic.config["API_BASE"] + "/operators/<oid:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_operator(request, oid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operator_query()
        op = await db_objects.get(query, id=oid)
        if op.username == user["username"] or user["view_mode"] != "spectator":
            return json({"status": "success", **op.to_json()})
        else:
            return json(
                {
                    "status": "error",
                    "error": "Spectators cannot query for specific users",
                }
            )
    except:
        print("Failed to get operator")
        return json({"status": "error", "error": "failed to get operator"})


@mythic.route(
    mythic.config["API_BASE"] + "/operators/config/<name:string>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_config_item(request, name, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    name = unquote_plus(name)
    try:
        if name == "light":
            return json({"status": "success", "config": Operator.light_config})
        elif name == "dark":
            return json({"status": "success", "config": Operator.dark_config})
        else:
            return json({"status": "error", "error": "config not found"})
    except Exception as e:
        return json({"status": "error", "error": "error getting configs"})


@mythic.route(mythic.config["API_BASE"] + "/operators/<oid:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_operator(request, oid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operator_query()
        op = await db_objects.get(query, id=oid)
        if op.username != user["username"] and not user["admin"]:
            # you can't change the name of somebody else unless you're admin
            return json(
                {
                    "status": "error",
                    "error": "not authorized to change that user's information",
                }
            )
        data = request.json
        if "password" in data:
            op.password = await crypto.hash_SHA512(data["password"])
        if (
            "admin" in data and user["admin"]
        ):  # only a current admin can make somebody an admin
            op.admin = data["admin"]
        if (
            "active" in data
        ):  # this way you can deactivate accounts without deleting them
            op.active = data["active"]
        if "current_operation" in data:
            if data["current_operation"] in user["operations"]:
                query = await db_model.operation_query()
                current_op = await db_objects.get(query, name=data["current_operation"])
                op.current_operation = current_op
        if "ui_config" in data:
            if data["ui_config"] == "default":
                op.ui_config = op.default_config
            elif data["ui_config"] == "dark":
                op.ui_config = op.default_specter_config
            else:
                op.ui_config = data["ui_config"]
        if "username" in data and data["username"] != "":
            op.username = data["username"]
        if "view_utc_time" in data:
            op.view_utc_time = data["view_utc_time"]
        try:
            await db_objects.update(op)
            success = {"status": "success"}
        except Exception as e:
            return json(
                {"status": "error", "error": "failed to update operator: " + str(e)}
            )
        updated_operator = op.to_json()
        return json({**success, **updated_operator})
    except Exception as e:
        return json(
            {"status": "error", "error": "failed to update operator: " + str(e)}
        )


@mythic.route(mythic.config["API_BASE"] + "/operators/<oid:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_operator(request, oid, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )

    try:
        query = await db_model.operator_query()
        op = await db_objects.get(query, id=oid)
        if op.username != user["username"] and not user["admin"]:
            return json(
                {
                    "status": "error",
                    "error": "cannot delete anybody but yourself unless you're admin",
                }
            )
        if oid == 1:
            return json(
                {
                    "status": "error",
                    "error": "cannot delete the default account so you always have a way in",
                }
            )
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find operator"})
    try:
        op.deleted = True
        await db_objects.update(op)
        success = {"status": "success"}
        return json({**success, **op.to_json()})
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to mark operator as deleted"})
