from app import apfell, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
from sanic_jwt.decorators import protected, inject_user

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/attacks/host_file", methods=['GET'])
@inject_user()
@protected()
async def attacks_host_file(request, user):
    template = env.get_template('attacks_host_file.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss")
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws")
    return response.html(content)

# add links to the routes in this file at the bottom
links['attacks_host_file'] = apfell.url_for('attacks_host_file')
