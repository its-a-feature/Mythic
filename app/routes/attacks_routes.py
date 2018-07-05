from app import apfell, auth, links
from sanic import response
from jinja2 import Environment, PackageLoader

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/attacks/host_file", methods=['GET'])
@auth.login_required(user_keyword='user')
async def attacks_host_file(request, user):
    template = env.get_template('attacks_host_file.html')
    content = template.render(name=user.name, links=links)
    return response.html(content)

# add links to the routes in this file at the bottom
links['attacks_host_file'] = apfell.url_for('attacks_host_file')
