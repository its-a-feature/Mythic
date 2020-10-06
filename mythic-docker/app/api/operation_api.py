from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import OperatorOperation, DisabledCommandsProfile
import base64
from sanic_jwt.decorators import scoped, inject_user
from sanic.exceptions import abort
import app.database_models.model as db_model
from app.api.browserscript_api import remove_admin_browserscripts


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
        query = await db_model.operation_query()
        operations = await db_objects.execute(query)
        query = await db_model.operatoroperation_query()
        for o in operations:
            if user["admin"] or o.name in user["operations"]:
                operatorsmap = await db_objects.execute(
                    query.where(OperatorOperation.operation == o)
                )
                ojson = o.to_json()
                ojson.pop("AESPSK", None)
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=op)
        if (
            operation.name in user["operations"]
            or operation.name in user["admin_operations"]
        ):
            query = await db_model.operatoroperation_query()
            operatorsmap = await db_objects.execute(
                query.where(OperatorOperation.operation == operation)
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
    query = await db_model.operator_query()
    adder = await db_objects.get(query, username=user["username"])
    for operator in users:
        try:
            op = await db_objects.get(query, username=operator["username"])
        except Exception as e:
            return {"status": "error", "error": "failed to find user"}
        try:
            if op.current_operation is None:
                op.current_operation = operation
                await db_objects.update(op)
            if "view_mode" not in operator:
                operator["view_mode"] = "operator"
            elif operator["view_mode"] not in ["operator", "developer", "spectator"]:
                operator["view_mode"] = "operator"
            map = await db_objects.create(
                OperatorOperation,
                operator=op,
                operation=operation,
                view_mod=operator["view_mode"],
            )
            await db_objects.create(
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
        query = await db_model.operation_query()
        operation = await db_objects.get(query, id=op)
    except Exception as e:
        return json({"status": "error", "error": "failed to find operation"})
    if operation.name in user["admin_operations"] or user["admin"]:
        data = request.json
        query = await db_model.operator_query()
        modifier = await db_objects.get(query, username=user["username"])
        if "name" in data and data["name"] not in ["", "null", None]:
            operation.name = data["name"]
        if "admin" in data and data["admin"] != operation.admin.username:
            try:
                query = await db_model.operator_query()
                new_admin = await db_objects.get(query, username=data["admin"])
                await remove_admin_browserscripts(operation.admin, operation)
                operation.admin = new_admin
                await db_objects.update(operation)
                await db_objects.create(
                    db_model.OperationEventLog,
                    operation=operation,
                    message="{} made {} the operation admin".format(
                        modifier.username, new_admin.username
                    ),
                )
            except Exception as e:
                print(e)
                return json({"status": "error", "error": "failed to update the admin"})
        if "add_members" in data:
            for new_member in data["add_members"]:
                try:
                    query = await db_model.operator_query()
                    operator = await db_objects.get(
                        query, username=new_member["username"]
                    )
                    if operator.current_operation is None:
                        operator.current_operation = operation
                        await db_objects.update(operator)
                    if "view_mode" not in new_member:
                        new_member["view_mode"] = "operator"
                    elif new_member["view_mode"] not in [
                        "operator",
                        "developer",
                        "spectator",
                    ]:
                        new_member["view_mode"] = "operator"
                    try:
                        map = await db_objects.get(
                            OperatorOperation, operator=operator, operation=operation
                        )
                        map.view_mode = new_member["view_mode"]
                        await db_objects.update(map)
                        await db_objects.create(
                            db_model.OperationEventLog,
                            operation=operation,
                            message="{} updated {} view mode to {}".format(
                                modifier.username,
                                operator.username,
                                new_member["view_mode"],
                            ),
                        )
                    except Exception as e:
                        map = await db_objects.create(
                            OperatorOperation,
                            operator=operator,
                            operation=operation,
                            view_mode=new_member["view_mode"],
                        )
                        await db_objects.create(
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
                    query = await db_model.operator_query()
                    operator = await db_objects.get(query, username=old_member)
                    query = await db_model.operatoroperation_query()
                    operatoroperation = await db_objects.get(
                        query, operator=operator, operation=operation
                    )
                    # don't remove the admin of an operation
                    if operation.admin.username != operator.username:
                        # if this operation is set as that user's current_operation, nullify it
                        if operator.current_operation == operation:
                            operator.current_operation = None
                            await db_objects.update(operator)
                        await db_objects.delete(operatoroperation)
                        await db_objects.create(
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
                query = await db_model.operator_query()
                operator = await db_objects.get(query, username=user["username"])
                query = await db_model.operatoroperation_query()
                operatoroperation = await db_objects.get(
                    query, operator=operator, operation=operation
                )
                query = await db_model.disabledcommandsprofile_query()
                try:
                    disabled_profile = await db_objects.get(
                        query, name=user["base_disabled_commands"]
                    )
                    operatoroperation.base_disabled_commands = disabled_profile
                    await db_objects.create(
                        db_model.OperationEventLog,
                        operation=operation,
                        message=f"{modifier.username} updated {operator.username}'s disabled command list to {disabled_profile.name}",
                    )
                except Exception as e:
                    operatoroperation.base_disabled_commands = None
                    await db_objects.create(
                        db_model.OperationEventLog,
                        operation=operation,
                        message=f"{modifier.username} removed {operator.username}'s disabled command list",
                    )
                await db_objects.update(operatoroperation)
        if "webhook" in data:
            if (data["webhook"] == "" or data["webhook"] is None) and (
                operation.webhook is not None and operation.webhook != ""
            ):
                operation.webhook = None
                await db_objects.create(
                    db_model.OperationEventLog,
                    operation=operation,
                    message="{} removed Operation webhook".format(modifier.username),
                )
            elif data["webhook"] != "":
                operation.webhook = data["webhook"]
                if operation.webhook is not None:
                    await db_objects.create(
                        db_model.OperationEventLog,
                        operation=operation,
                        message="{} added operation webhook: {}".format(
                            modifier.username, data["webhook"]
                        ),
                    )
        if "complete" in data:
            operation.complete = data["complete"]
        try:
            await db_objects.update(operation)
        except Exception as e:
            return json({"status": "error", "error": str(e)})
        all_users = []
        query = await db_model.operatoroperation_query()
        current_members = await db_objects.execute(
            query.where(OperatorOperation.operation == operation)
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
        ojson.pop("AESPSK", None)
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

            query = await db_model.operator_query()
            modifier = await db_objects.get(query, username=user["username"])
            query = await db_model.operator_query()
            new_admin = await db_objects.get(query, username=data["admin"])
            operation = await db_objects.create(
                db_model.Operation,
                name=data["name"],
                admin=new_admin,
                AESPSK=await create_key_AES256(),
            )
            await db_objects.create(
                db_model.OperationEventLog,
                operation=operation,
                message="{} created operation {}".format(
                    modifier.username, data["name"]
                ),
            )
            await db_objects.create(
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
                    query = await db_model.operator_query()
                    operator = await db_objects.get(
                        query, username=new_member["username"]
                    )
                    if operator.current_operation is None:
                        operator.current_operation = operation
                        await db_objects.update(operator)
                    map = await db_objects.create(
                        OperatorOperation,
                        operator=operator,
                        operation=operation,
                        view_mode=new_member["view_mode"],
                    )
                    added_members.append(new_member)
                    await db_objects.create(
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
        if "webhook" in data:
            if (data["webhook"] == "" or data["webhook"] is None) and (
                operation.webhook is not None and operation.webhook != ""
            ):
                operation.webhook = None
                await db_objects.create(
                    db_model.OperationEventLog,
                    operation=operation,
                    message="{} removed operation webhook".format(modifier.username),
                )
            elif data["webhook"] != "":
                operation.webhook = data["webhook"]
                await db_objects.create(
                    db_model.OperationEventLog,
                    operation=operation,
                    message="{} added operation webhook: {}".format(
                        modifier.username, data["webhook"]
                    ),
                )
        await db_objects.update(operation)
        return json(
            {"status": "success", "members": added_members, **operation.to_json()}
        )
    else:
        return json({"status": "error", "error": "not authorized to make the change"})


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
        query = await db_model.disabledcommandsprofile_query()
        disabled_command_profiles = await db_objects.execute(query)
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
                query = await db_model.payloadtype_query()
                payload_type = await db_objects.get(query, ptype=ptype)
                for cmd in data[name][ptype]:
                    query = await db_model.command_query()
                    command = await db_objects.get(
                        query, cmd=cmd, payload_type=payload_type
                    )
                    try:
                        profile = await db_objects.create(
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
    + "/operations/disabled_commands_profiles/<profile:string>",
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
        query = await db_model.disabledcommandsprofile_query()
        commands_profile = await db_objects.execute(
            query.where(DisabledCommandsProfile.name == profile)
        )
        # make sure that the mapping is gone from operatoroperation.base_disabled_commands
        query = await db_model.operatoroperation_query()
        operator_operation_mapping = await db_objects.execute(
            query.where(DisabledCommandsProfile.name == profile)
        )
        for o in operator_operation_mapping:
            o.base_disabled_commands = None
            await db_objects.update(o)
        for c in commands_profile:
            await db_objects.delete(c)

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
        print(data)
        disabled_profile_query = await db_model.disabledcommandsprofile_query()
        for name in data:
            current_commands = await db_objects.execute(
                disabled_profile_query.where(
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
                await db_objects.delete(r)
            # we need to add everything still in data
            for ptype in data[name]:
                query = await db_model.payloadtype_query()
                payload_type = await db_objects.get(query, ptype=ptype)
                for cmd in data[name][ptype]:
                    query = await db_model.command_query()
                    command = await db_objects.get(
                        query, cmd=cmd, payload_type=payload_type
                    )
                    profile = await db_objects.create(
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


async def send_all_operations_message(message: str, level: str):
    query = await db_model.operation_query()
    operations = await db_objects.execute(query)
    for o in operations:
        await db_objects.create(
            db_model.OperationEventLog,
            operation=o,
            level=level,
            message=message,
        )