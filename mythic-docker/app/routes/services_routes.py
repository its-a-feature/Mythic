from app import mythic, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
from sanic_jwt.decorators import scoped, inject_user
from app.routes.routes import respect_pivot

env = Environment(loader=PackageLoader("app", "templates"), autoescape=True)


@mythic.route("/services/host_file", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def services_host_file(request, user):
    template = env.get_template("services_host_file.html")
    content = template.render(
        links=await respect_pivot(links, request),
        name=user["username"],
        http="https" if use_ssl else "http",
        ws="wss" if use_ssl else "ws",
        config=user["ui_config"],
        view_utc_time=user["view_utc_time"],
        view_mode=user["view_mode"],
    )
    return response.html(content)


# add links to the routes in this file at the bottom
links["services_host_file"] = mythic.url_for("services_host_file")
