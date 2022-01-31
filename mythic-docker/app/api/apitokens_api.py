from app import mythic
import app
from sanic_jwt.decorators import inject_user, scoped
import app.database_models.model as db_model
from sanic.response import json
from sanic.exceptions import abort


@mythic.route(mythic.config["API_BASE"] + "/generate_apitoken_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_c2", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def generate_apitoken_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json["input"]
    except Exception as e:
        return json({"status": "error", "error": "failed to parse json"})
    if "token_type" not in data or data["token_type"] not in ["C2", "User"]:
        return json(
            {
                "status": "error",
                "error": 'token_type must be specified and be "C2" or "User"',
            }
        )
    try:
        operator = await app.db_objects.get(db_model.operator_query, id=user["user_id"])
        token = await request.app.auth.generate_access_token(
            {
                "user_id": user["user_id"],
                "auth": "apitoken",
                "token_type": data["token_type"],
            }
        )
        try:
            apitoken = await app.db_objects.create(
                db_model.APITokens,
                token_type=data["token_type"],
                token_value=token,
                operator=operator,
            )
            return json({"status": "success", "id": apitoken.id, "operator_id": operator.id, "token_value": apitoken.token_value})
        except Exception as e:
            return json({"status": "error", "error": "Failed to create token: " + str(e)})
    except Exception as e:
        return json({"status": "error", "error": "failed to find user or tokens: " + str(e)})


# -------  API Tokens FUNCTION -----------------
@mythic.route(mythic.config["API_BASE"] + "/apitokens", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_c2", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_apitokens(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        tokens = await app.db_objects.execute(
            db_model.apitokens_query.where(db_model.APITokens.operator == operator)
        )
        return json({"status": "success", "apitokens": [t.to_json() for t in tokens]})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to find user or tokens"})


@mythic.route(mythic.config["API_BASE"] + "/apitokens", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_apitokens(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
    except Exception as e:
        return json({"status": "error", "error": "failed to parse json"})
    if "token_type" not in data or data["token_type"] not in ["C2", "User"]:
        return json(
            {
                "status": "error",
                "error": 'token_type must be specified and be "C2" or "User"',
            }
        )
    try:
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        token = await request.app.auth.generate_access_token(
            {
                "user_id": user["user_id"],
                "auth": "apitoken",
                "token_type": data["token_type"],
            }
        )
        try:
            apitoken = await app.db_objects.create(
                db_model.APITokens,
                token_type=data["token_type"],
                token_value=token,
                operator=operator,
            )
            return json({"status": "success", **apitoken.to_json()})
        except Exception as e:
            print(str(e))
            return json({"status": "error", "error": "Failed to create token"})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to find user or tokens"})


@mythic.route(mythic.config["API_BASE"] + "/apitokens/<tid:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def modify_apitokens(request, user, tid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        data = request.json
    except Exception as e:
        return json({"status": "error", "error": "failed to parse json"})
    try:
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        apitoken = await app.db_objects.get(db_model.apitokens_query, id=tid, operator=operator)
        try:
            if "active" in data and data["active"] != apitoken.active:
                apitoken.active = data["active"]
                await app.db_objects.update(apitoken)
            return json({"status": "success", **apitoken.to_json()})
        except Exception as e:
            print(str(e))
            return json({"status": "error", "error": "Failed to update token"})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to find user or tokens"})


@mythic.route(mythic.config["API_BASE"] + "/apitokens/<tid:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def remove_apitokens(request, user, tid):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
        apitoken = await app.db_objects.get(db_model.apitokens_query, id=tid, operator=operator)
        apitoken_json = apitoken.to_json()
        await app.db_objects.delete(apitoken)
        return json({"status": "success", **apitoken_json})
    except Exception as e:
        print(str(e))
        return json({"status": "error", "error": "failed to find user or tokens"})
