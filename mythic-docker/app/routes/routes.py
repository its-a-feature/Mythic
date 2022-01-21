from app import (
    mythic,
    links,
    nginx_port,
    listen_port,
    mythic_admin_password,
    mythic_admin_user,
    default_operation_name,
    mythic_db
)
import app
import asyncpg
import redis
from peewee_async import Manager
from sanic.response import json
from sanic import response
from sanic.exceptions import (
    NotFound,
    Unauthorized,
    MethodNotSupported,
    SanicException,
    RequestTimeout,
)
import sys
from jinja2 import Environment, PackageLoader
from app.database_models.model import (
    Operator,
    Operation,
    OperatorOperation,
    ATTACK,
    Artifact,
)
import datetime
import app.crypto as crypto
from sanic_jwt import BaseEndpoint, utils, exceptions
from sanic_jwt.decorators import scoped, inject_user
import ujson as js
from ipaddress import ip_address
from app.routes.authentication import invalidate_refresh_token
import app.database_models.model as db_model
from sanic.log import logger
from uuid import uuid4
import asyncio


env = Environment(loader=PackageLoader("app", "templates"), autoescape=True)


async def respect_pivot(my_links, request):
    # given the links dictionary, update the server_ip and server_port to match what was received
    # this will allow people using pivots (127.0.0.1:8888) to still access things going through to IP:other_port
    updated_links = my_links
    host_field = request.host.split(":")
    if len(host_field) == 1:
        server_ip = host_field[0]
        if 'x-forwarded-port' in request.headers:
            server_port = request.headers["x-forwarded-port"]
        else:
            if request.scheme == "https":
                server_port = nginx_port
            else:
                server_port = listen_port
    else:
        server_ip = host_field[0]
        server_port = host_field[1]
    updated_links["server_ip"] = server_ip
    updated_links["server_port"] = server_port
    updated_links["login"] = "/login"
    return updated_links


async def getSchemes(request):
    if 'x-forwarded-proto' in request.headers:
        if request.headers['x-forwarded-proto'] == "http":
            return {"http": "http", "ws": "ws"}
        else:
            return {"http": "https", "ws": "wss"}
    if request.scheme == "http":
        return {"http": "http", "ws": "ws"}
    else:
        return {"http": "https", "ws": "wss"}


@mythic.route("/")
@inject_user()
@scoped("auth:user")
async def index(request, user):
    template = env.get_template("main_page.html")
    content = template.render(
        name=user["username"],
        links=await respect_pivot(links, request),
        current_operation=user["current_operation"],
        config=user["ui_config"],
        view_utc_time=user["view_utc_time"],
        ** await getSchemes(request)
    )

    return response.html(content)


class Login(BaseEndpoint):
    async def get(self, request):
        error = ""
        template = env.get_template("login.html")
        content = template.render(
            links=await respect_pivot(links, request),
            error=error,
            config={},
            view_utc_time=False,
            ** await getSchemes(request)
        )
        return response.html(content)

    async def post(self, request):
        form = request.form
        error = ""
        username = None
        ip = request.headers["x-real-ip"] if "x-real-ip" in request.headers else request.ip
        from app.api.operation_api import send_all_operations_message
        try:
            username = form["username"][0] if 'username' in form and len(form['username']) > 0 else ""
            password = form["password"][0] if 'password' in form and len(form['password']) > 0 else ""
            user = await app.db_objects.get(db_model.operator_query, username=username)
            if user.id == 1 and user.failed_login_count > 10 and (user.last_failed_login_timestamp
                        > datetime.datetime.utcnow() + datetime.timedelta(seconds=-60)):
                # throttle their attempts to log in to 1 min between checks
                error = "Too many failed login attempts, try again later"
                user.failed_login_count += 1
                user.last_failed_login_timestamp = datetime.datetime.utcnow()
                await app.db_objects.update(user)
                await send_all_operations_message(message=f"Throttling login attempts for {user.username} due to too many failed login attempts\nLast connection from {ip}",
                                                  level="warning", source="throttled_login_" + user.username)
            elif not user.active:
                error = "Account is not active, cannot log in"
                await send_all_operations_message(message=f"Deactivated account {user.username} trying to log in from {ip}",
                                                  level="warning", source="deactivated_login_" + user.username)
            elif await user.check_password(password):
                try:
                    # update the last login time to be now
                    user.last_login = datetime.datetime.utcnow()
                    user.failed_login_count = 0
                    await app.db_objects.update(user)
                    if user.current_operation is not None:
                        # update that operations' event log that the user just signed in
                        await app.db_objects.create(
                            db_model.OperationEventLog,
                            operator=None,
                            operation=user.current_operation,
                            message="{} signed in from {}".format(user.username, ip),
                        )
                    (
                        access_token,
                        output,
                    ) = await self.responses.get_access_token_output(
                        request,
                        {"user_id": user.id, "auth": "cookie"},
                        self.config,
                        self.instance,
                    )
                    refresh_token = (
                        await self.instance.auth.generate_refresh_token(
                            request, {"user_id": user.id, "auth": "cookie"}
                        )
                    )
                    output.update(
                        {self.config.refresh_token_name(): refresh_token}
                    )
                    template = env.get_template("login.html")
                    content = template.render(
                        links=await respect_pivot(links, request),
                        error=error,
                        access_token=access_token,
                        ** await getSchemes(request),
                        refresh_token=refresh_token,
                        config={},
                        view_utc_time=False,
                    )
                    resp = response.html(content)
                    # resp = response.redirect("/")
                    resp.cookies[
                        self.config.cookie_access_token_name()
                    ] = access_token
                    resp.cookies[self.config.cookie_access_token_name()][
                        "httponly"
                    ] = True
                    resp.cookies[self.config.cookie_access_token_name()][
                        "samesite"
                    ] = "strict"
                    resp.cookies[
                        self.config.cookie_refresh_token_name()
                    ] = refresh_token
                    resp.cookies[self.config.cookie_refresh_token_name()][
                        "httponly"
                    ] = True
                    resp.cookies[self.config.cookie_refresh_token_name()][
                        "samesite"
                    ] = "strict"
                    return resp
                except Exception as e:
                    print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    logger.error("post login error:" + str(e))
            else:
                # user exists, but password is wrong
                error = "Username or password invalid"
                user.failed_login_count += 1
                if user.failed_login_count >= 10 and user.active:
                    user.last_failed_login_timestamp = datetime.datetime.utcnow()
                    if user.id != 1:
                        user.active = False
                        await send_all_operations_message(message=f"Deactivating account {user.username} due to too many failed logins.\nLast connection from {ip}",
                                                      level="warning")
                await app.db_objects.update(user)
        except Exception as e:
            if username is not None:
                logger.warning("login error: " + str(e))
                error = "Username or password invalid"
                await send_all_operations_message(message=f"Attempt to login with unknown user: {username}, from {ip}",
                                                  level="warning", source="unknown_login" + ip)
        template = env.get_template("login.html")
        content = template.render(
            links=await respect_pivot(links, request),
            error=error,
            config={},
            view_utc_time=False,
            ** await getSchemes(request)
        )
        return response.html(content)


