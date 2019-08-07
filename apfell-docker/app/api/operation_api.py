from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operation, OperatorOperation, DisabledCommandsProfile
from urllib.parse import unquote_plus
from sanic_jwt.decorators import scoped, inject_user
from sanic.exceptions import abort
import os
import shutil
from app.crypto import create_key_AES256
import app.database_models.model as db_model


@apfell.route(apfell.config['API_BASE'] + "/operations/", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_operations(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # we already get this information populated as part of our user authentication
    output = []
    if user['admin']:
        query = await db_model.operation_query()
        db_ops = await db_objects.execute(query)
        operations = [o.name for o in db_ops]
    else:
        operations = user['operations']
    for op in operations:
        # for each operation you're a member of, get all members and the admin name
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=op)
        data = operation.to_json()
        data['members'] = []
        added_users = []
        query = await db_model.operatoroperation_query()
        operationmap = await db_objects.execute(query.where(OperatorOperation.operation == operation))
        for map in operationmap:
            o = map.operator
            if o.username not in added_users:
                data['members'].append({**o.to_json(), 'base_disabled_commands': map.base_disabled_commands.name if map.base_disabled_commands is not None else map.base_disabled_commands})
                added_users.append(o.username)
        output.append(data)
    return json(output)


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_one_operation(request, user, op):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # get information about a single operation
    # first confirm that this authenticated user as permission to view the op
    #   side effect is that we confirm if the op is real or not
    op = unquote_plus(op)
    if op in user['operations']:
        # get all users associated with that operation and the admin
        operators = []
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=op)
        query = await db_model.operatoroperation_query()
        operatorsmap = await db_objects.execute(query.where(OperatorOperation.operation == operation))
        for operator in operatorsmap:
            o = operator.operator
            operators.append(o.username)
        status = {'status': 'success'}
        return json({**operation.to_json(), "members": operators, **status})
    else:
        return json({"status": 'error', 'error': 'failed to find operation or not authorized'})


