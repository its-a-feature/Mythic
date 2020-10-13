from sanic_jwt import exceptions
from app import db_objects, links
from app.database_models.model import Operation, OperatorOperation
from app.database_models.model import (
    operator_query,
    operation_query,
    operatoroperation_query,
    apitokens_query,
)
import datetime
import json
from sanic_jwt import Authentication, Configuration


from contextlib import contextmanager
from sanic_jwt.cache import to_cache, clear_cache


@contextmanager
def cache_request(request):
    to_cache("_request", request)
    yield
    clear_cache()


refresh_tokens = (
    {}
)  # having this not persist past reboot of the server and forcing re-auth is perfectly fine


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
                print("Failed to decode apitoken")
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
                print("retrieve_user lookup failed in request_kwargs")
                return False, 401, "Auth Error"
            if user["apitoken_active"]:
                return True, 200, "Success"
            else:
                print("Token no longer active")
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
        username = request.json.get("username", None)
        password = request.json.get("password", None)
        if not username or not password:
            raise exceptions.AuthenticationFailed(
                "Must supply both username and password"
            )
        try:
            query = await operator_query()
            user = await db_objects.get(query, username=username)
            # print("in authenticate, the user: " + str(user))
            # user = await db_objects.get(Operator, username=username)
        except Exception as e:
            print("invalid username")
            raise exceptions.AuthenticationFailed("Incorrect username or password")
        if not user.active:
            raise exceptions.AuthenticationFailed("Account is deactivated")
        if await user.check_password(password):
            try:
                user.last_login = datetime.datetime.now()
                await db_objects.update(user)
                # now we have successful authentication, return appropriately
                # print("success authentication")
                return {"user_id": user.id, "username": user.username, "auth": "user"}
            except Exception as e:
                print("failed to update user in authenticate")
                raise exceptions.AuthenticationFailed("Failed to authenticate")
        else:
            print("invalid password")
            raise exceptions.AuthenticationFailed("Incorrect username or password")

    async def retrieve_user(self, request, payload, *args, **kwargs):
        user_id = None
        user = None
        if payload:
            user_id = payload.get("user_id", None)
        try:
            if user_id is None or (
                user_id not in refresh_tokens and "apitoken" not in request.headers
            ):
                raise exceptions.AuthenticationFailed(
                    "Invalid auth token or your refresh token is gone. Login again"
                )
            if user is None:
                query = await operator_query()
                user = await db_objects.get(query, id=user_id)
                if not user.active:
                    # this allows us to reject apitokens of user that have been deactivated
                    print("User is not active, failing authentication")
                    raise exceptions.AuthenticationFailed("User is not active")
            user_json = user.to_json()
            query = await operatoroperation_query()
            operationmap = await db_objects.execute(
                query.where(OperatorOperation.operator == user)
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
            query = await operation_query()
            admin_operations = await db_objects.execute(
                query.where(Operation.admin == user)
            )
            admin_ops = []
            for op in admin_operations:
                admin_ops.append(op.name)
            user_json["ui_config"] = json.loads(user_json["ui_config"])
            # note for @inject_user headers if this is an apitoken or normal login request
            if "apitoken" in request.headers:
                query = await apitokens_query()
                try:
                    token = await db_objects.get(
                        query,
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
            print("got authentication failed in retrieve_user. {}".format(str(e)))
            raise e
        except Exception as e:
            print("Error in retrieve user:" + str(e))
            raise exceptions.AuthenticationFailed("Auth Error")


async def add_scopes_to_payload(user, *args, **kwargs):
    # return an array of scopes
    scopes = []
    if user["auth"] == "apitoken" and user["token_type"] == "C2":
        scopes.append("auth:apitoken_c2")
    elif user["auth"] == "apitoken" and user["token_type"] == "User":
        scopes.append("auth:apitoken_user")
    else:
        scopes.append("auth:user:apitoken_c2:apitoken_user")
    try:
        query = await operator_query()
        dbuser = await db_objects.get(query, id=user["user_id"])
    except Exception as e:
        print(e)
        return []
    try:
        query = await operatoroperation_query()
        operationsmap = await db_objects.execute(
            query.where(OperatorOperation.operator == dbuser)
        )
        if dbuser.admin:
            scopes.append("admin")
        for map in operationsmap:
            # map is an OperatorOperation object that points to an operator and operation
            # need to get that corresponding operation's name to add to our scope list
            scopes.append(map.operation.name)
        return scopes
    except Exception as e:
        print(e)
        return []


async def store_refresh_token(user_id, refresh_token, *args, **kwargs):
    try:
        refresh_tokens[user_id] = refresh_token
    except Exception as e:
        pass
    return


async def retrieve_refresh_token(request, user_id, *args, **kwargs):
    # print("requested refresh token for: " + str(user_id))
    if user_id in refresh_tokens:
        return refresh_tokens[user_id]
    return None


async def invalidate_refresh_token(user_id):
    if user_id in refresh_tokens:
        del refresh_tokens[user_id]
