from app import apfell, db_objects, links, use_ssl, server_header
from sanic.response import json
from sanic import response
from sanic.exceptions import NotFound, Unauthorized, MethodNotSupported
from jinja2 import Environment, PackageLoader
from app.database_models.model import Operator, Operation, OperatorOperation, ATTACK, Artifact
from app.forms.loginform import LoginForm, RegistrationForm
import datetime
import app.crypto as crypto
from sanic_jwt import BaseEndpoint, utils, exceptions
from sanic_jwt.decorators import scoped, inject_user
import json as js
from ipaddress import ip_address
from app.api.c2profiles_api import register_default_profile_operation
from app.routes.authentication import invalidate_refresh_token
from app.api.payloadtype_api import import_payload_type_func
from app.crypto import create_key_AES256
import app.database_models.model as db_model


env = Environment(loader=PackageLoader('app', 'templates'))


async def respect_pivot(my_links, request):
    # given the links dictionary, update the server_ip and server_port to match what was received
    # this will allow people using pivots (127.0.0.1:8888) to still access things going through to IP:other_port
    updated_links = my_links
    host_field = request.host.split(":")
    if len(host_field) == 1:
        server_ip = host_field[0]
        if request.scheme == "https":
            server_port = 443
        else:
            server_port = 80
    else:
        server_ip = host_field[0]
        server_port = host_field[1]
    updated_links['server_ip'] = server_ip
    updated_links['server_port'] = server_port
    updated_links['login'] = "{}://{}/login".format(request.scheme, request.host)
    updated_links['register'] = "{}://{}/register".format(request.scheme, request.host)
    return updated_links


@apfell.route("/")
@inject_user()
@scoped('auth:user')
async def index(request, user):
    template = env.get_template('main_page.html')
    content = template.render(name=user['username'], links=await respect_pivot(links, request), current_operation=user['current_operation'], config=user['ui_config'])
    return response.html(content)


class Login(BaseEndpoint):
    async def get(self, request):
        form = LoginForm(request)
        errors = {}
        errors['username_errors'] = '<br>'.join(form.username.errors)
        errors['password_errors'] = '<br>'.join(form.password.errors)
        template = env.get_template('login.html')
        content = template.render(links=await respect_pivot(links, request), form=form, errors=errors, config={})
        return response.html(content)

    async def post(self, request):
        form = LoginForm(request)
        errors = {}
        if form.validate():
            username = form.username.data
            password = form.password.data
            try:
                query = await db_model.operator_query()
                user = await db_objects.get(query, username=username)
                if await user.check_password(password):
                    if not user.active:
                        errors['validate_errors'] = "account is deactivated, cannot log in"
                    else:
                        try:
                            user.last_login = datetime.datetime.now()
                            await db_objects.update(user)  # update the last login time to be now
                            access_token, output = await self.responses.get_access_token_output(
                                request,
                                {'user_id': user.id, 'auth': 'cookie'},
                                self.config,
                                self.instance)
                            refresh_token = await self.instance.auth.generate_refresh_token(request, {'user_id': user.id, 'auth': 'cookie'})
                            output.update({
                                self.config.refresh_token_name(): refresh_token
                            })
                            template = env.get_template('login.html')
                            content = template.render(links=await respect_pivot(links, request), form=form, errors=errors, access_token=access_token, refresh_token=refresh_token, config={})
                            resp = response.html(content)
                            # resp = response.redirect("/")
                            resp.cookies[self.config.cookie_access_token_name()] = access_token
                            resp.cookies[self.config.cookie_access_token_name()]['httponly'] = True
                            resp.cookies[self.config.cookie_refresh_token_name()] = refresh_token
                            resp.cookies[self.config.cookie_refresh_token_name()]['httponly'] = True
                            return resp
                        except Exception as e:
                            print("post login error:" + str(e))
                            errors['validate_errors'] = "failed to update login time"
                else:
                    errors['validate_errors'] = "Username or password invalid"
            except Exception as e:
                print(e)
        errors['username_errors'] = '<br>'.join(form.username.errors)
        errors['password_errors'] = '<br>'.join(form.password.errors)
        template = env.get_template('login.html')
        content = template.render(links=await respect_pivot(links, request), form=form, errors=errors, config={})
        return response.html(content)


