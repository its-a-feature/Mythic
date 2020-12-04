# -*- coding: utf-8 -*-
import peewee as p
import datetime
from app import mythic_db
import app.crypto as crypto
import json
from uuid import uuid4


def gen_uuid():
    return str(uuid4())


class Operator(p.Model):
    light_config = json.dumps(
        {
            "background-color": "white",
            "text-color": "black",
            "hover": "#2B4978",
            "highlight": "#2B4978",
            "autocomplete": "#B7C8FA",
            "highlight-text": "#ECEDF0",
            "timestamp": "black",
            "operator": "#7E8BD9",
            "display": "#FF4D4D",
            "is-background-dark": "false",
            "new-callback-color": "#829BC4",
            "table-headers": "#F1F1F1",
            "operation-color": "#b366ff",
            "success_highlight": "#340080",
            "failure_highlight": "#f68d8d",
            "code-theme": "xcode",
            "table-color": "",
            "response-background": "#e8e8e8",
            "outline-buttons": "-",
            "bg-header": "hsl(225, 6%, 18%)",
            "bg-header-dark": "#c8c8c8",
            "bg-card-body": "#e8e8e8",
            "bg-card-body-l1": "hsl(225, 6%, 23%)",
            "bg-card-body-l2": "hsl(225, 6%, 80%)",
            "bg-card-footer": "#c8c8c8",
            "bg-body": "hsl(225, 6%, 18%)",
            "th": "#adadad",
            "font-size": "14",
            "top-bar": "#182842",
            "row-highlight": "#B7C8FA",
            "link": "#192A45",
            "link-visited": "#192A45",
        }
    )
    dark_config = json.dumps(
        {
            "background-color": "rgb(21,22,25)",
            "text-color": "#ECEDF0",
            "hover": "hsl(225, 6%, 12%)",
            "highlight": "#2C314D",
            "autocomplete": "#1E2133",
            "highlight-text": "#ECEDF0",
            "timestamp": "#24E0FF",
            "operator": "#7E8BD9",
            "display": "#FF4D4D",
            "is-background-dark": "true",
            "new-callback-color": "#515A8C",
            "table-headers": "#F1F1F1",
            "operation-color": "#b366ff",
            "success_highlight": "#340080",
            "failure_highlight": "#f68d8d",
            "code-theme": "monokai",
            "table-color": "table-dark",
            "response-background": "hsl(225, 6%, 23%)",
            "outline-buttons": "-outline-",
            "bg-header": "hsl(225, 6%, 18%)",
            "bg-header-dark": "hsl(225, 6%, 13%)",
            "bg-card-body": "hsl(225, 6%, 22%)",
            "bg-card-body-l1": "hsl(225, 6%, 23%)",
            "bg-card-body-l2": "hsl(225, 6%, 27%)",
            "bg-card-footer": "hsl(225, 6%, 23%)",
            "bg-body": "rgb(35,35,35)",
            "th": "hsl(225, 6%, 20%)",
            "font-size": "14",
            "top-bar": "#1E2133",
            "row-highlight": "#2C314D",
            "link": "",
            "link-visited": "",
        }
    )
    username = p.TextField(unique=True, null=False)
    password = p.TextField(null=False)
    admin = p.BooleanField(null=True, default=False)
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    last_login = p.DateTimeField(default=None, null=True)
    # option to simply de-activate an account instead of delete it so you keep all your relational data intact
    active = p.BooleanField(null=False, default=True)
    current_operation = p.DeferredForeignKey("Operation", null=True)
    ui_config = p.TextField(null=False, default=dark_config)
    view_utc_time = p.BooleanField(null=False, default=False)
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        ordering = [
            "-id",
        ]
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "username": self.username,
            "admin": self.admin,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "last_login": self.last_login.strftime("%m/%d/%Y %H:%M:%S") if self.last_login is not None else "",
            "active": self.active,
            "current_operation": self.current_operation.name if self.current_operation is not None else None,
            "current_operation_id": self.current_operation.id if self.current_operation is not None else None,
            "ui_config": self.ui_config,
            "view_utc_time": self.view_utc_time,
            "deleted": self.deleted
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    async def check_password(self, password):
        temp_pass = await crypto.hash_SHA512(password)
        return self.password.lower() == temp_pass.lower()

    async def hash_password(self, password):
        return await crypto.hash_SHA512(password)


