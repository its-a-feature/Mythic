from app import apfell, links, use_ssl
from app.routes.routes import env
from sanic import response
from sanic_jwt.decorators import protected, inject_user


@apfell.route("/callbacks")
@inject_user()
@protected()
async def callbacks(request, user):
    template = env.get_template('callbacks.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss")
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws")
    return response.html(content)


@apfell.route("/db_management")
@inject_user()
@protected()
async def db_management(request, user):
    template = env.get_template('database_management.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss")
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws")
    return response.html(content)


@apfell.route("/payload_management",methods=['GET'])
@inject_user()
@protected()
async def payload_management(request, user):
    template = env.get_template('payload_management.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss")
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws")
    return response.html(content)


@apfell.route("/analytics", methods=['GET'])
@inject_user()
@protected()
async def analytics(request, user):
    template = env.get_template('analytics.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss")
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws")
    return response.html(content)


@apfell.route("/c2profile_management", methods=['GET'])
@inject_user()
@protected()
async def c2profile_management(request, user):
    template = env.get_template('c2profile_management.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss")
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws")
    return response.html(content)


@apfell.route("/operations_management", methods=['GET'])
@inject_user()
@protected()
async def operations_management(request, user):
    template = env.get_template('operations_management.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss", admin=user['admin'],
                                  current_operation=user['current_operation'])
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws", admin=user['admin'],
                                  current_operation=user['current_operation'])
    return response.html(content)


@apfell.route("/screencaptures", methods=['GET'])
@inject_user()
@protected()
async def screencaptures(request, user):
    template = env.get_template('screencaptures.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss", admin=user['admin'],
                                  current_operation=user['current_operation'])
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws", admin=user['admin'],
                                  current_operation=user['current_operation'])
    return response.html(content)


@apfell.route("/keylogs", methods=['GET'])
@inject_user()
@protected()
async def keylogs(request, user):
    template = env.get_template('keylogs.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss", admin=user['admin'],
                                  current_operation=user['current_operation'])
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws", admin=user['admin'],
                                  current_operation=user['current_operation'])
    return response.html(content)


@apfell.route("/files", methods=['GET'])
@inject_user()
@protected()
async def files(request, user):
    template = env.get_template('files.html')
    if use_ssl:
        content = template.render(links=links, name=user['username'], http="https", ws="wss", admin=user['admin'],
                                  current_operation=user['current_operation'])
    else:
        content = template.render(links=links, name=user['username'], http="http", ws="ws", admin=user['admin'],
                                  current_operation=user['current_operation'])
    return response.html(content)


# add links to these routes at the bottom
links['callbacks'] = apfell.url_for('callbacks')
links['database_management'] = apfell.url_for('db_management')
links['payload_management'] = apfell.url_for('payload_management')
links['analytics'] = apfell.url_for('analytics')
links['c2profile_management'] = apfell.url_for('c2profile_management')
links['operations_management'] = apfell.url_for('operations_management')
links['screencaptures'] = apfell.url_for('screencaptures')
links['keylogs'] = apfell.url_for('keylogs')
links['files'] = apfell.url_for('files')