@apfell.route(apfell.config['API_BASE'] + "/operations", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_operation(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # this will create a new operation (must be admin to do this)
    # needs a unique operation name, a user that will be admin
    # optionally, include a list of users that will be part of the operation
    if user['admin']:
        data = request.json
        if 'name' not in data:
            return json({'status': 'error', 'error': '"name" is a required parameter'})
        if 'admin' not in data:
            return json({'status': 'error', 'error': '"admin" operator name is a required parameter'})
        try:
            query = await db_model.operator_query()
            admin_operator = await db_objects.get(query, username=data['admin'])
        except Exception as e:
            return json({'status': 'error', 'error': 'admin operator does not exist'})
        try:
            AESPSK =await create_key_AES256()
            operation = await db_objects.create(Operation, name=data['name'], admin=admin_operator,
                                                AESPSK=AESPSK)
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to create operation, is the name unique?'})
        if 'members' not in data or data['members'] is None:
            data['members'] = [data['admin']]
        elif data['admin'] not in data['members']:
            data['members'].append(data['admin'])
        status = await add_user_to_operation_func(operation, data['members'])
        if status['status'] == 'success':
            if not os.path.exists("./app/payloads/operations/{}".format(data['name'])):
                os.makedirs("./app/payloads/operations/{}".format(data['name']), exist_ok=True)
            return json({'status': 'success', **operation.to_json(), 'members': data['members']})
        else:
            await db_objects.delete(operation, recursive=True)
            return json({'status': 'error', 'error': status['error']})
    else:
        return json({'status': 'error', 'error': 'must be admin to create new operations'})


async def add_user_to_operation_func(operation, users):
    # this take an operation object and a list of users (string) and adds them to the operation
    for operator in users:
        try:
            query = await db_model.operator_query()
            op = await db_objects.get(query, username=operator)
        except Exception as e:
            return {'status': 'error', 'error': 'failed to find user'}
        try:
            map = await db_objects.create(OperatorOperation, operator=op, operation=operation)
        except Exception as e:
            return {'status': 'error', 'error': 'failed to add user to operation'}
    return {'status': 'success'}


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_operation(request, user, op):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # this can change the name (assuming it's still unique), ['name']
    # this can change the admin user assuming the person submitting is the current admin or overall admin ['admin']
    # this can change the users ['add_users'], ['remove_users']
    op = unquote_plus(op)
    if op in user['admin_operations'] or user['admin']:
        data = request.json
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=op)
        if not operation.complete:
            if 'admin' in data:
                try:
                    query = await db_model.operator_query()
                    new_admin = await db_objects.get(query, username=data['admin'])
                    operation.admin = new_admin
                    await db_objects.update(operation)
                except Exception as e:
                    return json({'status': 'error', 'error': 'failed to update the admin'})
            if 'add_members' in data:
                for new_member in data['add_members']:
                    try:
                        query = await db_model.operator_query()
                        operator = await db_objects.get(query, username=new_member)
                        map = await db_objects.create(OperatorOperation, operator=operator, operation=operation)
                    except Exception as e:
                        return json({'status': 'error', 'error': 'failed to add user {} to the operation'.format(new_member)})
            if 'remove_members' in data:
                for old_member in data['remove_members']:
                    try:
                        query = await db_model.operator_query()
                        operator = await db_objects.get(query, username=old_member)
                        query = await db_model.operatoroperation_query()
                        operatoroperation = await db_objects.get(query, operator=operator, operation=operation)
                        # don't remove the admin of an operation
                        if operation.admin.username != operator.username:
                            # if this operation is set as that user's current_operation, nullify it
                            if operator.current_operation == operation:
                                operator.current_operation = None
                                await db_objects.update(operator)
                            await db_objects.delete(operatoroperation)
                    except Exception as e:
                        print("got exception: " + str(e))
                        return json({'status': 'error', 'error': 'failed to remove: ' + old_member + "\nAdded: " + str(data['add_users'])})
            if 'add_disabled_commands' in data:
                for user in data['add_disabled_commands']:
                    query = await db_model.operator_query()
                    operator = await db_objects.get(query, username=user['username'])
                    query = await db_model.operatoroperation_query()
                    operatoroperation = await db_objects.get(query, operator=operator, operation=operation)
                    query = await db_model.disabledcommandsprofile_query()
                    try:
                        disabled_profile = await db_objects.get(query, name=user['base_disabled_commands'])
                        operatoroperation.base_disabled_commands = disabled_profile
                    except Exception as e:
                        print("failed to find disabled commands profile")
                        operatoroperation.base_disabled_commands = None
                    await db_objects.update(operatoroperation)
            all_users = []
            query = await db_model.operatoroperation_query()
            current_members = await db_objects.execute(query.where(OperatorOperation.operation == operation))
            for mem in current_members:
                member = mem.operator
                all_users.append(member.to_json())
            if 'complete' in data:
                operation.complete = data['complete']
                await db_objects.update(operation)
            return json({'status': 'success', 'members': all_users, **operation.to_json()})
        elif 'complete' in data and data['complete'] is False:
            operation.complete = False
            await db_objects.update(operation)
            return json({'status': 'success', **operation.to_json()})
        else:
            return json({'status': 'error', 'error': 'operation is complete and cannot be modified'})
    else:
        return json({'status': 'error', 'error': 'not authorized to make the change'})


@apfell.route(apfell.config['API_BASE'] + "/operations/<op:string>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_operation(request, user, op):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # only the admin of an operation or an overall admin can delete an operation
    op = unquote_plus(op)
    if op in user['admin_operations'] or user['admin']:
        try:
            query = await db_model.operation_query()
            operation = await db_objects.get(query, name=op)
            # Need to go through and delete all the things that relate to this operation, then delete the operation
            # callbacks, payloads, profiles, mappings (operatoroperation, payloadtypec2profile), tasks, responses
            await db_objects.delete(operation, recursive=True)
            try:
                # delete the operation's files (downloads, uploads, and screenshots)
                shutil.rmtree("./app/files/{}".format(operation.name))
            except Exception as e:
                pass
            try:
                # delete the operation's created payload files
                shutil.rmtree("./app/payloads/operations/{}".format(operation.name))
            except Exception as e:
                pass
            return json({'status': 'success', **operation.to_json()})
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to delete operation'})
    return json({'status': 'error', 'error': 'Not authorized to delete the operation'})


# ######## deal with operation ACLS for operators and track which commands they can or cannot do #################

@apfell.route(apfell.config['API_BASE'] + "/operations/disabled_commands_profiles", methods=['GET'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def get_all_disabled_commands_profiles(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
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
            command_groupings[dcp.name][dcp.command.payload_type.ptype].append(dcp.to_json())
        return json({'status': 'success', "disabled_command_profiles": command_groupings})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get disabled command profiles'})


@apfell.route(apfell.config['API_BASE'] + "/operations/disabled_commands_profile", methods=['POST'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def create_disabled_commands_profile(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # only the admin of an operation or an overall admin can delete an operation
    try:
        if not user['admin']:
            return json({"status": 'error', 'error': 'Must be an Apfell admin to create disabled command profiles'})
        data = request.json
        added_acl = []
        # {"profile_name": {"payload type": [command name, command name 2], "Payload type 2": [] }
        for name in data:
            for ptype in data[name]:
                query = await db_model.payloadtype_query()
                payload_type = await db_objects.get(query, ptype=ptype)
                for cmd in data[name][ptype]:
                    query = await db_model.command_query()
                    command = await db_objects.get(query, cmd=cmd, payload_type=payload_type)
                    profile = await db_objects.create(DisabledCommandsProfile, name=name, command=command)
                    added_acl.append(profile.to_json())
        return json({'status': 'success', 'disabled_command_profile': added_acl })

    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to create disabled command profile'})


@apfell.route(apfell.config['API_BASE'] + "/operations/disabled_commands_profiles/<profile:string>", methods=['DELETE'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def delete_disabled_commands_profile(request, user, profile):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # only the admin of an operation or an overall admin can delete an operation
    try:
        profile = unquote_plus(profile)
        if not user['admin']:
            return json({'status': 'error', 'error': 'Must be an Apfell admin to delete command profiles'})
        query = await db_model.disabledcommandsprofile_query()
        commands_profile = await db_objects.execute(query.where(DisabledCommandsProfile.name == profile))
        for c in commands_profile:
            await db_objects.delete(c)
        return json({"status": 'success', "name": profile})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to delete disabled command profile'})


@apfell.route(apfell.config['API_BASE'] + "/operations/disabled_commands_profile", methods=['PUT'])
@inject_user()
@scoped(['auth:user', 'auth:apitoken_user'], False)  # user or user-level api token are ok
async def update_disabled_commands_profile(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    # only the admin of an operation or an overall admin can delete an operation
    try:
        if not user['admin']:
            return json({"status": 'error', 'error': 'Must be an Apfell admin to create disabled command profiles'})
        data = request.json
        added_acl = []
        # {"profile_name": {"payload type": [command name, command name 2], "Payload type 2": [] }
        disabled_profile_query = await db_model.disabledcommandsprofile_query()
        for name in data:
            for ptype in data[name]:
                query = await db_model.payloadtype_query()
                payload_type = await db_objects.get(query, ptype=ptype)
                for cmd in data[name][ptype]:
                    query = await db_model.command_query()
                    command = await db_objects.get(query, cmd=cmd['cmd'], payload_type=payload_type)
                    if cmd['disabled']:
                        # its set to be disabled, try to get it, if it doesn't exist, create it
                        try:
                            profile = await db_objects.get(disabled_profile_query, name=name, command=command)
                        except Exception as e:
                            profile = await db_objects.create(DisabledCommandsProfile, name=name, command=command)
                        added_acl.append(profile.to_json())
                    else:
                        # this is set to be true, so check if it exists. if it does, we need to delete it
                        try:
                            profile = await db_objects.get(disabled_profile_query, name=name, command=command)
                            await db_objects.delete(profile)
                        except Exception as e:
                            pass
        return json({'status': 'success', 'disabled_command_profile': added_acl })
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to create disabled command profile'})