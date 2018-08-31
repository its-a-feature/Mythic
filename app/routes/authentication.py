from sanic_jwt import exceptions
from app import db_objects
from app.database_models.model import Operator
import datetime

refresh_tokens = {}  # having this not persist past reboot of the server and forcing re-auth is perfectly fine


# defaults to /auth
async def authenticate(request):
    username = request.json.get("username", None)
    password = request.json.get("password", None)
    if not username or not password:
        raise exceptions.AuthenticationFailed("Must supply both username and password")
    try:
        user = await db_objects.get(Operator, username=username)
    except Exception as e:
        print("invalid username")
        raise exceptions.AuthenticationFailed("Incorrect username or password")
    if await user.check_password(password):
        try:
            user.last_login = datetime.datetime.now()
            await db_objects.update(user)
            # now we have successful authentication, return appropriately
            print("success authentication")
            return {'user_id': user.id, 'username': user.username}
        except Exception as e:
            print("failed to update user in authenticate")
            raise exceptions.AuthenticationFailed("Failed to authenticate")
    else:
        print("invalid password")
        raise exceptions.AuthenticationFailed("Incorrect username or password")


# defaults to /me
async def retrieve_user(request, payload, *args, **kwargs):
    user_id = None
    if payload:
        user_id = payload.get('user_id', None)
    try:
        user = await db_objects.get(Operator, id=user_id)
        user_json = user.to_json()
        return {**user_json, "user_id": user.id}
    except Exception as e:
        print("failed to get user in retrieve_user")
        return {}


async def add_scopes_to_payload(user, *args, **kwargs):
    # return an array of scopes
    try:
        user = await db_objects.get(Operator, id=user['user_id'])
    except Exception as e:
        print(e)
        return ['']
    if user.admin:
        return ['admin']
    else:
        return ['user']


async def store_refresh_token(user_id, refresh_token, *args, **kwargs):
    refresh_tokens[user_id] = refresh_token
    return


async def retrieve_refresh_token(request, user_id, *args, **kwargs):
    # print("requested refresh token for: " + str(user_id))
    if user_id in refresh_tokens:
        return refresh_tokens[user_id]