# This is information about a class of payloads (like Apfell-jxa)
#   This will have multiple Command class objects associated with it
#   Users can create their own commands and payload types as well
class PayloadType(p.Model):
    ptype = p.TextField(null=False, unique=True)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    file_extension = p.CharField(null=True)
    # if this type requires another payload to be already created
    wrapper = p.BooleanField(default=False, null=False)
    # indicate which OS/versions this payload works for
    supported_os = p.TextField(null=False, default="")
    # information about getting information to/from another container or machine for building/loading/transforming
    last_heartbeat = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    container_running = p.BooleanField(null=False, default=False)
    service = p.TextField(null=False, default="rabbitmq")
    # who created the code for the payload type, not just who imported it
    author = p.TextField(null=False, default="")
    note = p.TextField(null=False, default="")
    supports_dynamic_loading = p.BooleanField(null=False, default=False)
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "ptype": self.ptype,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "file_extension": self.file_extension,
            "wrapper": self.wrapper,
            "supported_os": self.supported_os,
            "last_heartbeat": self.last_heartbeat.strftime("%m/%d/%Y %H:%M:%S"),
            "container_running": self.container_running,
            "service": self.service,
            "author": self.author,
            "note": self.note,
            "supports_dynamic_loading": self.supports_dynamic_loading,
            "deleted": self.deleted
        }
        if getattr(self, "build_parameters") is not None:
            r["build_parameters"] = []
            for x in self.build_parameters:
                if x.deleted is False:
                    r["build_parameters"].append(x.to_json())
        else:
            r["build_parameters"] = []
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class WrappedPayloadTypes(p.Model):
    # which payload type does the wrapping
    wrapper = p.ForeignKeyField(PayloadType, null=False)
    # which payload type is wrapped
    wrapped = p.ForeignKeyField(PayloadType, backref="wrapped", null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "wrapper": self.wrapper.ptype,
            "wrapped": self.wrapped.ptype
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class BuildParameter(p.Model):
    # name presented to the user
    name = p.TextField(null=False, default="")
    # what kind of parameter should be shown in the UI? String or ChooseOne
    parameter_type = p.TextField(null=False, default="None")
    description = p.TextField(null=False, default="")
    # associated payload type
    payload_type = p.ForeignKeyField(PayloadType, backref="build_parameters")
    required = p.BooleanField(default=True)
    verifier_regex = p.TextField(default="", null=False)
    deleted = p.BooleanField(default=False)
    parameter = p.TextField(null=False, default="")

    class Meta:
        indexes = ((("name", "payload_type"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": self.name,
            "parameter_type": self.parameter_type,
            "description": self.description,
            "payload_type": self.payload_type.ptype,
            "required": self.required,
            "verifier_regex": self.verifier_regex,
            "deleted": self.deleted,
            "parameter": self.parameter
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# This has information about a specific command that can be executed by a PayloadType
#   Custom commands can be created by users
#   There will be a new Command instance for every cmd+payload_type combination
#      (each payload_type needs its own 'shell' command because they might be implemented differently)
class Command(p.Model):
    needs_admin = p.BooleanField(null=False, default=False)
    # generates get-help info on the command
    help_cmd = p.TextField(null=False, default="")
    description = p.TextField(null=False)
    cmd = p.CharField(null=False)
    # this command applies to what payload types
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    # what version, so we can know if loaded commands are out of date
    version = p.IntegerField(null=False, default=1)
    # indicate if this command is the exit command for a payload type
    is_exit = p.BooleanField(null=False, default=False)
    # indicate if this is the command used for browsing files
    is_file_browse = p.BooleanField(null=False, default=False)
    # indicate if this is the command used for listing processes
    is_process_list = p.BooleanField(null=False, default=False)
    # indicate if this is the command used for downloading files
    is_download_file = p.BooleanField(null=False, default=False)
    # indicate if this is the command used for removing files
    is_remove_file = p.BooleanField(null=False, default=False)
    # indicate if this is the command used to upload files
    is_upload_file = p.BooleanField(null=False, default=False)
    author = p.TextField(null=False, default="")
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        indexes = ((("cmd", "payload_type"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "needs_admin": self.needs_admin,
            "help_cmd": self.help_cmd,
            "description": self.description,
            "cmd": self.cmd,
            "payload_type": self.payload_type.ptype,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "version": self.version,
            "is_exit": self.is_exit,
            "is_file_browse": self.is_file_browse,
            "is_process_list": self.is_process_list,
            "is_download_file": self.is_download_file,
            "is_remove_file": self.is_remove_file,
            "is_upload_file": self.is_upload_file,
            "author": self.author,
            "deleted": self.deleted
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# these parameters are used to create an easily parsible JSON 'params' field for the agent to utilize
class CommandParameters(p.Model):
    command = p.ForeignKeyField(Command, null=False)
    # what is the name of the parameter (what is displayed in the UI and becomes dictionary key)
    name = p.TextField(null=False)
    # String, Boolean, Number, Array, Choice, ChoiceMultiple, Credential, File, PayloadList, AgentConnect
    type = p.CharField(null=False, default="String")
    default_value = p.TextField(null=False, default="")
    # \n separated list of possible choices
    choices = p.TextField(null=False, default="")
    required = p.BooleanField(null=False, default=False)
    description = p.TextField(null=False, default="")
    # if the action is related to payloads or linking agents, you can limit the options to only agents you want
    supported_agents = p.TextField(null=False, default="")

    class Meta:
        indexes = ((("command", "name"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "command": self.command.id,
            "cmd": self.command.cmd,
            "payload_type": self.command.payload_type.ptype,
            "name": self.name,
            "type": self.type,
            "default_value": self.default_value,
            "choices": self.choices,
            "required": self.required,
            "description": self.description,
            "supported_agents": self.supported_agents
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# users will be associated with operations
#   payload_types and commands are associated with all operations
#   when creating a new operation, associate all the default c2profiles with it
class Operation(p.Model):
    name = p.TextField(null=False, unique=True)
    admin = p.ForeignKeyField(Operator, null=False)  # who is an admin of this operation
    complete = p.BooleanField(null=False, default=False)
    # auto create an AES PSK key when the operation is created for things like PFS with EKE
    AESPSK = p.TextField(null=False, unique=True)
    webhook = p.TextField(null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": self.name,
            "admin": self.admin.username,
            "complete": self.complete,
            "AESPSK": self.AESPSK,
            "webhook": self.webhook
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class DisabledCommandsProfile(p.Model):
    # A set of commands that are disabled for an operation due to OPSEC concerns
    # only the lead of an operation will be able to set this for other operators on that operation
    # name to group a bunch of disabled commands together for an operator
    name = p.TextField(null=False)
    command = p.ForeignKeyField(Command, null=False)

    class Meta:
        indexes = ((("command", "name"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": self.name,
            "command": self.command.cmd,
            "command_id": self.command.id,
            "payload_type": self.command.payload_type.ptype
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class DisabledCommands(p.Model):
    command = p.ForeignKeyField(Command, null=False)
    operator = p.ForeignKeyField(Operator, null=False)
    operation = p.ForeignKeyField(Operation, null=False)

    class Meta:
        indexes = ((("command", "operator", "operation"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "command": self.command.cmd,
            "command_id": self.command.id,
            "payload_type": self.command.payload_type.ptype,
            "operator": self.operator.username,
            "operation": self.operation.name
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# because operators and operations are a many-to-many relationship, we need a join table to facilitate
#   this means operator class doesn't mention operation, and operation doesn't mention operator - odd, I know
class OperatorOperation(p.Model):
    operator = p.ForeignKeyField(Operator)
    operation = p.ForeignKeyField(Operation)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    base_disabled_commands = p.ForeignKeyField(DisabledCommandsProfile, null=True)
    view_mode = p.TextField(null=False, default="operator")

    class Meta:
        indexes = ((("operator", "operation"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "operator": self.operator.username,
            "operation": self.operation.name,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "base_disabled_commands": self.base_disabled_commands.name,
            "view_mode": self.view_mod
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# an instance of a c2profile
class C2Profile(p.Model):
    name = p.TextField(null=False, unique=True)
    description = p.TextField(null=True, default="")
    # list of payload types that are supported (i.e. have a corresponding module created for them on the client side
    # This has information about supported payload types, but that information is in a separate join table
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    # indicates if the c2 profile is running
    running = p.BooleanField(null=False, default=False)
    last_heartbeat = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    # indicates if the c2 profile container is up and able to receive tasking
    container_running = p.BooleanField(null=False, default=False)
    author = p.TextField(null=False, default="")
    # identify if this is a p2p protocol or not, we treat those a bit differently
    is_p2p = p.BooleanField(null=False, default=False)
    # server_routed means the server specifies the specific route for sending messages
    is_server_routed = p.BooleanField(null=False, default=False)
    # indicate if mythic should do the encryption/decryption for the profile
    #     or if the profile will handle it
    mythic_encrypts = p.BooleanField(null=False, default=True)
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": self.name,
            "description": self.description,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "running": self.running,
            "last_heartbeat": self.last_heartbeat.strftime("%m/%d/%Y %H:%M:%S"),
            "container_running": self.container_running,
            "author": self.author,
            "is_p2p": self.is_p2p,
            "is_server_routed": self.is_server_routed,
            "mythic_encrypts": self.mythic_encrypts,
            "deleted": self.deleted
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# this is a join table between the many to many relationship between payload_types and c2profiles
#   ex: apfell PayloadType instance should be tied to default/twitter/etc c2profiles
#       and default c2profile should be tied to apfell, apfell-swift, etc
class PayloadTypeC2Profile(p.Model):
    payload_type = p.ForeignKeyField(PayloadType)
    c2_profile = p.ForeignKeyField(C2Profile)

    class Meta:
        indexes = ((("payload_type", "c2_profile"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "payload_type": self.payload_type.ptype,
            "payload_type_id": self.payload_type.id,
            "c2_profile": self.c2_profile.name,
            "c2_profile_id": self.c2_profile.id,
            "c2_profile_description": self.c2_profile.description
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# this is an instance of a payload
class Payload(p.Model):
    # this is actually a sha256 from other information about the payload
    uuid = p.TextField(unique=True, null=False)
    # tag a payload with information like spearphish, custom bypass, lat mov, etc (indicates "how")
    tag = p.TextField(null=True)
    # creator of the payload, cannot be null! must be attributed to somebody (indicates "who")
    operator = p.ForeignKeyField(Operator, null=False)
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    # this is fine because this is an instance of a payload, so it's tied to one PayloadType
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    # this will signify if a current callback made / spawned a new callback that's checking in
    #   this helps track how we're getting callbacks (which payloads/tags/parents/operators)
    pcallback = p.DeferredForeignKey("Callback", null=True)
    # c2_profile = p.ForeignKeyField(C2Profile, null=False)  # identify which C2 profile is being used
    operation = p.ForeignKeyField(Operation, null=False)
    wrapped_payload = p.ForeignKeyField("self", null=True)
    deleted = p.BooleanField(null=False, default=False)
    # if the payload is in the build process: building, success, error
    build_container = p.TextField(null=False)
    build_phase = p.TextField(null=False, default="building")
    # capture error or any other info
    build_message = p.TextField(null=False, default="")
    # if there is a slack webhook for the operation, decide if this payload should generate an alert or not
    callback_alert = p.BooleanField(null=False, default=True)
    # when dealing with auto-generated payloads for lateral movement or spawning new callbacks
    auto_generated = p.BooleanField(null=False, default=False)
    task = p.DeferredForeignKey("Task", null=True)
    file_id = p.DeferredForeignKey("FileMeta", null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "uuid": self.uuid,
            "tag": self.tag,
            "operator": self.operator.username,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "payload_type": self.payload_type.ptype,
            "pcallback": self.pcallback.id if self.pcallback is not None else None,
            "operation": self.operation.name,
            "wrapped_payload": self.wrapped_payload.uuid if self.wrapped_payload is not None else None,
            "deleted": self.deleted,
            "build_container": self.build_container,
            "build_phase": self.build_phase,
            "build_message": self.build_message,
            "callback_alert": self.callback_alert,
            "auto_generated": self.auto_generated,
            "task": self.task.to_json() if self.task is not None else None,
            "file_id": self.file_id.to_json() if self.file_id is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# this is an instance of a payload
class PayloadOnHost(p.Model):
    host = p.TextField(null=False)
    payload = p.ForeignKeyField(Payload, null=False)
    deleted = p.BooleanField(default=False, null=False)
    operation = p.ForeignKeyField(Operation, null=False)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    task = p.DeferredForeignKey("Task", null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "host": self.host,
            "payload": self.payload.to_json(),
            "deleted": self.deleted,
            "operation": self.operation.name,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "task": self.task.to_json() if self.task is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class BuildParameterInstance(p.Model):
    # this is the instance of actual values used to create a specific payload instance
    build_parameter = p.ForeignKeyField(BuildParameter, null=False)
    payload = p.ForeignKeyField(Payload, null=False)
    parameter = p.TextField(null=True)  # what the user picked

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "build_parameter": self.build_parameter.to_json(),
            "payload": self.payload.uuid,
            "parameter": self.parameter
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# a specific payload instance has multiple commands associated with it, so we need to track that
#   commands can be loaded/unloaded at run time, so we need to track creation_time
class PayloadCommand(p.Model):
    payload = p.ForeignKeyField(Payload, null=False)
    # this is how we can tell what commands are in a payload by default and if they might be out of date
    command = p.ForeignKeyField(Command, null=False)
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    # version of a command when the payload is created might differ from later in time, so save it off
    version = p.IntegerField(null=False)

    class Meta:
        indexes = ((("payload", "command"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "payload": self.payload.uuid,
            "command": self.command.cmd,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "version": self.version
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


#  C2 profiles will have various parameters that need to be stamped in at payload creation time
#    this will specify the name and value to look for
class C2ProfileParameters(p.Model):
    c2_profile = p.ForeignKeyField(C2Profile, null=False)
    # what the parameter is called. ex: Callback address
    description = p.TextField(null=False)
    name = p.TextField(null=False)  # what the stamping should look for. ex: XXXXX
    # Hint for the user when setting the parameters
    default_value = p.TextField(null=False, default="")
    randomize = p.BooleanField(null=False, default=False)
    format_string = p.TextField(null=False, default="")
    parameter_type = p.TextField(null=False, default="String")
    required = p.BooleanField(null=False, default=True)
    verifier_regex = p.TextField(null=False, default="")

    class Meta:
        indexes = ((("c2_profile", "name"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "c2_profile": self.c2_profile.name,
            "description": self.description,
            "name": self.name,
            "default_value": self.default_value,
            "randomize": self.randomize,
            "format_string": self.format_string,
            "parameter_type": self.parameter_type,
            "required": self.required,
            "verifier_regex": self.verifier_regex
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Callback(p.Model):
    agent_callback_id = p.TextField(unique=True, null=False, default=gen_uuid)
    init_callback = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    last_checkin = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    user = p.CharField(null=False)
    host = p.CharField(null=False)
    pid = p.IntegerField(null=False)
    ip = p.CharField(max_length=100, null=False)
    external_ip = p.TextField(null=True)
    description = p.TextField(null=True)
    operator = p.ForeignKeyField(Operator, null=False)
    active = p.BooleanField(default=True, null=False)
    # keep track of the parent callback from this one
    pcallback = p.DeferredForeignKey("Callback", null=True)
    # what payload is associated with this callback
    registered_payload = p.ForeignKeyField(Payload, null=False)
    integrity_level = p.IntegerField(null=True, default=2)
    # an operator can lock a callback to themselves so that other users cannot issue commands as well
    locked = p.BooleanField(default=False)
    locked_operator = p.ForeignKeyField(
        Operator, null=True, backref="locked_operator"
    )
    operation = p.ForeignKeyField(Operation, null=False)
    # the following information comes from the c2 profile if it wants to provide some form of encryption
    # the kind of encryption on this callback (aes, xor, rc4, etc)
    encryption_type = p.CharField(null=True)
    # base64 of the key to use to decrypt traffic
    decryption_key = p.TextField(null=True)
    # base64 of the key to use to encrypt traffic
    encryption_key = p.TextField(null=True)
    os = p.TextField(null=True)
    architecture = p.TextField(null=True)
    domain = p.TextField(null=True)
    # associated socks information
    port = p.IntegerField(null=True)
    socks_task = p.DeferredForeignKey("Task", null=True)
    # if you need to define extra context for a callback, like a webshell, supply that here
    extra_info = p.TextField(null=False, default="")
    # store information about sleep interval/jitter/waking hours/etc here
    sleep_info = p.TextField(null=False, default="")

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "agent_callback_id": self.agent_callback_id,
            "init_callback": self.init_callback.strftime("%m/%d/%Y %H:%M:%S"),
            "last_checkin": self.last_checkin.strftime("%m/%d/%Y %H:%M:%S"),
            "user": self.user,
            "host": self.host,
            "pid": self.pid,
            "ip": self.ip,
            "external_ip": self.external_ip,
            "description": self.description,
            "operator": self.operator.username,
            "active": self.active,
            "pcallback": self.pcallback.id if self.pcallback is not None else None,
            "registered_payload": self.registered_payload.uuid,
            "payload_type": self.registered_payload.payload_type.ptype,
            "payload_type_id": self.registered_payload.payload_type.id,
            "payload_description": self.registered_payload.tag,
            "integrity_level": self.integrity_level,
            "locked": self.locked,
            "locked_operator": self.locked_operator.username if self.locked_operator is not None else None,
            "operation": self.operation.name,
            "os": self.os,
            "architecture": self.architecture,
            "domain": self.domain,
            "port": self.port,
            "socks_task": self.socks_task.id if self.socks_task is not None else None,
            "extra_info": self.extra_info,
            "sleep_info": self.sleep_info
        }
        return r

    def __str__(self):
        return "" #json.dumps(self.to_json())


class PayloadC2Profiles(p.Model):
    # tracking which c2 profiles are in a payload
    payload = p.ForeignKeyField(Payload)
    c2_profile = p.ForeignKeyField(C2Profile)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "payload": self.payload.uuid,
            "c2_profile": self.c2_profile.name
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class CallbackC2Profiles(p.Model):
    callback = p.ForeignKeyField(Callback)
    c2_profile = p.ForeignKeyField(C2Profile)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "callback": self.callback.id,
            "c2_profile": self.c2_profile.name
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# c2 profiles will have various parameters that need to be stamped in when the payload is created
#   This is an opportunity to specify key-value pairs for specific C2 profiles
#   There can be many of these per c2 profile or none
#   This holds the specific values used in the C2ProfileParameters and which payload they're associated with
# If we want to save a collection off for repeated use, payload will be null, but instance_name and operation are set
class C2ProfileParametersInstance(p.Model):
    c2_profile_parameters = p.ForeignKeyField(C2ProfileParameters, null=False)
    c2_profile = p.ForeignKeyField(C2Profile)
    # this is the final value the user specified
    value = p.TextField(null=False)
    # the specific payload instance these values apply to
    payload = p.ForeignKeyField(
        Payload, null=True, backref="payload_profile_parameters"
    )
    # name the group of parameter instances if we want to save off values for later
    instance_name = p.TextField(null=True)
    operation = p.ForeignKeyField(
        Operation, null=True
    )  # tie this instance to an operation if there's no payload
    # when keeping track of which profile instances are in a given callback, set the callback variable
    # if this is just tracking what's in a payload, callback will be null
    callback = p.ForeignKeyField(
        Callback, null=True, backref="callback_profile_parameters"
    )

    class Meta:
        indexes = (
            (("c2_profile_parameters", "payload"), True),
            (("c2_profile_parameters", "instance_name", "operation"), True),
        )
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": self.c2_profile_parameters.name,
            "default_value": self.c2_profile_parameters.default_value,
            "required": self.c2_profile_parameters.required,
            "randomize": self.c2_profile_parameters.randomize,
            "verifier_regex": self.c2_profile_parameters.verifier_regex,
            "parameter_type": self.c2_profile_parameters.parameter_type,
            "description": self.c2_profile_parameters.description,
            "c2_profile": self.c2_profile.name,
            "value": self.value,
            "payload": self.payload.uuid if self.payload is not None else None,
            "instance_name": self.instance_name,
            "operation": self.operation.name if self.operation is not None else None,
            "callback": self.callback.id if self.callback is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class LoadedCommands(p.Model):
    # this keeps track of which commands and versions are currently loaded in which callbacks
    command = p.ForeignKeyField(Command, null=False)
    callback = p.ForeignKeyField(Callback, null=False)
    # so we know who loaded which commands
    operator = p.ForeignKeyField(Operator, null=False)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    # which version of the command is loaded, so we know if it's out of date
    version = p.IntegerField(null=False)

    class Meta:
        # can't have the same command loaded multiple times in a callback
        indexes = ((("command", "callback"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "command": self.command.cmd,
            "version": self.version,
            "callback": self.callback.id,
            "operator": self.operator.username,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Task(p.Model):
    agent_task_id = p.TextField(unique=True, null=False, default=gen_uuid)
    # could be added via task/clear or scripting by bot
    command = p.ForeignKeyField(Command, null=True)
    params = p.TextField(
        null=True
    )  # this will have the instance specific params (ex: id)
    # make room for ATT&CK ID (T#) if one exists or enable setting this later
    status_timestamp_preprocessing = p.DateTimeField(
        default=datetime.datetime.utcnow, null=False
    )
    status_timestamp_submitted = p.DateTimeField(null=True)
    status_timestamp_processing = p.DateTimeField(null=True)
    status_timestamp_processed = p.DateTimeField(null=True)
    # this is the last timestamp that something happened
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    # every task is associated with a specific callback that executes the task
    callback = p.ForeignKeyField(Callback, null=False)
    # the operator to issue the command can be different from the one that spawned the callback
    operator = p.ForeignKeyField(Operator, null=False)
    # [preprocessing, submitted, processing, processed]
    status = p.CharField(null=False, default="preprocessing")
    # save off the original params in the scenarios where we to transforms on it for logging and tracking purposes
    original_params = p.TextField(null=True)
    # people can add a comment to the task
    comment = p.TextField(null=False, default="")
    # the user that added the above comment
    comment_operator = p.ForeignKeyField(
        Operator, backref="comment_operator", null=True
    )
    completed = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "agent_task_id": self.agent_task_id,
            "command": self.command.cmd if self.command is not None else None,
            "command_id": self.command.id if self.command is not None else None,
            "status_timestamp_preprocessing": self.status_timestamp_preprocessing.strftime("%m/%d/%Y %H:%M:%S"),
            "status_timestamp_submitted": self.status_timestamp_submitted.strftime("%m/%d/%Y %H:%M:%S") if self.status_timestamp_submitted is not None else None,
            "status_timestamp_processing": self.status_timestamp_processing.strftime("%m/%d/%Y %H:%M:%S") if self.status_timestamp_processing is not None else None,
            "status_timestamp_processed": self.status_timestamp_processed.strftime("%m/%d/%Y %H:%M:%S") if self.status_timestamp_processed is not None else None,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "callback": self.callback.id,
            "operation": self.callback.operation.name,
            "operator": self.operator.username,
            "status": self.status,
            "original_params": self.original_params,
            "comment": self.comment,
            "comment_operator": self.comment_operator.username if self.comment_operator is not None else None,
            "completed": self.completed
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Response(p.Model):
    response = p.BlobField(null=True)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    task = p.ForeignKeyField(Task, null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "response": bytes(getattr(self, "response")).decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "task": self.task.to_json()
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class ATTACK(p.Model):
    # store ATT&CK data
    t_num = p.CharField(null=False, unique=True)
    name = p.TextField(null=False)
    os = p.TextField(null=False)
    tactic = p.CharField(null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "t_num": self.t_num,
            "name": self.name,
            "os": self.os,
            "tactic": self.tactic
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class ATTACKCommand(p.Model):
    attack = p.ForeignKeyField(ATTACK, null=False)
    command = p.ForeignKeyField(Command, null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "t_num": self.attack.t_num,
            "attack_name": self.attack.name,
            "command": self.command.cmd,
            "command_id": self.command.id
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class ATTACKTask(p.Model):
    attack = p.ForeignKeyField(ATTACK, null=False)
    task = p.ForeignKeyField(Task, null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "attack": self.attack.t_num,
            "attack_name": self.attack.name,
            "task": self.task.id,
            "task_command": self.task.command.cmd,
            "task_params": self.task.original_params
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Credential(p.Model):
    # what kind of credential is it? [hash, password, certificate, etc]
    type = p.TextField(null=False)
    # if you know the task, you know who, what, where, when, etc that caused this thing to exist
    # task can be null though which means it was manually entered
    task = p.ForeignKeyField(Task, null=True)
    account = p.TextField(null=False)  # whose credential is this
    realm = p.TextField()  # which domain does this credential apply?
    operation = p.ForeignKeyField(Operation)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    credential = p.BlobField(null=False)  # the actual credential we captured
    operator = p.ForeignKeyField(Operator, null=False)
    comment = p.TextField(null=True)
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "type": self.type,
            "task": self.task.id if self.task is not None else None,
            "task_command": self.task.command.cmd if self.task is not None else None,
            "account": self.account,
            "realm": self.realm,
            "operation": self.operation.name,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "credential": bytes(getattr(self, "credential")).decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "operator": self.operator.username,
            "comment": self.comment,
            "deleted": self.deleted
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Keylog(p.Model):
    # if you know the task, you know who, where, when, etc
    task = p.ForeignKeyField(Task, null=False)  # what command caused this to exist
    keystrokes = p.BlobField(null=False)  # what did you actually capture
    # if possible, what's the window title for where these keystrokes happened
    window = p.TextField(null=False, default="UNKOWN")
    # when did we get these keystrokes?
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    operation = p.ForeignKeyField(Operation, null=False)
    # whose keystrokes are these? The agent needs to tell us
    user = p.TextField(null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "task": self.task.id,
            "host": self.task.callback.host,
            "callback": {"id": self.task.callback.id},
            "keystrokes": bytes(getattr(self, "keystrokes")).decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "window": self.window,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "operation": self.operation.name,
            "user": self.user
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Artifact(p.Model):
    # this is global and generic information about different kinds of host artifacts
    # type indicates the kind of host artifacts this instance applies to
    name = p.BlobField(null=False, unique=True)
    description = p.BlobField(null=False, default="")

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": bytes(getattr(self, "name")).decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "description": bytes(getattr(self, "description")).decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode()
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class TaskArtifact(p.Model):
    task = p.ForeignKeyField(Task, null=True)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    artifact_instance = p.BlobField(null=False, default="")
    # if this is a manual entry (no task), still specify the corresponding artifact
    artifact = p.ForeignKeyField(Artifact, null=True)
    operation = p.ForeignKeyField(Operation, null=True)
    host = p.TextField(null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "task_id": self.task.id if self.task is not None else -1,
            "task": self.task.original_params if self.task is not None else "",
            "command": self.task.command.cmd if self.task is not None else "Manual Entry",
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "artifact_instance": bytes(getattr(self, "artifact_instance")).decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "artifact_template": bytes(getattr(self, "artifact").name).decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "operation": self.operation.name if self.operation is not None else None,
            "host": str(self.host).encode().decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class StagingInfo(p.Model):
    # this is a way to identify the corresponding session key between HTTP messages since it's stateless
    session_id = p.TextField(null=False, unique=True)
    # this is the creation session key that's base64 encoded
    session_key = p.TextField(null=False)
    # staging step uuid
    staging_uuid = p.TextField(null=False, unique=True)
    payload_uuid = p.TextField(null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "session_id": self.session_id,
            "session_key": self.session_key,
            "staging_uuid": self.staging_uuid,
            "payload_uuid": self.payload_uuid
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class APITokens(p.Model):
    # this offers a way to interact with specific interfaces without a JWT expiring
    token_type = p.TextField(null=False)  # [C2, User]
    token_value = p.TextField(null=False)
    active = p.BooleanField(null=False, default=True)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    operator = p.ForeignKeyField(Operator)  # act on behalf of which user

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "token_type": self.token_type,
            "token_value": self.token_value,
            "active": self.active,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "operator": self.operator.username
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class BrowserScript(p.Model):
    # keep a set of scripts with no operator so we can copy the scripts for a new operator added
    # who does this script belong to
    operator = p.ForeignKeyField(Operator, null=True)
    # the actual script contents
    script = p.TextField(null=False, default="")
    # if this is null, it is a support function
    command = p.ForeignKeyField(Command, null=True)
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    # if command is None, we're a support function, use this to define a name for the function
    name = p.TextField(null=True)
    active = p.BooleanField(default=True)
    author = p.TextField(null=False, default="")
    # track if the user modified this script
    user_modified = p.BooleanField(default=False)
    # this is always the latest from the container
    container_version = p.TextField(null=False, default="")
    container_version_author = p.TextField(null=False, default="")

    class Meta:
        indexes = ((("command", "name", "operator"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "operator": self.operator.username if self.operator is not None else "",
            "script": self.script,
            "command": self.command.cmd if self.command is not None else None,
            "payload_type": self.payload_type.ptype if self.payload_type is not None else None,
            "command_id": self.command.id if self.command is not None else None,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "name": self.name,
            "active": self.active,
            "author": self.author,
            "user_modified": self.user_modified,
            "container_version": self.container_version,
            "container_version_author": self.container_version_author
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class BrowserScriptOperation(p.Model):
    browserscript = p.ForeignKeyField(BrowserScript)  # the script in question
    operation = p.ForeignKeyField(Operation)  # the operation in question

    class Meta:
        indexes = (
            (("browserscript", "operation"), True),
        )  # can't assign 1 script to the same operation mult times
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "browserscript": json.dumps(self.browserscript.to_json()),
            "operation": self.operation.name
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class ProcessList(p.Model):
    # which task populated the data
    task = p.ForeignKeyField(Task, null=False, unique=True)
    # when did we get the data back
    timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    # this is a process list for which host
    host = p.TextField(null=False)
    # requires a specific format:
    #  [ {"pid": pid, "arch": "x64", "name": "lol.exe", "bin_path": "C:\whatever", "ppid": ppid } ]
    process_list = p.BlobField(null=False)
    operation = p.ForeignKeyField(Operation, null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "task": self.task.id,
            "callback": self.task.callback.id,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "host": self.host,
            "process_list": bytes(getattr(self, "process_list"))
                        .decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "operation": self.operation.name
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class FileBrowserObj(p.Model):
    task = p.ForeignKeyField(Task, null=False)
    timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    operation = p.ForeignKeyField(Operation, null=False)
    # this should be the fqdn of the host the info is from
    host = p.BlobField(null=False)
    permissions = p.TextField(null=False, default="")
    # this is the name of this file/folder
    name = p.BlobField(null=False)
    # this is the parent object
    parent = p.ForeignKeyField('self', null=True)
    # this is the full path for the parent folder
    # we need this to enable faster searching and better context
    parent_path = p.BlobField(null=False, default="")
    full_path = p.BlobField(null=False, default="")
    access_time = p.TextField(null=False, default="")
    modify_time = p.TextField(null=False, default="")
    comment = p.TextField(null=False, default="")
    # this is how we differentiate between files and folders of information
    is_file = p.BooleanField(null=False, default=False)
    size = p.TextField(null=False, default="")
    # indicates if we successfully pulled info about the object. False would be access denied for example
    success = p.BooleanField(null=True)
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "task": self.task.id,
            "callback": self.task.callback.id,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "operation": self.operation.name,
            "host": bytes(getattr(self, "host"))
                        .decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            #"permissions": self.permissions,
            "name": bytes(getattr(self, "name"))
                        .decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "parent": self.parent.id if self.parent is not None else None,
            "parent_path": bytes(getattr(self, "parent_path"))
                        .decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "full_path": bytes(getattr(self, "full_path"))
                        .decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "access_time": self.access_time,
            "modify_time": self.modify_time,
            "comment": self.comment,
            "is_file": self.is_file,
            "size": self.size,
            "success": self.success,
            "deleted": self.deleted
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class FileMeta(p.Model):
    agent_file_id = p.TextField(unique=True, null=False, default=gen_uuid)
    # how many total chunks will there be
    total_chunks = p.IntegerField(null=False)
    # how many we've received so far
    chunks_received = p.IntegerField(null=False, default=0)
    chunk_size = p.IntegerField(null=False, default=0)
    # what task caused this file to exist in the database
    task = p.ForeignKeyField(Task, null=True)
    complete = p.BooleanField(null=False, default=False)
    # where the file is located on local disk
    path = p.TextField(null=False)
    # path on victim if applicable
    full_remote_path = p.TextField(null=False, default="")
    # host of where the file was pulled from, can be remote
    host = p.TextField(null=False, default="")
    is_payload = p.BooleanField(null=False, default=False)
    is_screenshot = p.BooleanField(null=False, default=False)
    is_download_from_agent = p.BooleanField(default=False)
    file_browser = p.ForeignKeyField(FileBrowserObj, null=True, backref="files")
    filename = p.TextField(null=False, default="")
    delete_after_fetch = p.BooleanField(null=False, default=True)
    operation = p.ForeignKeyField(Operation, null=False)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    deleted = p.BooleanField(null=False, default=False)
    # specify this in case it was a manual registration
    operator = p.ForeignKeyField(Operator, null=True)
    md5 = p.TextField(null=True)
    sha1 = p.TextField(null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "agent_file_id": self.agent_file_id,
            "total_chunks": self.total_chunks,
            "chunks_received": self.chunks_received,
            "chunk_size": self.chunk_size,
            "task": self.task.id if self.task is not None else None,
            "cmd": self.task.command.cmd if self.task is not None else None,
            "complete": self.complete,
            "path": self.path,
            "full_remote_path": str(self.full_remote_path).encode().decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "host": str(self.host).encode().decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "is_payload": self.is_payload,
            "is_screenshot": self.is_screenshot,
            "is_download_from_agent": self.is_download_from_agent,
            "file_browser": self.file_browser.id if self.file_browser is not None else None,
            "filename": self.filename,
            "delete_after_fetch": self.delete_after_fetch,
            "operation": self.operation.name,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "deleted": self.deleted,
            "operator": self.operator.username if self.operator is not None else None,
            "md5": self.md5,
            "sha1": self.sha1
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class OperationEventLog(p.Model):
    # user-user messages, sign-on/off notifications, new callback notifications, file hosted, etc
    operator = p.ForeignKeyField(Operator, null=True)  # who sent the message
    timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    message = p.BlobField(null=False)
    operation = p.ForeignKeyField(Operation, null=False)
    level = p.TextField(null=False, default="info")
    deleted = p.BooleanField(null=False, default=False)
    resolved = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "operator": self.operator.username if self.operator is not None else None,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "message":  bytes(getattr(self, "message"))
                        .decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "operation": self.operation.name,
            "level": self.level,
            "deleted": self.deleted,
            "resolved": self.resolved
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class CallbackGraphEdge(p.Model):
    # information about p2p connections and egress to p2p connections
    # when did this connection start
    start_timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    end_timestamp = p.DateTimeField(null=True)  # when did the connection stop
    operation = p.ForeignKeyField(Operation, null=False)
    # source node for the relationship
    source = p.ForeignKeyField(Callback, backref="source", null=False)
    # destination node for the relationship
    destination = p.ForeignKeyField(Callback, backref="destination", null=False)
    # 1 is src->dst, 2 is dst->src, 3 is src<->dst
    direction = p.IntegerField(null=False)
    # metadata about the connection, JSON string
    metadata = p.BlobField(null=False, default=b"")
    # which c2 profile does this connection belong to
    c2_profile = p.ForeignKeyField(C2Profile, null=False)
    # which task added the connection
    task_start = p.ForeignKeyField(Task, backref="task_start", null=True)
    # which task ended the connection
    task_end = p.ForeignKeyField(Task, backref="task_end", null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "start_timestamp": self.start_timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "end_timestamp": self.end_timestamp.strftime("%m/%d/%Y %H:%M:%S") if self.end_timestamp is not None else None,
            "operation": self.operation.name,
            "source": json.dumps(self.source.to_json()),
            "destination": json.dumps(self.destination.to_json()),
            "direction": self.direction,
            "metadata": bytes(getattr(self, "metadata"))
                        .decode("unicode-escape", errors="backslashreplace")
                        .encode("utf-8", errors="backslashreplace")
                        .decode(),
            "c2_profile": self.c2_profile.name,
            "task_start": self.task_start.id if self.task_start is not None else None,
            "task_end": self.task_end.id if self.task_end is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# -------------- TABLE SPECIFIC ASYNC JOIN QUERIES -----------
async def operator_query():
    return (
        Operator.select(Operator, Operation)
        .join(Operation, p.JOIN.LEFT_OUTER)
        .switch(Operator)
    )


async def payloadtype_query():
    ptype = PayloadType.alias()
    return (
        PayloadType.select(PayloadType, BuildParameter, ptype)
        .join(ptype, on=(ptype.id == PayloadType.id))
        .join(BuildParameter, join_type=p.JOIN.LEFT_OUTER, on=(BuildParameter.payload_type == ptype.id))
        .switch(PayloadType)
    )



async def wrappedpayloadtypes_query():
    wrapped = PayloadType.alias()
    wrapper = PayloadType.alias()
    return (
        WrappedPayloadTypes.select(WrappedPayloadTypes, wrapper, wrapped)
        .join(wrapped, on=(WrappedPayloadTypes.wrapped == wrapped.id),)
        .switch(WrappedPayloadTypes)
        .join(wrapper, on=(WrappedPayloadTypes.wrapper == wrapper.id),)
        .switch(WrappedPayloadTypes)
    )


async def command_query():
    return Command.select(Command, PayloadType).join(PayloadType).switch(Command)


async def commandparameters_query():
    return (
        CommandParameters.select(CommandParameters, Command, PayloadType)
        .join(Command)
        .join(PayloadType)
        .switch(CommandParameters)
    )


async def operation_query():
    return Operation.select(Operation, Operator).join(Operator).switch(Operation)


async def operatoroperation_query():
    current_op = Operation.alias()
    return (
        OperatorOperation.select(
            OperatorOperation, Operator, Operation, current_op, DisabledCommandsProfile
        )
        .join(Operator)
        .join(
            current_op,
            p.JOIN.LEFT_OUTER,
            on=(Operator.current_operation == current_op.id),
        )
        .switch(OperatorOperation)
        .join(Operation)
        .switch(OperatorOperation)
        .join(DisabledCommandsProfile, p.JOIN.LEFT_OUTER)
        .switch(OperatorOperation)
    )


async def c2profile_query():
    return C2Profile.select(C2Profile)


async def payloadtypec2profile_query():
    return (
        PayloadTypeC2Profile.select(PayloadTypeC2Profile, PayloadType, C2Profile)
        .join(PayloadType)
        .switch(PayloadTypeC2Profile)
        .join(C2Profile)
        .switch(PayloadTypeC2Profile)
    )


async def payload_query():
    wrap_alias = Payload.alias()
    fm_operation = Operation.alias()
    fm_operator = Operator.alias()
    return (
        Payload.select(
            Payload, Operator, PayloadType, Operation, wrap_alias, Task, FileMeta, fm_operation, fm_operator
        )
        .join(Operator)
        .switch(Payload)
        .join(PayloadType)
        .switch(Payload)
        .join(Operation)
        .switch(Payload)
        .join(
            wrap_alias,
            p.JOIN.LEFT_OUTER,
            on=(
                (Payload.wrapped_payload == wrap_alias.id)
                & (Payload.wrapped_payload.is_null(False))
            ),
        )
        .switch(Payload)
        .join(Task, p.JOIN.LEFT_OUTER)
        .switch(Payload)
        .join(FileMeta, p.JOIN.LEFT_OUTER)
        .join(
            fm_operation,
            p.JOIN.LEFT_OUTER,
        )
        .switch(FileMeta)
        .join(
            fm_operator,
            p.JOIN.LEFT_OUTER
        )
        .switch(Payload)
    )


async def payloadonhost_query():
    file_op = Operation.alias()
    pay_op = Operation.alias()
    pay_operator = Operator.alias()
    return (
        PayloadOnHost.select(PayloadOnHost, Payload, Operation, Task, Operator, FileMeta, file_op, pay_op, PayloadType,
                             pay_operator)
        .join(Payload)
        .join(FileMeta, p.JOIN.LEFT_OUTER)
        .join(Operator, p.JOIN.LEFT_OUTER)
        .switch(FileMeta)
        .join(file_op, p.JOIN.LEFT_OUTER)
        .switch(Payload)
        .join(pay_op, p.JOIN.LEFT_OUTER)
        .switch(Payload)
        .join(PayloadType, p.JOIN.LEFT_OUTER)
        .switch(Payload)
        .join(pay_operator, p.JOIN.LEFT_OUTER)
        .switch(PayloadOnHost)
        .join(Operation)
        .switch(PayloadOnHost)
        .join(Task, p.JOIN.LEFT_OUTER)
        .switch(PayloadOnHost)
    )


async def payloadcommand_query():
    return (
        PayloadCommand.select(PayloadCommand, Payload, Command)
        .join(Payload)
        .switch(PayloadCommand)
        .join(Command)
        .switch(PayloadCommand)
    )


async def c2profileparameters_query():
    return (
        C2ProfileParameters.select(C2ProfileParameters, C2Profile)
        .join(C2Profile)
        .switch(C2ProfileParameters)
    )


async def c2profileparametersinstance_query():
    parameters_profile = C2Profile.alias()
    return (
        C2ProfileParametersInstance.select(
            C2ProfileParametersInstance,
            C2ProfileParameters,
            parameters_profile,
            C2Profile,
            Payload,
            Operation,
            Callback,
        )
        .join(C2ProfileParameters)
        .join(parameters_profile)
        .switch(C2ProfileParametersInstance)
        .join(C2Profile)
        .switch(C2ProfileParametersInstance)
        .join(Payload, p.JOIN.LEFT_OUTER)
        .switch(C2ProfileParametersInstance)
        .join(Operation, p.JOIN.LEFT_OUTER)
        .switch(C2ProfileParametersInstance)
        .join(Callback, p.JOIN.LEFT_OUTER)
        .switch(C2ProfileParametersInstance)
    )


async def callback_query():
    calias = Callback.alias()
    loperator = Operator.alias()
    return (
        Callback.select(
            Callback, Operator, Payload, FileMeta, Operation, PayloadType, calias, loperator, Task
        )
        .join(Operator)
        .switch(Callback)
        .join(Payload)
        .join(PayloadType)
        .switch(Payload)
        .join(FileMeta)
        .switch(Callback)
        .join(Operation)
        .switch(Callback)
        .join(calias, p.JOIN.LEFT_OUTER, on=(Callback.pcallback).alias("pcallback"))
        .switch(Callback)
        .join(
            loperator,
            p.JOIN.LEFT_OUTER,
            on=(Callback.locked_operator).alias("locked_operator"),
        )
        .switch(Callback)
        .join(
            Task,
            p.JOIN.LEFT_OUTER
        )
        .switch(Callback)
    )


async def payloadc2profiles_query():
    return (
        PayloadC2Profiles.select(PayloadC2Profiles, Payload, C2Profile)
        .join(Payload)
        .switch(PayloadC2Profiles)
        .join(C2Profile)
        .switch(PayloadC2Profiles)
    )


async def callbackc2profiles_query():
    return (
        CallbackC2Profiles.select(CallbackC2Profiles, Callback, C2Profile)
        .join(Callback)
        .switch(CallbackC2Profiles)
        .join(C2Profile)
        .switch(CallbackC2Profiles)
    )


async def loadedcommands_query():
    return (
        LoadedCommands.select(LoadedCommands, Command, Callback, Operator)
        .join(Command)
        .switch(LoadedCommands)
        .join(Callback)
        .switch(LoadedCommands)
        .join(Operator)
        .switch(LoadedCommands)
    )


async def disabledcommandsprofile_query():
    return (
        DisabledCommandsProfile.select(DisabledCommandsProfile, Command, PayloadType)
        .join(Command)
        .join(PayloadType)
        .switch(DisabledCommandsProfile)
    )


async def disabledcommands_query():
    return (
        DisabledCommands.select(
            DisabledCommands, Command, PayloadType, Operation, Operator
        )
        .join(Command)
        .join(PayloadType)
        .switch(DisabledCommands)
        .join(Operation)
        .switch(DisabledCommands)
        .join(Operator)
        .switch(DisabledCommands)
    )


async def task_query():
    comment_operator = Operator.alias()
    callback_operator = Operator.alias()
    callback_lock_operator = Operator.alias()
    callback_payload_type = PayloadType.alias()
    callback_payload = Payload.alias()
    return (
        Task.select(
            Task, Callback, Operator, comment_operator, Operation, Command, PayloadType, callback_operator,
            callback_lock_operator, callback_payload_type, callback_payload
        )
        .join(Callback)
        .join(Operation)
        .switch(Callback)
        .join(callback_operator)
        .switch(Callback)
        .join(callback_lock_operator, p.JOIN.LEFT_OUTER, on=(Callback.locked_operator == callback_lock_operator.id))
        .switch(Callback)
        .join(callback_payload)
        .join(callback_payload_type)
        .switch(Task)
        .join(Operator)
        .switch(Task)
        .join(
            comment_operator,
            p.JOIN.LEFT_OUTER,
            on=(Task.comment_operator == comment_operator.id).alias("comment_operator"),
        )
        .switch(Task)
        .join(Command, p.JOIN.LEFT_OUTER)
        .join(PayloadType, p.JOIN.LEFT_OUTER)
        .switch(Task)
    )


async def response_query():
    comment_operator = Operator.alias()
    return (
        Response.select(
            Response, Task, Callback, Operator, Command, comment_operator, Operation
        )
        .join(Task)
        .join(Callback)
        .join(Operation)
        .switch(Task)
        .join(Operator)
        .switch(Task)
        .join(Command, p.JOIN.LEFT_OUTER)
        .switch(Task)
        .join(
            comment_operator,
            p.JOIN.LEFT_OUTER,
            on=(Task.comment_operator == comment_operator.id).alias("comment_operator"),
        )
        .switch(Response)
    )


async def filemeta_query():
    return (
        FileMeta.select(FileMeta, Operation, Operator, Task, FileBrowserObj, Callback, Command)
        .join(Operation)
        .switch(FileMeta)
        .join(Operator, p.JOIN.LEFT_OUTER)
        .switch(FileMeta)
        .join(Task, p.JOIN.LEFT_OUTER)
        .join(Callback, p.JOIN.LEFT_OUTER)
        .switch(Task)
        .join(Command, p.JOIN.LEFT_OUTER)
        .switch(FileMeta)
        .join(FileBrowserObj, p.JOIN.LEFT_OUTER)
        .switch(FileMeta)
    )


async def attack_query():
    return ATTACK.select()


async def attackcommand_query():
    return (
        ATTACKCommand.select(ATTACKCommand, ATTACK, Command, PayloadType)
        .join(ATTACK)
        .switch(ATTACKCommand)
        .join(Command)
        .join(PayloadType)
        .switch(ATTACKCommand)
    )


async def attacktask_query():
    return (
        ATTACKTask.select(
            ATTACKTask, ATTACK, Task, Command, PayloadType, Operation, Callback
        )
        .join(ATTACK)
        .switch(ATTACKTask)
        .join(Task)
        .join(Command)
        .join(PayloadType)
        .switch(Task)
        .join(Callback)
        .join(Operation)
        .switch(ATTACKTask)
    )


async def credential_query():
    return (
        Credential.select(Credential, Operation, Operator)
        .join(Operation)
        .switch(Credential)
        .join(Operator)
        .switch(Credential)
    )


async def keylog_query():
    comment_operator = Operator.alias()
    return (
        Keylog.select(
            Keylog, Task, Operation, Command, Operator, Callback, comment_operator
        )
        .join(Task)
        .join(Callback)
        .switch(Task)
        .join(Operator)
        .switch(Task)
        .join(Command)
        .switch(Task)
        .join(
            comment_operator,
            p.JOIN.LEFT_OUTER,
            on=(Task.comment_operator == comment_operator.id).alias("comment_operator"),
        )
        .switch(Keylog)
        .join(Operation)
        .switch(Keylog)
    )


async def artifact_query():
    return Artifact.select()


async def taskartifact_query():
    return (
        TaskArtifact.select(TaskArtifact, Task, Command, Artifact, Operation)
        .join(Task, p.JOIN.LEFT_OUTER)
        .join(Command, p.JOIN.LEFT_OUTER)
        .switch(TaskArtifact)
        .join(Artifact, p.JOIN.LEFT_OUTER)
        .switch(TaskArtifact)
        .join(Operation, p.JOIN.LEFT_OUTER)
        .switch(TaskArtifact)
    )


async def staginginfo_query():
    return StagingInfo.select()


async def apitokens_query():
    return APITokens.select(APITokens, Operator).join(Operator).switch(APITokens)


async def browserscript_query():
    return (
        BrowserScript.select(BrowserScript, Operator, Command, PayloadType)
        .join(Operator, p.JOIN.LEFT_OUTER)
        .switch(BrowserScript)
        .join(Command, p.JOIN.LEFT_OUTER)
        .switch(BrowserScript)
        .join(PayloadType)
        .switch(BrowserScript)
    )


async def browserscriptoperation_query():
    return (
        BrowserScriptOperation.select(
            BrowserScriptOperation,
            BrowserScript,
            Operation,
            Command,
            PayloadType,
            Operator,
        )
        .join(BrowserScript)
        .join(Command, p.JOIN.LEFT_OUTER)
        .join(PayloadType, p.JOIN.LEFT_OUTER)
        .switch(BrowserScript)
        .join(Operator)
        .switch(BrowserScriptOperation)
        .join(Operation)
        .switch(BrowserScriptOperation)
    )


async def processlist_query():
    return (
        ProcessList.select(ProcessList, Task, Callback, Operation)
        .join(Task)
        .join(Callback)
        .switch(ProcessList)
        .join(Operation)
        .switch(ProcessList)
    )


async def filebrowserobj_query():
    parent = FileBrowserObj.alias()
    return (
        FileBrowserObj.select(FileBrowserObj, Task, Callback, Operation, parent)
        .join(Task)
        .join(Callback)
        .switch(FileBrowserObj)
        .join(Operation)
        .switch(FileBrowserObj)
        .join(parent, p.JOIN.LEFT_OUTER, on=(FileBrowserObj.parent).alias("parent"))
        .switch(FileBrowserObj)
    )


async def operationeventlog_query():
    return (
        OperationEventLog.select(OperationEventLog, Operator, Operation)
        .join(Operator, p.JOIN.LEFT_OUTER)
        .switch(OperationEventLog)
        .join(Operation)
        .switch(OperationEventLog)
    )


async def callbackgraphedge_query():
    destination = Callback.alias()
    source = Callback.alias()
    task_end = Task.alias()
    task_start = Task.alias()
    dest_operation = Operation.alias()
    dest_payloadtype = PayloadType.alias()
    dest_payload = Payload.alias()
    dest_operator = Operator.alias()
    dest_locked_operator = Operator.alias()
    source_operation = Operation.alias()
    source_payloadtype = PayloadType.alias()
    source_payload = Payload.alias()
    source_operator = Operator.alias()
    source_locked_operator = Operator.alias()
    return (
        CallbackGraphEdge.select(
            CallbackGraphEdge,
            source,
            destination,
            Operation,
            task_start,
            task_end,
            C2Profile,
            dest_operation,
            dest_payloadtype,
            dest_payload,
            dest_operator,
            dest_locked_operator,
            source_operation,
            source_payloadtype,
            source_payload,
            source_operator,
            source_locked_operator
        )
        .join(source, on=(CallbackGraphEdge.source == source.id))
        .join(source_operation)
        .switch(source)
        .join(source_payload)
        .join(source_payloadtype)
        .switch(source)
        .join(source_operator)
        .switch(source)
        .join(source_locked_operator, p.JOIN.LEFT_OUTER, on=(source.locked_operator == source_locked_operator.id))
        .switch(CallbackGraphEdge)
        .join(destination, on=(CallbackGraphEdge.destination == destination.id))
        .join(dest_operation)
        .switch(destination)
        .join(dest_payload)
        .join(dest_payloadtype)
        .switch(destination)
        .join(dest_operator)
        .switch(destination)
        .join(dest_locked_operator, p.JOIN.LEFT_OUTER, on=(destination.locked_operator == dest_locked_operator.id))
        .switch(CallbackGraphEdge)
        .join(Operation)
        .switch(CallbackGraphEdge)
        .join(task_start, p.JOIN.LEFT_OUTER, on=(CallbackGraphEdge.task_start == task_start.id))
        .switch(CallbackGraphEdge)
        .join(
            task_end,
            p.JOIN.LEFT_OUTER,
            on=(CallbackGraphEdge.task_end == task_end.id),
        )
        .switch(CallbackGraphEdge)
        .join(C2Profile)
        .switch(CallbackGraphEdge)
    )


async def buildparameter_query():
    return (
        BuildParameter.select(BuildParameter, PayloadType)
        .join(PayloadType)
        .switch(BuildParameter)
    )


async def buildparameterinstance_query():
    return (
        BuildParameterInstance.select(
            BuildParameterInstance, BuildParameter, Payload, PayloadType
        )
        .join(BuildParameter)
        .switch(BuildParameterInstance)
        .join(Payload)
        .join(PayloadType)
        .switch(BuildParameterInstance)
    )


# ------------ LISTEN / NOTIFY ---------------------
def pg_register_newinserts():
    inserts = [
        "callback",
        "task",
        "payload",
        "c2profile",
        "operator",
        "operation",
        "payloadtype",
        "command",
        "operatoroperation",
        "payloadtypec2profile",
        "filemeta",
        "payloadcommand",
        "attack",
        "credential",
        "keylog",
        "commandparameters",
        "loadedcommands",
        "response",
        "attackcommand",
        "attacktask",
        "artifact",
        "taskartifact",
        "staginginfo",
        "apitokens",
        "browserscript",
        "disabledcommandsprofile",
        "disabledcommands",
        "processlist",
        "filebrowserobj",
        "browserscriptoperation",
        "operationeventlog",
        "callbackgraphedge",
        "payloadc2profiles",
        "buildparameter",
        "buildparameterinstance",
        "callbackc2profiles",
        "payloadonhost",
        "wrappedpayloadtypes",
    ]
    for table in inserts:
        create_function_on_insert = (
            "DROP FUNCTION IF EXISTS notify_new"
            + table
            + "() cascade;"
            + "CREATE FUNCTION notify_new"
            + table
            + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('new"
            + table
            + "', NEW.id::text); RETURN NULL; END; $$;"
        )
        create_trigger_on_insert = (
            "CREATE TRIGGER new"
            + table
            + "_trigger AFTER INSERT ON "
            + table
            + " FOR EACH ROW EXECUTE PROCEDURE notify_new"
            + table
            + "();"
        )
        try:
            mythic_db.execute_sql(create_function_on_insert)
            mythic_db.execute_sql(create_trigger_on_insert)
        except Exception as e:
            print(e)


def pg_register_updates():
    updates = [
        "callback",
        "task",
        "response",
        "payload",
        "c2profile",
        "operator",
        "operation",
        "payloadtype",
        "command",
        "operatoroperation",
        "payloadtypec2profile",
        "filemeta",
        "payloadcommand",
        "attack",
        "credential",
        "keylog",
        "commandparameters",
        "loadedcommands",
        "attackcommand",
        "attacktask",
        "artifact",
        "taskartifact",
        "operationeventlog",
        "staginginfo",
        "apitokens",
        "browserscript",
        "disabledcommandsprofile",
        "disabledcommands",
        "processlist",
        "filebrowserobj",
        "browserscriptoperation",
        "callbackgraphedge",
        "callbackc2profiles",
        "payloadonhost",
        "wrappedpayloadtypes",
        "buildparameter",
        "buildparameterinstance",
    ]
    for table in updates:
        create_function_on_changes = (
            "DROP FUNCTION IF EXISTS notify_updated"
            + table
            + "() cascade;"
            + "CREATE FUNCTION notify_updated"
            + table
            + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('updated"
            + table
            + "', NEW.id::text); RETURN NULL; END; $$;"
        )
        create_trigger_on_changes = (
            "CREATE TRIGGER updated"
            + table
            + "_trigger AFTER UPDATE ON "
            + table
            + " FOR EACH ROW EXECUTE PROCEDURE notify_updated"
            + table
            + "();"
        )
        try:
            mythic_db.execute_sql(create_function_on_changes)
            mythic_db.execute_sql(create_trigger_on_changes)
        except Exception as e:
            print(e)


def pg_register_deletes():
    updates = [
        "commandparameters",
        "disabledcommands",
        "browserscriptoperation",
        "credential",
        "loadedcommands",
        "wrappedpayloadtypes",
    ]
    for table in updates:
        create_function_on_deletes = (
            "DROP FUNCTION IF EXISTS notify_deleted"
            + table
            + "() cascade;"
            + "CREATE FUNCTION notify_deleted"
            + table
            + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('deleted"
            + table
            + "', row_to_json(OLD)::text); RETURN NULL; END; $$;"
        )
        create_trigger_on_deletes = (
            "CREATE TRIGGER deleted"
            + table
            + "_trigger AFTER DELETE ON "
            + table
            + " FOR EACH ROW EXECUTE PROCEDURE notify_deleted"
            + table
            + "();"
        )
        try:
            mythic_db.execute_sql(create_function_on_deletes)
            mythic_db.execute_sql(create_trigger_on_deletes)
        except Exception as e:
            print(e)


# don't forget to add in a new truncate command in database_api.py to clear the rows if you add a new table
Operator.create_table(True)
PayloadType.create_table(True)
BuildParameter.create_table(True)
WrappedPayloadTypes.create_table(True)
Command.create_table(True)
CommandParameters.create_table(True)
Operation.create_table(True)
DisabledCommandsProfile.create_table(True)
DisabledCommands.create_table(True)
OperatorOperation.create_table(True)
C2Profile.create_table(True)
PayloadTypeC2Profile.create_table(True)
Payload.create_table(True)
BuildParameterInstance.create_table(True)
PayloadOnHost.create_table(True)
Callback.create_table(True)
Task.create_table(True)
Response.create_table(True)
PayloadCommand.create_table(True)
C2ProfileParameters.create_table(True)
C2ProfileParametersInstance.create_table(True)
PayloadC2Profiles.create_table(True)
CallbackC2Profiles.create_table(True)
ATTACK.create_table(True)
ATTACKCommand.create_table(True)
ATTACKTask.create_table(True)
Credential.create_table(True)
Keylog.create_table(True)
LoadedCommands.create_table(True)
Artifact.create_table(True)
TaskArtifact.create_table(True)
StagingInfo.create_table(True)
APITokens.create_table(True)
BrowserScript.create_table(True)
BrowserScriptOperation.create_table(True)
ProcessList.create_table(True)
FileBrowserObj.create_table(True)
FileMeta.create_table(True)
OperationEventLog.create_table(True)
CallbackGraphEdge.create_table(True)
# setup default admin user and c2 profile
# Create the ability to do LISTEN / NOTIFY on these tables
pg_register_newinserts()
pg_register_updates()
pg_register_deletes()
try:
    Payload._schema.create_foreign_key(Payload.pcallback)
    Payload._schema.create_foreign_key(Payload.wrapped_payload)
    Payload._schema.create_foreign_key(Payload.task)
    Payload._schema.create_foreign_key(Payload.file_id)
    Operator._schema.create_foreign_key(Operator.current_operation)
    PayloadOnHost._schema.create_foreign_key(PayloadOnHost.task)
    Callback._schema.create_foreign_key(Callback.pcallback)
    Callback._schema.create_foreign_key(Callback.socks_task)
except Exception as e:
    pass
