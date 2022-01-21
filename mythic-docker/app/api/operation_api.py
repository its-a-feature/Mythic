from app import mythic
import app
from sanic.response import json
from app.database_models.model import OperatorOperation, DisabledCommandsProfile
import base64
from sanic_jwt.decorators import scoped, inject_user
from sanic.exceptions import abort
import app.database_models.model as db_model
from app.api.browserscript_api import remove_admin_browserscripts
import uuid
from sanic.log import logger


@mythic.route(mythic.config["API_BASE"] + "/operations", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_operation(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    output = []
    try:
        operations = await app.db_objects.execute(db_model.operation_query)
        for o in operations:
            if user["admin"] or o.name in user["operations"]:
                operatorsmap = await app.db_objects.execute(
                    db_model.operatoroperation_query.where(OperatorOperation.operation == o)
                )
                ojson = o.to_json()
                ojson["members"] = []
                for map in operatorsmap:
                    data = {
                        "username": map.operator.username,
                        "view_mode": map.view_mode,
                    }
                    if map.base_disabled_commands is not None:
                        data["base_disabled_commands"] = map.base_disabled_commands.name
                    else:
                        data["base_disabled_commands"] = None
                    ojson["members"].append(data)
                output.append(ojson)
        return json({"status": "success", "output": output})
    except Exception as e:
        return json(
            {
                "status": "error",
                "error": "Failed to get operation information: " + str(e),
            }
        )


@mythic.route(mythic.config["API_BASE"] + "/operations/<op:int>", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_one_operation(request, user, op):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # get information about a single operation
    # first confirm that this authenticated user as permission to view the op
    #   side effect is that we confirm if the op is real or not
    try:
        # get all users associated with that operation and the admin
        operators = []
        operation = await app.db_objects.get(db_model.operation_query, id=op)
        if (
            operation.name in user["operations"]
            or operation.name in user["admin_operations"]
            or user["admin"]
        ):
            operatorsmap = await app.db_objects.execute(
                db_model.operatoroperation_query.where(OperatorOperation.operation == operation)
            )
            for operator in operatorsmap:
                o = operator.operator
                data = {"username": o.username, "view_mode": operator.view_mode}
                if operator.base_disabled_commands is not None:
                    data[
                        "base_disabled_commands"
                    ] = operator.base_disabled_commands.name
                else:
                    data["base_disabled_commands"] = None
                operators.append(data)
            status = {"status": "success"}
            return json({**operation.to_json(), "members": operators, **status})
        else:
            return json(
                {
                    "status": "error",
                    "error": "failed to find operation or not authorized",
                }
            )
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find operation"})


async def add_user_to_operation_func(operation, users, user):
    # this take an operation object and a list of users (string) and adds them to the operation
    adder = await app.db_objects.get(db_model.operator_query, username=user["username"])
    for operator in users:
        try:
            op = await app.db_objects.get(db_model.operator_query, username=operator["username"])
        except Exception as e:
            return {"status": "error", "error": "failed to find user"}
        try:
            if op.current_operation is None:
                op.current_operation = operation
                await app.db_objects.update(op)
            if "view_mode" not in operator:
                operator["view_mode"] = "operator"
            elif operator["view_mode"] not in ["operator", "developer", "spectator"]:
                operator["view_mode"] = "operator"
            map = await app.db_objects.create(
                OperatorOperation,
                operator=op,
                operation=operation,
                view_mod=operator["view_mode"],
            )
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="{} added {} to operation as {}".format(
                    adder.username, op.username, operator["view_mode"]
                ),
            )
        except Exception as e:
            return {"status": "error", "error": "failed to add user to operation"}
    return {"status": "success"}


@mythic.route(mythic.config["API_BASE"] + "/operations/<op:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_operation(request, user, op):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # this can change the name (assuming it's still unique), ['name']
    # this can change the admin user assuming the person submitting is the current admin or overall admin ['admin']
    # this can change the users ['add_users'], ['remove_users']
    try:
        operation = await app.db_objects.get(db_model.operation_query, id=op)
    except Exception as e:
        return json({"status": "error", "error": "failed to find operation"})
    if operation.name in user["admin_operations"] or user["admin"]:
        data = request.json
        modifier = await app.db_objects.get(db_model.operator_query, username=user["username"])
        if "name" in data and data["name"] not in ["", "null", None]:
            operation.name = data["name"]
        if "admin" in data and data["admin"] != operation.admin.username:
            try:
                new_admin = await app.db_objects.get(db_model.operator_query, username=data["admin"])
                await remove_admin_browserscripts(operation.admin, operation)
                operation.admin = new_admin
                await app.db_objects.update(operation)
                await app.db_objects.create(
                    db_model.OperationEventLog,
                    operation=operation,
                    message="{} made {} the operation admin".format(
                        modifier.username, new_admin.username
                    ),
                )
            except Exception as e:
                print(str(e))
                return json({"status": "error", "error": "failed to update the admin"})
        if "add_members" in data:
            for new_member in data["add_members"]:
                try:
                    operator = await app.db_objects.get(
                        db_model.operator_query, username=new_member["username"]
                    )
                    if operator.current_operation is None:
                        operator.current_operation = operation
                        await app.db_objects.update(operator)
                    if "view_mode" not in new_member:
                        new_member["view_mode"] = "operator"
                    elif new_member["view_mode"] not in [
                        "operator",
                        "developer",
                        "spectator",
                    ]:
                        new_member["view_mode"] = "operator"
                    try:
                        map = await app.db_objects.get(
                            OperatorOperation, operator=operator, operation=operation
                        )
                        if map.view_mode != new_member["view_mode"]:
                            map.view_mode = new_member["view_mode"]
                            await app.db_objects.update(map)
                            await app.db_objects.create(
                                db_model.OperationEventLog,
                                operation=operation,
                                message="{} updated {} view mode to {}".format(
                                    modifier.username,
                                    operator.username,
                                    new_member["view_mode"],
                                ),
                            )
                    except Exception as e:
                        map = await app.db_objects.create(
                            OperatorOperation,
                            operator=operator,
                            operation=operation,
                            view_mode=new_member["view_mode"],
                        )
                        await app.db_objects.create(
                            db_model.OperationEventLog,
                            operation=operation,
                            message="{} added {} to operation with view mode {}".format(
                                modifier.username,
                                operator.username,
                                new_member["view_mode"],
                            ),
                        )
                except Exception as e:
                    return json(
                        {
                            "status": "error",
                            "error": "failed to add user {} to the operation".format(
                                new_member
                            ),
                        }
                    )
        if "remove_members" in data:
            for old_member in data["remove_members"]:
                try:
                    operator = await app.db_objects.get(db_model.operator_query, username=old_member)
                    operatoroperation = await app.db_objects.get(
                        db_model.operatoroperation_query, operator=operator, operation=operation
                    )
                    # don't remove the admin of an operation
                    if operation.admin.username != operator.username:
                        # if this operation is set as that user's current_operation, nullify it
                        if operator.current_operation == operation:
                            operator.current_operation = None
                            await app.db_objects.update(operator)
                        await app.db_objects.delete(operatoroperation)
                        await app.db_objects.create(
                            db_model.OperationEventLog,
                            operation=operation,
                            message="{} removed {} from operation".format(
                                modifier.username, operator.username
                            ),
                        )
                except Exception as e:
                    print("got exception: " + str(e))
                    return json(
                        {
                            "status": "error",
                            "error": "failed to remove: "
                            + old_member
                            + "\nAdded: "
                            + str(data["add_users"]),
                        }
                    )
        if "add_disabled_commands" in data:
            for user in data["add_disabled_commands"]:
                operator = await app.db_objects.get(db_model.operator_query, username=user["username"])
                operatoroperation = await app.db_objects.get(
                    db_model.operatoroperation_query, operator=operator, operation=operation
                )
                try:
                    disabled_profile = await app.db_objects.get(
                        db_model.disabledcommandsprofile_query, name=user["base_disabled_commands"]
                    )
                    operatoroperation.base_disabled_commands = disabled_profile
                    await app.db_objects.create(
                        db_model.OperationEventLog,
                        operation=operation,
                        message=f"{modifier.username} updated {operator.username}'s disabled command list to {disabled_profile.name}",
                    )
                except Exception as e:
                    operatoroperation.base_disabled_commands = None
                    await app.db_objects.create(
                        db_model.OperationEventLog,
                        operation=operation,
                        message=f"{modifier.username} removed {operator.username}'s disabled command list",
                    )
                await app.db_objects.update(operatoroperation)
        if "webhook" in data:
            if (data["webhook"] == "" or data["webhook"] is None) and (
                operation.webhook != ""
            ):
                operation.webhook = ""
                await app.db_objects.create(
                    db_model.OperationEventLog,
                    operation=operation,
                    message="{} removed Operation webhook".format(modifier.username),
                )
            elif data["webhook"] != "" and data["webhook"] != operation.webhook:
                operation.webhook = data["webhook"]
                await app.db_objects.create(
                    db_model.OperationEventLog,
                    operation=operation,
                    message="{} set operation webhook to {}".format(
                        modifier.username, data["webhook"]
                    ),
                )
        if "channel" in data and data["channel"] != operation.channel:
            operation.channel = data["channel"]
        if "display_name" in data and data["display_name"] != operation.display_name:
            operation.display_name = data["display_name"]
        if "icon_emoji" in data and data["icon_emoji"] != operation.icon_emoji:
            operation.icon_emoji = data["icon_emoji"]
        if "icon_url" in data and data["icon_url"] != operation.icon_url:
            operation.icon_url = data["icon_url"]
        if "webhook_message" in data and data["webhook_message"] != operation.webhook_message:
            operation.webhook_message = data["webhook_message"]
        if "complete" in data:
            operation.complete = data["complete"]
        try:
            await app.db_objects.update(operation)
        except Exception as e:
            return json({"status": "error", "error": str(e)})
        all_users = []
        current_members = await app.db_objects.execute(
            db_model.operatoroperation_query.where(OperatorOperation.operation == operation)
        )
        for mem in current_members:
            member = mem.operator
            data = {"username": member.username, "view_mode": mem.view_mode}
            if mem.base_disabled_commands is not None:
                data["base_disabled_commands"] = mem.base_disabled_commands.name
            else:
                data["base_disabled_commands"] = None
            all_users.append(data)
        ojson = operation.to_json()
        return json({"status": "success", "members": all_users, **ojson})
    else:
        return json({"status": "error", "error": "not authorized to make the change"})


@mythic.route(mythic.config["API_BASE"] + "/operations/", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_operation(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # this can change the name (assuming it's still unique), ['name']
    # this can change the admin user assuming the person submitting is the current admin or overall admin ['admin']
    # this can change the users ['add_users'], ['remove_users']
    if user["admin"]:
        data = request.json
        if "name" not in data or data["name"] == "":
            return json({"status": "error", "error": "Operation must have a name"})
        if "admin" not in data:
            return json({"status": "error", "error": "Operation must have an admin"})
        try:
            from app.crypto import create_key_AES256

            modifier = await app.db_objects.get(db_model.operator_query, username=user["username"])
            new_admin = await app.db_objects.get(db_model.operator_query, username=data["admin"])
            operation = await app.db_objects.create(
                db_model.Operation,
                name=data["name"],
                admin=new_admin,
            )
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="{} created operation {}".format(
                    modifier.username, data["name"]
                ),
            )
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="{} made {} the operation admin".format(
                    modifier.username, new_admin.username
                ),
            )
        except Exception as e:
            print(e)
            return json(
                {"status": "error", "error": "Error creating operation: " + str(e)}
            )
        added_members = []
        if "members" in data:
            if len(data["members"]) == 0:
                data["members"] = [{"username": data["admin"], "view_mode": "operator"}]
            # make sure the admin is added in as a member, weird otherwise
            found_admin = False
            for m in data["members"]:
                if m["username"] == data["admin"]:
                    found_admin = True
            if not found_admin:
                data["members"].append(
                    {"username": data["admin"], "view_mode": "operator"}
                )
            for new_member in data["members"]:
                try:
                    operator = await app.db_objects.get(
                        db_model.operator_query, username=new_member["username"]
                    )
                    if operator.current_operation is None:
                        operator.current_operation = operation
                        await app.db_objects.update(operator)
                    map = await app.db_objects.create(
                        OperatorOperation,
                        operator=operator,
                        operation=operation,
                        view_mode=new_member["view_mode"],
                    )
                    added_members.append(new_member)
                    await app.db_objects.create(
                        db_model.OperationEventLog,
                        operation=operation,
                        message="{} added {} to operation with view mode {}".format(
                            modifier.username,
                            operator.username,
                            new_member["view_mode"],
                        ),
                    )
                except Exception as e:
                    print(e)
                    return json(
                        {
                            "status": "error",
                            "error": "failed to add user {} to the operation".format(
                                new_member
                            ),
                        }
                    )
        if "webhook" in data and data["webhook"] != "":
            operation.webhook = data["webhook"]
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="{} added operation webhook: {}".format(
                    modifier.username, data["webhook"]
                ),
            )
        if "channel" in data:
            operation.channel = data["channel"]
        if "display_name" in data:
            operation.display_name = data["display_name"]
        if "icon_emoji" in data:
            operation.icon_emoji = data["icon_emoji"]
        if "icon_url" in data:
            operation.icon_url = data["icon_url"]
        if "webhook_message" in data:
            operation.webhook_message = data["webhook_message"]
        await app.db_objects.update(operation)
        return json(
            {"status": "success", "members": added_members, **operation.to_json()}
        )
    else:
        return json({"status": "error", "error": "not authorized to make the change"})


@mythic.route(mythic.config["API_BASE"] + "/create_operation_webhook", methods=["POST"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_operation_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # this can change the name (assuming it's still unique), ['name']
    # this can change the admin user assuming the person submitting is the current admin or overall admin ['admin']
    # this can change the users ['add_users'], ['remove_users']
    if user["admin"]:
        data = request.json["input"]
        if "admin" not in data:
            data["admin"] = user["id"]
        try:
            from app.crypto import create_key_AES256

            modifier = await app.db_objects.get(db_model.operator_query, id=user["id"])
            new_admin = await app.db_objects.get(db_model.operator_query, id=data["admin"])
            if "name" not in data or data["name"] == "":
                data["name"] = f"Operation {new_admin.username}"
            operation = await app.db_objects.create(
                db_model.Operation,
                name=data["name"],
                admin=new_admin,
            )
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="{} created operation {}".format(
                    modifier.username, data["name"]
                ),
            )
            await app.db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="{} made {} the operation admin".format(
                    modifier.username, new_admin.username
                ),
            )
        except Exception as e:
            print(e)
            return json(
                {"status": "error", "error": "Error creating operation: " + str(e)}
            )
        try:
            if new_admin.current_operation is None:
                new_admin.current_operation = operation
                await app.db_objects.update(new_admin)
            map = await app.db_objects.create(
                OperatorOperation,
                operator=new_admin,
                operation=operation,
                view_mode="lead",
            )
        except Exception as e:
            print(e)
            return json(
                {
                    "status": "error",
                    "error": "failed to add user {} to the operation".format(
                        new_admin.username
                    ),
                }
            )
        await app.db_objects.update(operation)
        return json(
            {"status": "success", "operation_id": operation.id}
        )
    else:
        return json({"status": "error", "error": "not authorized to make new operations"})

# ######## deal with operation ACLS for operators and track which commands they can or cannot do #################


@mythic.route(
    mythic.config["API_BASE"] + "/operations/disabled_commands_profiles",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_disabled_commands_profiles(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # only the admin of an operation or an overall admin can delete an operation
    try:
        disabled_command_profiles = await app.db_objects.execute(db_model.disabledcommandsprofile_query)
        command_groupings = {}
        for dcp in disabled_command_profiles:
            if dcp.name not in command_groupings:
                command_groupings[dcp.name] = {}
            if dcp.command.payload_type.ptype not in command_groupings[dcp.name]:
                command_groupings[dcp.name][dcp.command.payload_type.ptype] = []
            command_groupings[dcp.name][dcp.command.payload_type.ptype].append(
                dcp.to_json()
            )
        return json(
            {"status": "success", "disabled_command_profiles": command_groupings}
        )
    except Exception as e:
        print(e)
        return json(
            {"status": "error", "error": "failed to get disabled command profiles"}
        )


@mythic.route(
    mythic.config["API_BASE"] + "/operations/disabled_commands_profile",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def create_disabled_commands_profile(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # only the admin of an operation or an overall admin can delete an operation
    try:
        if not user["admin"]:
            return json(
                {
                    "status": "error",
                    "error": "Must be a Mythic admin to create disabled command profiles",
                }
            )
        data = request.json
        added_acl = []
        # {"profile_name": {"payload type": [command name, command name 2], "Payload type 2": [] }
        for name in data:
            if name == "":
                return json({"status": "error", "error": "name cannot be blank"})
            for ptype in data[name]:
                payload_type = await app.db_objects.get(db_model.payloadtype_query, ptype=ptype)
                for cmd in data[name][ptype]:
                    command = await app.db_objects.get(
                        db_model.command_query, cmd=cmd, payload_type=payload_type
                    )
                    try:
                        profile = await app.db_objects.create(
                            DisabledCommandsProfile, name=name, command=command
                        )
                        added_acl.append(profile.to_json())
                    except Exception as d:
                        pass
        return json({"status": "success", "disabled_command_profile": added_acl})

    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to create disabled command profile: " + str(e),
            }
        )


@mythic.route(
    mythic.config["API_BASE"]
    + "/operations/disabled_commands_profiles/<profile:str>",
    methods=["DELETE"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_disabled_commands_profile(request, user, profile):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # only the admin of an operation or an overall admin can delete an operation
    try:
        profile = base64.b64decode(profile).decode()
        if not user["admin"]:
            return json(
                {
                    "status": "error",
                    "error": "Must be a Mythic admin to delete command profiles",
                }
            )
        commands_profile = await app.db_objects.execute(
            db_model.disabledcommandsprofile_query.where(DisabledCommandsProfile.name == profile)
        )
        # make sure that the mapping is gone from operatoroperation.base_disabled_commands
        operator_operation_mapping = await app.db_objects.execute(
            db_model.operatoroperation_query.where(DisabledCommandsProfile.name == profile)
        )
        for o in operator_operation_mapping:
            o.base_disabled_commands = None
            await app.db_objects.update(o)
        for c in commands_profile:
            await app.db_objects.delete(c)

        return json({"status": "success", "name": profile})
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to delete disabled command profile: " + str(e),
            }
        )

@mythic.route(
    mythic.config["API_BASE"]
    + "/delete_disabled_command_profile_webhook",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_disabled_commands_profile_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # only the admin of an operation or an overall admin can delete an operation
    try:
        profile = request.json["input"]["name"]
        operator = await app.db_objects.get(db_model.operator_query, id=user["id"])
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        if operation.admin.id != operator.id:
            return json({"status": "error", "error": "Only the operational lead can delete block lists"})
        commands_profile = await app.db_objects.execute(
            db_model.disabledcommandsprofile_query.where(
                (DisabledCommandsProfile.name == profile) &
                (DisabledCommandsProfile.operation == operation)
            )
        )
        # make sure that the mapping is gone from operatoroperation.base_disabled_commands
        operator_operation_mapping = await app.db_objects.execute(
            db_model.operatoroperation_query.where(
                (DisabledCommandsProfile.name == profile) &
                (DisabledCommandsProfile.operation == operation) &
                (OperatorOperation.operation == operation)
            )
        )
        for o in operator_operation_mapping:
            o.base_disabled_commands = None
            await app.db_objects.update(o)
        for c in commands_profile:
            await app.db_objects.delete(c)
        return json({"status": "success", "name": profile})
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to delete disabled command profile: " + str(e),
            }
        )


@mythic.route(
    mythic.config["API_BASE"]
    + "/delete_disabled_command_profile_entry_webhook",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_disabled_commands_profile_entry_webhook(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # only the admin of an operation or an overall admin can delete an operation
    try:
        data_input = request.json["input"]
        operator = await app.db_objects.get(db_model.operator_query, id=user["id"])
        operation = await app.db_objects.get(db_model.operation_query, name=user["current_operation"])
        if operation.admin.id != operator.id:
            return json({"status": "error", "error": "Only the operational lead can delete block lists"})
        commands_profile = await app.db_objects.execute(
            db_model.disabledcommandsprofile_query.where(
                (DisabledCommandsProfile.name == data_input["name"]) &
                (DisabledCommandsProfile.operation == operation)
            )
        )
        # make sure that the mapping is gone from operatoroperation.base_disabled_commands if there are no more commands
        operator_operation_mapping = await app.db_objects.execute(
            db_model.operatoroperation_query.where(
                (DisabledCommandsProfile.name == data_input["name"]) &
                (DisabledCommandsProfile.operation == operation)
            )
        )
        remaining = True
        deleted_ids = []
        for c in commands_profile:
            if c.command.id in data_input["entries"]:
                deleted_ids.append(c.id)
                await app.db_objects.delete(c)
            else:
                remaining = False
        if not remaining:
            # this means we ended up deleting all of them, so need to remove the operator mappings
            for o in operator_operation_mapping:
                o.base_disabled_commands = None
                await app.db_objects.update(o)
        return json({"status": "success", "name": data_input["name"], "deleted_ids": deleted_ids})
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to delete disabled command profile: " + str(e),
            }
        )


@mythic.route(
    mythic.config["API_BASE"] + "/operations/disabled_commands_profile", methods=["PUT"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_disabled_commands_profile(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    # only the admin of an operation or an overall admin can delete an operation
    try:
        if not user["admin"]:
            return json(
                {
                    "status": "error",
                    "error": "Must be a Mythic admin to create disabled command profiles",
                }
            )
        data = request.json
        added_acl = []
        # {"profile_name": {"payload type": [command name, command name 2], "Payload type 2": [] }
        for name in data:
            current_commands = await app.db_objects.execute(
                db_model.disabledcommandsprofile_query.where(
                    db_model.DisabledCommandsProfile.name == name
                )
            )
            remove = []
            for cc in current_commands:
                if cc.command.payload_type.ptype not in data[name]:
                    # the payload type isn't even included anymore, so we're removing this command
                    remove.append(cc)
                    continue
                if cc.command.cmd in data[name][cc.command.payload_type.ptype]:
                    # the old command is still in the current list, so remove it and keep going on
                    data[name][cc.command.payload_type.ptype].remove(cc.command.cmd)
                    added_acl.append(cc.to_json())
                    continue
                # the payload_type is still listed, but the command isn't. mark it for removal
                remove.append(cc)
            # now we need to remove everything in 'remove'
            for r in remove:
                await app.db_objects.delete(r)
            # we need to add everything still in data
            for ptype in data[name]:
                payload_type = await app.db_objects.get(db_model.payloadtype_query, ptype=ptype)
                for cmd in data[name][ptype]:
                    command = await app.db_objects.get(
                        db_model.command_query, cmd=cmd, payload_type=payload_type
                    )
                    profile = await app.db_objects.create(
                        DisabledCommandsProfile, name=name, command=command
                    )
                    added_acl.append(profile.to_json())
        return json({"status": "success", "disabled_command_profile": added_acl})
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to create disabled command profile: " + str(e),
            }
        )


async def send_all_operations_message(message: str, level: str, source: str = "", operation=None):
    try:
        operations = await app.db_objects.execute(db_model.operation_query.where(db_model.Operation.complete == False))
        if source == "":
            source = str(uuid.uuid4())
        for o in operations:
            if operation is None or operation == o:
                try:
                    msg = await app.db_objects.count(db_model.operationeventlog_query.where(
                        (db_model.OperationEventLog.level == "warning") &
                        (db_model.OperationEventLog.source == source) &
                        (db_model.OperationEventLog.operation == o) &
                        (db_model.OperationEventLog.resolved == False) &
                        (db_model.OperationEventLog.deleted == False)
                    ).order_by(-db_model.OperationEventLog.id).limit(1))
                    if msg == 0:
                        await app.db_objects.create(
                            db_model.OperationEventLog,
                            operation=o,
                            level=level,
                            message=message,
                            source=source
                        )
                    else:
                        msg = await app.db_objects.execute(db_model.operationeventlog_query.where(
                            (db_model.OperationEventLog.level == "warning") &
                            (db_model.OperationEventLog.source == source) &
                            (db_model.OperationEventLog.operation == o) &
                            (db_model.OperationEventLog.resolved == False) &
                            (db_model.OperationEventLog.deleted == False)
                        ).order_by(-db_model.OperationEventLog.id).limit(1))
                        for m in msg:
                            m.count = m.count + 1
                            await app.db_objects.update(m)
                except Exception as e:
                    logger.warning("operation_api.py - send all messages: " + str(e))
    except Exception as b:
        logger.warning("operation_api.py - send all messages: " + str(b))


async def resolve_all_operations_message(message: str, operation=None):
    try:
        operations = await app.db_objects.execute(db_model.operation_query.where(db_model.Operation.complete == False))
        for o in operations:
            if operation is None or operation == o:
                try:
                    events = await app.db_objects.execute(db_model.operationeventlog_query.where(
                        (db_model.OperationEventLog.message.regexp(message)) &
                        (db_model.OperationEventLog.resolved == False) &
                        (db_model.OperationEventLog.level == "warning")
                    ))
                    for evt in events:
                        evt.resolved = True
                        await app.db_objects.update(evt)
                except Exception as e:
                    logger.warning("operation_api.py - send all messages: " + str(e))
    except Exception as b:
        logger.warning("operation_api.py - send all messages: " + str(b))