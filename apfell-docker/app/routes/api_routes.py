from app import apfell, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
from sanic_jwt.decorators import scoped, inject_user
from app.routes.routes import respect_pivot
import urllib.parse

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/apiui/command_help")
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def apiui_command_help(request, user):
    template = env.get_template('apiui_command_help.html')
    if len(request.query_args) != 0:
        data = urllib.parse.unquote(request.query_args[0][1])
        print(data)
    else:
        data = ""
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https",
                                  ws="wss", config=user['ui_config'], view_utc_time=user['view_utc_time'], agent=data)
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http",
                                  ws="ws", config=user['ui_config'], view_utc_time=user['view_utc_time'], agent=data)
    return response.html(content)

# add links to the routes in this file at the bottom
links['apiui_command_help'] = apfell.url_for('apiui_command_help')