class Register(BaseEndpoint):
    async def get(self, request, *args, **kwargs):
        errors = {}
        form = RegistrationForm(request)
        template = env.get_template('register.html')
        content = template.render(links=await respect_pivot(links, request), form=form, errors=errors, config={})
        return response.html(content)

    async def post(self, request, *args, **kwargs):
        errors = {}
        form = RegistrationForm(request)
        if form.validate():
            username = form.username.data
            password = await crypto.hash_SHA512(form.password.data)
            # we need to create a new user
            try:
                user = await db_objects.create(Operator, username=username, password=password)
                user.last_login = datetime.datetime.utcnow()
                await db_objects.update(user)  # update the last login time to be now
                # generate JWT token to be stored in a cookie
                access_token, output = await self.responses.get_access_token_output(
                    request,
                    {'user_id': user.id, 'auth': 'cookie'},
                    self.config,
                    self.instance)
                refresh_token = await self.instance.auth.generate_refresh_token(request, {'user_id': user.id, 'auth': 'cookie'})
                output.update({
                    self.config.refresh_token_name(): refresh_token
                })
                # we want to make sure to store access/refresh token in JS before moving into the rest of the app
                template = env.get_template('register.html')
                content = template.render(links=await respect_pivot(links, request), form=form, errors=errors, access_token=access_token,
                                          refresh_token=refresh_token, config={})
                resp = response.html(content)
                resp.cookies[self.config.cookie_access_token_name()] = access_token
                resp.cookies[self.config.cookie_access_token_name()]['httponly'] = True
                resp.cookies[self.config.cookie_refresh_token_name()] = refresh_token
                resp.cookies[self.config.cookie_refresh_token_name()]['httponly'] = True
                return resp
            except Exception as e:
                # failed to insert into database
                print(e)
                errors['validate_errors'] = "Username already exists"
        errors['username_errors'] = '<br>'.join(form.username.errors)
        errors['password_errors'] = '<br>'.join(form.password.errors)
        template = env.get_template('register.html')
        content = template.render(links=await respect_pivot(links, request), form=form, errors=errors, config={})
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
        token = await self.instance.auth.retrieve_refresh_token_from_request(
            request
        )

        if refresh_token != token:
            raise exceptions.AuthenticationFailed()

        access_token, output = await self.responses.get_access_token_output(
            request, user, self.config, self.instance
        )
        redirect_to = request.headers['referer'] if 'referer' in request.headers else "/"
        resp = response.redirect(redirect_to)
        resp.cookies[self.config.cookie_access_token_name()] = access_token
        resp.cookies[self.config.cookie_access_token_name()]['httponly'] = True
        return resp


@apfell.route("/settings", methods=['GET'])
@inject_user()
@scoped('auth:user')
async def settings(request, user):
    template = env.get_template('settings.html')
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        op_json = operator.to_json()
        del op_json['ui_config']
        if use_ssl:
            content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss",
                                      op=op_json, config=user['ui_config'])
        else:
            content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws",
                                      op=op_json, config=user['ui_config'])
        return response.html(content)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'Failed to find operator'})


@apfell.route("/search", methods=['GET'])
@inject_user()
@scoped('auth:user')
async def search(request, user):
    template = env.get_template('search.html')
    try:
        if use_ssl:
            content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss",
                                      config=user['ui_config'])
        else:
            content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws",
                                      config=user['ui_config'])
        return response.html(content)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'Failed to find operator'})


@apfell.route("/settings", methods=['PUT'])
@inject_user()
@scoped('auth:user')
async def settings(request, user):
    data = request.json
    if user['admin']:
        if 'registration' in data:
            apfell.remove_route("/register")
            links['register'] = "#"
            return json({'status': 'success'})
    else:
        return json({'status': 'error', 'error': "Must be admin to change settings."})


@apfell.route("/logout")
@inject_user()
@scoped('auth:user')
async def logout(request, user):
    resp = response.redirect("/login")
    del resp.cookies['access_token']
    del resp.cookies['refresh_token']
    # now actually invalidate tokens
    await invalidate_refresh_token(user['id'])
    return resp


@apfell.exception(NotFound)
async def handler_404(request, exception):
    print(exception)
    return json({'status': 'error', 'error': 'Not Found'})


@apfell.exception(MethodNotSupported)
async def handler_405(request, exception):
    print(exception)
    return json({'status': 'error', 'error': 'Session Expired, refresh'})


@apfell.exception(Unauthorized)
async def handler_403(request, exception):
    return response.redirect("/login")


@apfell.middleware('request')
async def check_ips(request):
    if request.path in ["/login", "/register", "/auth"]:
        ip = ip_address(request.ip)
        for block in apfell.config['WHITELISTED_IPS']:
            if ip in block:
                return
        return json({'error': 'Not Found'}, status=404)


