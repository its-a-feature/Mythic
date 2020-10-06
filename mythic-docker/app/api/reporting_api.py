from app import mythic, db_objects
from app.database_models.model import *
from sanic.response import json
from sanic_jwt.decorators import scoped, inject_user
from fpdf import FPDF, HTMLMixin
import sys
from sanic.exceptions import abort
import ujson as js
from app.crypto import hash_MD5, hash_SHA1
import uuid


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
            query = await operation_query()
            operation = await db_objects.get(query, name=user["current_operation"])
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
                query = await operator_query()
                operator = await db_objects.get(query, username=user["username"])
                filemeta = await db_objects.create(
                    FileMeta,
                    total_chunks=1,
                    operation=operation,
                    path=save_path,
                    operator=operator,
                    complete=True,
                    filename="{} Timeline.pdf".format(user["current_operation"]),
                )
                pdf.output(save_path, dest="F")
                filedata = open(save_path, "rb").read()
                filemeta.md5 = await hash_MD5(filedata)
                filemeta.sha1 = await hash_SHA1(filedata)
                await db_objects.update(filemeta)
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
        query = await callback_query()
        callbacks = await db_objects.execute(
            query.where(Callback.operation == operation).order_by(Callback.id)
        )
        height = pdf.font_size + 1
        for c in callbacks:
            all_data[c.init_callback] = {"callback": c}
            query = await task_query()
            tasks = await db_objects.prefetch(
                query.where(Task.callback == c), Command.select()
            )
            for t in tasks:
                all_data[t.status_timestamp_preprocessing] = {"task": t}
                if config["attack"]:
                    query = await attacktask_query()
                    attacks = await db_objects.execute(
                        query.where(ATTACKTask.task == t)
                    )
                    attack_list = []
                    for a in attacks:
                        attack_list.append(
                            {"attack": a.attack.t_num, "attack_name": a.attack.name}
                        )
                    all_data[t.status_timestamp_preprocessing]["attack"] = attack_list
                if config["artifacts"]:
                    query = await taskartifact_query()
                    artifacts = await db_objects.execute(
                        query.where(TaskArtifact.task == t)
                    )
                    artifacts_list = []
                    for a in artifacts:
                        artifacts_list.append(a.to_json())
                    all_data[t.status_timestamp_preprocessing][
                        "artifacts"
                    ] = artifacts_list
                if "cmd_output" in config and config["cmd_output"]:
                    query = await response_query()
                    responses = await db_objects.execute(
                        query.where(Response.task == t).order_by(Response.timestamp)
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
                query = await callback_query()
                callback = (
                    await db_objects.get(query, id=all_data[key]["task"].callback)
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
                query = await operation_query()
                operation = await db_objects.get(query, name=user["current_operation"])
                all_data = {}
                query = await callback_query()
                callbacks = await db_objects.execute(
                    query.where(Callback.operation == operation).order_by(Callback.id)
                )
                for c in callbacks:
                    c_json = c.to_json()
                    all_data[c_json["init_callback"]] = {"callback": c_json}
                    query = await task_query()
                    tasks = await db_objects.prefetch(
                        query.where(Task.callback == c).order_by(Task.id),
                        Command.select(),
                    )
                    for t in tasks:
                        t_json = t.to_json()
                        if data["attack"]:
                            query = await attacktask_query()
                            attacks = await db_objects.execute(
                                query.where(ATTACKTask.task == t)
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
                            query = await taskartifact_query()
                            artifacts = await db_objects.execute(
                                query.where(TaskArtifact.task == t)
                            )
                            artifacts_list = []
                            for a in artifacts:
                                artifacts_list.append(a.to_json())
                            t_json["artifacts"] = artifacts_list
                        all_data[t_json["status_timestamp_preprocessing"]] = {
                            "task": t_json
                        }
                        if data["cmd_output"]:
                            query = await response_query()
                            responses = await db_objects.execute(
                                query.where(Response.task == t)
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
                query = await operator_query()
                operator = await db_objects.get(query, username=user["username"])
                filemeta = await db_objects.create(
                    FileMeta,
                    total_chunks=1,
                    operation=operation,
                    path=save_path,
                    operator=operator,
                    complete=True,
                    filename="{} Full Timeline.json".format(user["current_operation"]),
                )
                file = open(save_path, "w")
                file.write(js.dumps(all_data, indent=4, sort_keys=True))
                file.close()
                filemeta.md5 = await hash_MD5(js.dumps(all_data))
                filemeta.sha1 = await hash_SHA1(js.dumps(all_data))
                await db_objects.update(filemeta)
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
