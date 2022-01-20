from app import mythic
import app
from app.database_models.model import *
from sanic.response import json
from sanic_jwt.decorators import scoped, inject_user
from fpdf import FPDF, HTMLMixin
import sys
from sanic.exceptions import abort
import ujson as js
from app.crypto import hash_MD5, hash_SHA1
import uuid
import logging
import asyncio
from app.api.operation_api import send_all_operations_message
from pylatex import Document, PageStyle, Head, Foot, MiniPage, Section, Subsection, \
    StandAloneGraphic, MultiColumn, UnsafeCommand, LongTabularx, LargeText, MediumText, \
    LineBreak, NewPage, Tabularx, simple_page_number, Package
from pylatex.utils import bold, NoEscape, escape_latex
from datetime import datetime


# ------- REPORTING-BASED API FUNCTION -----------------
@mythic.route(
    mythic.config["API_BASE"] + "/reporting/full_timeline_pdf", methods=["GET", "POST"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def reporting_full_timeline_api(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # post takes in configuration parameters for how to display the timeline
    # {"output_type": {pdf | csv }, "cmd_output": {true | false}, "strict": {time | task}}
    #  strict refers to if we need to adhere to strict ordering of commands issued, response timings, or nothing
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot generate reports"})
    if user["current_operation"] != "":
        try:
            operation = await app.db_objects.get(operation_query, name=user["current_operation"])
            pdf = PDF()
            pdf.set_author(user["username"])
            pdf.set_title(
                "Operation {}'s Full Timeline Report.pdf".format(
                    user["current_operation"]
                )
            )
            # call to alias_nb_pages allows us refer to total page numbers with {nb} dynamically
            pdf.alias_nb_pages()
            pdf.add_font("FreeSerif", "", "./app/static/FreeSerif.ttf", uni=True)
            pdf.set_font("FreeSerif", "", 20)
            pdf.add_page()
            pdf.set_fill_color(224, 224, 224)
            pdf.cell(
                w=36,
                h=pdf.font_size,
                txt="Timestamp",
                border=0,
                align="C",
                fill=True,
                ln=0,
            )
            pdf.cell(
                w=35, h=pdf.font_size, txt="Host", border=0, align="C", fill=True, ln=0
            )
            pdf.cell(
                w=30, h=pdf.font_size, txt="User", border=0, align="C", fill=True, ln=0
            )
            pdf.cell(
                w=20, h=pdf.font_size, txt="PID", border=0, align="C", fill=True, ln=0
            )
            pdf.cell(
                w=0, h=pdf.font_size, txt="Task", border=0, align="C", fill=True, ln=1
            )
            pdf.set_font("FreeSerif", "", 10)
            pdf.set_fill_color(244, 244, 244)
            data = {}
            data["cmd_output"] = False
            data["strict"] = "task"
            data["artifacts"] = False
            data["attack"] = False
            if request.method == "POST":
                config = request.json
                if "cmd_output" in config:
                    data["cmd_output"] = config["cmd_output"]
                if "strict" in config:
                    data["strict"] = config["strict"]
                if "artifacts" in config:
                    data["artifacts"] = config["artifacts"]
                if "attack" in config:
                    data["attack"] = config["attack"]
            pdf, status = await get_all_data(operation, pdf, data)
            if status["status"] == "success":
                save_path = "./app/files/{}".format(str(uuid.uuid4()))
                operator = await app.db_objects.get(operator_query, username=user["username"])
                filemeta = await app.db_objects.create(
                    FileMeta,
                    total_chunks=1,
                    operation=operation,
                    path=save_path,
                    operator=operator,
                    complete=True,
                    filename="{} Timeline.pdf".format(user["current_operation"]).encode("utf-8"),
                )
                pdf.output(save_path, dest="F")
                filedata = open(save_path, "rb").read()
                filemeta.md5 = await hash_MD5(filedata)
                filemeta.sha1 = await hash_SHA1(filedata)
                await app.db_objects.update(filemeta)
            else:
                return json({"status": "error", "error": status["error"]})
            return json({"status": "success", **filemeta.to_json()})
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            error = "Error in creating report: " + str(e)
            return json({"status": "error", "error": error})

    else:
        error = "Must select a current operation to generate a report"
        return json({"status": "error", "error": error})


async def get_all_data(operation, pdf, config):
    # need to get all callbacks, tasks, responses in a dict with the key being the timestamp
    try:
        all_data = {}
        callbacks = await app.db_objects.execute(
            callback_query.where(Callback.operation == operation).order_by(Callback.id)
        )
        height = pdf.font_size + 1
        for c in callbacks:
            all_data[c.init_callback] = {"callback": c}
            tasks = await app.db_objects.prefetch(
                task_query.where(Task.callback == c), Command.select()
            )
            for t in tasks:
                all_data[t.status_timestamp_preprocessing] = {"task": t}
                if config["attack"]:
                    attacks = await app.db_objects.execute(
                        attacktask_query.where(ATTACKTask.task == t)
                    )
                    attack_list = []
                    for a in attacks:
                        attack_list.append(
                            {"attack": a.attack.t_num, "attack_name": a.attack.name}
                        )
                    all_data[t.status_timestamp_preprocessing]["attack"] = attack_list
                if config["artifacts"]:
                    artifacts = await app.db_objects.execute(
                        taskartifact_query.where(TaskArtifact.task == t)
                    )
                    artifacts_list = []
                    for a in artifacts:
                        artifacts_list.append(a.to_json())
                    all_data[t.status_timestamp_preprocessing][
                        "artifacts"
                    ] = artifacts_list
                if "cmd_output" in config and config["cmd_output"]:
                    responses = await app.db_objects.execute(
                        response_query.where(Response.task == t).order_by(Response.timestamp)
                    )
                    if "strict" in config and config["strict"] == "time":
                        # this will get output as it happened, not grouped with the corresponding command
                        for r in responses:
                            all_data[r.timestamp] = {"response": r}
                    elif "strict" in config and config["strict"] == "task":
                        # this will group output with the corresponding task, like we see it in the operator view
                        response_data = {}
                        for r in responses:
                            response_data[r.timestamp] = {"response": r}
                        # now that it's all grouped together into a dictionary, associate it with the task
                        all_data[t.status_timestamp_preprocessing] = {
                            "task": t,
                            "response": response_data,
                        }
        highlight = False
        for key in sorted(all_data.keys()):
            if "callback" in all_data[key]:
                pdf.set_fill_color(255, 204, 204)
                c = all_data[key]["callback"].to_json()
                pdf.cell(
                    w=36,
                    h=height,
                    txt=c["init_callback"],
                    border=2,
                    align="L",
                    fill=True,
                    ln=0,
                )
                pdf.cell(
                    w=35, h=height, txt=c["host"], border=2, align="C", fill=True, ln=0
                )
                pdf.cell(
                    w=30, h=height, txt=c["user"], border=2, align="C", fill=True, ln=0
                )
                pdf.cell(
                    w=20,
                    h=height,
                    txt=str(c["pid"]),
                    border=2,
                    align="C",
                    fill=True,
                    ln=0,
                )
                output = (
                    "New Callback of type "
                    + all_data[key]["callback"].registered_payload.payload_type.ptype
                    + " with description: "
                    + c["description"]
                )
                if len(output) > 45:
                    pdf.cell(
                        w=0,
                        h=height,
                        txt=output[0:45],
                        border=0,
                        align="L",
                        fill=True,
                        ln=1,
                    )
                    # it's too long to fit on one line, start a new line for it and do a multi-cell
                    pdf.multi_cell(
                        w=0, h=height, txt=output[45:], border=0, align="L", fill=True
                    )
                else:
                    pdf.cell(
                        w=0,
                        h=height,
                        txt=output,
                        border=0,
                        align="L",
                        fill=highlight,
                        ln=1,
                    )
            elif "task" in all_data[key]:
                pdf.set_fill_color(244, 244, 244)
                task = all_data[key]["task"]
                task_json = task.to_json()
                callback = (
                    await app.db_objects.get(callback_query, id=all_data[key]["task"].callback)
                ).to_json()
                pdf.cell(
                    w=36,
                    h=height,
                    txt=task_json["timestamp"],
                    border=0,
                    align="L",
                    fill=highlight,
                    ln=0,
                )
                pdf.cell(
                    w=35,
                    h=height,
                    txt=callback["host"],
                    border=0,
                    align="C",
                    fill=highlight,
                    ln=0,
                )
                pdf.cell(
                    w=30,
                    h=height,
                    txt=callback["user"],
                    border=0,
                    align="C",
                    fill=highlight,
                    ln=0,
                )
                pdf.cell(
                    w=20,
                    h=height,
                    txt=str(callback["pid"]),
                    border=0,
                    align="C",
                    fill=highlight,
                    ln=0,
                )
                if task.command is not None:
                    command = (
                        task.command.cmd
                        + " "
                        + task_json["original_params"]
                        .encode("unicode-escape", errors="backslashreplace")
                        .decode("utf-8", errors="backslash-replace")
                    )
                else:
                    command = (
                        task_json["original_params"]
                        .encode("unicode-escape", errors="backslashreplace")
                        .decode("utf-8", errors="backslash-replace")
                    )
                # print(command)
                if len(command) > 45:
                    pdf.cell(
                        w=0,
                        h=height,
                        txt=command[0:45],
                        border=0,
                        align="L",
                        fill=highlight,
                        ln=1,
                    )
                    # it's too long to fit on one line, start a new line for it and do a multi-cell
                    pdf.multi_cell(
                        w=0,
                        h=pdf.font_size,
                        txt=command[45:],
                        border=0,
                        align="L",
                        fill=highlight,
                    )
                else:
                    pdf.cell(
                        w=0,
                        h=height,
                        txt=command,
                        border=0,
                        align="L",
                        fill=highlight,
                        ln=1,
                    )
                highlight = not highlight
                if "cmd_output" in config and config["cmd_output"]:
                    if "response" in all_data[key]:
                        # this means we're grouping all of the response output with the task
                        for r in sorted(all_data[key]["response"].keys()):
                            r_json = all_data[key]["response"][r]["response"].to_json()
                            pdf.set_fill_color(204, 229, 255)
                            pdf.cell(
                                w=36,
                                h=height,
                                txt=r_json["timestamp"],
                                border=0,
                                align="L",
                                fill=True,
                                ln=1,
                            )
                            try:
                                r_json["response"] = (
                                    r_json["response"]
                                    .encode("unicode-escape", errors="backslashreplace")
                                    .decode("utf-8", errors="backslash-replace")
                                )
                            except Exception as e:
                                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                                r_json[
                                    "response"
                                ] = "[[cannot handle non latin-1 character here]]"
                            pdf.multi_cell(
                                w=0,
                                h=height,
                                txt=r_json["response"],
                                border=0,
                                align="L",
                                fill=True,
                            )
                if "attack" in config and config["attack"]:
                    if "attack" in all_data[key]:
                        for a in all_data[key]["attack"]:
                            pdf.set_fill_color(198, 63, 30)
                            data = a["attack"] + ": " + a["attack_name"]
                            pdf.multi_cell(
                                w=0, h=height, txt=data, border=0, align="L", fill=True
                            )
                if "artifacts" in config and config["artifacts"]:
                    if "artifacts" in all_data[key]:
                        for a in all_data[key]["artifacts"]:
                            pdf.set_fill_color(0, 128, 128)
                            data = (
                                a["artifact_template"] + ": " + a["artifact_instance"]
                            )
                            pdf.multi_cell(
                                w=0, h=height, txt=data, border=0, align="L", fill=True
                            )
            elif "response" in all_data[key]:
                # this means we're doing true time, not grouping all responses with their tasks
                r_json = all_data[key]["response"].to_json()
                pdf.set_fill_color(204, 229, 255)
                pdf.cell(
                    w=38,
                    h=height,
                    txt=r_json["timestamp"],
                    border=0,
                    align="L",
                    fill=True,
                    ln=1,
                )
                try:
                    r_json["response"] = (
                        r_json["response"]
                        .encode("unicode-escape", errors="backslashreplace")
                        .decode("utf-8", errors="backslash-replace")
                    )
                except Exception as e:
                    print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    r_json["response"] = "[[cannot handle non latin-1 character here]]"
                pdf.multi_cell(
                    w=0,
                    h=height,
                    txt=r_json["response"],
                    border=0,
                    align="L",
                    fill=True,
                )
        return pdf, {"status": "success"}
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return pdf, {"status": "error", "error": str(e)}


class PDF(FPDF, HTMLMixin):
    def header(self):
        # Logo
        try:
            title = "Mythic - Timeline"
            # image location, top-left x, top-left y, width (height auto calculated to keep proportions)
            self.image("./app/static/red_blue_login.png", 10, 8, 20)
            # Arial bold 15
            self.set_font("FreeSerif", "", 15)
            # Calculate width of title and position
            w = self.get_string_width(title) + 6
            self.set_x((210 - w) / 2)
            # Colors of frame, background and text
            # Thickness of frame (1 mm)
            self.set_line_width(1)
            # Title
            # last 1 here means that the cell must be filled
            self.cell(w, 9, title, 1, 1, "C", 0)
            # put some line breaks between here and where the rest of the body starts
            self.ln(10)
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))

    # Page footer
    def footer(self):
        try:
            # Position at 1.5 cm from bottom
            self.set_y(-15)
            # Arial italic 8
            self.set_font("FreeSerif", "", 8)
            # Page number
            self.cell(0, 10, "Page " + str(self.page_no()) + "/{nb}", 0, 0, "C")
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))


