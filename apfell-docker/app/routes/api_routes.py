from app import apfell, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
import json as js
from sanic_jwt.decorators import scoped, inject_user
from app.routes.routes import respect_pivot

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/apiui/commandlines")
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def apiui_commandline(request, user):
    data = open("./app/api/cli_api.json", 'r').read().replace("API_BASE", apfell.config['API_BASE'])
    api_data = js.loads(data)
    template = env.get_template('apiui_commandlines.html')
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss",
                                  cld=api_data, config=user['ui_config'])
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws",
                                  cld=api_data, config=user['ui_config'])
    return response.html(content)


@apfell.route("/apiui/documentation")
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def apiui_documentation(request, user):
    template = env.get_template('apiui_documentation.html')
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss", config=user['ui_config'])
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws", config=user['ui_config'])
    return response.html(content)


@apfell.route("/apiui/command_help")
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def apiui_command_help(request, user):
    template = env.get_template('apiui_command_help.html')
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss", config=user['ui_config'])
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws", config=user['ui_config'])
    return response.html(content)

# add links to the routes in this file at the bottom
links['apiui_commandlines'] = apfell.url_for('apiui_commandline')
links['apiui_documentation'] = apfell.url_for('apiui_documentation')
links['apiui_command_help'] = apfell.url_for('apiui_command_help')
