from app import apfell, db_objects, links, use_ssl
from sanic.response import json
from sanic import response
from sanic.exceptions import NotFound
from jinja2 import Environment, PackageLoader
from app.database_models.model import Operator, Operation, OperatorOperation
from app.forms.loginform import LoginForm, RegistrationForm
import datetime
import app.crypto as crypto
from sanic_jwt import BaseEndpoint, utils, exceptions
from sanic_jwt.decorators import protected, inject_user
import json as js

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/")
@inject_user()
@protected()
async def index(request, user):
    template = env.get_template('main_page.html')
    content = template.render(name=user['username'], links=links)
    return response.html(content)


class Login(BaseEndpoint):
    async def get(self, request):
        form = LoginForm(request)
        errors = {}
        errors['username_errors'] = '<br>'.join(form.username.errors)
        errors['password_errors'] = '<br>'.join(form.password.errors)
        template = env.get_template('login.html')
        content = template.render(links=links, form=form, errors=errors)
        return response.html(content)

    async def post(self, request):
        form = LoginForm(request)
        errors = {}
        if form.validate():
            username = form.username.data
            password = form.password.data
            try:
                user = await db_objects.get(Operator, username=username)
                if await user.check_password(password):
                    if not user.active:
                        errors['validate_errors'] = "account is deactivated, cannot log in"
                    else:
                        try:
                            user.last_login = datetime.datetime.now()
                            await db_objects.update(user)  # update the last login time to be now
                            access_token, output = await self.responses.get_access_token_output(
                                request,
                                {'user_id': user.id},
                                self.config,
                                self.instance)
                            refresh_token = await self.instance.auth.generate_refresh_token(request, {'user_id': user.id})
                            output.update({
                                self.config.refresh_token_name(): refresh_token
                            })
                            resp = response.redirect("/")
                            resp.cookies[self.config.cookie_access_token_name()] = access_token
                            resp.cookies[self.config.cookie_access_token_name()]['httponly'] = True
                            resp.cookies[self.config.cookie_refresh_token_name()] = refresh_token
                            resp.cookies[self.config.cookie_refresh_token_name()]['httponly'] = True
                            return resp
                        except Exception as e:
                            print(e)
                            errors['validate_errors'] = "failed to update login time"
                else:
                    errors['validate_errors'] = "Username or password invalid"
            except Exception as e:
                print(e)
        errors['username_errors'] = '<br>'.join(form.username.errors)
        errors['password_errors'] = '<br>'.join(form.password.errors)
        template = env.get_template('login.html')
        content = template.render(links=links, form=form, errors=errors)
        return response.html(content)


class Register(BaseEndpoint):
    async def get(self, request, *args, **kwargs):
        errors = {}
        form = RegistrationForm(request)
        template = env.get_template('register.html')
        content = template.render(links=links, form=form, errors=errors)
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
                user.last_login = datetime.datetime.now()
                await db_objects.update(user)  # update the last login time to be now
                default_operation = await db_objects.get(Operation, name="default")
                # now add the new user to the default operation
                await db_objects.create(OperatorOperation, operator=user, operation=default_operation)
                # generate JWT token to be stored in a cookie
                access_token, output = await self.responses.get_access_token_output(
                    request,
                    {'user_id': user.id},
                    self.config,
                    self.instance)
                refresh_token = await self.instance.auth.generate_refresh_token(request, {'user_id': user.id})
                output.update({
                    self.config.refresh_token_name(): refresh_token
                })
                resp = response.redirect("/")
                resp.cookies[self.config.cookie_access_token_name()] = access_token
                resp.cookies[self.config.cookie_access_token_name()]['httponly'] = True
                resp.cookies[self.config.cookie_refresh_token_name()] = refresh_token
                resp.cookies[self.config.cookie_refresh_token_name()]['httponly'] = True
                return resp
            except:
                # failed to insert into database
                errors['validate_errors'] = "failed to create user"
        errors['token_errors'] = '<br>'.join(form.csrf_token.errors)
        errors['username_errors'] = '<br>'.join(form.username.errors)
        errors['password_errors'] = '<br>'.join(form.password.errors)
        template = env.get_template('register.html')
        content = template.render(links=links, form=form, errors=errors)
        return response.html(content)


class UIRefresh(BaseEndpoint):
    async def get(self, request, *args, **kwargs):
        # go here if we're in the browser and our JWT expires so we can update it and continue on
        payload = self.instance.auth.extract_payload(request, verify=False)
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
@protected()
async def settings(request, user):
    template = env.get_template('settings.html')
    try:
        operator = Operator.get(Operator.username == user['username'])
        if use_ssl:
            content = template.render(links=links, name=user['username'], http="https", ws="wss", op=operator.to_json())
        else:
            content = template.render(links=links, name=user['username'], http="http", ws="ws", op=operator.to_json())
        return response.html(content)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'Failed to find operator'})


@apfell.route("/settings", methods=['PUT'])
@inject_user()
@protected()
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
@protected()
async def logout(request):
    resp = response.redirect("/login")
    del resp.cookies['access_token']
    del resp.cookies['refresh_token']
    return resp


@apfell.exception(NotFound)
async def handler_404(request, exception):
    return json({'error': 'Not Found'}, status=404)


@apfell.middleware('request')
async def reroute_to_login(request):
    # if a browser attempted to go somewhere without a cookie, reroute them to the login page
    if 'access_token' not in request.cookies and 'authorization' not in request.headers:
        if "/login" not in request.path and "/register" not in request.path and "/auth" not in request.path:
            if apfell.config['API_BASE'] not in request.path:
                return response.redirect("/login")


@apfell.middleware('response')
async def reroute_to_refresh(request, resp):
    # if you browse somewhere and get greeted with response.json.get('reasons')[0] and "Signature has expired"
    if resp and resp.status == 403 and resp.content_type == "application/json":
        output = js.loads(resp.body)
        if 'reasons' in output and 'Signature has expired' in output['reasons'][0]:
            # unauthorized due to signature expiring, not invalid auth, redirect to /refresh
            if request.cookies['refresh_token'] and request.cookies['access_token']:
                # auto generate a new
                return response.redirect("/uirefresh")


@apfell.middleware('response')
async def failed_refresh(request, resp):
    # you were redirected to /uirefresh, but your refresh failed (maybe the server restarted?)
    if 'uirefresh' in request.path:
        if resp and resp.status == 401 and resp.content_type == "application/json":
            if request.cookies['refresh_token'] and request.cookies['access_token']:
                newresp = response.redirect("/login")
                del newresp.cookies['access_token']
                del newresp.cookies['refresh_token']
                return newresp


apfell.static('/apfell-dark.png', './app/static/apfell_cropped_dark.png', name='apfell-dark')
apfell.static('/apfell-white.png', './app/static/apfell_cropped.png', name='apfell-white')
apfell.static('/strict_time.png', './app/static/strict_time.png', name='strict_time')
apfell.static('/grouped_output.png', './app/static/grouped_output.png', name='grouped_output')
apfell.static('/no_cmd_output.png', './app/static/no_cmd_output.png', name='no_cmd_output')

# add links to the routes in this file at the bottom
links['index'] = apfell.url_for('index')
links['login'] = links['WEB_BASE'] + "/login"
links['logout'] = apfell.url_for('logout')
links['register'] = links['WEB_BASE'] + "/register"
links['settings'] = apfell.url_for('settings')
