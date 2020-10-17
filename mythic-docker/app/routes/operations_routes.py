from app import mythic, links, use_ssl, db_objects
from app.routes.routes import env
from sanic import response
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
import base64
from app.routes.routes import respect_pivot


async def get_scripts(user):
    try:
        scripts_to_add = {}
        browser_scripts = ""
        support_scripts_to_add = {}
        final_support_scripts = ""
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user["username"])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.browserscript_query()
        # get your own scripts
        operator_scripts = await db_objects.execute(
            query.where(
                (db_model.BrowserScript.operator == operator)
                & (db_model.BrowserScript.active == True)
            )
        )
        for s in operator_scripts:
            if s.script != "":
                if s.command is not None:
                    scripts_to_add[s.command.id] = s.script
                else:
                    support_scripts_to_add[s.payload_type.ptype.lower() + "_" + s.name] = (
                        '"'
                        + s.payload_type.ptype.lower()
                        + "_"
                        + s.name
                        + '":'
                        + base64.b64decode(s.script).decode("utf-8")
                        + ","
                    )
                    # final_support_scripts += s.name + ":" + base64.b64decode(s.script).decode('utf-8') + ","
        # get scripts assigned to the operation
        operation_query = await db_model.browserscriptoperation_query()
        operation_scripts = await db_objects.execute(
            operation_query.where(
                db_model.BrowserScriptOperation.operation == operation
            )
        )
        for s in operation_scripts:
            if s.browserscript.script != "":
                if s.browserscript.command is not None:
                    scripts_to_add[s.browserscript.command.id] = (
                        '"' + s.browserscript.script + "'"
                    )  # will overwrite a user script if it existed, which is what we want
                else:
                    support_scripts_to_add[
                        s.browserscript.payload_type.ptype.lower()
                        + "_"
                        + s.browserscript.name
                    ] = (
                        '"'
                        + s.browserscript.payload_type.ptype.lower()
                        + "_"
                        + s.browserscript.name
                        + '":'
                        + base64.b64decode(s.browserscript.script).decode("utf-8")
                        + ","
                    )
                    # final_support_scripts += s.name + ":" + base64.b64decode(s.script).decode('utf-8') + ","
        for s, v in scripts_to_add.items():
            browser_scripts += (
                '"' + str(s) + '":' + base64.b64decode(v).decode("utf-8") + ","
            )
        for s, v in support_scripts_to_add.items():
            final_support_scripts += v
        final_support_scripts = "var support_scripts = {" + final_support_scripts + "}"
        final_support_scripts = base64.b64encode(
            final_support_scripts.encode()
        ).decode()
        browser_scripts = "var browser_scripts = {" + browser_scripts + "}"
        browser_scripts = base64.b64encode(browser_scripts.encode()).decode()
        return browser_scripts, final_support_scripts
    except Exception as e:
        print(e)
        return "", ""


@mythic.route("/callbacks")
@inject_user()
@scoped("auth:user")
async def callbacks(request, user):
    template = env.get_template("callbacks.html")
    browser_scripts, final_support_scripts = await get_scripts(user)
    content = template.render(
        links=await respect_pivot(links, request),
        name=user["username"],
        http="https" if use_ssl else "http",
        ws="wss" if use_ssl else "ws",
        config=user["ui_config"],
        browser_scripts=browser_scripts,
        support_scripts=final_support_scripts,
        view_utc_time=user["view_utc_time"],
    )
    return response.html(content)