class UIRefresh(BaseEndpoint):
    async def get(self, request, *args, **kwargs):
        # go here if we're in the browser and our JWT expires so we can update it and continue on
        payload = self.instance.auth.extract_payload(request, verify=True)
        try:
            user = await utils.call(
                self.instance.auth.retrieve_user, request, payload=payload
            )
        except exceptions.MeEndpointNotSetup:
            raise exceptions.RefreshTokenNotImplemented

        user_id = await self.instance.auth._get_user_id(user)
        refresh_token = await utils.call(
            self.instance.auth.retrieve_refresh_token,
            request=request,
            user_id=user_id,
        )
        if isinstance(refresh_token, bytes):
            refresh_token = refresh_token.decode("utf-8")
        token = await self.instance.auth.retrieve_refresh_token_from_request(request)

        if refresh_token != token:
            raise exceptions.AuthenticationFailed()

        access_token, output = await self.responses.get_access_token_output(
            request, user, self.config, self.instance
        )
        redirect_to = (
            request.headers["referer"] if "referer" in request.headers else "/"
        )
        resp = response.redirect(redirect_to)
        resp.cookies[self.config.cookie_access_token_name()] = access_token
        resp.cookies[self.config.cookie_access_token_name()]["httponly"] = True
        return resp


@mythic.route("/settings", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def settings(request, user):
    template = env.get_template("settings.html")
    try:
        content = template.render(
            links=await respect_pivot(links, request),
            name=user["username"],
            ** await getSchemes(request),
            config=user["ui_config"],
            view_utc_time=user["view_utc_time"],
        )
        return response.html(content)
    except Exception as e:
        logger.error(str(e))
        return json({"status": "error", "error": "Failed to find operator"})


@mythic.route("/logout")
@inject_user()
@scoped("auth:user")
async def logout(request, user):
    resp = response.redirect("/login")
    del resp.cookies["access_token"]
    del resp.cookies["refresh_token"]
    operator = await app.db_objects.get(db_model.operator_query, id=user["id"])
    if operator.current_operation is not None:
        await app.db_objects.create(
            db_model.OperationEventLog,
            operator=None,
            operation=operator.current_operation,
            message="{} signed out".format(operator.username),
        )
    # now actually invalidate tokens
    await invalidate_refresh_token(user["id"])
    return resp


@mythic.exception(asyncio.CancelledError)
async def handle_cancellation(request, exception):
    logger.info(
        "Request {} was cancelled".format(str(request))
    )
    return json({"status": "error", "error": "Request was cancelled"}, status=500)


@mythic.exception(NotFound)
async def handler_404(request, exception):
    logger.info(request)
    return json({"status": "error", "error": "Not Found"}, status=404)


@mythic.exception(MethodNotSupported)
async def handler_405(request, exception):
    return json({"status": "error", "error": "Session Expired, refresh"}, status=405)


@mythic.exception(RequestTimeout)
def request_timeout(request, exception):
    return json({"status": "error", "error": "request timeout"})


@mythic.exception(exceptions.AuthenticationFailed)
async def handler_auth_failed(request, exception):
    if "/new" in request.path or "webhook" in request.path or "/auth" in request.path or "/refresh" in request.path:
        return json({"status": "error", "error": "Authentication failed", "message": "access-denied", "code": "access-denied"}, status=401)
    else:
        return response.redirect("/login")


@mythic.exception(Unauthorized)
async def handler_auth_failed(request, exception):
    if "/new" in request.path or "webhook" in request.path or "/auth" in request.path or "/refresh" in request.path:
        return json({"status": "error", "error": "Authentication failed", "message": "Unauthorized", "code": "forbidden"}, status=403)
    else:
        return response.redirect("/login")


@mythic.exception(SanicException)
def catch_all(request, exception):
    logger.exception(
        "Caught random exception within Mythic: {}, {}".format(exception, str(request))
    )
    return json({"status": "error", "error": "Mythic encountered an error"}, status=500)


@mythic.middleware("request")
async def check_ips(request):
    if (
        request.path in ["/login", "/auth", "/"]
        or "/payloads/download/" in request.path
    ):
        ip = ip_address(request.headers["x-real-ip"] if "x-real-ip" in request.headers else request.ip)
        for block in mythic.config["ALLOWED_IPS"]:
            if ip in block:
                return
        return json({"error": "Not Found"}, status=404)


@mythic.middleware("response")
async def add_cors(request, response):
    response.headers["Access-Control-Allow-Headers"] = "authorization,content-type"


@mythic.listener("before_server_start")
async def setup_initial_info(sanic, loop):
    logger.info("setup_initial_info")
    app.db_objects = Manager(mythic_db, loop=loop)
    await mythic_db.connect_async(loop=loop)
    app.db_objects.database.allow_sync = True  # logging.WARNING
    await initial_setup()
    asyncio.create_task(app.api.rabbitmq_api.start_listening())


async def initial_setup():
    # create mythic_admin
    import multiprocessing
    try:
        app.websocket_pool = await asyncpg.create_pool(mythic.config["DB_POOL_ASYNCPG_CONNECT_STRING"],
                                                       max_size=30)
        # redis automatically creates a pool behind the scenes
        app.redis_pool = redis.Redis(host=app.redis_host, port=app.redis_port, db=3)
        # clear the database on start
        keys = app.redis_pool.keys("*")
        for k in keys:
            app.redis_pool.delete(k)
        operators = await app.db_objects.count(Operator.select())
        if operators > 0:
            logger.info("Users already exist, aborting initial install")
            return
        salt = str(uuid4())
        password = await crypto.hash_SHA512(salt + mythic_admin_password)
        try:
            admin, created = await app.db_objects.get_or_create(
                Operator, username=mythic_admin_user, password=password, admin=True, active=True, salt=salt
            )
        except Exception as e:
            print(e)
            return
        logger.info("Created Admin")
        # create default operation
        operation, created = await app.db_objects.get_or_create(
            Operation,
            name=default_operation_name,
            admin=admin,
            complete=False,
        )
        logger.info("Created Operation")
        await app.db_objects.get_or_create(
            OperatorOperation, operator=admin, operation=operation
        )
        admin.current_operation = operation
        await app.db_objects.update(admin)
        logger.info("Registered Admin with the default operation")
        logger.info("Started parsing ATT&CK data...")
        with open("./app/default_files/other_info/attack.json", "r") as file:
            attack = js.load(file)  # this is a lot of data and might take a hot second to load
            for obj in attack["techniques"]:
                await app.db_objects.create(ATTACK,
                                            t_num=obj["t_num"],
                                            name=obj["name"],
                                            os=js.dumps(obj["os"]),
                                            tactic=js.dumps(obj["tactic"]))
        logger.info("Created all ATT&CK entries")
        with open("./app/default_files/other_info/artifacts.json", "r") as file:
            artifacts_file = js.load(file)
            for artifact in artifacts_file["artifacts"]:
                await app.db_objects.get_or_create(
                    Artifact, name=artifact["name"], description=artifact["description"]
                )
        logger.info("Created all base artifacts")
        logger.info("Successfully finished initial setup")
    except Exception as e:
        logger.exception(f"Failed to do initial setup: {str(e)}")
        from app.api.operation_api import send_all_operations_message
        asyncio.create_task(
            send_all_operations_message(
                message=f"Worker failed to initialize:\n {str(e)}",
                level="warning"))


# /static serves out static images and files
mythic.static("/static", "./app/static", name="shared_files")
mythic.static("/favicon.ico", "./app/static/favicon.ico", name="favicon")
mythic.static("/strict_time.png", "./app/static/strict_time.png", name="strict_time")
mythic.static(
    "/grouped_output.png", "./app/static/grouped_output.png", name="grouped_output"
)
mythic.static(
    "/no_cmd_output.png", "./app/static/no_cmd_output.png", name="no_cmd_output"
)
mythic.static("/add_comment.png", "./app/static/add_comment.png", name="add_comment")

# add links to the routes in this file at the bottom
links["index"] = mythic.url_for("index")
links["login"] = links["WEB_BASE"] + "/login"
links["logout"] = mythic.url_for("logout")
links["settings"] = mythic.url_for("settings")