@apfell.middleware('response')
async def reroute_to_refresh(request, resp):
    resp.headers['Server'] = server_header
    # if you browse somewhere and get greeted with response.json.get('reasons')[0] and "Signature has expired"
    if resp and (resp.status == 403 or resp.status == 401) and resp.content_type == "application/json":
        output = js.loads(resp.body)
        if 'reasons' in output and 'Signature has expired' in output['reasons'][0]:
            # unauthorized due to signature expiring, not invalid auth, redirect to /refresh
            if request.cookies['refresh_token'] and request.cookies['access_token']:
                # auto generate a new
                return response.redirect("/uirefresh")
        if 'exception' in output and output['exception'] == "AuthenticationFailed":
            # authentication failed for one reason or another, redirect them to login
            resp = response.redirect("/login")
            del resp.cookies['access_token']
            del resp.cookies['refresh_token']
            return resp


@apfell.listener('before_server_start')
async def setup_initial_info(app, loop):
    await initial_setup()


async def initial_setup():
    # create apfell_admin
    operators = await db_objects.execute(Operator.select())
    if len(operators) != 0:
        print("Users already exist, exiting initial setup early")
        return
    admin, created = await db_objects.get_or_create(Operator, username="apfell_admin", password="E3D5B5899BA81F553666C851A66BEF6F88FC9713F82939A52BC8D0C095EBA68E604B788347D489CC93A61599C6A37D0BE51EE706F405AF5D862947EF8C36A201",
                                   admin=True, active=True)
    print("Created Admin")
    # create default operation
    AES_PSK = await create_key_AES256()
    operation, created = await db_objects.get_or_create(Operation, name='default', admin=admin, complete=False,
                                                        AESPSK=AES_PSK)
    print("Created Operation")
    await db_objects.get_or_create(OperatorOperation, operator=admin, operation=operation)
    print("Registered Admin with the default operation")
    print("Started parsing ATT&CK data...")
    file = open('./app/templates/attack.json', 'r')
    attack = js.load(file)  # this is a lot of data and might take a hot second to load
    for obj in attack['techniques']:
        await db_objects.create(ATTACK, **obj)
    file.close()
    print("Created all ATT&CK entries")
    file = open("./app/templates/artifacts.json", "r")
    artifacts_file = js.load(file)
    for artifact in artifacts_file['artifacts']:
        await db_objects.get_or_create(Artifact, name=artifact['name'], description=artifact['description'])
    file.close()
    print("Created all base artifacts")
    file = open('./app/templates/apfell-jxa.json', 'r')
    apfell_jxa = js.load(file)  # this is a lot of data and might take a hot second to load
    print("parsed apfell-jxa payload file")
    for ptype in apfell_jxa['payload_types']:
        await import_payload_type_func(ptype, admin, operation)
    file.close()
    print("created Apfell-jxa payload")
    file = open('./app/templates/linfell_c.json', 'r')
    linfell_c = js.load(file)  # this is a lot of data and might take a hot second to load
    for ptype in linfell_c['payload_types']:
        await import_payload_type_func(ptype, admin, operation)
    file.close()
    print("created Linfell-c payload")
    file = open('./app/templates/viper.json', 'r')
    viper = js.load(file)  # this is a lot of data and might take a hot second to load
    print("parsed viper payload file")
    for ptype in viper['payload_types']:
        await import_payload_type_func(ptype, admin, operation)
    file.close()
    print("created viper payload")
    await register_default_profile_operation(admin)
    print("Successfully finished initial setup")

# /static serves out static images and files
apfell.static('/static', './app/static')
apfell.static('/favicon.ico', './app/static/favicon.ico')
# / serves out the payloads we wish to host, make user supply a path they want to use, or just use file name
apfell.static('/', './app/payloads/operations/_hosting_dir')
apfell.static('/strict_time.png', './app/static/strict_time.png', name='strict_time')
apfell.static('/grouped_output.png', './app/static/grouped_output.png', name='grouped_output')
apfell.static('/no_cmd_output.png', './app/static/no_cmd_output.png', name='no_cmd_output')
apfell.static('/gear_med.png', './app/static/gear_med.png', name='gear_md')
apfell.static('/add_comment.png', './app/static/add_comment.png', name='add_comment')

# add links to the routes in this file at the bottom
links['index'] = apfell.url_for('index')
links['login'] = links['WEB_BASE'] + "/login"
links['logout'] = apfell.url_for('logout')
links['register'] = links['WEB_BASE'] + "/register"
links['settings'] = apfell.url_for('settings')
links['search'] = apfell.url_for('search')
