from app import apfell, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
from sanic_jwt.decorators import scoped, inject_user
from app.routes.routes import respect_pivot

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/reporting/full_timeline")
@inject_user()
@scoped('auth:user')
async def ui_full_timeline(request, user):
    template = env.get_template('reporting_full_timeline.html')
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss", config=user['ui_config'])
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws", config=user['ui_config'])
    return response.html(content)


@apfell.route("/reporting/attack_mapping")
@inject_user()
@scoped('auth:user')
async def attack_mappings(request, user):
    template = env.get_template('mitre_attack_mappings.html')
    if use_ssl:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="https", ws="wss", config=user['ui_config'])
    else:
        content = template.render(links=await respect_pivot(links, request), name=user['username'], http="http", ws="ws", config=user['ui_config'])
    return response.html(content)


links['full_timeline'] = apfell.url_for('ui_full_timeline')
links['attack_mapping'] = apfell.url_for('attack_mappings')