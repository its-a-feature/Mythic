from app import mythic
import app
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
from uuid import uuid4


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
    ops = await app.db_objects.execute(db_model.operator_query.where(db_model.Operator.deleted == False))
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
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
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
    if not user["admin"]:
        return json({"status": "error", "error": "Only admins can create new users"})
    if "username" not in data or data["username"] == "":
        return json({"status": "error", "error": '"username" field is required'})
    if not isinstance(data["username"], str) or not len(data["username"]):
        return json(
            {
                "status": "error",
                "error": '"username" must be string with at least one character',
            }
        )
    salt = str(uuid4())
    if len(data["password"]) < 12:
        return json({"status": "error", "error": "password must be at least 12 characters long"})
    password = await crypto.hash_SHA512(salt + data["password"])
    # we need to create a new user
    try:
        new_operator = await app.db_objects.create(
            Operator, username=data["username"], password=password, admin=False, salt=salt, active=True
        )
        success = {"status": "success"}
        new_user = new_operator.to_json()
        # try to get the browser script code to auto load for the new operator
        await set_default_scripts(new_operator)
        # print(result)
        return response.json({**success, **new_user})
    except Exception as e:
        return json({"status": "error", "error": "failed to add user: " + str(e)})


@mythic.route(mythic.config["API_BASE"] + "/create_operator", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_operator_graphql(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    data = request.json
    data = data["input"]["input"]
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot create users"})
    if not user["admin"]:
        return json({"status": "error", "error": "Only admins can create new users"})
    if "username" not in data or data["username"] == "":
        return json({"status": "error", "error": '"username" field is required'})
    if not isinstance(data["username"], str) or not len(data["username"]):
        return json(
            {
                "status": "error",
                "error": '"username" must be string with at least one character',
            }
        )
    salt = str(uuid4())
    password = await crypto.hash_SHA512(salt + data["password"])
    if len(data["password"]) < 12:
        return json({"status": "error", "error": "password must be at least 12 characters long"})
    # we need to create a new user
    try:
        new_operator = await app.db_objects.create(
            Operator, username=data["username"], password=password, admin=False, salt=salt, active=True
        )
        success = {"status": "success"}
        new_user = new_operator.to_json()
        # try to get the browser script code to auto load for the new operator
        await set_default_scripts(new_operator)
        # print(result)
        return response.json({**success, **new_user})
    except Exception as e:
        return json({"status": "error", "error": "failed to add user: " + str(e)})


@mythic.route(mythic.config["API_BASE"] + "/update_operator_password_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_operator_password_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
        data = data["input"]
    except Exception as e:
        return json({"status": "error", "error": "Failed to process submitted data"})
    if "user_id" not in data:
        return json({"status": "error", "error": "user_id must be supplied"})
    operator = await app.db_objects.get(db_model.operator_query, id=data["user_id"])
    if user["admin"]:
        password = await crypto.hash_SHA512(operator.salt + data["new_password"])
    elif operator.id == user["id"]:
        # check to make sure the user supplied the right old password
        password_check = await crypto.hash_SHA512(operator.salt + data["old_password"])
        if password_check != operator.password:
            return json({"status": "error", "error": "Invalid old password, cannot set new password"})
        password = await crypto.hash_SHA512(operator.salt + data["new_password"])
    else:
        return json({"status": "error", "error": "Can only change your own password unless you're an admin"})
    if len(data["new_password"]) < 12:
        return json({"status": "error", "error": "password must be at least 12 characters long"})
    # we need to create a new user
    try:
        operator.password = password
        await app.db_objects.update(operator)
        success = {"status": "success"}
        return response.json({**success})
    except Exception as e:
        return json({"status": "error", "error": "failed to update user: " + str(e)})


@mythic.route(mythic.config["API_BASE"] + "/update_current_operation_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_operator_operation_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
        data = data["input"]
    except Exception as e:
        return json({"status": "error", "error": "Failed to process submitted data"})
    if "user_id" not in data:
        return json({"status": "error", "error": "user_id must be supplied"})
    if "operation_id" not in data:
        return json({"status": "error", "error": "operation_id must be supplied"})
    try:
        operator = await app.db_objects.get(db_model.operator_query, id=data["user_id"])
        operation = await app.db_objects.get(db_model.operation_query, id=data["operation_id"])
    except Exception as e:
        return json({"status": "error", "error": "Failed to find operator or operation"})
    try:
        operatorOperation = await app.db_objects.get(db_model.operatoroperation_query,
                                                     operator=operator,
                                                     operation=operation)
        operator.current_operation = operation
        await app.db_objects.update(operator)
        success = {"status": "success"}
        return response.json({**success, "operation_id": operation.id})
    except Exception as e:
        return json({"status": "error", "error": "Must be part of an operation to make it your current operation"})


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
        op = await app.db_objects.get(db_model.operator_query, id=oid)
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
    mythic.config["API_BASE"] + "/operators/config/<name:str>", methods=["GET"]
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
        op = await app.db_objects.get(db_model.operator_query, id=oid)
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
            if len(data["password"]) < 12:
                return json({"status": "error", "error": "password must be at least 12 characters long"})
            op.password = await crypto.hash_SHA512(op.salt + data["password"])
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
                current_op = await app.db_objects.get(db_model.operation_query, name=data["current_operation"])
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
            await app.db_objects.update(op)
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
        op = await app.db_objects.get(db_model.operator_query, id=oid)
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
        op.active = False
        op.admin = False
        await app.db_objects.update(op)
        success = {"status": "success"}
        return json({**success, **op.to_json()})
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to mark operator as deleted"})
