from sanic_jwt import exceptions, Responses
from app import links, mythic, valid_restful_scripting_bounds
import app
from app.database_models.model import Operation, OperatorOperation
from app.database_models.model import (
    operator_query,
    operation_query,
    operatoroperation_query,
    apitokens_query,
)
import datetime
import ujson as js
from sanic.response import json
from sanic_jwt import Authentication, Configuration
from sanic.log import logger
from sanic_jwt.decorators import inject_user
from contextlib import contextmanager
from sanic_jwt.cache import to_cache, clear_cache
import sys
from app.api.operation_api import send_all_operations_message


@contextmanager
def cache_request(request):
    to_cache("_request", request)
    yield
    clear_cache()


# pulled from janic_jwt issue discussion: https://github.com/ahopkins/sanic-jwt/issues/158
class MyConfig(Configuration):
    def get_verify_exp(self, request=None):
        """
        If the request is with the "apitoken", then we do not want to check for expiration
        """
        if request:
            return "apitoken" not in request.headers


class MyAuthentication(Authentication):
    async def _verify(
            self,
            request,
            return_payload=False,
            verify=True,
            raise_missing=False,
            request_args=None,
            request_kwargs=None,
            *args,
            **kwargs,
    ):
        """
        If there is a "apitoken", then we will verify the token by checking the
        database. Otherwise, just do the normal verification.
        Typically, any method that begins with an underscore in sanic-jwt should
        not be touched. In this case, we are trying to break the rules a bit to handle
        a unique use case: handle both expirable and non-expirable tokens.
        """
        if "apitoken" in request.headers:
            # Extract the apitoken from the headers
            apitoken = request.headers.get("apitoken")

            try:
                with cache_request(request):
                    payload = await self._decode(apitoken, verify=verify)
            except Exception as e:
                logger.error("Failed to decode apitoken")
                if return_payload:
                    return {}
                return False, 401, "Auth Error"
            # Sometimes, the application will call _verify(...return_payload=True)
            # So, let's make sure to handle this scenario.
            if return_payload:
                return payload
            request_kwargs = request_kwargs or {}
            user = request_kwargs.get("user")
            if not user:
                logger.error("retrieve_user lookup failed in request_kwargs")
                return False, 401, "Auth Error"
            if user["apitoken_active"]:
                return True, 200, "Success"
            else:
                logger.error("Token no longer active")
                return False, 401, "Auth Error"
        else:
            with cache_request(request):
                return await super()._verify(
                    request=request,
                    return_payload=return_payload,
                    verify=verify,
                    raise_missing=raise_missing,
                    request_args=request_args,
                    request_kwargs=request_kwargs,
                    *args,
                    **kwargs,
                )

    async def authenticate(self, request, *args, **kwargs):
        #logger.debug("called authenticate")
        username = request.json.get("username", None)
        password = request.json.get("password", None)
        unknown_username = True
        if not username or not password:
            raise exceptions.AuthenticationFailed(
                "Must supply both username and password"
            )
        try:
            user = await app.db_objects.get(operator_query, username=username)
            unknown_username = False
            if user.id == 1 and user.failed_login_count > 10 and (user.last_failed_login_timestamp
                                                                  > datetime.datetime.utcnow() + datetime.timedelta(
                        seconds=-60)):
                # throttle their attempts to log in to 1 min between checks
                user.failed_login_count += 1
                user.last_failed_login_timestamp = datetime.datetime.utcnow()
                await app.db_objects.update(user)
                await send_all_operations_message(
                    message=f"Throttling login attempts for {user.username} due to too many failed login attempts ",
                    level="warning", source="throttled_login_" + user.username)
                raise exceptions.AuthenticationFailed("Too many failed login attempts, try again later")
            elif not user.active:
                await send_all_operations_message(message=f"Deactivated account {user.username} trying to log in",
                                                  level="warning", source="deactivated_login_" + user.username)
                raise exceptions.AuthenticationFailed("Account is not active, cannot log in")
            elif await user.check_password(password):
                try:
                    user.last_login = datetime.datetime.now()
                    user.failed_login_count = 0
                    await app.db_objects.update(user)
                    # now we have successful authentication, return appropriately
                    return {"user_id": user.id, "username": user.username, "auth": "user", **user.to_json()}
                except Exception as e:
                    raise exceptions.AuthenticationFailed("Failed to authenticate")
            else:
                user.failed_login_count += 1
                if user.failed_login_count >= 10 and user.active:
                    user.last_failed_login_timestamp = datetime.datetime.utcnow()
                    if user.id != 1:
                        user.active = False
                        await send_all_operations_message(
                            message=f"Deactivating account {user.username} due to too many failed logins",
                            level="warning")
                await app.db_objects.update(user)
                raise exceptions.AuthenticationFailed("Username or password invalid")
        except Exception as e:
            if unknown_username:
                await send_all_operations_message(message=f"Attempt to login with unknown user: {username}",
                                                  level="warning", source="unknown_login_" + username)

            raise exceptions.AuthenticationFailed("Username or password invalid")

    async def retrieve_user(self, request, payload, *args, **kwargs):
        user_id = None
        user = None
        if payload:
            user_id = payload.get("user_id", None)
        try:
            user_refresh = app.redis_pool.get(f"JWT:{user_id}")
            if user_id is None or (
                    user_refresh is None and "apitoken" not in request.headers
            ):
                raise exceptions.AuthenticationFailed(
                    "Invalid auth token or your refresh token is gone. Login again"
                )
            if user is None:
                user = await app.db_objects.get(operator_query, id=user_id)
                if not user.active:
                    # this allows us to reject apitokens of user that have been deactivated
                    logger.info("User is not active, failing authentication")
                    raise exceptions.AuthenticationFailed("User is not active")
            user_json = user.to_json()
            operationmap = await app.db_objects.execute(
                operatoroperation_query.where(OperatorOperation.operator == user)
            )
            operations = []
            if (
                    user.current_operation is not None
            ):
                links["current_operation"] = user.current_operation.name
            else:
                links["current_operation"] = ""
                user_json["current_operation"] = ""
            for operation in operationmap:
                op = operation.operation
                if op.name == user_json["current_operation"]:
                    user_json["view_mode"] = operation.view_mode
                operations.append(op.name)
            if "view_mode" not in user_json:
                user_json["view_mode"] = "operator"
            admin_operations = await app.db_objects.execute(
                operation_query.where(Operation.admin == user)
            )
            admin_ops = []
            for op in admin_operations:
                admin_ops.append(op.name)
            user_json["ui_config"] = js.loads(user_json["ui_config"])
            # note for @inject_user headers if this is an apitoken or normal login request
            if "apitoken" in request.headers:
                try:
                    token = await app.db_objects.get(
                        apitokens_query,
                        operator=user,
                        token_value=request.headers.get("apitoken"),
                    )
                except Exception as d:
                    raise d
                if not token.active:
                    # allows us to not allow inactive tokens
                    raise exceptions.AuthenticationFailed("Token is no longer active")
                user_json["auth"] = "apitoken"
                user_json["token_type"] = token.token_type
                user_json["apitoken_active"] = token.active
            elif "Authorization" in request.headers:
                user_json["auth"] = "access_token"
            else:
                user_json["auth"] = "cookie"
            return {
                **user_json,
                "user_id": user.id,
                "operations": operations,
                "admin_operations": admin_ops,
            }
        except exceptions.AuthenticationFailed as e:
            msg = "Authentication failed in retrieve_user (user ID: {}). {}"
            logger.info(msg.format(user_id, str(e)))
            raise e
        except Exception as e:
            logger.error("Error in retrieve user: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            raise exceptions.AuthenticationFailed("Auth Error")

    async def store_refresh_token(self, *args, **kwargs):
        return await store_refresh_token(*args, **kwargs)

    async def retrieve_refresh_token(self, user_id, *args, **kwargs):
        try:
            token = app.redis_pool.get(f"JWT:{user_id}")
            return token
        except Exception as e:
            print("no refresh token in retrieve_refresh_token:" + str(e))
            return None


class MyResponses(Responses):
    @staticmethod
    def extend_authenticate(request,
                            user=None,
                            access_token=None,
                            refresh_token=None):
        data = request.json
        if "scripting_version" in data:
            if data["scripting_version"] < valid_restful_scripting_bounds[0] or \
                    data["scripting_version"] > valid_restful_scripting_bounds[1]:
                return {"status": "error", "error": "Scripting version is outside of the allowed bounds. please update"}
        return {"access_token": access_token, "refresh_token": refresh_token,
                "user": user}


async def add_scopes_to_payload(user, *args, **kwargs):
    # return an array of scopes
    scopes = []
    if user["auth"] == "apitoken" and user["token_type"] == "User":
        scopes.append("auth:apitoken_user")
    else:
        scopes.append("auth:user:apitoken_user")
    try:
        dbuser = await app.db_objects.get(operator_query, id=user["user_id"])
    except Exception as e:
        logger.error("Error adding scopes:" + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return []
    try:
        operationsmap = await app.db_objects.execute(
            operatoroperation_query.where(OperatorOperation.operator == dbuser)
        )
        if dbuser.admin:
            scopes.append("admin")
        for map in operationsmap:
            # map is an OperatorOperation object that points to an operator and operation
            # need to get that corresponding operation's name to add to our scope list
            scopes.append(map.operation.name)
        return scopes
    except Exception as e:
        logger.error("Error adding scopes: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return []


async def get_graphql_claims(user_id):
    try:
        user = await app.db_objects.get(operator_query, id=user_id)
        operationmap = await app.db_objects.execute(
            operatoroperation_query.where(OperatorOperation.operator == user)
        )
        operations = []
        admin_ops = []
        user_json = {
            "x-hasura-user-id": str(user.id)
        }
        if user.current_operation is not None:
            user_json["x-hasura-current_operation"] = user.current_operation.name
            user_json["x-hasura-current-operation-id"] = str(user.current_operation.id)
        else:
            user_json["x-hasura-current_operation"] = "null"
        for operation in operationmap:
            op = operation.operation
            if op.name == user_json["x-hasura-current_operation"]:
                user_json["x-hasura-role"] = operation.view_mode
                if op.admin == user:
                    user_json["x-hasura-role"] = "operation_admin"
            operations.append(str(op.id))
            if op.admin == user:
                admin_ops.append(str(op.id))
        if user.admin:
            user_json["x-hasura-role"] = "mythic_admin"
        if "x-hasura-role" not in user_json:
            user_json["x-hasura-role"] = "spectator"
        user_json["x-hasura-operations"] = "{" + ",".join(operations) + "}"
        user_json["x-hasura-admin-operations"] = "{" + ",".join(admin_ops) + "}"
        return user_json
    except Exception as e:
        logger.error("Error adding graphql scopes: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return {}


async def store_refresh_token(user_id, refresh_token, *args, **kwargs):
    try:
        app.redis_pool.set(f"JWT:{user_id}", refresh_token)
    except Exception as e:
        print("exception in storing refresh tokens: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        pass
    return


async def invalidate_refresh_token(user_id):
    try:
        app.redis_pool.delete(f"JWT:{user_id}")
        return
    except Exception as e:
        print("failed to find refresh token")
        return


@mythic.route("/graphql/webhook")
@inject_user()
async def index(request, user):
    user_json = await get_graphql_claims(user["id"])
    # print(user_json)
    return json(user_json)
