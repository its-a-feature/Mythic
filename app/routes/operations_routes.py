from app import apfell, auth, links
from app.routes.routes import env
from sanic import response


@apfell.route("/callbacks")
@auth.login_required(user_keyword='user')
async def callbacks(request, user):
    template = env.get_template('callbacks.html')
    content = template.render(links=links, name=user.name)
    return response.html(content)

# add links to these routes at the bottom
links['callbacks'] = apfell.url_for('callbacks')
