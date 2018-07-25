from app import apfell, auth, links, use_ssl
from app.routes.routes import env
from sanic import response


@apfell.route("/callbacks")
@auth.login_required(user_keyword='user')
async def callbacks(request, user):
    template = env.get_template('callbacks.html')
    if use_ssl:
        content = template.render(links=links, name=user.name, http="https", ws="wss")
    else:
        content = template.render(links=links, name=user.name, http="http", ws="ws")
    return response.html(content)

# add links to these routes at the bottom
links['callbacks'] = apfell.url_for('callbacks')
