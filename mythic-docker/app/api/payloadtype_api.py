from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import (
    PayloadType,
    Command,
    CommandParameters,
    ATTACKCommand,
    PayloadTypeC2Profile,
)
from sanic_jwt.decorators import scoped, inject_user
import shortuuid
import datetime
import app.database_models.model as db_model
from sanic.exceptions import abort
from sanic.log import logger
from peewee import fn
import shortuuid
from app.api.rabbitmq_api import send_pt_rabbitmq_message
import ujson as js


# payloadtypes aren't inherent to an operation
@mythic.route(mythic.config["API_BASE"] + "/payloadtypes/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_payloadtypes(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] == "":
        return json({"status": "error", "error": "Must be part of an operation to view this"})
    query = await db_model.payloadtype_query()
    wrapquery = await db_model.wrappedpayloadtypes_query()
    payloads = await db_objects.prefetch(
        query.where(db_model.PayloadType.deleted == False),
        db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False)
    )
    pt_c2_query = await db_model.payloadtypec2profile_query()
    plist = []
    wrappers = []
    for pt in payloads:
        build_query = await db_model.buildparameter_query()
        build_params = await db_objects.execute(
            build_query.where(
                (db_model.BuildParameter.payload_type == pt)
                & (db_model.BuildParameter.deleted == False)
            )
        )
        pt_json = pt.to_json()
        # pt_json["build_parameters"] = [bp.to_json() for bp in build_params]
        if pt.wrapper:
            wrapped_types = await db_objects.execute(
                wrapquery.where(db_model.WrappedPayloadTypes.wrapper == pt)
            )
            wrappers.append(
                {**pt_json, "wrapped": [w.to_json() for w in wrapped_types]}
            )
        else:
            # get the list of c2 profiles the payload supports
            pt_c2 = await db_objects.execute(
                pt_c2_query.where(db_model.PayloadTypeC2Profile.payload_type == pt)
            )
            pt_json["c2_profiles"] = []
            for c2 in pt_c2:
                pt_json["c2_profiles"].append(c2.c2_profile.to_json())
            plist.append(pt_json)
    return json({"payloads": plist, "wrappers": wrappers})


@mythic.route(mythic.config["API_BASE"] + "/payloadtypes/<ptype:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_payloadtype(request, user, ptype):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["current_operation"] == "":
            return json({"status": "error", "error": "Must be part of an operation to view this"})
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.prefetch(query.where(db_model.PayloadType.id == ptype),
                                                db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False))
        payloadtype = payloadtype[0]
        # get the list of c2 profiles the payload supports
        pt_c2_query = await db_model.payloadtypec2profile_query()
        pt_c2 = await db_objects.execute(
            pt_c2_query.where(db_model.PayloadTypeC2Profile.payload_type == payloadtype)
        )
        c2_profiles = []
        for c2 in pt_c2:
            c2_profiles.append(c2.c2_profile.to_json())
    except Exception as e:
        return json({"status": "error", "error": "failed to find payload type"})
    return json(
        {
            "status": "success",
            **payloadtype.to_json(),
            "c2_profiles": c2_profiles,
        }
    )


@mythic.route(mythic.config["API_BASE"] + "/payloadtypes/<ptype:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_one_payloadtype(request, user, ptype):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["current_operation"] == "":
            return json({"status": "error", "error": "Not part of an operation"})
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, id=ptype)
        data = request.json
        if "container_running" in data:
            payloadtype.container_running = data["container_running"]
            await db_objects.update(payloadtype)
    except Exception as e:
        return json({"status": "error", "error": "failed to find payload type"})
    return json({"status": "success", **payloadtype.to_json()})


