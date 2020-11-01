from app import mythic, db_objects
from sanic.response import json
from app.database_models.model import (
    C2Profile,
    PayloadTypeC2Profile,
    C2ProfileParameters,
    C2ProfileParametersInstance,
)
from urllib.parse import unquote_plus
from sanic_jwt.decorators import scoped, inject_user
import ujson as js
import app.database_models.model as db_model
from app.api.rabbitmq_api import send_c2_rabbitmq_message
from sanic.exceptions import abort
from exrex import getone
import uuid
from app.api.operation_api import send_all_operations_message
from app.crypto import create_key_AES256


# Get all the currently registered profiles
@mythic.route(mythic.config["API_BASE"] + "/c2profiles/", methods=["GET"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_c2profiles(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    #  this syntax is atrocious for getting a pretty version of the results from a many-to-many join table)
    query = await db_model.c2profile_query()
    all_profiles = await db_objects.execute(query.where(C2Profile.deleted == False))
    query = await db_model.payloadtypec2profile_query()
    profiles = await db_objects.execute(query)
    results = []
    inter = {}
    for p in all_profiles:
        inter[p.name] = p.to_json()
        # create an empty array for ptypes that we'll populate in the next for loop
        inter[p.name]["ptype"] = []
    for p in profiles:
        if p.c2_profile.name in inter:
            inter[p.c2_profile.name]["ptype"].append(
                {
                    "ptype": p.payload_type.ptype,
                    "supported_os": p.payload_type.supported_os,
                }
            )
    for k in inter.keys():
        results.append(inter[k])
    return json(results)


# Get all currently registered profiles that support a given payload type
@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/type/<info:string>", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_c2profiles_by_type(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    ptype = unquote_plus(info)
    try:
        profiles = await get_c2profiles_by_type_function(ptype)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to get c2 profiles"})
    return json({"status": "success", "profile": profiles})


# this function will be useful by other files, so make it easier to use
async def get_c2profiles_by_type_function(ptype):
    try:
        query = await db_model.payloadtype_query()
        payload_type = await db_objects.get(query, ptype=ptype)
        query = await db_model.payloadtypec2profile_query()
        profiles = await db_objects.execute(
            query.where(PayloadTypeC2Profile.payload_type == payload_type)
        )
    except Exception as e:
        print(e)
        raise Exception
    return [p.to_json() for p in profiles]


# Start running a profile's server side code
@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/<info:int>/start", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def start_c2profile(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {"status": "error", "error": "Spectators cannot start c2 profiles"}
            )
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=info)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find C2 Profile"})
    status = await send_c2_rabbitmq_message(profile.name, "start", "", user["username"])
    return json(status)


# Start running a profile's server side code
@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/<info:int>/stop", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def stop_c2profile(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json({"status": "error", "error": "Spectators cannot stop c2 profiles"})
    return await stop_c2profile_func(info, user["username"])


async def stop_c2profile_func(profile_id, username):
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=profile_id)
    except Exception as e:
        return {"status": "error", "error": "failed to find c2 profile in database"}
    status = await send_c2_rabbitmq_message(profile.name, "stop", "", username)
    return json(status)


# Return the current input and output of the c2 profile for the user
@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/<info:int>/status", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def status_c2profile(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {"status": "error", "error": "Spectators cannot query c2 profiles"}
            )
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=info)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find C2 Profile"})
    # we want to send a rabbitmq message and wait for a response via websocket
    status = await send_c2_rabbitmq_message(
        profile.name, "status", "", user["username"]
    )
    return json(status)


@mythic.route(
    mythic.config["API_BASE"]
    + "/c2profiles/<info:int>/files/container_config_download",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def download_container_file_for_c2profiles(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=info)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find C2 Profile"})
    try:
        status = await send_c2_rabbitmq_message(
            profile.name, "get_config", "", user["username"]
        )
        return json(status)
    except Exception as e:
        return json({"status": "error", "error": "failed finding the file: " + str(e)})


@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/<info:int>/files/container_config_upload",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def upload_container_file_for_c2profiles(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {
                    "status": "error",
                    "error": "Spectators cannot modify c2 profile files",
                }
            )
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=info)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find C2 Profile"})
    try:
        data = request.json
        status = await send_c2_rabbitmq_message(
            profile.name,
            "writefile",
            js.dumps({"file_path": "config.json", "data": data["code"]}),
            user["username"],
        )
        return json(status)
    except Exception as e:
        return json({"status": "error", "error": "failed finding the file: " + str(e)})


