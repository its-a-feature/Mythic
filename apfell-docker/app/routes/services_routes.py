from app import apfell, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
from sanic_jwt.decorators import scoped, inject_user
from app.routes.routes import respect_pivot

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/services/host_file", methods=['GET'])
@inject_user()
@scoped('auth:user')
async def services_host_file(request, user):
    template = env.get_template('services_host_file.html')
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss", config=user['ui_config'])
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws", config=user['ui_config'])
    return response.html(content)

# add links to the routes in this file at the bottom
links['services_host_file'] = apfell.url_for('services_host_file')