# payloadtypes aren't inherent to an operation
@mythic.route(
    mythic.config["API_BASE"] + "/payloadtypes/<ptype:int>", methods=["DELETE"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_one_payloadtype(request, user, ptype):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, id=ptype)
    except Exception as e:
        return json({"status": "error", "error": "failed to find payload type"})
    if user["admin"]:
        # only delete a payload type if you created it or if you're an admin
        try:
            payloadtype_json = payloadtype.to_json()
            payloadtype.deleted = True
            payloadtype.ptype = str(shortuuid.uuid()) + "-" + payloadtype.ptype
            await db_objects.update(payloadtype)
            query = await db_model.payloadtypec2profile_query()
            mapping = await db_objects.execute(
                query.where(db_model.PayloadTypeC2Profile.payload_type == payloadtype)
            )
            for m in mapping:
                await db_objects.delete(m)
            return json({"status": "success", **payloadtype_json})
        except Exception as e:
            logger.exception("exception in delete_one_payloadtype")
            return json(
                {"status": "error", "error": "failed to delete payloadtype. " + str(e)}
            )
    else:
        return json(
            {"status": "error", "error": "you must be admin to delete payload types"}
        )


# get all the commands associated with a specific payload_type
@mythic.route(
    mythic.config["API_BASE"] + "/payloadtypes/<ptype:int>/commands", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_commands_for_payloadtype(request, user, ptype):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["current_operation"] == "":
        return json({"status": "error", "error": "Must be part of a current operation to see this"})
    try:
        query = await db_model.payloadtype_query()
        payloadtype = await db_objects.get(query, id=ptype)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to get payload type"})
    query = await db_model.command_query()
    commands = await db_objects.execute(
        query.where(
            (Command.payload_type == payloadtype) & (Command.deleted == False)
        ).order_by(Command.cmd)
    )
    all_commands = []
    for cmd in commands:
        query = await db_model.commandparameters_query()
        params = await db_objects.execute(query.where(CommandParameters.command == cmd))
        all_commands.append({**cmd.to_json(), "params": [p.to_json() for p in params]})
    status = {"status": "success"}
    return json({**status, "commands": all_commands})


@mythic.route(
    mythic.config["API_BASE"] + "/payloadtypes/<ptype:int>/files/sync", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def sync_container_file_for_payload_type(request, ptype, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json({"status": "error", "error": "Spectators cannot sync files"})
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, id=ptype)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find C2 Profile"})
    try:
        status = await send_pt_rabbitmq_message(
            payload_type.ptype, "sync_classes", "", user["username"]
        )
        return json(status)
    except Exception as e:
        return json({"status": "error", "error": "failed finding the file: " + str(e)})


async def import_payload_type_func(ptype, operator):
    new_payload = False
    try:
        #print(ptype)
        if "author" not in ptype:
            ptype["author"] = operator.username if operator is not None else ""
        if "note" not in ptype:
            ptype["note"] = ""
        if "ptype" not in ptype or ptype["ptype"] == "":
            return {"status": "error", "error": "payload type must not be empty"}
        ptquery = await db_model.payloadtype_query()
        build_param_query = await db_model.buildparameter_query()
        try:
            payload_type = await db_objects.prefetch(ptquery.where(db_model.PayloadType.ptype == ptype["ptype"]), build_param_query)
            payload_type = payload_type[0]
            payload_type.wrapper = ptype["wrapper"]
            payload_type.supported_os = ptype["supported_os"]
            payload_type.file_extension = ptype["file_extension"]
            payload_type.author = ptype["author"]
            payload_type.note = ptype["note"]
            payload_type.supports_dynamic_loading = ptype[
                "supports_dynamic_loading"
            ]
        except Exception as e:
            new_payload = True
            payload_type = await db_objects.create(
                PayloadType,
                ptype=ptype["ptype"],
                wrapper=ptype["wrapper"],
                supported_os=ptype["supported_os"],
                file_extension=ptype["file_extension"],
                author=ptype["author"],
                note=ptype["note"],
                supports_dynamic_loading=ptype["supports_dynamic_loading"],
            )
        if not ptype["wrapper"]:
            # now deal with all of the wrapped payloads mentioned
            wrapper_query = await db_model.wrappedpayloadtypes_query()
            # get the list of wrapper combinations associated with the current payload type
            current_wrapped = await db_objects.execute(
                wrapper_query.where(
                    db_model.WrappedPayloadTypes.wrapped == payload_type
                )
            )
            # current_wrapped has list of wrapper->this_payload_type that currently exist in Mythic
            for cw in current_wrapped:
                found = False
                # ptype["wrapped"] is a list of wrappers we support
                for ptw in ptype["wrapped"]:
                    if ptw == cw.wrapper.ptype:
                        ptype["wrapped"].remove(ptw)
                        found = True
                        break
                # if we get here, then there was a wrapping that's not supported anymore
                if not found:
                    await db_objects.delete(cw)
            # if there's anything left in ptype['wrapped'], then we need to try to add them
            for ptw in ptype["wrapped"]:
                try:
                    wrapped = await db_objects.get(ptquery, ptype=ptw)
                    await db_objects.create(
                        db_model.WrappedPayloadTypes,
                        wrapper=wrapped,
                        wrapped=payload_type,
                    )
                except Exception as e:
                    print(e)
                    pass
        try:
            payload_type.creation_time = datetime.datetime.utcnow()
            await db_objects.update(payload_type)
            # create any TransformCode entries as needed,just keep track of them
            if "build_parameters" in ptype:
                query = await db_model.buildparameter_query()
                current_params = await db_objects.execute(
                    query.where(
                        (db_model.BuildParameter.payload_type == payload_type)
                        & (db_model.BuildParameter.deleted == False)
                    )
                )
                build_param_dict = {b.name: b for b in current_params}
                for bp in ptype["build_parameters"]:
                    if bp["name"] == "":
                        continue
                    try:
                        buildparam = await db_objects.get(
                            query,
                            payload_type=payload_type,
                            name=bp["name"],
                            deleted=False,
                        )
                        buildparam.parameter_type = bp["parameter_type"]
                        buildparam.description = bp["description"]
                        buildparam.required = bp["required"]
                        buildparam.verifier_regex = bp["verifier_regex"]
                        buildparam.parameter = bp["parameter"]
                        await db_objects.update(buildparam)
                        build_param_dict.pop(bp["name"], None)
                    except Exception as e:
                        await db_objects.create(
                            db_model.BuildParameter,
                            payload_type=payload_type,
                            name=bp["name"],
                            parameter_type=bp["parameter_type"],
                            description=bp["description"],
                            required=bp["required"],
                            verifier_regex=bp["verifier_regex"],
                            parameter=bp["parameter"],
                        )
                for k, v in build_param_dict.items():
                    v.deleted = True
                    await db_objects.update(v)
            # go through support scripts and add as necessary
            # first find all that currently exist
            browserscriptquery = await db_model.browserscript_query()
            operator_query = await db_model.operator_query()
            support_scripts_db = await db_objects.execute(browserscriptquery.where(
                (db_model.BrowserScript.payload_type == payload_type) &
                (db_model.BrowserScript.command == None) &
                (db_model.BrowserScript.operator == None)
            ))
            support_scripts = {s.name: s for s in support_scripts_db}
            if "support_scripts" in ptype:
                for support_script in ptype["support_scripts"]:
                    support_scripts.pop(support_script["name"], None)
                    try:
                        # first update the base case,then loop through operators
                        script = await db_objects.get(
                            browserscriptquery,
                            name=support_script["name"],
                            payload_type=payload_type,
                            command=None,
                            operator=None,
                        )
                        script.container_version = support_script["script"]
                        script.script = support_script["script"]
                        script.container_version_author = support_script["author"]
                        script.author = support_script["author"]
                        await db_objects.update(script)
                    except Exception as e:
                        await db_objects.create(
                            db_model.BrowserScript,
                            name=support_script["name"],
                            script=support_script["script"],
                            container_version=support_script["script"],
                            payload_type=payload_type,
                            author=support_script["author"],
                            container_version_author=support_script["author"],
                            command=None,
                            operator=None
                        )
                    # now loop through all users
                    operators = await db_objects.execute(
                        operator_query.where(db_model.Operator.deleted == False)
                    )
                    for op in operators:
                        try:
                            # first update the base case,then loop through operators
                            script = await db_objects.get(
                                browserscriptquery,
                                name=support_script["name"],
                                payload_type=payload_type,
                                operator=op,
                                command=None
                            )
                            script.container_version = support_script["script"]
                            script.container_version_author = support_script["author"]
                            if not script.user_modified:
                                script.script = support_script["script"]
                                script.author = support_script["author"]
                            await db_objects.update(script)
                        except Exception as e:
                            await db_objects.create(
                                db_model.BrowserScript,
                                name=support_script["name"],
                                script=support_script["script"],
                                container_version=support_script["script"],
                                operator=op,
                                payload_type=payload_type,
                                author=support_script["author"],
                                container_version_author=support_script["author"],
                                command=None
                            )
            # if there's anything left in support_scripts, we need to delete them
            for k,v in support_scripts.items():
                operators = await db_objects.execute(
                    operator_query.where(db_model.Operator.deleted == False)
                )
                for op in operators:
                    try:
                        # first update the base case,then loop through operators
                        script = await db_objects.get(
                            browserscriptquery,
                            name=v.name,
                            payload_type=payload_type,
                            operator=op,
                            command=None
                        )
                        await db_objects.delete(script)
                    except Exception as e:
                        pass
                await db_objects.delete(v)
            # now that we have the payload type, start processing the commands and their parts
            await import_command_func(payload_type, operator, ptype["commands"])
            if "c2_profiles" in ptype:
                query = await db_model.payloadtypec2profile_query()
                current_c2 = await db_objects.execute(
                    query.where(
                        db_model.PayloadTypeC2Profile.payload_type == payload_type
                    )
                )
                current_c2_dict = {c.c2_profile.name: c for c in current_c2}
                for c2_profile_name in ptype["c2_profiles"]:
                    try:
                        c2query = await db_model.c2profile_query()
                        c2_profile = await db_objects.get(c2query, name=c2_profile_name)
                        try:
                            await db_objects.get(
                                query, payload_type=payload_type, c2_profile=c2_profile
                            )
                            current_c2_dict.pop(c2_profile.name, None)
                        except Exception as e:
                            # it doesn't exist, so we create it
                            await db_objects.create(
                                PayloadTypeC2Profile,
                                payload_type=payload_type,
                                c2_profile=c2_profile,
                            )
                    except Exception as e:
                        #print("Failed to associated c2 profile with payload type")
                        continue  # just try to get the next c2_profile
                # delete any mappings that used to exist but are no longer listed by the agent
                for k, v in current_c2_dict.items():
                    await db_objects.delete(v)
            payload_type = await db_objects.prefetch(ptquery.where(db_model.PayloadType.ptype == ptype["ptype"]),
                                                     build_param_query)
            payload_type = payload_type[0]
            return {"status": "success", "new": new_payload, **payload_type.to_json()}
        except Exception as e:
            logger.exception("exception on importing payload type")
            return {"status": "error", "error": str(e)}
    except Exception as e:
        logger.exception("failed to import a payload type: " + str(e))
        return {"status": "error", "error": str(e)}


async def import_command_func(payload_type, operator, command_list):
    query = await db_model.command_query()
    current_commands = await db_objects.execute(
        query.where(
            (db_model.Command.payload_type == payload_type)
            & (db_model.Command.deleted == False)
        )
    )
    for command in current_commands:
        # if this command is in command_list,then we just update it
        if command.cmd in command_list:
            cmd = command_list[command.cmd]
            if "is_exit" not in cmd:
                cmd["is_exit"] = False
            elif cmd["is_exit"] is True:
                # this is trying to say it is the exit command for this payload type
                # there can only be one for a given payload type though, so check. if one exists, change it
                query = await db_model.command_query()
                try:
                    exit_command = await db_objects.get(
                        query.where(
                            (Command.is_exit == True)
                            & (Command.payload_type == payload_type)
                            & (Command.deleted == False)
                        )
                    )
                    # one is already set, so set it to false
                    exit_command.is_exit = False
                    await db_objects.update(exit_command)
                except Exception as e:
                    # one doesn't exist, so let this one be set
                    pass
            if "is_process_list" not in cmd:
                cmd["is_process_list"] = False
            elif cmd["is_process_list"] is True:
                query = await db_model.command_query()
                try:
                    pl_command = await db_objects.get(
                        query.where(
                            (Command.is_process_list == True)
                            & (Command.payload_type == payload_type)
                            & (Command.deleted == False)
                        )
                    )
                    # one is already set, so set it to false
                    pl_command.is_process_list = False
                    await db_objects.update(pl_command)
                except Exception as e:
                    # one doesn't exist, so let this one be set
                    pass
            if "is_file_browse" not in cmd:
                cmd["is_file_browse"] = False
            elif cmd["is_file_browse"] is True:
                query = await db_model.command_query()
                try:
                    fb_command = await db_objects.get(
                        query.where(
                            (Command.is_file_browse == True)
                            & (Command.payload_type == payload_type)
                            & (Command.deleted == False)
                        )
                    )
                    # one is already set, so set it to false
                    fb_command.is_file_browse = False
                    await db_objects.update(fb_command)
                except Exception as e:
                    # one doesn't exist, so let this one be set
                    pass
            if "is_download_file" not in cmd:
                cmd["is_download_file"] = False
            elif cmd["is_download_file"] is True:
                query = await db_model.command_query()
                try:
                    df_command = await db_objects.get(
                        query.where(
                            (Command.is_download_file == True)
                            & (Command.payload_type == payload_type)
                            & (Command.deleted == False)
                        )
                    )
                    # one is already set, so set it to false
                    df_command.is_download_file = False
                    await db_objects.update(df_command)
                except Exception as e:
                    # one doesn't exist, so let this one be set
                    pass
            if "is_remove_file" not in cmd:
                cmd["is_remove_file"] = False
            elif cmd["is_remove_file"] is True:
                query = await db_model.command_query()
                try:
                    rf_command = await db_objects.get(
                        query.where(
                            (Command.is_remove_file == True)
                            & (Command.payload_type == payload_type)
                            & (Command.deleted == False)
                        )
                    )
                    # one is already set, so set it to false
                    rf_command.is_remove_file = False
                    await db_objects.update(rf_command)
                except Exception as e:
                    # one doesn't exist, so let this one be set
                    pass
            if "is_upload_file" not in cmd:
                cmd["is_upload_file"] = False
            elif cmd["is_upload_file"] is True:
                query = await db_model.command_query()
                try:
                    rf_command = await db_objects.get(
                        query.where(
                            (Command.is_upload_file == True)
                            & (Command.payload_type == payload_type)
                            & (Command.deleted == False)
                        )
                    )
                    # one is already set, so set it to false
                    rf_command.is_upload_file = False
                    await db_objects.update(rf_command)
                except Exception as e:
                    # one doesn't exist, so let this one be set
                    pass
            command.description = cmd["description"]
            command.needs_admin = cmd["needs_admin"]
            command.version = cmd["version"]
            command.help_cmd = cmd["help_cmd"]
            command.is_exit = cmd["is_exit"]
            command.is_process_list = cmd["is_process_list"]
            command.is_file_browse = cmd["is_file_browse"]
            command.is_download_file = cmd["is_download_file"]
            command.is_remove_file = cmd["is_remove_file"]
            command.is_upload_file = cmd["is_upload_file"]
            command.author = cmd["author"]
            await db_objects.update(command)
            query = await db_model.commandparameters_query()
            current_params = await db_objects.execute(
                query.where((db_model.CommandParameters.command == command))
            )
            current_param_dict = {c.name: c for c in current_params}
            for param in cmd["parameters"]:
                try:
                    query = await db_model.commandparameters_query()
                    cmd_param = await db_objects.get(
                        query, command=command, name=param["name"]
                    )
                    cmd_param.type = param["type"]
                    if "default_value" in param and param["default_value"] is not None:
                        if cmd_param.type == "Array":
                            cmd_param.default_value = js.dumps(param["default_value"])
                        else:
                            cmd_param.default_value = param["default_value"]
                    if (
                        "supported_agents" in param
                        and param["supported_agents"] is not None
                    ):
                        cmd_param.supported_agents = param["supported_agents"]
                    cmd_param.description = param["description"]
                    cmd_param.choices = param["choices"]
                    cmd_param.required = param["required"]
                    await db_objects.update(cmd_param)
                    current_param_dict.pop(param["name"], None)
                except:  # param doesn't exist yet, so create it
                    if "default_value" not in param or param["default_value"] is None:
                        param["default_value"] = ""
                    elif param["type"] == "Array":
                        param["default_value"] = js.dumps(param["default_value"])
                    await db_objects.create(CommandParameters, command=command, **param)
            for k, v in current_param_dict.items():
                await db_objects.delete(v)
            # now to process the att&cks
            for attack in cmd["attack"]:
                query = await db_model.attack_query()
                attck = await db_objects.get(query, t_num=attack["t_num"])
                query = await db_model.attackcommand_query()
                try:
                    await db_objects.get(query, command=command, attack=attck)
                except Exception as e:
                    # we got here so it doesn't exist, so create it and move on
                    await db_objects.create(
                        ATTACKCommand, command=command, attack=attck
                    )
            # now process the command file
            browserscriptquery = await db_model.browserscript_query()
            found_script = False
            try:
                # first try to find if one exists currently
                script = await db_objects.get(
                    browserscriptquery,
                    payload_type=payload_type,
                    operator=None,
                    command=command,
                )
                found_script = True
            except Exception as e:
                script = None
            # get the current script if one exists
            if "browser_script" in cmd:
                # this means we have one to add or update
                if found_script:
                    script.container_version = cmd["browser_script"]["script"]
                    script.script = cmd["browser_script"]["script"]
                    script.container_version_author = cmd["browser_script"]["author"]
                    script.author = cmd["browser_script"]["author"]
                    await db_objects.update(script)
                else:
                    script = await db_objects.create(
                        db_model.BrowserScript,
                        script=cmd["browser_script"]["script"],
                        container_version=cmd["browser_script"]["script"],
                        payload_type=payload_type,
                        command=command,
                        author=cmd["browser_script"]["author"],
                        container_version_author=cmd["browser_script"]["author"],
                    )
                # now loop through all users
                operator_query = await db_model.operator_query()
                operators = await db_objects.execute(
                    operator_query.where(db_model.Operator.deleted == False)
                )
                for op in operators:
                    try:
                        # first update the base case,then loop through operators
                        script = await db_objects.get(
                            browserscriptquery,
                            payload_type=payload_type,
                            operator=op,
                            command=command,
                        )
                        script.container_version = cmd["browser_script"]["script"]
                        script.container_version_author = cmd["browser_script"][
                            "author"
                        ]
                        if not script.user_modified:
                            script.script = cmd["browser_script"]["script"]
                            script.author = cmd["browser_script"]["author"]
                        await db_objects.update(script)
                    except Exception as e:
                        await db_objects.create(
                            db_model.BrowserScript,
                            script=cmd["browser_script"]["script"],
                            container_version=cmd["browser_script"]["script"],
                            operator=op,
                            payload_type=payload_type,
                            command=command,
                            author=cmd["browser_script"]["author"],
                            container_version_author=cmd["browser_script"]["author"],
                        )
            else:
                if found_script:
                    # this means we need to get rid of the browser script
                    # now loop through all users
                    operator_query = await db_model.operator_query()
                    operators = await db_objects.execute(
                        operator_query.where(db_model.Operator.deleted == False)
                    )
                    for op in operators:
                        try:
                            # first update the base case,then loop through operators
                            op_script = await db_objects.get(
                                browserscriptquery,
                                payload_type=payload_type,
                                operator=op,
                                command=command,
                            )
                            await db_objects.delete(op_script)
                        except Exception as e:
                            pass
                    await db_objects.delete(script)
            command_list.pop(command.cmd, None)
        else:
            # we need to mark the command as deleted
            command.cmd = str(shortuuid.uuid()) + "-" + command.cmd
            command.deleted = True
            await db_objects.update(command)
    # everything left in command_list should be new
    for cmd_name, cmd in command_list.items():
        if "is_exit" not in cmd:
            cmd["is_exit"] = False
        elif cmd["is_exit"] is True:
            # this is trying to say it is the exit command for this payload type
            # there can only be one for a given payload type though, so check. if one exists, change it
            query = await db_model.command_query()
            try:
                exit_command = await db_objects.get(
                    query.where(
                        (Command.is_exit == True)
                        & (Command.payload_type == payload_type)
                        & (Command.deleted == False)
                    )
                )
                # one is already set, so set it to false
                exit_command.is_exit = False
                await db_objects.update(exit_command)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
        if "is_process_list" not in cmd:
            cmd["is_process_list"] = False
        elif cmd["is_process_list"] is True:
            query = await db_model.command_query()
            try:
                pl_command = await db_objects.get(
                    query.where(
                        (Command.is_process_list == True)
                        & (Command.payload_type == payload_type)
                        & (Command.deleted == False)
                    )
                )
                # one is already set, so set it to false
                pl_command.is_process_list = False
                await db_objects.update(pl_command)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
        if "is_file_browse" not in cmd:
            cmd["is_file_browse"] = False
        elif cmd["is_file_browse"] is True:
            query = await db_model.command_query()
            try:
                fb_command = await db_objects.get(
                    query.where(
                        (Command.is_file_browse == True)
                        & (Command.payload_type == payload_type)
                        & (Command.deleted == False)
                    )
                )
                # one is already set, so set it to false
                fb_command.is_file_browse = False
                await db_objects.update(fb_command)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
        if "is_download_file" not in cmd:
            cmd["is_download_file"] = False
        elif cmd["is_download_file"] is True:
            query = await db_model.command_query()
            try:
                df_command = await db_objects.get(
                    query.where(
                        (Command.is_download_file == True)
                        & (Command.payload_type == payload_type)
                        & (Command.deleted == False)
                    )
                )
                # one is already set, so set it to false
                df_command.is_download_file = False
                await db_objects.update(df_command)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
        if "is_remove_file" not in cmd:
            cmd["is_remove_file"] = False
        elif cmd["is_remove_file"] is True:
            query = await db_model.command_query()
            try:
                rf_command = await db_objects.get(
                    query.where(
                        (Command.is_remove_file == True)
                        & (Command.payload_type == payload_type)
                        & (Command.deleted == False)
                    )
                )
                # one is already set, so set it to false
                rf_command.is_remove_file = False
                await db_objects.update(rf_command)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
        if "is_upload_file" not in cmd:
            cmd["is_upload_file"] = False
        elif cmd["is_upload_file"] is True:
            query = await db_model.command_query()
            try:
                rf_command = await db_objects.get(
                    query.where(
                        (Command.is_upload_file == True)
                        & (Command.payload_type == payload_type)
                        & (Command.deleted == False)
                    )
                )
                # one is already set, so set it to false
                rf_command.is_upload_file = False
                await db_objects.update(rf_command)
            except Exception as e:
                # one doesn't exist, so let this one be set
                pass
        try:
            query = await db_model.command_query()
            command = await db_objects.get(
                query, cmd=cmd["cmd"], payload_type=payload_type
            )
            command.description = cmd["description"]
            command.needs_admin = cmd["needs_admin"]
            command.version = cmd["version"]
            command.help_cmd = cmd["help_cmd"]
            command.is_exit = cmd["is_exit"]
            command.is_process_list = cmd["is_process_list"]
            command.is_file_browse = cmd["is_file_browse"]
            command.is_download_file = cmd["is_download_file"]
            command.is_remove_file = cmd["is_remove_file"]
            command.is_upload_file = cmd["is_upload_file"]
            command.author = cmd["author"]
            await db_objects.update(command)
        except Exception as e:  # this means that the command doesn't already exist
            command = await db_objects.create(
                Command,
                cmd=cmd["cmd"],
                payload_type=payload_type,
                description=cmd["description"],
                version=cmd["version"],
                needs_admin=cmd["needs_admin"],
                help_cmd=cmd["help_cmd"],
                is_exit=cmd["is_exit"],
                is_process_list=cmd["is_process_list"],
                is_file_browse=cmd["is_file_browse"],
                is_download_file=cmd["is_download_file"],
                is_remove_file=cmd["is_remove_file"],
                is_upload_file=cmd["is_upload_file"],
                author=cmd["author"],
            )
        # now to process the parameters
        query = await db_model.commandparameters_query()
        current_params = await db_objects.execute(
            query.where((db_model.CommandParameters.command == command))
        )
        current_param_dict = {c.name: c for c in current_params}
        for param in cmd["parameters"]:
            try:
                query = await db_model.commandparameters_query()
                cmd_param = await db_objects.get(
                    query, command=command, name=param["name"]
                )
                cmd_param.type = param["type"]
                if "default_value" in param and param["default_value"] is not None:
                    if cmd_param.type == "Array":
                        cmd_param.default_value = js.dumps(param["default_value"])
                    else:
                        cmd_param.default_value = param["default_value"]
                if (
                    "supported_agents" in param
                    and param["supported_agents"] is not None
                ):
                    cmd_param.supported_agents = param["supported_agents"]
                cmd_param.description = param["description"]
                cmd_param.choices = param["choices"]
                cmd_param.required = param["required"]
                await db_objects.update(cmd_param)
                current_param_dict.pop(param["name"], None)
            except:  # param doesn't exist yet, so create it
                if "default_value" not in param or param["default_value"] is None:
                    param["default_value"] = ""
                elif param["type"] == "Array":
                    param["default_value"] = js.dumps(param["default_value"])
                await db_objects.create(CommandParameters, command=command, **param)
        for k, v in current_param_dict.items():
            await db_objects.delete(v)
        # now to process the att&cks
        for attack in cmd["attack"]:
            query = await db_model.attack_query()
            attck = await db_objects.get(query, t_num=attack["t_num"])
            query = await db_model.attackcommand_query()
            try:
                await db_objects.get(query, command=command, attack=attck)
            except Exception as e:
                # we got here so it doesn't exist, so create it and move on
                await db_objects.create(ATTACKCommand, command=command, attack=attck)
        # now process the command file
        if "browser_script" in cmd:
            browserscriptquery = await db_model.browserscript_query()
            try:
                # first update the base case,then loop through operators
                script = await db_objects.get(
                    browserscriptquery,
                    operator=None,
                    payload_type=payload_type,
                    command=command,
                )
                script.container_version = cmd["browser_script"]["script"]
                script.script = cmd["browser_script"]["script"]
                script.container_version_author = cmd["browser_script"]["author"]
                script.author = cmd["browser_script"]["author"]
                await db_objects.update(script)
            except Exception as e:
                await db_objects.create(
                    db_model.BrowserScript,
                    script=cmd["browser_script"]["script"],
                    container_version=cmd["browser_script"]["script"],
                    payload_type=payload_type,
                    command=command,
                    operator=None,
                    author=cmd["browser_script"]["author"],
                    container_version_author=cmd["browser_script"]["author"],
                )
            # now loop through all users
            operator_query = await db_model.operator_query()
            operators = await db_objects.execute(
                operator_query.where(db_model.Operator.deleted == False)
            )
            for op in operators:
                try:
                    # first update the base case,then loop through operators
                    script = await db_objects.get(
                        browserscriptquery,
                        payload_type=payload_type,
                        operator=op,
                        command=command,
                    )
                    script.container_version = cmd["browser_script"]["script"]
                    script.container_version_author = cmd["browser_script"]["author"]
                    if not script.user_modified:
                        script.script = cmd["browser_script"]["script"]
                        script.author = cmd["browser_script"]["author"]
                    await db_objects.update(script)
                except Exception as e:
                    await db_objects.create(
                        db_model.BrowserScript,
                        script=cmd["browser_script"]["script"],
                        container_version=cmd["browser_script"]["script"],
                        operator=op,
                        payload_type=payload_type,
                        command=command,
                        author=cmd["browser_script"]["author"],
                        container_version_author=cmd["browser_script"]["author"],
                    )