# Delete a profile
@mythic.route(mythic.config["API_BASE"] + "/c2profiles/<info:int>", methods=["DELETE"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_c2profile(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {"status": "error", "error": "Spectators cannot delete c2 profiles"}
            )
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=info)
        query = await db_model.payloadtypec2profile_query()
        ptypec2profile = await db_objects.execute(
            query.where(PayloadTypeC2Profile.c2_profile == profile)
        )
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find C2 profile"})
    try:
        # we will do this recursively because there can't be payloadtypec2profile mappings if the profile doesn't exist
        for p in ptypec2profile:
            await db_objects.delete(p)
        profile.deleted = True
        profile.name = str(uuid.uuid1()) + " ( deleted " + str(profile.name) + ")"
        await db_objects.update(profile)
        success = {"status": "success"}
        updated_json = profile.to_json()
        return json({**success, **updated_json})
    except Exception as e:
        return json({"status": "error", "error": "failed to delete c2 profile"})


@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/<info:int>/parameters/", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_c2profile_parameters(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=info)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find the c2 profile"})
    try:
        query = await db_model.c2profileparameters_query()
        parameters = await db_objects.execute(
            query.where(C2ProfileParameters.c2_profile == profile)
        )
        param_list = []
        for p in parameters:
            p_json = p.to_json()
            if p_json["name"] == "AESPSK":
                p_json["default_value"] = await create_key_AES256()
            if p_json["randomize"]:
                # generate a random value based on the associated format_string variable
                p_json["default_value"] = await generate_random_format_string(
                    p_json["format_string"]
                )
            param_list.append(p_json)
        return json({"status": "success", "c2profileparameters": param_list})
    except Exception as e:
        print(e)
        return json(
            {
                "status": "error",
                "error": "failed to get c2 profile parameters, you might need to select a c2 profile first",
            }
        )


async def generate_random_format_string(format_string):
    try:
        return getone(format_string)
    except Exception as e:
        print(e)
        return ""


@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/<profile:int>/files/sync", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def sync_container_file_for_c2_profile(request, profile, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {"status": "error", "error": "Spectators cannot sync containers"}
            )
        query = await db_model.c2profile_query()
        c2profile = await db_objects.get(query, id=profile)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find C2 Profile"})
    try:
        status = await send_c2_rabbitmq_message(
            c2profile.name, "sync_classes", "", user["username"]
        )
        return json(status)
    except Exception as e:
        return json({"status": "error", "error": "failed finding the file: " + str(e)})


