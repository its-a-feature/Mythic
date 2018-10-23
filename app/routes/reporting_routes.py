from app import apfell, db_objects, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
from sanic_jwt.decorators import protected, inject_user

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/reporting/full_timeline")
@inject_user()
@protected()
async def ui_full_timeline(request, user):
    template = env.get_template('reporting_full_timeline.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss")
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws")
    return response.html(content)

links['full_timeline'] = apfell.url_for('ui_full_timeline')