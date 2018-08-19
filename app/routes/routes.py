from app import apfell, db_objects, auth, links, use_ssl
from sanic.response import json
from sanic import response
from sanic.exceptions import NotFound, abort
from jinja2 import Environment, PackageLoader
from sanic_auth import User
from app.database_models.model import Operator
from app.forms.loginform import LoginForm, RegistrationForm
import datetime
import app.crypto as crypto


env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/")
@auth.login_required(user_keyword='user')
async def index(request, user):
    template = env.get_template('main_page.html')
    content = template.render(name=user.name, links=links)
    return response.html(content)


@apfell.route("/login", methods=['GET', 'POST'])
async def login(request):
    form = LoginForm(request)
    errors = {}
    if request.method == 'POST' and form.validate():
        username = form.username.data
        password = form.password.data
        try:
            user = await db_objects.get(Operator, username=username)
            if await user.check_password(password):
                try:
                    user.last_login = datetime.datetime.now()
                    await db_objects.update(user)  # update the last login time to be now
                    login_user = User(id=user.id, name=user.username)
                    auth.login_user(request, login_user)
                    return response.redirect("/")
                except Exception as e:
                    print(e)
                    errors['validate_errors'] = "failed to update login time"
        except Exception as e:
            print(e)
            errors['validate_errors'] = "Username or password invalid"
    errors['token_errors'] = '<br>'.join(form.csrf_token.errors)
    errors['username_errors'] = '<br>'.join(form.username.errors)
    errors['password_errors'] = '<br>'.join(form.password.errors)
    template = env.get_template('login.html')
    content = template.render(links=links, form=form, errors=errors)
    return response.html(content)


@apfell.route("/register", methods=['GET', 'POST'])
async def register(request):
    errors = {}
    form = RegistrationForm(request)
    if request.method == 'POST' and form.validate():
        username = form.username.data
        password = await crypto.hash_SHA512(form.password.data)
        # we need to create a new user
        try:
            user = await db_objects.create(Operator, username=username, password=password)
            user.last_login = datetime.datetime.now()
            await db_objects.update(user)  # update the last login time to be now
            login_user = User(id=user.id, name=user.username)
            auth.login_user(request, login_user)
            return response.redirect("/")
        except:
            # failed to insert into database
            errors['validate_errors'] = "failed to create user"
    errors['token_errors'] = '<br>'.join(form.csrf_token.errors)
    errors['username_errors'] = '<br>'.join(form.username.errors)
    errors['password_errors'] = '<br>'.join(form.password.errors)
    template = env.get_template('register.html')
    content = template.render(links=links, form=form, errors=errors)
    return response.html(content)


@apfell.route("/settings", methods=['GET'])
@auth.login_required(user_keyword='user')
async def settings(request, user):
    template = env.get_template('settings.html')
    try:
        operator = Operator.get(Operator.username == user.name)
        if use_ssl:
            content = template.render(links=links, name=user.name, http="https", ws="wss", op=operator.to_json())
        else:
            content = template.render(links=links, name=user.name, http="http", ws="ws", op=operator.to_json())
        return response.html(content)
    except Exception as e:
        print(e)
        return abort(404)



@apfell.route("/logout")
@auth.login_required
async def logout(request):
    auth.logout_user(request)
    return response.redirect('/login')


@apfell.exception(NotFound)
async def handler_404(request, exception):
    return json({'error': 'Not Found'})


# add links to the routes in this file at the bottom
links['index'] = apfell.url_for('index')
links['login'] = apfell.url_for('login')
links['logout'] = apfell.url_for('logout')
links['register'] = apfell.url_for('register')
links['settings'] = apfell.url_for('settings')
