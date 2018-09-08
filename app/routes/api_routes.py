from app import apfell, links
from sanic import response
from jinja2 import Environment, PackageLoader
import json as js
from sanic_jwt.decorators import protected, inject_user

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/apiui/commandlines")
@inject_user()
@protected()
async def apiui_commandline(request, user):
    data = open("./app/api/cli_api.json", 'r').read().replace("API_BASE", apfell.config['API_BASE'])
    api_data = js.loads(data)
    template = env.get_template('apiui_commandlines.html')
    content = template.render(name=user['username'], links=links, cld=api_data)
    return response.html(content)


@apfell.route("/apiui/documentation")
@inject_user()
@protected()
async def apiui_documentation(request, user):
    template = env.get_template('apiui_documentation.html')
    content = template.render(name=user['username'], links=links)
    return response.html(content)


@apfell.route("/apiui/apfell_jxa")
@inject_user()
@protected()
async def apiui_apfell_jxa(request, user):
    data = open("./app/templates/default_commands.json", 'r').read()
    json_data = js.loads(data)
    template = env.get_template('apiui_apfell-jxa.html')
    content = template.render(name=user['username'], links=links, cmd=json_data)
    return response.html(content)

# add links to the routes in this file at the bottom
links['apiui_commandlines'] = apfell.url_for('apiui_commandline')
links['apiui_documentation'] = apfell.url_for('apiui_documentation')
links['apiui_apfell_jxa'] = apfell.url_for('apiui_apfell_jxa')
