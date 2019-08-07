from app import apfell, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
from sanic_jwt.decorators import scoped, inject_user
from app.routes.routes import respect_pivot
env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/payloads/", methods=['GET'])
@inject_user()
@scoped('auth:user')
async def payloads_creation(request, user):
    template = env.get_template('payloads_creation.html')
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss", config=user['ui_config'])
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws", config=user['ui_config'])
    return response.html(content)


@apfell.route("/instantiate_c2profile/", methods=['GET'])
@inject_user()
@scoped('auth:user')
async def instantiate_c2profile(request, user):
    template = env.get_template('instantiate_c2profile.html')
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss", config=user['ui_config'])
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws", config=user['ui_config'])
    return response.html(content)

links['payloads_creation'] = apfell.url_for('payloads_creation')
links['instantiate_c2profile'] = apfell.url_for('instantiate_c2profile')
