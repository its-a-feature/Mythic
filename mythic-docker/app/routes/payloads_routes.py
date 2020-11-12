from app import mythic, links, use_ssl
from sanic import response
from jinja2 import Environment, PackageLoader
from sanic_jwt.decorators import scoped, inject_user
from app.routes.routes import respect_pivot

env = Environment(loader=PackageLoader("app", "templates"), autoescape=True)


@mythic.route("/payloads/", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def payloads_creation(request, user):
    template = env.get_template("payloads_creation.html")
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


@mythic.route("/wrappers/", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def wrappers_creation(request, user):
    template = env.get_template("wrappers_creation.html")
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


@mythic.route("/instantiate_c2profile/", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def instantiate_c2profile(request, user):
    template = env.get_template("instantiate_c2profile.html")
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


links["payloads_creation"] = mythic.url_for("payloads_creation")
links["wrappers_creation"] = mythic.url_for("wrappers_creation")
links["instantiate_c2profile"] = mythic.url_for("instantiate_c2profile")