@mythic.route(
    mythic.config["API_BASE"] + "/reporting/full_timeline_json", methods=["GET", "POST"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_full_timeline_json(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot generate reports"})
    try:
        if user["current_operation"] != "":
            data = {}
            data["cmd_output"] = False
            data["strict"] = "task"
            data["artifacts"] = False
            data["attack"] = False
            if request.method == "POST":
                config = request.json
                if "cmd_output" in config:
                    data["cmd_output"] = config["cmd_output"]
                if "strict" in config:
                    data["strict"] = config["strict"]
                if "artifacts" in config:
                    data["artifacts"] = config["artifacts"]
                if "attack" in config:
                    data["attack"] = config["attack"]
            try:
                operation = await app.db_objects.get(operation_query, name=user["current_operation"])
                all_data = {}
                callbacks = await app.db_objects.prefetch(
                    callback_query.where(Callback.operation == operation).order_by(Callback.id),
                    callbacktoken_query
                )
                for c in callbacks:
                    c_json = c.to_json()
                    all_data[c_json["init_callback"]] = {"callback": c_json}
                    tasks = await app.db_objects.prefetch(
                        task_query.where(Task.callback == c).order_by(Task.id),
                        command_query,
                    )
                    for t in tasks:
                        t_json = t.to_json()
                        if data["attack"]:
                            attacks = await app.db_objects.execute(
                                attacktask_query.where(ATTACKTask.task == t)
                            )
                            attack_list = []
                            for a in attacks:
                                attack_list.append(
                                    {
                                        "attack": a.attack.t_num,
                                        "attack_name": a.attack.name,
                                    }
                                )
                            t_json["attack"] = attack_list
                        if data["artifacts"]:
                            artifacts = await app.db_objects.execute(
                                taskartifact_query.where(TaskArtifact.task == t)
                            )
                            artifacts_list = []
                            for a in artifacts:
                                artifacts_list.append(a.to_json())
                            t_json["artifacts"] = artifacts_list
                        all_data[t_json["status_timestamp_preprocessing"]] = {
                            "task": t_json
                        }
                        if data["cmd_output"]:
                            responses = await app.db_objects.execute(
                                response_query.where(Response.task == t)
                            )
                            if data["strict"] == "time":
                                # this will get output as it happened, not grouped with the corresponding command
                                for r in responses:
                                    r_json = r.to_json()
                                    all_data[r_json["timestamp"]] = {"response": r_json}
                            elif data["strict"] == "task":
                                # this will group output with the corresponding task, like we see it in the operator view
                                response_data = []
                                for r in responses:
                                    r_json = r.to_json()
                                    response_data.append(
                                        {
                                            "response": r_json["response"],
                                            "id": r_json["id"],
                                            "timestamp": r_json["timestamp"],
                                        }
                                    )
                                # now that it's all grouped together into a dictionary, associate it with the task
                                all_data[t_json["status_timestamp_preprocessing"]] = {
                                    "task": t_json,
                                    "responses": response_data,
                                }
                save_path = "./app/files/{}".format(str(uuid.uuid4()))
                operator = await app.db_objects.get(operator_query, username=user["username"])
                filemeta = await app.db_objects.create(
                    FileMeta,
                    total_chunks=1,
                    operation=operation,
                    path=save_path,
                    operator=operator,
                    complete=True,
                    filename="{} Full Timeline.json".format(user["current_operation"]).encode("utf-8"),
                )
                file = open(save_path, "w")
                file.write(js.dumps(all_data, indent=4, sort_keys=True))
                file.close()
                filemeta.md5 = await hash_MD5(js.dumps(all_data))
                filemeta.sha1 = await hash_SHA1(js.dumps(all_data))
                await app.db_objects.update(filemeta)
                return json({"status": "success", **filemeta.to_json()})
            except Exception as e:
                print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                return json({"status": "error", "error": str(e)})
        else:
            return json(
                {
                    "status": "error",
                    "error": "Must select an operation as your current operation",
                }
            )
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": str(e)})


@mythic.route(
    mythic.config["API_BASE"] + "/reporting_webhook", methods=["POST"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def reporting_webhook_generating(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # post takes in configuration parameters for how to display the timeline
    # {"output_type": {pdf | csv }, "cmd_output": {true | false}, "strict": {time | task}}
    #  strict refers to if we need to adhere to strict ordering of commands issued, response timings, or nothing
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot generate reports"})
    if user["current_operation"] != "":
        try:
            parameters = request.json["input"]
            operation = await app.db_objects.get(operation_query, name=user["current_operation"])
            operator = await app.db_objects.get(operator_query, id=user["user_id"])
            asyncio.create_task(generate_report(operation, operator, parameters))
            return json({"status": "success"})
        except Exception as e:
            logging.exception(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            error = "Error in creating report: " + str(e)
            return json({"status": "error", "error": error})
    else:
        error = "Must select a current operation to generate a report"
        return json({"status": "error", "error": error})


class Hyperlink(UnsafeCommand):
    r"""A class representing a stand alone hyperlink."""

    _latex_name = "href"

    packages = [Package('hyperref')]

    _repr_attributes_mapping = {
        "url": "arguments",
        "text": "arguments"
    }

    def __init__(self, url, text, extra_arguments=None):
        r"""
        Args
        ----
        url: str
            The url to link to
        text: str
            The text to display that has the link
        """
        self.escaped_text = escape_latex(text)
        self.escaped_url = escape_latex(url)
        arguments = [self.escaped_url, self.escaped_text]

        super().__init__(command=self._latex_name, arguments=arguments,
                         extra_arguments=extra_arguments)

    def __str__(self):
        return "\\href{" + self.escaped_url + "}{" + self.escaped_text + "}"


class PageBreak(UnsafeCommand):
    r"""A class representing a stand alone page break."""

    _latex_name = "pagebreak"

    packages = []

    _repr_attributes_mapping = {
        "break_options": "options",
    }

    def __init__(self, break_options=None, extra_arguments=None):
        r"""
        Args
        ----
        break_options: int
            Make the page break from a command to a request
        """

        arguments = []

        super().__init__(command=self._latex_name, arguments=arguments, options=break_options,
                         extra_arguments=extra_arguments)


async def generate_report(operation: Operation, operator: Operator, parameters: dict):
    """
    :param operation:
    :param operator:
    :param parameters: this has the following fields:
        excludedUsers: a comma separated list of users to not include
        excludedHosts: a comma separated list of hosts to not include
        excludedIDs: a comma separated list of callback IDs to not include
        outputFormat: the format for the final report ("json", "latex", "pdf")
        includeOutput: boolean indicating if responses should be included or not
        includeMITREPerTask: boolean indicating if MITRE ATT&CK information should be included per task
        includeMITREOverall: boolean indicating if MITRE ATT&CK information should be aggregated at the end of the report
    :return:
    """
    try:
        save_filename = str(uuid.uuid4())
        save_path = "./app/files/{}".format(save_filename)
        all_data = []
        excluded_callback_users = [x.strip().lower() for x in parameters["excludedUsers"].split(",")]
        excluded_callback_hosts = [x.strip().lower() for x in parameters["excludedHosts"].split(",")]
        excluded_callback_ids = [x.strip() for x in parameters["excludedIDs"].split(",")]
        callbacks = await app.db_objects.execute(
            callback_query.where(Callback.operation == operation).order_by(Callback.id)
        )
        for c in callbacks:
            if str(c.id) in excluded_callback_ids:
                continue
            if c.host.lower() in excluded_callback_hosts:
                continue
            if c.user.lower() in excluded_callback_users:
                continue
            # if we get here then this callback is to be included
            callback_data = {"callback": c, "tasks": []}
            tasks = await app.db_objects.prefetch(
                task_query.where(Task.callback == c), Command.select()
            )
            for t in tasks:
                task_data = {"task": t}
                if parameters["includeMITREPerTask"]:
                    attacks = await app.db_objects.execute(
                        attacktask_query.where(ATTACKTask.task == t)
                    )
                    attack_list = []
                    for a in attacks:
                        attack_list.append(
                            {"attack": a.attack.t_num, "attack_name": a.attack.name}
                        )
                    task_data["attack"] = attack_list
                else:
                    task_data["attack"] = []
                if parameters["includeOutput"]:
                    responses = await app.db_objects.execute(
                        response_query.where(Response.task == t).order_by(Response.timestamp)
                    )
                    response_data = [r for r in responses]
                    # now that it's all grouped together into a dictionary, associate it with the task
                    task_data["responses"] = response_data
                else:
                    task_data["responses"] = []
                callback_data["tasks"].append(task_data)
            all_data.append(callback_data)
        if parameters["outputFormat"] == "json":
            # we're done
            for c in all_data:
                c["callback"] = c["callback"].to_json()
                for t in c["tasks"]:
                    t["task"] = t["task"].to_json()
            with open(save_path, "w") as f:
                f.write(js.dumps(all_data))
            filedata = open(save_path, "rb").read()
            filemeta = await app.db_objects.create(
                FileMeta,
                total_chunks=1,
                operation=operation,
                path=save_path,
                operator=operator,
                complete=True,
                comment=f"{operator.username} generated JSON report",
                filename="{} Report.json".format(operation.name).encode("utf-8"),
            )
            filemeta.md5 = await hash_MD5(filedata)
            filemeta.sha1 = await hash_SHA1(filedata)
            await app.db_objects.update(filemeta)
            await send_all_operations_message(level="info", operation=operation, source="generated_report",
                                              message=f"{operator.username} generated a JSON report with UUID: {filemeta.agent_file_id}")
            return
        # set up the header/footers for the LaTeX
        geometry_options = {
            "head": "80.5pt",
            "margin": "0.5in",
            "bottom": "0.6in",
            "includeheadfoot": True
        }
        doc = Document(geometry_options=geometry_options, default_filepath="./app/files/")
        # Generating first page style
        first_page = PageStyle("header")
        # Header image
        with first_page.create(Head("L")) as header_left:
            with header_left.create(MiniPage(width=NoEscape(r"0.49\textwidth"),
                                             pos='c')) as logo_wrapper:
                logo_file = "../static/red_blue_login.png"
                logo_wrapper.append(StandAloneGraphic(image_options="height=80px",
                                                      filename=logo_file))
        # Add document title
        with first_page.create(Head("R")) as right_header:
            with right_header.create(MiniPage(width=NoEscape(r"0.49\textwidth"),
                                              pos='c', align='r')) as title_wrapper:
                title_wrapper.append(LargeText(bold(f"{operation.name} Report")))
                title_wrapper.append(LineBreak())
                title_wrapper.append(MediumText(bold("Date: " + datetime.utcnow().strftime("%Y/%m/%d"))))
        # Add footer
        with first_page.create(Foot("R")) as footer:
            with footer.create(MiniPage(width=NoEscape(r"0.25\textwidth"),
                                              pos='c', align='r')) as footer_wrapper:
                footer_wrapper.append(simple_page_number())
        doc.preamble.append(first_page)
        doc.change_document_style("header")
        doc.add_color(name="rowgray", model="RGB", description="229,228,226")
        # add this manually since it doesn't seem to get added if we do the list comprehension
        doc.packages.append(Package('hyperref'))
        # Add in some generic metadata about the operation
        with doc.create(Section('Assigned Operators')):
            doc.append('The following table lists out all of the operators assigned to the operation and their roles in the assessment.\n')
            with doc.create(Tabularx("p{4cm} p{14cm}")) as data_table:
                data_table.add_row(["Operator",
                                    "Role",],
                                   mapper=bold,
                                   color="lightgray")
                data_table.add_hline()
                operators = await app.db_objects.execute(operatoroperation_query.where(OperatorOperation.operation == operation).order_by(OperatorOperation.view_mode))
                for index, o in enumerate(operators):
                    row = [escape_latex(o.operator.username), o.view_mode]
                    if (index % 2) == 1:
                        data_table.add_row(row, color="rowgray")
                    else:
                        data_table.add_row(row)
        with doc.create(Section('Operation Metrics')):
            doc.append('The following table lists out some metrics for the operation..\n')
            with doc.create(Tabularx("p{4cm} p{14cm}", width_argument=NoEscape(r"\textwidth"))) as data_table:
                data_table.add_row(["Metric",
                                    "Value",],
                                   mapper=bold,
                                   color="lightgray")
                data_table.add_hline()
                compromised_hosts = []
                compromised_users = []
                tasks_issued = 0
                number_of_callbacks = len(all_data)
                number_of_high_integrity = 0
                domains = []
                for c in all_data:
                    if c['callback'].domain == "" or c["callback"].domain == c["callback"].host:
                        compromised_user = f"{c['callback'].host}\{c['callback'].user}"
                        compromised_host = c['callback'].host
                    else:
                        compromised_user = f"{c['callback'].domain}\{c['callback'].user}"
                        compromised_host = f"{c['callback'].domain}\{c['callback'].host}"
                    if compromised_host not in compromised_hosts:
                        compromised_hosts.append(compromised_host)
                    if compromised_user not in compromised_users:
                        compromised_users.append(compromised_user)
                    tasks_issued += len(c['tasks'])
                    if c['callback'].integrity_level > 2:
                        number_of_high_integrity += 1
                    if c['callback'].domain not in domains and c['callback'].domain != "":
                        domains.append(c['callback'].domain)
                data_table.add_row([
                    "Compromised Users",
                    escape_latex("\n".join(compromised_users))
                ])
                data_table.add_row([
                    "Compromised Hosts",
                    escape_latex("\n".join(compromised_hosts))
                ], color="rowgray")
                data_table.add_row([
                    "Total Callbacks",
                    escape_latex(str(number_of_callbacks))
                ])
                data_table.add_row([
                    "Total High Integrity Callbacks",
                    escape_latex(str(number_of_high_integrity))
                ], color="rowgray")
                data_table.add_row([
                    "Total Tasks Issued",
                    escape_latex(str(tasks_issued))
                ])
                data_table.add_row([
                    "Domains Accessed",
                    escape_latex("\n".join(domains))
                ], color="rowgray")
                creds = await app.db_objects.execute(credential_query.where(
                    (Credential.operation == operation) & (Credential.deleted == False)))
                compromised_creds = []
                for c in creds:
                    cred_account = c.realm + "\\" + c.account
                    if cred_account not in compromised_creds:
                        compromised_creds.append(cred_account)
                data_table.add_row([
                    "Credentials Compromised",
                    escape_latex("\n".join(compromised_creds))
                ])

            with doc.create(Tabularx("p{9cm} p{9cm}", width_argument=NoEscape(r"\textwidth"))) as data_table:
                data_table.add_row(["Artifact Generated",
                                    "Instances in operation",],
                                   mapper=bold,
                                   color="lightgray")
                artifacts = await app.db_objects.execute(taskartifact_query.where(
                    (TaskArtifact.operation == operation)
                ))

                artifact_data = {}
                for a in artifacts:
                    if a.artifact.name not in artifact_data:
                        artifact_data[a.artifact.name] = 1
                    else:
                        artifact_data[a.artifact.name] += 1
                should_color = 0
                artifact_data = dict(sorted(artifact_data.items(), key=lambda item: item[1] * -1))
                for a, v in artifact_data.items():
                    if should_color % 2 == 1:
                        data_table.add_row([
                            a, str(v)
                        ], color="rowgray")
                    else:
                        data_table.add_row([
                            a, str(v)
                        ])
                    should_color += 1
        doc.append(PageBreak())
        with doc.create(Section('Operation History')):
            doc.append(
                'The following sections detail all of the callbacks and associated data for the operation. The execution duration field is the time between when the agent requested the task and when the agent stopped sending data for that task.\n')
            for c in all_data:
                c2profiles = await app.db_objects.execute(callbackc2profiles_query.where(CallbackC2Profiles.callback == c["callback"]))
                edges = await app.db_objects.execute(callbackgraphedge_query.where(
                    (( (CallbackGraphEdge.source == c['callback']) & (CallbackGraphEdge.destination != c['callback'])) |
                    ( (CallbackGraphEdge.destination == c['callback']) & (CallbackGraphEdge.source != c['callback']))) &
                      (CallbackGraphEdge.end_timestamp == None)
                ))
                linked_callbacks = [x for x in edges]
                with doc.create(Subsection(f"New Callback {c['callback'].id}")):
                    with doc.create(
                            LongTabularx("p{5cm} p{13cm}", width_argument=NoEscape(r"\textwidth"))) as data_table:
                        data_table.add_row([bold("User: "), escape_latex(f"{c['callback'].user}{'*' if c['callback'].integrity_level > 2 else ''}")])
                        data_table.add_row([bold("Host: "), escape_latex(f"{c['callback'].host}")])
                        data_table.add_row([bold("Domain: "), escape_latex(f"{c['callback'].domain}")])
                        data_table.add_row([bold("PID: "), escape_latex(f"{c['callback'].pid}")])
                        if c['callback'].process_name != "":
                            data_table.add_row([bold("Process Name: "), escape_latex(f"{c['callback'].process_name}")])
                        data_table.add_row([bold("IP"), escape_latex(f"{c['callback'].ip}")])
                        if c["callback"].external_ip != "":
                            data_table.add_row([bold("External IP"), escape_latex(f"{c['callback'].external_ip}")])
                        data_table.add_row([bold("Initial Checkin: "), escape_latex(f"{c['callback'].init_callback.strftime('%m/%d/%Y %H:%M:%S UTC')}")])
                        data_table.add_row([bold("Description: "), escape_latex(f"{c['callback'].description}")])
                        data_table.add_row([bold("C2 Channels: "), escape_latex("\n".join([c.c2_profile.name for c in c2profiles]))])
                        data_table.add_row([bold("Agent Type: "), escape_latex(c['callback'].registered_payload.payload_type.ptype)])
                        if len(linked_callbacks) > 0:
                            linked_messages = []
                            for edge in linked_callbacks:
                                if edge.source.id == c['callback'].id:
                                    linked_messages.append(
                                        f"Callback {edge.source.id} ---{edge.c2_profile.name}---> Callback {edge.destination.id}"
                                    )
                                else:
                                    linked_messages.append(
                                        f"Callback {edge.destination.id} ---{edge.c2_profile.name}---> Callback {edge.source.id}"
                                    )
                            data_table.add_row([bold("Linked Callbacks: "), escape_latex("\n".join(linked_messages))])
                    if parameters["includeMITREPerTask"]:
                        table_spec = "p{5cm} p{11cm} p{2cm}"
                        table_headers = ["Execution Duration", "Task Information", "ATT&CK"]
                    else:
                        table_spec = "p{5cm} p{13cm}"
                        table_headers = ["Execution Duration", "Task Information"]
                    with doc.create(
                            LongTabularx(table_spec, width_argument=NoEscape(r"\textwidth"))) as data_table:
                        data_table.add_row(table_headers, mapper=bold, color="lightgray")
                        data_table.add_hline()
                        data_table.end_table_header()  # make the table header appear on every page
                        entry_count = 0
                        for t in c["tasks"]:
                            # t is dict with task, attack, responses keys
                            if t["task"].status_timestamp_processing:
                                task_start = t["task"].status_timestamp_processing.strftime("%m/%d/%Y %H:%M:%S UTC")
                                task_end = t["task"].timestamp.strftime("%m/%d/%Y %H:%M:%S UTC")
                            else:
                                task_start = "N/A"
                                task_end = "N/A"
                            task_row = [f"Start: {task_start}\nEnd : {task_end}"]
                            task_text = f"{t['task'].command_name} {t['task'].display_params}"
                            task_row.append(escape_latex(task_text))
                            if parameters["includeMITREPerTask"]:
                                link_row = []
                                for a in t["attack"]:
                                    link_row.append(Hyperlink("https://attack.mitre.org/techniques/" + a['attack'].replace(".", "/"), a["attack"]))
                                if len(link_row) == 0:
                                    link_row = ""
                                else:
                                    link_row = "\\newline%\n".join([str(x) for x in link_row])
                                task_row.append(NoEscape(link_row))
                            if (entry_count % 2) == 1:
                                data_table.add_row(task_row, escape=NoEscape, color="rowgray")
                            else:
                                data_table.add_row(task_row, escape=NoEscape)
                            entry_count += 1
                doc.append(PageBreak())
        if parameters["includeMITREOverall"]:
            doc.append(PageBreak())
            with doc.create(Section("MITRE ATT&CK Overview")):
                mitre_license = """LICENSE
The MITRE Corporation (MITRE) hereby grants you a non-exclusive, royalty-free license to use ATT&CK™ for research, development, and commercial purposes. Any copy you make for such purposes is authorized provided that you reproduce MITRE's copyright designation and this license in any such copy.
"© 2018 The MITRE Corporation. This work is reproduced and distributed with the permission of The MITRE Corporation."
DISCLAIMERS
MITRE does not claim ATT&CK enumerates all possibilities for the types of actions and behaviors documented as part of its adversary model and framework of techniques. Using the information contained within ATT&CK to address or cover full categories of techniques will not guarantee full defensive coverage as there may be undisclosed techniques or variations on existing techniques not documented by ATT&CK.
ALL DOCUMENTS AND THE INFORMATION CONTAINED THEREIN ARE PROVIDED ON AN "AS IS" BASIS AND THE CONTRIBUTOR, THE ORGANIZATION HE/SHE REPRESENTS OR IS SPONSORED BY (IF ANY), THE MITRE CORPORATION, ITS BOARD OF TRUSTEES, OFFICERS, AGENTS, AND EMPLOYEES, DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTY THAT THE USE OF THE INFORMATION THEREIN WILL NOT INFRINGE ANY RIGHTS OR ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
    """
                with doc.create(Tabularx("p{3cm} p{3cm} p{12cm}", width_argument=NoEscape(r"\textwidth"))) as data_table:
                    data_table.add_row(["ATT&CK",
                                        "Count",
                                        "Name"],
                                       mapper=bold,
                                       color="lightgray")
                    attack_counts = {}
                    for c in all_data:
                        for t in c["tasks"]:
                            for a in t["attack"]:
                                if a['attack'] not in attack_counts:
                                    attack_counts[a['attack']] = {"name": a['attack_name'], "count": 1}
                                else:
                                    attack_counts[a['attack']]["count"] += 1
                    attack_counts = dict(sorted(attack_counts.items(), key=lambda item: item[1]["count"] * -1))
                    row_index = 1
                    for key, value in attack_counts.items():
                        if row_index % 2 == 0:
                            data_table.add_row([Hyperlink("https://attack.mitre.org/techniques/" + key, key),
                                                value["count"], value["name"]], color="rowgray")
                        else:
                            data_table.add_row([Hyperlink("https://attack.mitre.org/techniques/" + key, key),
                                                value["count"], value["name"]])
                        row_index += 1
                doc.append(mitre_license)

        if parameters["outputFormat"] == "pdf":
            doc.generate_pdf(save_path, clean_tex=True)
            filedata = open(save_path + ".pdf", "rb").read()
            filemeta = await app.db_objects.create(
                FileMeta,
                total_chunks=1,
                operation=operation,
                path=save_path + ".pdf",
                operator=operator,
                complete=True,
                comment=f"{operator.username} generated PDF report",
                filename="{} Report.pdf".format(operation.name).encode("utf-8"),
            )
            filemeta.md5 = await hash_MD5(filedata)
            filemeta.sha1 = await hash_SHA1(filedata)
            await app.db_objects.update(filemeta)
            await send_all_operations_message(level="info", operation=operation,source="generated_report",
                                              message=f"{operator.username} generated a PDF report with UUID: {filemeta.agent_file_id}")
        elif parameters["outputFormat"] == "latex":
            doc.generate_tex(save_path)
            filedata = open(save_path + ".tex", "rb").read()
            filemeta = await app.db_objects.create(
                FileMeta,
                total_chunks=1,
                operation=operation,
                path=save_path + ".tex",
                operator=operator,
                complete=True,
                comment=f"{operator.username} generated PDF report",
                filename="{} Report.tex".format(operation.name).encode("utf-8"),
            )
            filemeta.md5 = await hash_MD5(filedata)
            filemeta.sha1 = await hash_SHA1(filedata)
            await app.db_objects.update(filemeta)
            await send_all_operations_message(level="info", operation=operation, source="generated_report",
                                              message=f"{operator.username} generated a LaTeX report with UUID: {filemeta.agent_file_id}")
        else:
            await send_all_operations_message(level="info", operation=operation,
                                              message=f"{operator.username} tried to generate a report of an unknown type: {parameters['outputFormat']}")
    except Exception as e:
        logging.exception(e)
        await send_all_operations_message(level="error", operation=operation,
                                          message=f"Error generating report: {e}")