@mythic.route("/payload_management", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def payload_management(request, user):
    template = env.get_template("payload_management.html")
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


@mythic.route("/payloadtype_management", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def payloadtype_management(request, user):
    template = env.get_template("payloadtype_management.html")
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


@mythic.route("/analytics", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def analytics(request, user):
    template = env.get_template("analytics.html")
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


@mythic.route("/c2profile_management", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def c2profile_management(request, user):
    template = env.get_template("c2profile_management.html")
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


@mythic.route("/operations_management", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def operations_management(request, user):
    template = env.get_template("operations_management.html")
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


@mythic.route("/screenshots", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def screenshots(request, user):
    template = env.get_template("screenshots.html")
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


@mythic.route("/keylogs", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def keylogs(request, user):
    template = env.get_template("keylogs.html")
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


@mythic.route("/files", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def files(request, user):
    template = env.get_template("files.html")
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


@mythic.route("/credentials", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def credentials(request, user):
    template = env.get_template("credentials.html")
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


@mythic.route("/view_tasks", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def view_tasks(request, user):
    template = env.get_template("view_tasks.html")
    browser_scripts, final_support_scripts = await get_scripts(user)
    content = template.render(
        links=await respect_pivot(links, request),
        name=user["username"],
        http="https" if use_ssl else "http",
        ws="wss" if use_ssl else "ws",
        config=user["ui_config"],
        browser_scripts=browser_scripts,
        support_scripts=final_support_scripts,
        view_utc_time=user["view_utc_time"],
    )
    return response.html(content)


@mythic.route("/tasks/<tid:int>", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def view_shared_task(request, user, tid):
    template = env.get_template("share_task.html")
    browser_scripts, final_support_scripts = await get_scripts(user)
    content = template.render(
        links=await respect_pivot(links, request),
        name=user["username"],
        http="https" if use_ssl else "http",
        ws="wss" if use_ssl else "ws",
        config=user["ui_config"],
        browser_scripts=browser_scripts,
        support_scripts=final_support_scripts,
        tid=tid,
        view_utc_time=user["view_utc_time"],
    )
    return response.html(content)


@mythic.route("/split_callbacks/<cid:int>", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def view_split_callbacks(request, user, cid):
    template = env.get_template("split_callback.html")
    browser_scripts, final_support_scripts = await get_scripts(user)
    content = template.render(
        links=await respect_pivot(links, request),
        name=user["username"],
        http="https" if use_ssl else "http",
        ws="wss" if use_ssl else "ws",
        config=user["ui_config"],
        cid=cid,
        browser_scripts=browser_scripts,
        support_scripts=final_support_scripts,
        view_utc_time=user["view_utc_time"],
    )
    return response.html(content)


@mythic.route("/search", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def search(request, user):
    template = env.get_template("search.html")
    browser_scripts, final_support_scripts = await get_scripts(user)
    content = template.render(
        links=await respect_pivot(links, request),
        name=user["username"],
        http="https" if use_ssl else "http",
        ws="wss" if use_ssl else "ws",
        config=user["ui_config"],
        browser_scripts=browser_scripts,
        support_scripts=final_support_scripts,
        view_utc_time=user["view_utc_time"],
    )
    return response.html(content)


@mythic.route("/web_log", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def web_log(request, user):
    template = env.get_template("web_log.html")
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


@mythic.route("/artifacts_management", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def artifacts_management(request, user):
    template = env.get_template("artifacts_management.html")
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


@mythic.route("/reporting_artifacts", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def reporting_artifacts(request, user):
    template = env.get_template("reporting_artifacts.html")
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


@mythic.route("/manage_browser_scripts", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def manage_browser_scripts(request, user):
    template = env.get_template("browser_scripts.html")
    content = template.render(
        links=await respect_pivot(links, request),
        name=user["username"],
        http="https" if use_ssl else "http",
        ws="wss" if use_ssl else "ws",
        config=user["ui_config"],
        view_utc_time=user["view_utc_time"],
        view_mode=user["view_mode"],
        current_operation=user["current_operation"]
    )
    return response.html(content)


@mythic.route("/live_task_feed", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def live_task_feed(request, user):
    template = env.get_template("live_feed.html")
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


@mythic.route("/live_event_feed", methods=["GET"])
@inject_user()
@scoped("auth:user")
async def live_event_feed(request, user):
    template = env.get_template("live_event_feed.html")
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


# add links to these routes at the bottom
links["callbacks"] = mythic.url_for("callbacks")
links["payload_management"] = mythic.url_for("payload_management")
links["payloadtype_management"] = mythic.url_for("payloadtype_management")
links["analytics"] = mythic.url_for("analytics")
links["c2profile_management"] = mythic.url_for("c2profile_management")
links["operations_management"] = mythic.url_for("operations_management")
links["screenshots"] = mythic.url_for("screenshots")
links["keylogs"] = mythic.url_for("keylogs")
links["files"] = mythic.url_for("files")
links["credentials"] = mythic.url_for("credentials")
links["view_tasks"] = mythic.url_for("view_tasks")
links["artifacts_management"] = mythic.url_for("artifacts_management")
links["reporting_artifacts"] = mythic.url_for("reporting_artifacts")
links["manage_browser_scripts"] = mythic.url_for("manage_browser_scripts")
links["web_log"] = mythic.url_for("web_log")
links["live_feed"] = mythic.url_for("live_task_feed")
links["live_event_feed"] = mythic.url_for("live_event_feed")
links["search"] = mythic.url_for("search")
