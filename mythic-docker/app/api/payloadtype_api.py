from app import mythic
import app
from sanic.response import json
from app.database_models.model import (
    PayloadType,
    Command,
    CommandParameters,
    ATTACKCommand,
    PayloadTypeC2Profile,
)
from sanic_jwt.decorators import scoped, inject_user
import asyncio
import datetime
import app.database_models.model as db_model
from sanic.exceptions import abort
from sanic.log import logger
from peewee import IntegrityError
import ujson as js
import sys


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
    payloads = await app.db_objects.prefetch(
        db_model.payloadtype_query.where(db_model.PayloadType.deleted == False),
        db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False)
    )
    plist = []
    wrappers = []
    for pt in payloads:
        pt_json = pt.to_json()
        if pt.wrapper:
            wrapped_types = await app.db_objects.execute(
                db_model.wrappedpayloadtypes_query.where(db_model.WrappedPayloadTypes.wrapper == pt)
            )
            wrappers.append(
                {**pt_json, "wrapped": [w.to_json() for w in wrapped_types]}
            )
        else:
            # get the list of c2 profiles the payload supports
            pt_c2 = await app.db_objects.execute(
                db_model.payloadtypec2profile_query.where(db_model.PayloadTypeC2Profile.payload_type == pt)
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
        payloadtype = await app.db_objects.prefetch(db_model.payloadtype_query.where(db_model.PayloadType.id == ptype),
                                                    db_model.BuildParameter.select().where(
                                                        db_model.BuildParameter.deleted == False))
        payloadtype = payloadtype[0]
        # get the list of c2 profiles the payload supports
        pt_c2 = await app.db_objects.execute(
            db_model.payloadtypec2profile_query.where(db_model.PayloadTypeC2Profile.payload_type == payloadtype)
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
        payloadtype = await app.db_objects.prefetch(db_model.payloadtype_query.where(db_model.PayloadType.id == ptype),
                                                    db_model.BuildParameter.select().where(db_model.BuildParameter.deleted == False))
        data = request.json
        payloadtype = list(payloadtype)[0]
        if "container_running" in data:
            payloadtype.container_running = data["container_running"]
            await app.db_objects.update(payloadtype)
        if "translation_container_running" in data:
            if payloadtype.translation_container is not None:
                payloadtype.translation_container.container_running = data["translation_container_running"]
                await app.db_objects.update(payloadtype.translation_container)
    except Exception as e:
        return json({"status": "error", "error": "failed to find payload type: " + str(e)})
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
        payloadtype = await app.db_objects.get(db_model.payloadtype_query, id=ptype)
    except Exception as e:
        return json({"status": "error", "error": "failed to find payload type"})
    if user["admin"]:
        # only delete a payload type if you created it or if you're an admin
        try:
            payloadtype_json = payloadtype.to_json()
            payloadtype.deleted = True
            await app.db_objects.update(payloadtype)
            mapping = await app.db_objects.execute(
                db_model.payloadtypec2profile_query.where(db_model.PayloadTypeC2Profile.payload_type == payloadtype)
            )
            for m in mapping:
                await app.db_objects.delete(m)
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
        payloadtype = await app.db_objects.get(db_model.payloadtype_query, id=ptype)
    except Exception as e:
        logger.warning("payloadtype_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return json({"status": "error", "error": "failed to get payload type"})
    commands = await app.db_objects.execute(
        db_model.command_query.where(
            (Command.payload_type == payloadtype) & (Command.deleted == False)
        ).order_by(Command.cmd)
    )
    all_commands = []
    for cmd in commands:
        params = await app.db_objects.execute(db_model.commandparameters_query.where(CommandParameters.command == cmd))
        all_commands.append({**cmd.to_json(), "params": [p.to_json() for p in params]})
    status = {"status": "success"}
    return json({**status, "commands": all_commands})


async def import_payload_type_func(ptype, operator, rabbitmqName):
    new_payload = False
    from app.api.operation_api import send_all_operations_message
    try:
        #print(ptype)
        #sys.stdout.flush()
        if "author" not in ptype:
            ptype["author"] = operator.username if operator is not None else ""
        if "note" not in ptype:
            ptype["note"] = ""
        if "ptype" not in ptype or ptype["ptype"] == "":
            return {"status": "error", "error": "payload type must not be empty"}
        if ptype["ptype"] != rabbitmqName:
            return {"status": "error", "error": f"container name, {rabbitmqName}, trying to sync with a different agent name, {ptype['ptype']}"}
        if "mythic_encrypts" not in ptype or ptype["mythic_encrypts"] is None or ptype["mythic_encrypts"] == "":
            ptype["mythic_encrypts"] = True
        if "translation_container" in ptype and ptype["translation_container"] is not None:
            #print("translation container listed: " + ptype["translation_container"])
            #sys.stdout.flush()
            try:
                translation_container = await app.db_objects.get(db_model.translationcontainer_query,
                                                                 name=ptype["translation_container"],
                                                                 deleted=False)
                #print("found translation container")
                ptype["translation_container"] = translation_container
            except Exception as t:
                asyncio.create_task(
                    send_all_operations_message(message=f"{rabbitmqName}'s sync with Mythic failed to find translation container {ptype['translation_container']}",
                                                level="warning", source="payload_type_import"))
                logger.warning("payloadtype_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(t))
                ptype["translation_container"] = None
        else:
            #print("no translation container found")
            #sys.stdout.flush()
            ptype["translation_container"] = None
        try:
            payload_types = await app.db_objects.prefetch(
                db_model.payloadtype_query.where(db_model.PayloadType.ptype == ptype["ptype"]),
                db_model.buildparameter_query)
            payload_type = payload_types[0]
            payload_type.deleted = False
            payload_type.wrapper = ptype["wrapper"]
            payload_type.supported_os = ptype["supported_os"]
            payload_type.file_extension = ptype["file_extension"]
            payload_type.author = ptype["author"]
            payload_type.note = ptype["note"]
            payload_type.supports_dynamic_loading = ptype[
                "supports_dynamic_loading"
            ]
            payload_type.mythic_encrypts = ptype["mythic_encrypts"]
            if "translation_container" not in ptype or ptype["translation_container"] is None:
                payload_type.translation_container = None
            else:
                payload_type.translation_container = ptype["translation_container"]
            await app.db_objects.update(payload_type)
        except Exception as e:
            new_payload = True
            try:
                payload_type, created = await app.db_objects.create_or_get(
                    PayloadType,
                    ptype=ptype["ptype"],
                    wrapper=ptype["wrapper"],
                    supported_os=ptype["supported_os"],
                    file_extension=ptype["file_extension"],
                    author=ptype["author"],
                    note=ptype["note"],
                    supports_dynamic_loading=ptype["supports_dynamic_loading"],
                    mythic_encrypts=ptype["mythic_encrypts"],
                    translation_container=ptype["translation_container"] if "translation_container" in ptype else None
                )
            except Exception as dup:
                logger.info("[*] Failed to create new payload due to duplicated name, if this is the first time the agent container is started, this can be ignored")
                return {"status": "error", "error": "duplicate"}
        if not ptype["wrapper"]:
            # now deal with all of the wrapped payloads mentioned
            # get the list of wrapper combinations associated with the current payload type
            current_wrapped = await app.db_objects.execute(
                db_model.wrappedpayloadtypes_query.where(
                    (db_model.WrappedPayloadTypes.wrapped == payload_type)
                )
            )
            # current_wrapped has list of wrapper->this_payload_type that currently exist in Mythic
            wrapped_to_add = [p for p in ptype["wrapped"]]
            for cw in current_wrapped:
                found = False
                # ptype["wrapped"] is a list of wrappers we support
                for ptw in ptype["wrapped"]:
                    if ptw == cw.wrapper.ptype:
                        wrapped_to_add.remove(ptw)
                        found = True
                        break
                # if we get here, then there was a wrapping that's not supported anymore
                if not found:
                    await app.db_objects.delete(cw)
            # if there's anything left in wrapped_to_add, then we need to try to add them
            for ptw in wrapped_to_add:
                try:
                    wrapped = await app.db_objects.get(db_model.payloadtype_query, ptype=ptw)
                    await app.db_objects.create(
                        db_model.WrappedPayloadTypes,
                        wrapper=wrapped,
                        wrapped=payload_type,
                    )
                except Exception as e:
                    asyncio.create_task(
                        send_all_operations_message(
                            message=f"{rabbitmqName} supports the wrapper, {ptw}, but it doesn't currently exist within Mythic",
                            level="info"))
                    logger.warning("payloadtype_api.py - couldn't find wrapped payload in system, skipping: " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                    pass
        try:
            if new_payload:
                payload_type.creation_time = datetime.datetime.utcnow()
                await app.db_objects.update(payload_type)
            # create any TransformCode entries as needed,just keep track of them
            if "build_parameters" in ptype:
                current_params = await app.db_objects.execute(
                    db_model.buildparameter_query.where(
                        (db_model.BuildParameter.payload_type == payload_type)
                        & (db_model.BuildParameter.deleted == False)
                    )
                )
                build_param_dict = {b.name: b for b in current_params}
                for bp in ptype["build_parameters"]:
                    if bp["name"] == "":
                        continue
                    try:
                        buildparam = await app.db_objects.get(
                            db_model.buildparameter_query,
                            payload_type=payload_type,
                            name=bp["name"],
                            deleted=False,
                        )
                        buildparam.parameter_type = bp["parameter_type"]
                        buildparam.description = bp["description"]
                        buildparam.required = bp["required"]
                        buildparam.verifier_regex = bp["verifier_regex"]
                        buildparam.parameter = bp["parameter"]
                        await app.db_objects.update(buildparam)
                        build_param_dict.pop(bp["name"], None)
                    except Exception as e:
                        await app.db_objects.create_or_get(
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
                    await app.db_objects.update(v)
            # go through support scripts and add as necessary
            # first find all that currently exist
            support_scripts_db = await app.db_objects.execute(db_model.browserscript_query.where(
                (db_model.BrowserScript.payload_type == payload_type) &
                (db_model.BrowserScript.command == None) &
                (db_model.BrowserScript.operator == None)
            ))
            support_scripts = {}
            for s in support_scripts_db:
                name = s.name + str(s.for_new_ui)
                support_scripts[name] = s
            if "support_scripts" in ptype:
                for support_script in ptype["support_scripts"]:
                    if "for_new_ui" not in support_script:
                        support_script["for_new_ui"] = False
                    support_scripts.pop(support_script["name"] + str(support_script["for_new_ui"]), None)
                    try:
                        # first update the base case,then loop through operators
                        script = await app.db_objects.get(
                            db_model.browserscript_query,
                            name=support_script["name"],
                            payload_type=payload_type,
                            command=None,
                            operator=None,
                            for_new_ui=support_script["for_new_ui"]
                        )
                        script.container_version = support_script["script"]
                        script.script = support_script["script"]
                        script.container_version_author = support_script["author"]
                        script.author = support_script["author"]
                        await app.db_objects.update(script)
                    except Exception as e:
                        await app.db_objects.create_or_get(
                            db_model.BrowserScript,
                            name=support_script["name"],
                            script=support_script["script"],
                            container_version=support_script["script"],
                            payload_type=payload_type,
                            author=support_script["author"],
                            container_version_author=support_script["author"],
                            command=None,
                            operator=None,
                            for_new_ui=support_script["for_new_ui"]
                        )
                    # now loop through all users
                    operators = await app.db_objects.execute(
                        db_model.operator_query.where(db_model.Operator.deleted == False)
                    )
                    for op in operators:
                        try:
                            # first update the base case,then loop through operators
                            script = await app.db_objects.get(
                                db_model.browserscript_query,
                                name=support_script["name"],
                                payload_type=payload_type,
                                operator=op,
                                command=None,
                                for_new_ui=support_script["for_new_ui"]
                            )
                            script.container_version = support_script["script"]
                            script.container_version_author = support_script["author"]
                            if not script.user_modified:
                                script.script = support_script["script"]
                                script.author = support_script["author"]
                            await app.db_objects.update(script)
                        except Exception as e:
                            await app.db_objects.create_or_get(
                                db_model.BrowserScript,
                                name=support_script["name"],
                                script=support_script["script"],
                                container_version=support_script["script"],
                                operator=op,
                                payload_type=payload_type,
                                author=support_script["author"],
                                container_version_author=support_script["author"],
                                command=None,
                                for_new_ui=support_script["for_new_ui"]
                            )
            # if there's anything left in support_scripts, we need to delete them
            for k, v in support_scripts.items():
                operators = await app.db_objects.execute(
                    db_model.operator_query.where(db_model.Operator.deleted == False)
                )
                for op in operators:
                    try:
                        # first update the base case,then loop through operators
                        script = await app.db_objects.get(
                            db_model.browserscript_query,
                            name=v.name,
                            payload_type=payload_type,
                            operator=op,
                            command=None,
                            for_new_ui=v.for_new_ui
                        )
                        await app.db_objects.delete(script)
                    except Exception as e:
                        pass
                await app.db_objects.delete(v)
            # now that we have the payload type, start processing the commands and their parts
            try:
                await import_command_func(payload_type, operator, ptype["commands"])
            except IntegrityError as ie:
                logger.warning(str(ie))
                return
            if "c2_profiles" in ptype:
                current_c2 = await app.db_objects.execute(
                    db_model.payloadtypec2profile_query.where(
                        db_model.PayloadTypeC2Profile.payload_type == payload_type
                    )
                )
                current_c2_dict = {c.c2_profile.name: c for c in current_c2}
                for c2_profile_name in ptype["c2_profiles"]:
                    try:
                        c2_profile = await app.db_objects.get(db_model.c2profile_query, name=c2_profile_name)
                        try:
                            await app.db_objects.get(
                                db_model.payloadtypec2profile_query, payload_type=payload_type, c2_profile=c2_profile
                            )
                            current_c2_dict.pop(c2_profile.name, None)
                        except Exception as e:
                            # it doesn't exist, so we create it
                            await app.db_objects.create(
                                PayloadTypeC2Profile,
                                payload_type=payload_type,
                                c2_profile=c2_profile,
                            )
                    except Exception as e:
                        # print("Failed to associated c2 profile with payload type")
                        continue  # just try to get the next c2_profile
                # delete any mappings that used to exist but are no longer listed by the agent
                for k, v in current_c2_dict.items():
                    await app.db_objects.delete(v)
            payload_type = await app.db_objects.prefetch(
                db_model.payloadtype_query.where(db_model.PayloadType.ptype == ptype["ptype"]),
                db_model.buildparameter_query)
            payload_type = payload_type[0]
            return {"status": "success", "new": new_payload, **payload_type.to_json()}
        except Exception as e:
            logger.exception("exception on importing payload type {}".format(payload_type.ptype))
            asyncio.create_task(
                send_all_operations_message(
                    message=f"{rabbitmqName}'s sync with Mythic failed:\n" + str(e),
                    level="warning", source="payload_type_import"))
            return {"status": "error", "error": str(e)}
    except Exception as e:
        logger.exception("failed to import a payload type: " + str(e))
        asyncio.create_task(
            send_all_operations_message(
                message=f"{rabbitmqName}'s sync with Mythic failed:\n" + str(e),
                level="warning", source="payload_type_import"))
        return {"status": "error", "error": str(e)}


async def import_command_func(payload_type, operator, command_list):
    current_commands = await app.db_objects.execute(
        db_model.command_query.where(
            (db_model.Command.payload_type == payload_type)
            & (db_model.Command.deleted == False)
        )
    )
    for command in current_commands:
        # if this command is in command_list,then we just update it
        if command.cmd in command_list:
            cmd = command_list[command.cmd]
            command.description = cmd["description"]
            command.needs_admin = cmd["needs_admin"]
            command.version = cmd["version"]
            command.help_cmd = cmd["help_cmd"]
            command.supported_ui_features = "\n".join(cmd["supported_ui_features"])
            command.author = cmd["author"]
            command.attributes = js.dumps(cmd["attributes"])
            command.script_only = cmd["script_only"]
            await add_update_opsec_for_command(command, cmd)
            await app.db_objects.update(command)

            current_params = await app.db_objects.execute(
                db_model.commandparameters_query.where((db_model.CommandParameters.command == command))
            )
            current_param_dict = {c.name + c.parameter_group_name: c for c in current_params}
            for param in cmd["parameters"]:
                for param_group in param["parameter_group_info"]:
                    try:
                        cmd_param = await app.db_objects.get(
                            db_model.commandparameters_query, command=command, name=param["name"],
                            parameter_group_name=param_group["group_name"]
                        )
                        cmd_param.type = param["type"]
                        if param_group["ui_position"] is not None:
                            cmd_param.ui_position = param_group["ui_position"]
                        else:
                            # we will need to assign a number later
                            cmd_param.ui_position = 999999
                        if "default_value" in param and param["default_value"] is not None:
                            if cmd_param.type == "Array":
                                cmd_param.default_value = js.dumps(param["default_value"])
                            else:
                                cmd_param.default_value = param["default_value"]
                        else:
                            if cmd_param.type == "Array":
                                cmd_param.default_value = "[]"
                            else:
                                cmd_param.default_value = ""
                        if (
                                "supported_agents" in param
                                and param["supported_agents"] is not None
                        ):
                            cmd_param.supported_agents = param["supported_agents"]
                        cmd_param.supported_agent_build_parameters = js.dumps(param["supported_agent_build_parameters"])
                        cmd_param.description = param["description"]
                        cmd_param.choices = param["choices"]
                        cmd_param.required = param_group["required"]
                        cmd_param.parameter_group_name = param_group["group_name"]
                        cmd_param.choice_filter_by_command_attributes = js.dumps(
                            param["choice_filter_by_command_attributes"])
                        cmd_param.choices_are_all_commands = param["choices_are_all_commands"]
                        cmd_param.cli_name = param["cli_name"]
                        cmd_param.display_name = param["display_name"]
                        cmd_param.choices_are_loaded_commands = param["choices_are_loaded_commands"]
                        cmd_param.dynamic_query_function = param["dynamic_query_function"] if "dynamic_query_function" in param else None
                        await app.db_objects.update(cmd_param)
                        current_param_dict.pop(param["name"] + param_group["group_name"], None)
                    except Exception as param_except:  # param doesn't exist yet, so create it
                        if "default_value" not in param or param["default_value"] is None:
                            if param["type"] == "Array":
                                param["default_value"] = "[]"
                            else:
                                param["default_value"] = ""
                        elif param["type"] == "Array":
                            param["default_value"] = js.dumps(param["default_value"])
                        param["supported_agent_build_parameters"] = js.dumps(param["supported_agent_build_parameters"])
                        await app.db_objects.create_or_get(CommandParameters,
                                                           command=command,
                                                           description=param["description"],
                                                           choices=param["choices"],
                                                           required=param_group["required"],
                                                           type=param["type"],
                                                           ui_position=999999 if param_group["ui_position"] is None else param_group["ui_position"],
                                                           supported_agents=param["supported_agents"],
                                                           supported_agent_build_parameters=param["supported_agent_build_parameters"],
                                                           parameter_group_name=param_group["group_name"],
                                                           name=param["name"],
                                                           display_name=param["display_name"],
                                                           cli_name=param["cli_name"],
                                                           default_value=param["default_value"],
                                                           choice_filter_by_command_attributes=param["choice_filter_by_command_attributes"],
                                                           choices_are_all_commands=param["choices_are_all_commands"],
                                                           choices_are_loaded_commands=param["choices_are_loaded_commands"],
                                                           dynamic_query_function=param["dynamic_query_function"] if "dynamic_query_function" in param else None)
            for k, v in current_param_dict.items():
                await app.db_objects.delete(v)
            # now go back and make sure all of the ui_position values match up and have proper, non -1, values
            current_params = await app.db_objects.execute(
                db_model.commandparameters_query.where((db_model.CommandParameters.command == command)).order_by(
                    db_model.CommandParameters.parameter_group_name, db_model.CommandParameters.ui_position)
            )
            position = 1
            for x in current_params:
                if x.ui_position != position:
                    x.ui_position = position
                    await app.db_objects.update(x)
                position += 1
            # now to process the att&cks
            for attack in cmd["attack"]:
                try:
                    attck = await app.db_objects.get(db_model.attack_query, t_num=attack["t_num"])
                    try:
                        await app.db_objects.get(db_model.attackcommand_query, command=command, attack=attck)
                    except Exception as e:
                        # we got here so it doesn't exist, so create it and move on
                        await app.db_objects.create(
                            ATTACKCommand, command=command, attack=attck
                        )
                except Exception as attack_e:
                    from app.api.operation_api import send_all_operations_message
                    asyncio.create_task(send_all_operations_message(
                        message=f"Failed to find ATT&CK number {attack['t_num']} for {command.cmd} in {command.payload_type.ptype}",
                        level="warning"
                    ))
            current_scripts = {}
            try:
                # first try to find if one exists currently
                mythic_current_scripts = await app.db_objects.execute(
                    db_model.browserscript_query.where(
                        (db_model.BrowserScript.payload_type == payload_type)
                        & (db_model.BrowserScript.operator == None)
                        & (db_model.BrowserScript.command == command)
                    )
                )
                for s in mythic_current_scripts:
                    if s.for_new_ui:
                        if "new" in current_scripts:
                            await app.db_objects.delete(current_scripts["new"])
                        current_scripts["new"] = s
                    else:
                        if "old" in current_scripts:
                            await app.db_objects.delete(current_scripts["old"])
                        current_scripts["old"] = s
            except Exception as e:
                logger.warning("payloadtype_api.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
                current_scripts = {}
            for sync_script in cmd["browser_script"]:
                if sync_script["for_new_ui"]:
                    if "new" in current_scripts:
                        # we want to update a current script for the new ui
                        current_scripts["new"].container_version = sync_script["script"]
                        current_scripts["new"].script = sync_script["script"]
                        current_scripts["new"].container_version_author = sync_script["author"]
                        current_scripts["new"].author = sync_script["author"]
                        await app.db_objects.update(current_scripts["new"])
                        script = current_scripts["new"]
                    else:
                        # we want to create a new script for the new ui
                        script = await app.db_objects.create(
                            db_model.BrowserScript,
                            script=sync_script["script"],
                            container_version=sync_script["script"],
                            payload_type=payload_type,
                            command=command,
                            author=sync_script["author"],
                            container_version_author=sync_script["author"],
                            for_new_ui=True
                        )
                else:
                    # this is for the old ui
                    if "old" in current_scripts:
                        current_scripts["old"].container_version = sync_script["script"]
                        current_scripts["old"].script = sync_script["script"]
                        current_scripts["old"].container_version_author = sync_script["author"]
                        current_scripts["old"].author = sync_script["author"]
                        await app.db_objects.update(current_scripts["old"])
                        script = current_scripts["old"]
                    else:
                        # we want to create a new script for the new ui
                        script = await app.db_objects.create(
                            db_model.BrowserScript,
                            script=sync_script["script"],
                            container_version=sync_script["script"],
                            payload_type=payload_type,
                            command=command,
                            author=sync_script["author"],
                            container_version_author=sync_script["author"],
                            for_new_ui=False
                        )
                # now loop through all users
                operators = await app.db_objects.execute(
                    db_model.operator_query.where(db_model.Operator.deleted == False)
                )
                for op in operators:
                    try:
                        # first update the base case,then loop through operators
                        op_script = await app.db_objects.get(
                            db_model.browserscript_query,
                            payload_type=payload_type,
                            operator=op,
                            command=command,
                            for_new_ui=script.for_new_ui
                        )
                        op_script.container_version = sync_script["script"]
                        op_script.container_version_author = sync_script["author"]
                        if not op_script.user_modified:
                            op_script.script = sync_script["script"]
                            op_script.author = sync_script["author"]
                        await app.db_objects.update(op_script)
                    except Exception as e:
                        await app.db_objects.create_or_get(
                            db_model.BrowserScript,
                            script=sync_script["script"],
                            container_version=sync_script["script"],
                            operator=op,
                            payload_type=payload_type,
                            command=command,
                            author=sync_script["author"],
                            container_version_author=sync_script["author"],
                            for_new_ui=sync_script["for_new_ui"]
                        )
                # now remove it from tracking so we know if we need to delete a script
                if sync_script["for_new_ui"]:
                    current_scripts.pop("new", None)
                else:
                    current_scripts.pop("old", None)
            for k, v in current_scripts.items():
                # this means we need to get rid of the browser script
                # now loop through all users
                op_script = await app.db_objects.execute(
                    db_model.browserscript_query.where(
                        (db_model.BrowserScript.payload_type == payload_type)
                        & (db_model.BrowserScript.command == command)
                        & (db_model.BrowserScript.for_new_ui == v.for_new_ui)
                    )
                )
                for op in op_script:
                    try:
                        await app.db_objects.delete(op)
                    except Exception as e:
                        pass
            command_list.pop(command.cmd, None)
        else:
            command.deleted = True
            await app.db_objects.update(command)
    # everything left in command_list should be new
    for cmd_name, cmd in command_list.items():
        try:
            command = await app.db_objects.get(
                db_model.command_query, cmd=cmd["cmd"], payload_type=payload_type
            )
            command.deleted = False
            command.description = cmd["description"]
            command.needs_admin = cmd["needs_admin"]
            command.version = cmd["version"]
            command.help_cmd = cmd["help_cmd"]
            command.supported_ui_features = "\n".join(cmd["supported_ui_features"])
            command.author = cmd["author"]
            command.script_only = cmd["script_only"]
            command.attributes = js.dumps(cmd["attributes"])
            await add_update_opsec_for_command(command, cmd)
            await app.db_objects.update(command)
        except Exception as e:  # this means that the command doesn't already exist
            command, created = await app.db_objects.create_or_get(
                Command,
                cmd=cmd["cmd"],
                payload_type=payload_type,
                description=cmd["description"],
                version=cmd["version"],
                needs_admin=cmd["needs_admin"],
                help_cmd=cmd["help_cmd"],
                supported_ui_features="\n".join(cmd["supported_ui_features"]),
                author=cmd["author"],
                script_only=cmd["script_only"],
                attributes=js.dumps(cmd["attributes"]),
            )
            await add_update_opsec_for_command(command, cmd)
            await app.db_objects.update(command)
        # now to process the parameters
        current_params = await app.db_objects.execute(
            db_model.commandparameters_query.where((db_model.CommandParameters.command == command))
        )
        current_param_dict = {c.name + c.parameter_group_name: c for c in current_params}
        for param in cmd["parameters"]:
            for param_group in param["parameter_group_info"]:
                try:
                    cmd_param = await app.db_objects.get(
                        db_model.commandparameters_query, command=command, name=param["name"],
                        parameter_group_name=param_group["group_name"]
                    )
                    cmd_param.type = param["type"]
                    if param_group["ui_position"] is not None:
                        cmd_param.ui_position = param_group["ui_position"]
                    else:
                        # we will need to assign a number later
                        cmd_param.ui_position = 999999
                    if "default_value" in param and param["default_value"] is not None:
                        if cmd_param.type == "Array":
                            cmd_param.default_value = js.dumps(param["default_value"])
                        else:
                            cmd_param.default_value = param["default_value"]
                    else:
                        if cmd_param.type == "Array":
                            cmd_param.default_value = "[]"
                        else:
                            cmd_param.default_value = ""
                    if (
                            "supported_agents" in param
                            and param["supported_agents"] is not None
                    ):
                        cmd_param.supported_agents = param["supported_agents"]
                    cmd_param.supported_agent_build_parameters = js.dumps(param["supported_agent_build_parameters"])
                    cmd_param.description = param["description"]
                    cmd_param.choices = param["choices"]
                    cmd_param.cli_name = param["cli_name"]
                    cmd_param.display_name = param["display_name"]
                    cmd_param.required = param_group["required"]
                    cmd_param.parameter_group_name = param_group["group_name"]
                    cmd_param.choice_filter_by_command_attributes = js.dumps(
                        param["choice_filter_by_command_attributes"])
                    cmd_param.choices_are_all_commands = param["choices_are_all_commands"]
                    cmd_param.choices_are_loaded_commands = param["choices_are_loaded_commands"]
                    cmd_param.dynamic_query_function = param[
                        "dynamic_query_function"] if "dynamic_query_function" in param else None
                    await app.db_objects.update(cmd_param)
                    current_param_dict.pop(param["name"] + param_group["group_name"], None)
                except Exception as param_except:  # param doesn't exist yet, so create it
                    if "default_value" not in param or param["default_value"] is None:
                        if param["type"] == "Array":
                            param["default_value"] = "[]"
                        else:
                            param["default_value"] = ""
                    elif param["type"] == "Array":
                        param["default_value"] = js.dumps(param["default_value"])
                    param["supported_agent_build_parameters"] = js.dumps(param["supported_agent_build_parameters"])
                    await app.db_objects.create_or_get(CommandParameters,
                                                       command=command,
                                                       description=param["description"],
                                                       choices=param["choices"],
                                                       required=param_group["required"],
                                                       type=param["type"],
                                                       ui_position=999999 if param_group["ui_position"] is None else
                                                       param_group["ui_position"],
                                                       supported_agents=param["supported_agents"],
                                                       supported_agent_build_parameters=param[
                                                           "supported_agent_build_parameters"],
                                                       parameter_group_name=param_group["group_name"],
                                                       name=param["name"],
                                                       cli_name=param["cli_name"],
                                                       display_name=param["display_name"],
                                                       default_value=param["default_value"],
                                                       choice_filter_by_command_attributes=param[
                                                           "choice_filter_by_command_attributes"],
                                                       choices_are_all_commands=param["choices_are_all_commands"],
                                                       choices_are_loaded_commands=param["choices_are_loaded_commands"],
                                                       dynamic_query_function=param[
                                                           "dynamic_query_function"] if "dynamic_query_function" in param else None)
        for k, v in current_param_dict.items():
            await app.db_objects.delete(v)
        # now go back and make sure all of the ui_position values match up and have proper, non -1, values
        current_params = await app.db_objects.execute(
            db_model.commandparameters_query.where((db_model.CommandParameters.command == command)).order_by(
                db_model.CommandParameters.parameter_group_name, db_model.CommandParameters.ui_position)
        )
        position = 1
        for x in current_params:
            if x.ui_position != position:
                x.ui_position = position
                await app.db_objects.update(x)
            position += 1
        # now to process the att&cks
        for attack in cmd["attack"]:
            try:
                attck = await app.db_objects.get(db_model.attack_query, t_num=attack["t_num"])
                try:
                    await app.db_objects.get(db_model.attackcommand_query, command=command, attack=attck)
                except Exception as e:
                    # we got here so it doesn't exist, so create it and move on
                    await app.db_objects.create(ATTACKCommand, command=command, attack=attck)
            except Exception as attack_e:
                from app.api.operation_api import send_all_operations_message
                asyncio.create_task(send_all_operations_message(
                    message=f"Failed to find ATT&CK number {attack['t_num']} for {command.cmd} in {command.payload_type.ptype}",
                    level="warning"
                ))
        # now process the command file
        for sync_script in cmd["browser_script"]:
            # we want to create a new script for the new ui
            script = await app.db_objects.create(
                db_model.BrowserScript,
                script=sync_script["script"],
                container_version=sync_script["script"],
                payload_type=payload_type,
                command=command,
                author=sync_script["author"],
                container_version_author=sync_script["author"],
                for_new_ui=sync_script["for_new_ui"]
            )
            # now loop through all users
            operators = await app.db_objects.execute(
                db_model.operator_query.where(db_model.Operator.deleted == False)
            )
            for op in operators:
                await app.db_objects.create(
                    db_model.BrowserScript,
                    script=sync_script["script"],
                    container_version=sync_script["script"],
                    operator=op,
                    payload_type=payload_type,
                    command=command,
                    author=sync_script["author"],
                    container_version_author=sync_script["author"],
                    for_new_ui=sync_script["for_new_ui"]
                )


async def add_update_opsec_for_command(command, data):
    if command.opsec is not None:
        if data["opsec"] == {}:
            # we're wanting to just remove the opsec component
            command.opsec = None
        else:
            command.opsec.injection_method = data["opsec"]["injection_method"]
            command.opsec.process_creation = data["opsec"]["process_creation"]
            command.opsec.authentication = data["opsec"]["authentication"]
            await app.db_objects.update(command.opsec)
    elif data["opsec"] == {}:
        return
    else:
        # command.opsec is None and we have "opsec" data to register
        try:
            opsec = await app.db_objects.create(db_model.CommandOPSEC, **data["opsec"])
            command.opsec = opsec
        except Exception as e:
            logger.warning("Failed to create OPSEC for command: " + str(e))