@mythic.route(mythic.config["API_BASE"] + "/c2profiles/<profile:int>", methods=["PUT"])
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def update_c2_profile(request, profile, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        if user["view_mode"] == "spectator":
            return json(
                {"status": "error", "error": "Spectators cannot modify c2 profiles"}
            )
        query = await db_model.c2profile_query()
        c2profile = await db_objects.get(query, id=profile)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to find C2 Profile"})
    try:
        data = request.json
        if "container_running" in data:
            c2profile.container_running = data["container_running"]
            if not c2profile.container_running:
                c2profile.running = False
                await send_all_operations_message(message=f"C2 Profile {c2profile.name} has stopped",
                                                  level="info")
            await db_objects.update(c2profile)
        return json(c2profile.to_json())
    except Exception as e:
        return json({"status": "error", "error": "failed finding the file: " + str(e)})


# ------------- SAVE C2 PROFILE PARAMETER INSTANCES FUNCTIONS -------------------
@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/<info:int>/parameter_instances/",
    methods=["POST"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def save_c2profile_parameter_value_instance(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    data = request.json  # all of the name,value pairs instances we want to save
    try:
        if user["view_mode"] == "spectator":
            return json(
                {
                    "status": "error",
                    "error": "Spectators cannot save c2 profile instances",
                }
            )
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=info)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to get the c2 profile"})
    if "instance_name" not in data or data["instance_name"] == "":
        return json(
            {
                "status": "error",
                "error": "must supply an instance name for these values",
            }
        )
    query = await db_model.c2profileparameters_query()
    params = await db_objects.execute(
        query.where(C2ProfileParameters.c2_profile == profile)
    )
    created_params = []
    for p in params:
        try:
            if p.parameter_type in ['Array', 'Dictionary']:
                data[p.name] = js.dumps(data[p.name])
            created = await db_objects.create(
                C2ProfileParametersInstance,
                c2_profile_parameters=p,
                instance_name=data["instance_name"],
                value=data[p.name],
                operation=operation,
                c2_profile=profile,
            )
            created_params.append(created)
        except Exception as e:
            for c in created_params:
                await db_objects.delete(c)
            return json(
                {
                    "status": "error",
                    "error": "failed to create a parameter value: " + str(e),
                }
            )
    return json({"status": "success"})


@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/parameter_instances/", methods=["GET"]
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_all_c2profile_parameter_value_instances(request, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to get the current operation"})
    query = await db_model.c2profileparametersinstance_query()
    params = await db_objects.execute(
        query.where(
            (C2ProfileParametersInstance.operation == operation)
            & (C2ProfileParametersInstance.instance_name != None)
        )
    )
    instances = {}
    for p in params:
        if p.instance_name not in instances:
            instances[p.instance_name] = []
        instances[p.instance_name].append(p.to_json())
    return json({"status": "success", "instances": instances})


@mythic.route(
    mythic.config["API_BASE"] + "/c2profiles/<info:int>/parameter_instances/",
    methods=["GET"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def get_specific_c2profile_parameter_value_instances(request, info, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, id=info)
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to get the c2 profile"})
    query = await db_model.c2profileparametersinstance_query()
    params = await db_objects.execute(
        query.where(
            (C2ProfileParametersInstance.operation == operation)
            & (C2ProfileParametersInstance.instance_name != None)
        )
    )
    instances = {}
    for p in params:
        if p.c2_profile_parameters.c2_profile.name == profile.name:
            if p.instance_name not in instances:
                instances[p.instance_name] = []
            instances[p.instance_name].append(p.to_json())
    return json({"status": "success", "instances": instances})


@mythic.route(
    mythic.config["API_BASE"]
    + "/c2profiles/parameter_instances/<instance_name:string>",
    methods=["DELETE"],
)
@inject_user()
@scoped(
    ["auth:user", "auth:apitoken_user"], False
)  # user or user-level api token are ok
async def delete_c2profile_parameter_value_instance(request, instance_name, user):
    if user["auth"] not in ["access_token", "apitoken"]:
        abort(
            status_code=403,
            message="Cannot access via Cookies. Use CLI or access via JS in browser",
        )
    if user["view_mode"] == "spectator":
        return json(
            {
                "status": "error",
                "error": "Spectators cannot delete c2 profile instances",
            }
        )
    name = unquote_plus(instance_name)
    try:
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user["current_operation"])
        query = await db_model.c2profileparametersinstance_query()
        params = await db_objects.execute(
            query.where(
                (C2ProfileParametersInstance.instance_name == name)
                & (C2ProfileParametersInstance.operation == operation)
                & (C2ProfileParametersInstance.payload == None)
                & ((C2ProfileParametersInstance.callback == None))
            )
        )
        parameters_found = False
        for p in params:
            await db_objects.delete(p)
            parameters_found = True
        if parameters_found:
            return json({"status": "success"})
        else:
            return json({"status": "error", "error": "Saved instance not found"})
    except Exception as e:
        print(e)
        return json({"status": "error", "error": "failed to get the c2 profile"})


async def import_c2_profile_func(data, operator):
    new_profile = False
    try:
        if "author" not in data:
            data["author"] = operator.username
        query = await db_model.c2profile_query()
        profile = await db_objects.get(query, name=data["name"])
        profile.description = data["description"]
        profile.author = data["author"]
        if "is_p2p" in data:
            profile.is_p2p = data["is_p2p"]
        if "is_server_routed" in data:
            profile.is_server_routed = data["is_server_routed"]
        if "mythic_encrypts" in data:
            profile.mythic_encrypts = data["mythic_encrypts"]
        await db_objects.update(profile)
    except Exception as e:
        # this means the profile doesn't exit yet, so we need to create it
        new_profile = True
        if "is_p2p" not in data:
            data["is_p2p"] = False
        if "is_server_routed" not in data:
            data["is_server_routed"] = False
        if "mythic_encrypts" not in data:
            data["mythic_encrypts"] = True
        profile = await db_objects.create(
            C2Profile,
            name=data["name"],
            description=data["description"],
            author=data["author"],
            mythic_encrypts=data["mythic_encrypts"],
            is_p2p=data["is_p2p"],
            is_server_routed=data["is_server_routed"],
        )
        # print("Created new c2 profile: {}".format(data['name']))
    query = await db_model.c2profileparameters_query()
    curr_parameters = await db_objects.execute(
        query.where(db_model.C2ProfileParameters.c2_profile == profile)
    )
    curr_parameters_dict = {c.name: c for c in curr_parameters}
    for param in data["params"]:
        try:
            query = await db_model.c2profileparameters_query()
            c2_profile_param = await db_objects.get(
                query, name=param["name"], c2_profile=profile
            )
            c2_profile_param.name = param["name"]
            c2_profile_param.default_value = param["default_value"]
            c2_profile_param.description = param["description"]
            c2_profile_param.randomize = param["randomize"]
            c2_profile_param.format_string = param["format_string"]
            c2_profile_param.required = param["required"]
            c2_profile_param.parameter_type = param["parameter_type"]
            c2_profile_param.verifier_regex = param["verifier_regex"]
            await db_objects.update(c2_profile_param)
        except Exception as e:
            await db_objects.create(
                C2ProfileParameters,
                c2_profile=profile,
                name=param["name"],
                description=param["description"],
                default_value=param["default_value"],
                randomize=param["randomize"],
                format_string=param["format_string"],
                required=param["required"],
                parameter_type=param["parameter_type"],
                verifier_regex=param["verifier_regex"],
            )
        curr_parameters_dict.pop(param["name"], None)
        # print("Associated new params for profile: {}-{}".format(param['name'], data['name']))
    #  anything left in curr_parameters_dict we need to delete
    for k, v in curr_parameters_dict.items():
        await db_objects.delete(v, recursive=True)
    return {"status": "success", "new": new_profile, **profile.to_json()}
