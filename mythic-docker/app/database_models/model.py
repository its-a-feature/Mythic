# -*- coding: utf-8 -*-
import base64

import peewee as p
import datetime
from app import mythic_db
import app.crypto as crypto
import json
from uuid import uuid4
import sys


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
    admin = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    salt = p.TextField(null=False)
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    last_login = p.DateTimeField(default=None, null=True)
    failed_login_count = p.IntegerField(null=False, default=0)
    last_failed_login_timestamp = p.DateTimeField(null=True)
    # option to simply de-activate an account instead of delete it so you keep all your relational data intact
    active = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    current_operation = p.DeferredForeignKey("Operation", null=True)
    ui_config = p.TextField(null=False, default=dark_config)
    view_utc_time = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])

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
            "last_login": self.last_login.strftime("%m/%d/%Y %H:%M:%S") if self.last_login is not None else None,
            "active": self.active,
            "current_operation": self.current_operation.name if self.current_operation is not None else None,
            "current_operation_id": self.current_operation.id if self.current_operation is not None else None,
            "ui_config": self.ui_config,
            "view_utc_time": self.view_utc_time,
            "deleted": self.deleted,
            "failed_login_count": self.failed_login_count,
            "last_failed_login_timestamp": self.last_failed_login_timestamp.strftime("%m/%d/%Y %H:%M:%S") if self.last_failed_login_timestamp is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    async def check_password(self, password):
        temp_pass = await crypto.hash_SHA512(self.salt + password)
        return self.password.lower() == temp_pass.lower()

    async def hash_password(self, password):
        return await crypto.hash_SHA512(password)


class TranslationContainer(p.Model):
    name = p.TextField(null=False, unique=True)
    last_heartbeat = p.DateTimeField(default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")], null=False)
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    container_running = p.BooleanField(null=False, default=True, constraints=[p.SQL("DEFAULT TRUE")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "name": self.name,
            "deleted": self.deleted,
            "last_heartbeat": self.last_heartbeat.strftime("%m/%d/%Y %H:%M:%S"),
            "container_running": self.container_running
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# This is information about a class of payloads (like Apfell-jxa)
#   This will have multiple Command class objects associated with it
#   Users can create their own commands and payload types as well
class PayloadType(p.Model):
    ptype = p.TextField(null=False, unique=True)
    mythic_encrypts = p.BooleanField(null=False, default=True)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")])
    file_extension = p.CharField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # if this type requires another payload to be already created
    wrapper = p.BooleanField(constraints=[p.SQL("DEFAULT FALSE")], null=False)
    # indicate which OS/versions this payload works for
    supported_os = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # information about getting information to/from another container or machine for building/loading/transforming
    last_heartbeat = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    container_running = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    service = p.TextField(null=False, constraints=[p.SQL("DEFAULT 'rabbitmq'")])
    # who created the code for the payload type, not just who imported it
    author = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    note = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    supports_dynamic_loading = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    translation_container = p.ForeignKeyField(TranslationContainer, null=True)
    container_count = p.IntegerField(null=False, default=0, constraints=[p.SQL("DEFAULT 0")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "ptype": self.ptype,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "file_extension": self.file_extension,
            "mythic_encrypts": self.mythic_encrypts,
            "wrapper": self.wrapper,
            "supported_os": self.supported_os,
            "last_heartbeat": self.last_heartbeat.strftime("%m/%d/%Y %H:%M:%S"),
            "container_running": self.container_running,
            "service": self.service,
            "author": self.author,
            "note": self.note,
            "supports_dynamic_loading": self.supports_dynamic_loading,
            "deleted": self.deleted,
            "translation_container": self.translation_container.to_json() if self.translation_container is not None else None,
            "container_count": self.container_count
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
    name = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # what kind of parameter should be shown in the UI? String or ChooseOne
    parameter_type = p.TextField(null=False, constraints=[p.SQL("DEFAULT 'None'")])
    description = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # associated payload type
    payload_type = p.ForeignKeyField(PayloadType, backref="build_parameters")
    required = p.BooleanField(constraints=[p.SQL("DEFAULT TRUE")], null=False)
    verifier_regex = p.TextField(constraints=[p.SQL("DEFAULT ''")], null=False)
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    parameter = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])

    class Meta:
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


class CommandOPSEC(p.Model):
    deleted = p.BooleanField(default=False, null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # opsec components that we care about regarding a specific command's execution
    injection_method = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])
    process_creation = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])
    authentication = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "deleted": self.deleted,
            "injection_method": self.injection_method,
            "process_creation": self.process_creation,
            "authentication": self.authentication
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# This has information about a specific command that can be executed by a PayloadType
#   Custom commands can be created by users
#   There will be a new Command instance for every cmd+payload_type combination
#      (each payload_type needs its own 'shell' command because they might be implemented differently)
class Command(p.Model):
    needs_admin = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # generates get-help info on the command
    help_cmd = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    description = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    cmd = p.CharField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # this command applies to what payload types
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")])
    # what version, so we can know if loaded commands are out of date
    version = p.IntegerField(null=False, constraints=[p.SQL("DEFAULT 1")])
    # identify the supported UI features that this command can be used for, such as: file_browser:list
    # full list of supported options can be found on docs.mythic-c2.net
    supported_ui_features = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])
    author = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # specify if this command supports being injected into a remote process and executed
    attributes = p.TextField(null=False,  constraints=[p.SQL("DEFAULT '{}'")])
    # specify any opsec considerations for the command
    opsec = p.ForeignKeyField(CommandOPSEC, null=True)
    # indicate if the command is only a script to create subtasks and doesn't get compiled into an agent
    script_only = p.BooleanField(null=False, default=False, constraints=[p.SQL("DEFAULT FALSE")])

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
            "supported_ui_features": self.supported_ui_features.split("\n"),
            "author": self.author,
            "deleted": self.deleted,
            "attributes": json.loads(getattr(self, "attributes")),
            "opsec": self.opsec.to_json() if self.opsec is not None else None,
            "script_only": self.script_only,
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# these parameters are used to create an easily parsible JSON 'params' field for the agent to utilize
class CommandParameters(p.Model):
    command = p.ForeignKeyField(Command, null=False)
    # what is the name of the parameter (what is displayed in the UI and becomes dictionary key)
    name = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    display_name = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    cli_name = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # String, Boolean, Number, Array, Choice, ChoiceMultiple, Credential, File, PayloadList, AgentConnect
    type = p.CharField(null=False, constraints=[p.SQL("DEFAULT 'String'")])
    default_value = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # \n separated list of possible choices
    choices = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])

    description = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # if the action is related to payloads or linking agents, you can limit the options to only agents you want
    supported_agents = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # if the action is related to payloads or linking agents, you can also limit to specific agent build param values
    supported_agent_build_parameters = p.TextField(null=False, constraints=[p.SQL("DEFAULT '{}'")])
    choice_filter_by_command_attributes = p.TextField(null=False, constraints=[p.SQL("DEFAULT '{}'")])
    choices_are_all_commands = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    choices_are_loaded_commands = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # indicate the name of the function to call to dynamically populate the parameter values
    dynamic_query_function = p.TextField(null=True)

    parameter_group_name = p.TextField(null=False, constraints=[p.SQL("DEFAULT 'default'")])
    required = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT TRUE")])
    ui_position = p.IntegerField(null=False)

    class Meta:
        indexes = ((("command", "name", "parameter_group_name"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "command": self.command.id,
            "cmd": self.command.cmd,
            "payload_type": self.command.payload_type.ptype,
            "name": self.name,
            "display_name": self.display_name,
            "cli_name": self.cli_name,
            "type": self.type,
            "default_value": self.default_value,
            "choices": self.choices,
            "required": self.required,
            "description": self.description,
            "supported_agents": self.supported_agents,
            "supported_agent_build_parameters": self.supported_agent_build_parameters,
            "choice_filter_by_command_attributes": self.choice_filter_by_command_attributes,
            "choices_are_all_commands": self.choices_are_all_commands,
            "choices_are_loaded_commands": self.choices_are_loaded_commands,
            "ui_position": self.ui_position,
            "dynamic_query_function": self.dynamic_query_function
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# users will be associated with operations
#   payload_types and commands are associated with all operations
#   when creating a new operation, associate all the default c2profiles with it
default_webhook_message = json.dumps({
                "channel": "{channel}",
                "username": "{display_name}",
                "icon_emoji": "{icon_emoji}",
                "attachments": [
                    {
                        "fallback": "New Mythic Callback!",
                        "color": "#b366ff",
                        "blocks": [
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": "<!channel> You have a new Callback!",
                                },
                            },
                            {"type": "divider"},
                            {
                                "type": "section",
                                "fields": [
                                    {
                                        "type": "mrkdwn",
                                        "text": "*Operation:*\n{operation}",
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": "*IP:*\n{ip}",
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": "*Callback ID:*\n{callback}",
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": "*Type:*\n{payload_type}",
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": '*Description:*\n"{description}"',
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": "*Operator:*\n{operator}",
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": "*Integrity Level*\n{integrity}",
                                    },
                                ],
                            },
                        ],
                    }
                ]
            }, indent=4)


class Operation(p.Model):
    name = p.TextField(null=False, unique=True, constraints=[p.SQL("DEFAULT gen_random_uuid()")])
    admin = p.ForeignKeyField(Operator, null=False)  # who is an admin of this operation
    complete = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    webhook = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    channel = p.TextField(null=False, constraints=[p.SQL("DEFAULT '#random'")])
    display_name = p.TextField(null=False, constraints=[p.SQL("DEFAULT 'Mythic'")])
    icon_emoji = p.TextField(null=False, constraints=[p.SQL("DEFAULT ':mythic:'")])
    icon_url = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    webhook_message = p.TextField(null=False, default=default_webhook_message)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": self.name,
            "admin": self.admin.username,
            "complete": self.complete,
            "webhook": self.webhook,
            "channel": self.channel,
            "display_name": self.display_name,
            "icon_emoji": self.icon_emoji,
            "icon_url": self.icon_url,
            "webhook_message": self.webhook_message
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
    operation = p.ForeignKeyField(Operation, null=False)

    class Meta:
        indexes = ((("command", "name", "operation"), True),)
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": self.name,
            "command": self.command.cmd,
            "command_id": self.command.id,
            "payload_type": self.command.payload_type.ptype,
            "operation_name": self.operation.name,
            "operation_id": self.operation.id
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# because operators and operations are a many-to-many relationship, we need a join table to facilitate
#   this means operator class doesn't mention operation, and operation doesn't mention operator - odd, I know
class OperatorOperation(p.Model):
    operator = p.ForeignKeyField(Operator)
    operation = p.ForeignKeyField(Operation)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    base_disabled_commands = p.ForeignKeyField(DisabledCommandsProfile, null=True)
    view_mode = p.TextField(null=False, constraints=[p.SQL("DEFAULT 'operator'")])

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
    description = p.TextField(null=True, constraints=[p.SQL("DEFAULT ''")])
    # list of payload types that are supported (i.e. have a corresponding module created for them on the client side
    # This has information about supported payload types, but that information is in a separate join table
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    # indicates if the c2 profile is running
    running = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    last_heartbeat = p.DateTimeField(null=False, default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")])
    # indicates if the c2 profile container is up and able to receive tasking
    container_running = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    author = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # identify if this is a p2p protocol or not, we treat those a bit differently
    is_p2p = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # server_routed means the server specifies the specific route for sending messages
    is_server_routed = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])

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
    tag = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # creator of the payload, cannot be null! must be attributed to somebody (indicates "who")
    operator = p.ForeignKeyField(Operator, null=False)
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    # this is fine because this is an instance of a payload, so it's tied to one PayloadType
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    operation = p.ForeignKeyField(Operation, null=False)
    wrapped_payload = p.ForeignKeyField("self", null=True)
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # if the payload is in the build process: building, success, error
    build_container = p.TextField(null=False)
    build_phase = p.TextField(null=False,constraints=[p.SQL("DEFAULT 'building'")])
    # capture error or any other info
    build_message = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    build_stderr = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    build_stdout = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # if there is a slack webhook for the operation, decide if this payload should generate an alert or not
    callback_alert = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT TRUE")])
    # when dealing with auto-generated payloads for lateral movement or spawning new callbacks
    auto_generated = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    task = p.DeferredForeignKey("Task", null=True)
    file = p.DeferredForeignKey("FileMeta", null=True)
    # which OS is this for
    os = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "uuid": self.uuid,
            "tag": self.tag,
            "description": self.tag,
            "operator": self.operator.username,
            "creation_time": self.creation_time.strftime("%m/%d/%Y %H:%M:%S"),
            "payload_type": self.payload_type.ptype,
            "operation": self.operation.name,
            "wrapped_payload": self.wrapped_payload.uuid if self.wrapped_payload is not None else None,
            "deleted": self.deleted,
            "os": self.os,
            "build_container": self.build_container,
            "build_phase": self.build_phase,
            "build_message": self.build_message,
            "build_stderr": self.build_stderr,
            "build_stdout": self.build_stdout,
            "callback_alert": self.callback_alert,
            "auto_generated": self.auto_generated,
            "task": self.task.to_json() if self.task is not None else None,
            "file": self.file.to_json() if self.file is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# this is an instance of a payload
class PayloadOnHost(p.Model):
    host = p.TextField(null=False)
    payload = p.ForeignKeyField(Payload, null=False)
    deleted = p.BooleanField(constraints=[p.SQL("DEFAULT FALSE")], null=False)
    operation = p.ForeignKeyField(Operation, null=False)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
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
            "task": self.task.id if self.task is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class BuildParameterInstance(p.Model):
    # this is the instance of actual values used to create a specific payload instance
    build_parameter = p.ForeignKeyField(BuildParameter, null=False)
    payload = p.ForeignKeyField(Payload, null=False, backref="build_parameters")
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
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
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
    default_value = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    randomize = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    format_string = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    parameter_type = p.TextField(null=False, constraints=[p.SQL("DEFAULT 'String'")])
    required = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT TRUE")])
    verifier_regex = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    crypto_type = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])

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
            "verifier_regex": self.verifier_regex,
            "deleted": self.deleted,
            "crypto_type": self.crypto_type
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Callback(p.Model):
    agent_callback_id = p.TextField(unique=True, null=False, default=gen_uuid)
    init_callback = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    last_checkin = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    user = p.CharField(null=False)
    host = p.TextField(null=False)
    pid = p.IntegerField(null=False)
    ip = p.CharField(max_length=100, null=False)
    external_ip = p.TextField(null=True)
    process_name = p.TextField(null=True)
    description = p.TextField(null=True)
    operator = p.ForeignKeyField(Operator, null=False)
    active = p.BooleanField(constraints=[p.SQL("DEFAULT TRUE")], null=False)
    # what payload is associated with this callback
    registered_payload = p.ForeignKeyField(Payload, null=False)
    integrity_level = p.IntegerField(null=True, default=2)
    # an operator can lock a callback to themselves so that other users cannot issue commands as well
    locked = p.BooleanField(constraints=[p.SQL("DEFAULT FALSE")])
    locked_operator = p.ForeignKeyField(
        Operator, null=True, backref="locked_operator"
    )
    operation = p.ForeignKeyField(Operation, null=False)
    # the following information comes from the c2 profile if it wants to provide some form of encryption
    # the kind of encryption on this callback (aes, xor, rc4, etc)
    crypto_type = p.TextField(null=True)
    dec_key = p.BlobField(null=True)
    enc_key = p.BlobField(null=True)
    os = p.TextField(null=True)
    architecture = p.TextField(null=True)
    domain = p.TextField(null=True)
    # associated socks information
    port = p.IntegerField(null=True)
    socks_task = p.DeferredForeignKey("Task", null=True)
    # if you need to define extra context for a callback, like a webshell, supply that here
    extra_info = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # store information about sleep interval/jitter/waking hours/etc here
    sleep_info = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])

    class Meta:
        database = mythic_db

    def to_json(self, get_tokens=True):
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
            "sleep_info": self.sleep_info,
            "process_name": self.process_name
        }
        if get_tokens:
            r["tokens"] = []
            for x in self.tokens:
                if x.deleted is False:
                    r["tokens"].append(x.to_json())
        return r

    def __str__(self):
        return str(getattr(self, "id"))


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
    # if c2_profile_parameters.crypto_type is True then we can specify enc and dec keys
    enc_key = p.BlobField(null=True)
    dec_key = p.BlobField(null=True)
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
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
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
            "attributes": json.loads(self.command.attributes),
            "supported_ui_features": self.command.supported_ui_features.split("\n")
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Task(p.Model):
    agent_task_id = p.TextField(unique=True, null=False, default=gen_uuid)
    # could be added via task/clear or scripting by bot
    command = p.ForeignKeyField(Command, null=True)
    command_name = p.TextField(null=False, default="", constraints=[p.SQL("default ''")])
    params = p.TextField(
        null=True
    )  # this will have the instance specific params (ex: id)
    # make room for ATT&CK ID (T#) if one exists or enable setting this later
    status_timestamp_preprocessing = p.DateTimeField(
        default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")], null=False
    )
    status_timestamp_submitted = p.DateTimeField(null=True)
    status_timestamp_processing = p.DateTimeField(null=True)
    status_timestamp_processed = p.DateTimeField(null=True)
    # this is the last timestamp that something happened
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    # every task is associated with a specific callback that executes the task
    callback = p.ForeignKeyField(Callback, null=False)
    # the operator to issue the command can be different from the one that spawned the callback
    operator = p.ForeignKeyField(Operator, null=True)
    # [preprocessing, submitted, processing, processed]
    status = p.CharField(null=False, default="preprocessing")
    # save off the original params in the scenarios where we to transforms on it for logging and tracking purposes
    original_params = p.TextField(null=True)
    # what to display to the user so that they don't see big JSON blobs immediately
    display_params = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # people can add a comment to the task
    comment = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # the user that added the above comment
    comment_operator = p.ForeignKeyField(
        Operator, backref="comment_operator", null=True
    )
    # optionally allow tasking to capture stdout/stderr when going through create_tasking for later analysis
    stdout = p.TextField(null=False, default="", constraints=[p.SQL("default ''")])
    stderr = p.TextField(null=False, default="", constraints=[p.SQL("default ''")])
    completed = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # Track which securitycontext was used for this task
    token = p.DeferredForeignKey('Token', null=True)
    opsec_pre_blocked = p.BooleanField(null=True)
    opsec_pre_message = p.TextField(null=False, default="", constraints=[p.SQL("default ''")])
    opsec_pre_bypassed = p.BooleanField(null=False, default=False, constraints=[p.SQL("DEFAULT FALSE")])
    opsec_pre_bypass_role = p.TextField(null=False, default="lead", constraints=[p.SQL("DEFAULT 'lead'")])
    opsec_pre_bypass_user = p.ForeignKeyField(Operator, null=True)
    opsec_post_blocked = p.BooleanField(null=True)
    opsec_post_message = p.TextField(null=False, default="", constraints=[p.SQL("default ''")])
    opsec_post_bypassed = p.BooleanField(null=False, default=False, constraints=[p.SQL("DEFAULT FALSE")])
    opsec_post_bypass_role = p.TextField(null=False, default="lead", constraints=[p.SQL("DEFAULT 'lead'")])
    opsec_post_bypass_user = p.ForeignKeyField(Operator, null=True)
    # track if this task is a subtask of others
    parent_task = p.ForeignKeyField('self', null=True)
    # can register callback function for when this subtask is complete (called on parent_task command file)
    subtask_callback_function = p.TextField(null=True)
    # null means we haven't tried to submit the function yet, then T/F indicates if we successfully called the function
    subtask_callback_function_completed = p.BooleanField(null=True)
    # can register callback function for when an entire group of subtasks completes
    #  this is called on the parent_task's command file
    group_callback_function = p.TextField(null=True)
    # null means we haven't tried to submit the function yet, then T/F indicates if we successfully called the function
    group_callback_function_completed = p.BooleanField(null=True)
    # can register callback function for when task has no more subtasks in a non-completed state
    #  this can apply to normal tasks or to tasks with subtasks
    completed_callback_function = p.TextField(null=True)
    # null means we haven't tried to submit the function yet, then T/F indicates if we successfully called the function
    completed_callback_function_completed = p.BooleanField(null=True)
    # can logically group a set of subtasks together and execute completion handlers when they're all done
    subtask_group_name = p.TextField(null=True)
    tasking_location = p.TextField(null=False,  constraints=[p.SQL("DEFAULT 'command_line'")])
    parameter_group_name = p.TextField(null=False,  constraints=[p.SQL("DEFAULT 'Default'")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "agent_task_id": self.agent_task_id,
            "command": self.command.cmd if self.command is not None else None,
            "command_name": self.command_name,
            "payload_type": self.command.payload_type.ptype if self.command is not None else None,
            "command_id": self.command.id if self.command is not None else None,
            "status_timestamp_preprocessing": self.status_timestamp_preprocessing.strftime("%m/%d/%Y %H:%M:%S"),
            "status_timestamp_submitted": self.status_timestamp_submitted.strftime("%m/%d/%Y %H:%M:%S") if self.status_timestamp_submitted is not None else None,
            "status_timestamp_processing": self.status_timestamp_processing.strftime("%m/%d/%Y %H:%M:%S") if self.status_timestamp_processing is not None else None,
            "status_timestamp_processed": self.status_timestamp_processed.strftime("%m/%d/%Y %H:%M:%S") if self.status_timestamp_processed is not None else None,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "callback": self.callback.id,
            "operation": self.callback.operation.name,
            "operator": self.operator.username if self.operator is not None else "MythicServer",
            "status": self.status,
            "original_params": self.original_params,
            "comment": self.comment,
            "comment_operator": self.comment_operator.username if self.comment_operator is not None else None,
            "completed": self.completed,
            "token": self.token.to_json() if self.token is not None else None,
            "opsec_pre_blocked": self.opsec_pre_blocked,
            "opsec_pre_bypassed": self.opsec_pre_bypassed,
            "opsec_pre_message": self.opsec_pre_message,
            "opsec_pre_bypass_role": self.opsec_pre_bypass_role,
            "opsec_pre_bypass_user": self.opsec_pre_bypass_user.username if self.opsec_pre_bypass_user is not None else "",
            "opsec_post_blocked": self.opsec_post_blocked,
            "opsec_post_bypassed": self.opsec_post_bypassed,
            "opsec_post_message": self.opsec_post_message,
            "opsec_post_bypass_role": self.opsec_post_bypass_role,
            "opsec_post_bypass_user": self.opsec_post_bypass_user.username if self.opsec_post_bypass_user is not None else "",
            "display_params": self.display_params,
            "parent_task": self.parent_task.id if self.parent_task is not None else None,
            "subtask_callback_function": self.subtask_callback_function,
            "group_callback_function": self.group_callback_function,
            "completed_callback_function": self.completed_callback_function,
            "subtask_group_name": self.subtask_group_name,
            "tasking_location": self.tasking_location,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "parameter_group_name": self.parameter_group_name
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class TaskTag(p.Model):
    task = p.ForeignKeyField(Task, null=False, backref="tags")
    operation = p.ForeignKeyField(Operation, null=False)
    tag = p.TextField(null=False, default="", constraints=[p.SQL("default ''")])

    class Meta:
        database = mythic_db

    def to_json(self):
        return {
            "task": self.task.id,
            "tag": self.tag,
            "operation": self.operation.name
        }

    def __str__(self):
        return json.dumps(self.to_json())


class LogonSession(p.Model):
    # Windows Logon Session data
    LogonId = p.IntegerField(null=True)
    UserName = p.TextField(null=True)
    LogonDomain = p.TextField(null=True)
    FullQualifiedUserName = p.TextField(null=True)
    LogonType = p.TextField(null=True)
    SessionId = p.IntegerField(null=True)
    Sid = p.TextField(null=True)
    LogonTime = p.TimestampField(null=True)
    LogonServer = p.TextField(null=True)
    DnsDomainName = p.TextField(null=True)
    Upn = p.TextField(null=True)
    UserFlags = p.IntegerField(null=True)
    LastSuccessfulLogon = p.TimestampField(null=True)
    LastFailedLogon = p.TimestampField(null=True)
    FailedAttemptCountSinceLastSuccessfulLogon = p.IntegerField(null=True)
    LogonScript = p.TextField(null=True)
    ProfilePath = p.TextField(null=True)
    HomeDirectory = p.TextField(null=True)
    HomeDirectoryDrive = p.TextField(null=True)
    LogoffTime = p.TimestampField(null=True)
    KickOffTime = p.TimestampField(null=True)
    PasswordLastSet = p.TimestampField(null=True)
    PasswordCanChange = p.TimestampField(null=True)
    PasswordMustChange = p.TimestampField(null=True)
    # Mythic tracking data
    os = p.TextField(null=False, default="Windows", constraints=[p.SQL("default 'Windows'")])
    task = p.ForeignKeyField(Task, null=False)
    timestamp_created = p.DateTimeField(default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")], null=False)
    deleted = p.BooleanField(default=False, null=False, constraints=[p.SQL("DEFAULT FALSE")])
    host = p.TextField(null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id")
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Process(p.Model):
    # which task populated the data
    task = p.ForeignKeyField(Task, null=False)
    # when did we get the data back
    timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")])
    # this is a process list for which host
    host = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # requires a specific format:
    #  [ {"pid": pid, "arch": "x64", "name": "lol.exe", "bin_path": "C:\whatever", "ppid": ppid } ]
    process_id = p.IntegerField(null=False)
    architecture = p.TextField(null=True)
    parent_process_id = p.IntegerField(null=True)
    bin_path = p.TextField(null=True)
    name = p.TextField(null=True)
    user = p.TextField(null=True)
    command_line = p.TextField(null=True)
    integrity_level = p.IntegerField(null=True)
    start_time = p.TextField(null=True)
    description = p.TextField(null=True)
    signer = p.TextField(null=True)
    operation = p.ForeignKeyField(Operation, null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "task": self.task.id,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S.%f"),
            "host": self.host,
            "operation": self.operation.name,
            "process_id": self.process_id,
            "architecture": self.architecture,
            "parent_process_id": self.parent_process_id,
            "bin_path": self.bin_path,
            "name": self.name,
            "user": self.user,
            "command_line": self.command_line,
            "integrity_level": self.integrity_level,
            "description": self.description,
            "signer": self.signer,
            "start_time": self.start_time.strftime("%m/%d/%Y %H:%M:%S.%f") if self.start_time is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Token(p.Model):
    # Windows Token Information
    # tokens are identified by TokenId and Host values
    TokenId = p.IntegerField(null=False)
    User = p.TextField(null=True)
    Groups = p.TextField(null=True)
    EnabledGroups = p.TextField(null=True)
    DenyOnlyGroups = p.TextField(null=True)
    GroupCount = p.IntegerField(null=True)
    # AuthenticationId is what correlates to LogonId in LogonSession
    AuthenticationId = p.ForeignKeyField(LogonSession, null=True, backref="tokens")
    # enum type, 0 is Primary 1 is Secondary
    TokenType = p.IntegerField(null=True)
    ExpirationTime = p.DateTimeField(null=True)
    ModifiedId = p.IntegerField(null=True)
    Owner = p.TextField(null=True)
    PrimaryGroup = p.TextField(null=True)
    DefaultDacl = p.TextField(null=True)
    Source = p.TextField(null=True)
    RestrictedSids = p.TextField(null=True)
    RestrictedSidsCount = p.TextField(null=True)
    # enum type
    ImpersonationLevel = p.IntegerField(null=True)
    SessionId = p.IntegerField(null=True)
    SandboxInert = p.BooleanField(null=True)
    Origin = p.IntegerField(null=True)
    ElevationType = p.IntegerField(null=True)
    Elevated = p.BooleanField(null=True)
    HasRestrictions = p.BooleanField(null=True)
    UIAccess = p.BooleanField(null=True)
    VirtualizationAllowed = p.BooleanField(null=True)
    VirtualizationEnabled = p.BooleanField(null=True)
    Restricted = p.BooleanField(null=True)
    WriteRestricted = p.BooleanField(null=True)
    Filtered = p.BooleanField(null=True)
    NotLow = p.BooleanField(null=True)
    Flags = p.TextField(null=True)
    NoChildProcess = p.BooleanField(null=True)
    Capabilities = p.TextField(null=True)
    MandatoryPolicy = p.TextField(null=True)
    LogonSid = p.TextField(null=True)
    IntegrityLevelSid = p.IntegerField(null=True)
    AppContainerNumber = p.IntegerField(null=True)
    IntegrityLevel = p.IntegerField(null=True)
    SecurityAttributes = p.TextField(null=True)
    DeviceClaimAttributes = p.TextField(null=True)
    UserClaimAttributes = p.TextField(null=True)
    RestrictedUserClaimAttributes = p.TextField(null=True)
    RestrictedDeviceClaimAttributes = p.TextField(null=True)
    AppContainer = p.BooleanField(null=True)
    LowPrivilegeAppContainer = p.BooleanField(null=True)
    AppContainerSid = p.TextField(null=True)
    PackageName = p.TextField(null=True)
    DeviceGroups = p.TextField(null=True)
    RestrictedDeviceGroups = p.TextField(null=True)
    Privileges = p.TextField(null=True)
    FullPath = p.TextField(null=True)
    TrustLevel = p.TextField(null=True)
    IsPseudoToken = p.BooleanField(null=True)
    IsSandbox = p.BooleanField(null=True)
    PackageFullName = p.TextField(null=True)
    AppId = p.TextField(null=True)
    AppModelPolicies = p.TextField(null=True)
    AppModelPolicyDictionary = p.TextField(null=True)
    BnoIsolationPrefix = p.TextField(null=True)
    PackageIdentity = p.TextField(null=True)
    AuditPolicy = p.TextField(null=True)
    PrivateNamespace = p.BooleanField(null=True)
    IsRestricted = p.BooleanField(null=True)
    ProcessUniqueAttribute = p.TextField(null=True)
    GrantedAccess = p.TextField(null=True)
    GrantedAccessGeneric = p.TextField(null=True)
    GrantedAccessMask = p.IntegerField(null=True)
    SecurityDescriptor = p.TextField(null=True)
    Sddl = p.TextField(null=True)
    Handle = p.IntegerField(null=True)
    NtTypeName = p.TextField(null=True)
    NtType = p.IntegerField(null=True)
    Name = p.TextField(null=True)
    CanSynchronize = p.BooleanField(null=True)
    CreationTime = p.TimestampField(null=True)
    AttributesFlags = p.IntegerField(null=True)
    HandleReferenceCount = p.IntegerField(null=True)
    PointerReferenceCount = p.IntegerField(null=True)
    Inherit = p.BooleanField(null=True)
    ProtectFromClose = p.BooleanField(null=True)
    Address = p.IntegerField(null=True)
    IsContainer = p.BooleanField(null=True)
    IsClosed = p.BooleanField(null=True)
    # Mythic Tracking Information
    os = p.TextField(null=False, default="Windows", constraints=[p.SQL("default 'Windows'")])
    task = p.ForeignKeyField(Task, null=False)
    timestamp_created = p.DateTimeField(default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")],
                                        null=False)
    deleted = p.BooleanField(default=False, null=False, constraints=[p.SQL("DEFAULT FALSE")])
    host = p.TextField(null=False)
    # tokens can be related to processes and specifically a thread in that process
    ThreadID = p.IntegerField(null=True)
    process = p.IntegerField(null=True)
    description = p.TextField(null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "TokenId": self.TokenId,
            "description": self.description
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class CallbackToken(p.Model):
    # this tracks which tokens a callback knows about or can leverage
    token = p.ForeignKeyField(Token, null=False)
    callback = p.ForeignKeyField(Callback, null=False, backref="tokens")
    # Mythic Tracking Information
    os = p.TextField(null=False, default="Windows", constraints=[p.SQL("default 'Windows'")])
    task = p.ForeignKeyField(Task, null=False)
    timestamp_created = p.DateTimeField(default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")],
                                        null=False)
    deleted = p.BooleanField(default=False, null=False, constraints=[p.SQL("DEFAULT FALSE")])
    host = p.TextField(null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "token": self.token.to_json()
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class AuthenticationPackage(p.Model):
    # Windows Information
    LogonSession = p.ForeignKeyField(LogonSession, null=False, backref="AuthenticationPackage")
    Name = p.TextField(null=False)
    # Mythic Tracking Information
    os = p.TextField(null=False, default="Windows", constraints=[p.SQL("default 'Windows'")])
    task = p.ForeignKeyField(Task, null=False)
    timestamp_created = p.DateTimeField(default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")],
                                        null=False)
    deleted = p.BooleanField(default=False, null=False, constraints=[p.SQL("DEFAULT FALSE")])
    host = p.TextField(null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "Name": self.name
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Response(p.Model):
    response = p.BlobField(null=True)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    task = p.ForeignKeyField(Task, null=False)
    sequence_number = p.IntegerField(null=True)

    class Meta:
        database = mythic_db

    def to_json(self, include_task: bool = True):
        r = {
            "id": getattr(self, "id"),
            "response": bytes(getattr(self, "response")).decode("utf-8"),
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "task": self.task.to_json() if include_task else self.task.id
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
    type = p.TextField(null=False, constraints=[p.SQL("DEFAULT 'plaintext'")])
    # if you know the task, you know who, what, where, when, etc that caused this thing to exist
    # task can be null though which means it was manually entered
    task = p.ForeignKeyField(Task, null=True)
    account = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])  # whose credential is this
    realm = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])  # which domain does this credential apply?
    operation = p.ForeignKeyField(Operation)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    credential = p.BlobField(null=False)  # the actual credential we captured
    operator = p.ForeignKeyField(Operator, null=False)
    comment = p.TextField(null=True)
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # this is a field that can be set for extra metadata surrounding the credential material
    metadata = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])

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
            "credential": bytes(getattr(self, "credential")).decode("utf-8"),
            "operator": self.operator.username,
            "comment": self.comment,
            "deleted": self.deleted,
            "metadata": self.metadata
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Keylog(p.Model):
    # if you know the task, you know who, where, when, etc
    task = p.ForeignKeyField(Task, null=False)  # what command caused this to exist
    keystrokes = p.BlobField(null=False)  # what did you actually capture
    # if possible, what's the window title for where these keystrokes happened
    window = p.TextField(null=False, default="UNKNOWN")
    # when did we get these keystrokes?
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
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
            "keystrokes": bytes(getattr(self, "keystrokes")).decode("utf-8"),
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
    name = p.TextField(null=False, unique=True)
    description = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "name": self.name,
            "description": self.description
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class TaskArtifact(p.Model):
    task = p.ForeignKeyField(Task, null=True)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    artifact_instance = p.BlobField(null=False, constraints=[p.SQL("DEFAULT ''")])
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
            "artifact_instance": bytes(getattr(self, "artifact_instance")).decode("utf-8"),
            "operation": self.operation.name if self.operation is not None else None,
            "host": self.host,
            "artifact": self.artifact.name
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class StagingInfo(p.Model):
    # this is a way to identify the corresponding session key between HTTP messages since it's stateless
    session_id = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # this is the creation session key that's base64 encoded
    enc_key = p.BlobField(null=True)
    dec_key = p.BlobField(null=True)
    crypto_type = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # staging step uuid
    staging_uuid = p.TextField(null=False, unique=True)
    payload = p.ForeignKeyField(Payload, null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "session_id": self.session_id,
            "staging_uuid": self.staging_uuid,
            "payload": self.payload.uuid
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class AgentStorage(p.Model):
    # this table serves as a way for payload and translation containers to save/fetch necessary information
    # that doesn't quite fit within Mythic's normal data model
    data = p.BlobField()
    unique_id = p.TextField(null=False, unique=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        return {
            "unique_id": self.unique_id,
            "data": base64.b64encode(bytes(getattr(self, "data"))).decode("utf-8")
        }

    def __str__(self):
        return json.dumps(self.to_json())


class APITokens(p.Model):
    # this offers a way to interact with specific interfaces without a JWT expiring
    token_type = p.TextField(null=False)  # [C2, User]
    token_value = p.TextField(null=False)
    active = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT TRUE")])
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")])
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
    script = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # if this is null, it is a support function
    command = p.ForeignKeyField(Command, null=True)
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")])
    # if command is None, we're a support function, use this to define a name for the function
    name = p.TextField(null=True)
    active = p.BooleanField(constraints=[p.SQL("DEFAULT TRUE")])
    author = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # track if the user modified this script
    user_modified = p.BooleanField(constraints=[p.SQL("DEFAULT FALSE")])
    # this is always the latest from the container
    container_version = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    container_version_author = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # format for browserscripts will change for the new UI, but for the moment, support both kinds
    for_new_ui = p.BooleanField(null=False, default=False, constraints=[p.SQL("DEFAULT FALSE")])

    class Meta:
        indexes = ((("command", "name", "operator", "for_new_ui"), True),)
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
            "container_version_author": self.container_version_author,
            "for_new_ui": self.for_new_ui
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


class FileBrowserObj(p.Model):
    task = p.ForeignKeyField(Task, null=False)
    timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")])
    operation = p.ForeignKeyField(Operation, null=False)
    # this should be the fqdn of the host the info is from
    host = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    permissions = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # this is the name of this file/folder
    name = p.BlobField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # this is the parent object
    parent = p.ForeignKeyField('self', null=True)
    # this is the full path for the parent folder
    # we need this to enable faster searching and better context
    parent_path = p.BlobField(null=False, constraints=[p.SQL("DEFAULT ''")])
    full_path = p.BlobField(null=False, constraints=[p.SQL("DEFAULT ''")])
    access_time = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    modify_time = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    comment = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # this is how we differentiate between files and folders of information
    is_file = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    size = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # indicates if we successfully pulled info about the object. False would be access denied for example
    success = p.BooleanField(null=True)
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "task": self.task.id,
            "callback": self.task.callback.id,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "operation": self.operation.name,
            "host": self.host,
            "name": bytes(getattr(self, "name")).decode("utf-8"),
            "parent": self.parent.id if self.parent is not None else None,
            "parent_path": bytes(getattr(self, "parent_path")).decode("utf-8"),
            "full_path": bytes(getattr(self, "full_path")).decode("utf-8"),
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
    complete = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # where the file is located on local disk
    path = p.TextField(null=False)
    # path on victim if applicable
    full_remote_path = p.BlobField(null=False, default=b"")
    # host of where the file was pulled from, can be remote
    host = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])
    is_payload = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    is_screenshot = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    is_download_from_agent = p.BooleanField(constraints=[p.SQL("DEFAULT FALSE")])
    file_browser = p.ForeignKeyField(FileBrowserObj, null=True, backref="files")
    filename = p.BlobField(null=False, default=b"", constraints=[p.SQL("DEFAULT ''")])
    delete_after_fetch = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT TRUE")])
    operation = p.ForeignKeyField(Operation, null=False)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")], null=False)
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # specify this in case it was a manual registration
    operator = p.ForeignKeyField(Operator, null=True)
    md5 = p.TextField(null=True)
    sha1 = p.TextField(null=True)
    comment = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT ''")])

    class Meta:
        database = mythic_db

    def to_json(self):
        try:
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
                "full_remote_path": bytes(self.full_remote_path).decode("utf-8"),
                "host": self.host,
                "is_payload": self.is_payload,
                "is_screenshot": self.is_screenshot,
                "is_download_from_agent": self.is_download_from_agent,
                "file_browser": self.file_browser.id if self.file_browser is not None else None,
                "filename": bytes(self.filename).decode("utf-8"),
                "delete_after_fetch": self.delete_after_fetch,
                "operation": self.operation.name,
                "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
                "deleted": self.deleted,
                "operator": self.operator.username if self.operator is not None else None,
                "md5": self.md5,
                "sha1": self.sha1,
                "comment": self.comment
            }
            return r
        except Exception as e:
            print("model.py - " + str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return {}

    def __str__(self):
        return json.dumps(self.to_json())


class OperationEventLog(p.Model):
    # user-user messages, sign-on/off notifications, new callback notifications, file hosted, etc
    operator = p.ForeignKeyField(Operator, null=True)  # who sent the message
    timestamp = p.DateTimeField(null=False,
        default=datetime.datetime.utcnow,constraints=[p.SQL("DEFAULT NOW()")])
    message = p.TextField(null=False)
    operation = p.ForeignKeyField(Operation, null=False)
    level = p.TextField(null=False, constraints=[p.SQL("DEFAULT 'info'")])
    deleted = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    resolved = p.BooleanField(null=False, constraints=[p.SQL("DEFAULT FALSE")])
    # indicate the 'source' of the message.
    # operator / callback / c2 / etc
    source = p.TextField(null=False, constraints=[p.SQL("DEFAULT ''")])
    # to prevent unnecessary messages, if the message already exists, just increment the count
    count = p.IntegerField(null=False, constraints=[p.SQL("DEFAULT 1")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "id": getattr(self, "id"),
            "operator": self.operator.username if self.operator is not None else "Mythic",
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S"),
            "message":  self.message,
            "operation": self.operation.name,
            "level": self.level,
            "deleted": self.deleted,
            "resolved": self.resolved,
            "count": self.count,
            "source": self.source
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class CallbackGraphEdge(p.Model):
    # information about p2p connections and egress to p2p connections
    # when did this connection start
    start_timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")])
    end_timestamp = p.DateTimeField(null=True)  # when did the connection stop
    operation = p.ForeignKeyField(Operation, null=False)
    # source node for the relationship
    source = p.ForeignKeyField(Callback, backref="source", null=False)
    # destination node for the relationship
    destination = p.ForeignKeyField(Callback, backref="destination", null=False)
    # 1 is src->dst, 2 is dst->src, 3 is src<->dst
    direction = p.IntegerField(null=False)
    # metadata about the connection, JSON string
    metadata = p.TextField(null=False, default="", constraints=[p.SQL("DEFAULT NOW()")])
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
            "metadata": self.metadata,
            "c2_profile": self.c2_profile.name,
            "task_start": self.task_start.id if self.task_start is not None else None,
            "task_end": self.task_end.id if self.task_end is not None else None
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class CallbackAccessTime(p.Model):
    callback = p.ForeignKeyField(Callback)
    timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow, constraints=[p.SQL("DEFAULT NOW()")])

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {
            "callback": self.callback.id,
            "timestamp": self.timestamp.strftime("%m/%d/%Y %H:%M:%S")
        }
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# -------------- TABLE SPECIFIC ASYNC JOIN QUERIES -----------
def query_operator():
    return (
        Operator.select(Operator, Operation)
        .join(Operation, p.JOIN.LEFT_OUTER)
        .switch(Operator)
    )
operator_query = query_operator()

def query_agentstorage():
    return (
        AgentStorage.select()
    )
agentstorage_query = query_agentstorage()

def query_translationcontainer():
    return (
        TranslationContainer.select(TranslationContainer)
    )
translationcontainer_query = query_translationcontainer()

def query_payloadtype():
    return (
        PayloadType.select(PayloadType, TranslationContainer)
        .join(TranslationContainer, p.JOIN.LEFT_OUTER)
        .switch(PayloadType)
    )
payloadtype_query = query_payloadtype()

def query_wrappedpayloadtypes():
    wrapped = PayloadType.alias()
    wrapper = PayloadType.alias()
    return (
        WrappedPayloadTypes.select(WrappedPayloadTypes, wrapper, wrapped)
        .join(wrapped, on=(WrappedPayloadTypes.wrapped == wrapped.id),)
        .switch(WrappedPayloadTypes)
        .join(wrapper, on=(WrappedPayloadTypes.wrapper == wrapper.id),)
        .switch(WrappedPayloadTypes)
    )
wrappedpayloadtypes_query = query_wrappedpayloadtypes()

def query_command():
    return Command.select(Command, PayloadType, CommandOPSEC)\
        .join(PayloadType).switch(Command)\
        .join(CommandOPSEC, p.JOIN.LEFT_OUTER).switch(Command)
command_query = query_command()

def query_commandparameters():
    return (
        CommandParameters.select(CommandParameters, Command, PayloadType)
        .join(Command)
        .join(PayloadType)
        .switch(CommandParameters)
    )
commandparameters_query = query_commandparameters()

def query_commandopsec():
    return (
        CommandOPSEC.select(CommandOPSEC, Command, PayloadType)
        .join(Command)
        .join(PayloadType)
        .switch(CommandOPSEC)
    )
commandopsec_query = query_commandopsec()

def query_operation():
    return Operation.select(Operation, Operator).join(Operator).switch(Operation)
operation_query = query_operation()

def query_operatoroperation():
    current_op = Operation.alias()
    admin = Operator.alias()
    return (
        OperatorOperation.select(
            OperatorOperation, Operator, Operation, current_op, DisabledCommandsProfile, admin
        )
        .join(Operator)
        .join(
            current_op,
            p.JOIN.LEFT_OUTER,
            on=(Operator.current_operation == current_op.id),
        )
        .switch(OperatorOperation)
        .join(Operation)
        .join(admin)
        .switch(OperatorOperation)
        .join(DisabledCommandsProfile, p.JOIN.LEFT_OUTER)
        .switch(OperatorOperation)
    )
operatoroperation_query = query_operatoroperation()

def query_c2profile():
    return C2Profile.select(C2Profile)
c2profile_query = query_c2profile()

def query_payloadtypec2profile():
    return (
        PayloadTypeC2Profile.select(PayloadTypeC2Profile, PayloadType, C2Profile)
        .join(PayloadType)
        .switch(PayloadTypeC2Profile)
        .join(C2Profile)
        .switch(PayloadTypeC2Profile)
    )
payloadtypec2profile_query = query_payloadtypec2profile()

def query_payload():
    wrap_alias = Payload.alias()
    fm_operation = Operation.alias()
    fm_operator = Operator.alias()
    tsk_operator = Operator.alias()
    tsk_callback = Callback.alias()
    tsk_operation = Operation.alias()
    tsk_payloadtype = PayloadType.alias()
    tsk_command = Command.alias()
    return (
        Payload.select(
            Payload, Operator, PayloadType, Operation, wrap_alias, Task, FileMeta, fm_operation, fm_operator, FileBrowserObj, tsk_operator,
            tsk_callback, tsk_operation, tsk_payloadtype, tsk_command, TranslationContainer
        )
        .join(Operator)
        .switch(Payload)
        .join(PayloadType)
        .join(TranslationContainer, p.JOIN.LEFT_OUTER)
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
        .join(tsk_operator, p.JOIN.LEFT_OUTER)
        .switch(Task)
        .join(tsk_callback, p.JOIN.LEFT_OUTER)
        .join(tsk_operation, p.JOIN.LEFT_OUTER)
        .switch(Task)
        .join(tsk_command, p.JOIN.LEFT_OUTER)
        .join(tsk_payloadtype, p.JOIN.LEFT_OUTER)
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
        .switch(FileMeta)
        .join(FileBrowserObj, p.JOIN.LEFT_OUTER)
        .switch(Payload)
    )
payload_query = query_payload()

def query_payloadonhost():
    file_op = Operation.alias()
    pay_op = Operation.alias()
    pay_operator = Operator.alias()
    return (
        PayloadOnHost.select(PayloadOnHost, Payload, Operation, Task, Operator, FileMeta, file_op, pay_op, PayloadType,
                             pay_operator, FileBrowserObj)
        .join(Payload)
        .join(FileMeta, p.JOIN.LEFT_OUTER)
        .join(Operator, p.JOIN.LEFT_OUTER)
        .switch(FileMeta)
        .join(file_op, p.JOIN.LEFT_OUTER)
        .switch(FileMeta)
        .join(FileBrowserObj, p.JOIN.LEFT_OUTER)
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
payloadonhost_query = query_payloadonhost()

def query_payloadcommand():
    return (
        PayloadCommand.select(PayloadCommand, Payload, Command)
        .join(Payload)
        .switch(PayloadCommand)
        .join(Command)
        .switch(PayloadCommand)
    )
payloadcommand_query = query_payloadcommand()

def query_c2profileparameters():
    return (
        C2ProfileParameters.select(C2ProfileParameters, C2Profile)
        .join(C2Profile)
        .switch(C2ProfileParameters)
    )
c2profileparameters_query = query_c2profileparameters()

def query_c2profileparametersinstance():
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
c2profileparametersinstance_query = query_c2profileparametersinstance()

def query_callback():
    loperator = Operator.alias()
    pay_operation = Operation.alias()
    return (
        Callback.select(
            Callback, Operator, Payload, FileMeta, Operation, PayloadType, loperator, Task, pay_operation
        )
        .join(Operator)
        .switch(Callback)
        .join(Payload)
        .join(PayloadType)
        .switch(Payload)
        .join(pay_operation)
        .switch(Payload)
        .join(FileMeta)
        .switch(Callback)
        .join(Operation)
        .switch(Callback)
        .join(
            loperator,
            p.JOIN.LEFT_OUTER,
            on=(Callback.locked_operator).alias("locked_operator"),
        )
        .switch(Callback)
        .join(
            Task,
            p.JOIN.LEFT_OUTER,
            on=(Callback.socks_task).alias("socks_task")
        )
        .switch(Callback)
    )
callback_query = query_callback()

def query_payloadc2profiles():
    return (
        PayloadC2Profiles.select(PayloadC2Profiles, Payload, C2Profile)
        .join(Payload)
        .switch(PayloadC2Profiles)
        .join(C2Profile)
        .switch(PayloadC2Profiles)
    )
payloadc2profiles_query = query_payloadc2profiles()

def query_callbackc2profiles():
    return (
        CallbackC2Profiles.select(CallbackC2Profiles, Callback, C2Profile)
        .join(Callback)
        .switch(CallbackC2Profiles)
        .join(C2Profile)
        .switch(CallbackC2Profiles)
    )
callbackc2profiles_query = query_callbackc2profiles()

def query_loadedcommands():
    return (
        LoadedCommands.select(LoadedCommands, Command, Callback, Operator)
        .join(Command)
        .switch(LoadedCommands)
        .join(Callback)
        .switch(LoadedCommands)
        .join(Operator)
        .switch(LoadedCommands)
    )
loadedcommands_query = query_loadedcommands()

def query_disabledcommandsprofile():
    return (
        DisabledCommandsProfile.select(DisabledCommandsProfile, Command, PayloadType)
        .join(Command)
        .join(PayloadType)
        .switch(DisabledCommandsProfile)
    )
disabledcommandsprofile_query = query_disabledcommandsprofile()


def query_task():
    comment_operator = Operator.alias()
    callback_operator = Operator.alias()
    parent_task = Task.alias()
    callback_lock_operator = Operator.alias()
    opsec_pre_bypass_user_operator = Operator.alias()
    opsec_post_bypass_user_operator = Operator.alias()
    callback_payload_type = PayloadType.alias()
    callback_payload = Payload.alias()
    return (
        Task.select(
            Task, Callback, Operator, comment_operator, Operation, Command, PayloadType, callback_operator,
            callback_lock_operator, callback_payload_type, callback_payload, opsec_pre_bypass_user_operator,
            opsec_post_bypass_user_operator, parent_task
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
        .join(parent_task, p.JOIN.LEFT_OUTER, on=(Task.parent_task == parent_task.id).alias("parent_task"),)
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
        .join(opsec_pre_bypass_user_operator, p.JOIN.LEFT_OUTER, on=(Task.opsec_pre_bypass_user == opsec_pre_bypass_user_operator.id).alias("opsec_pre_bypass_user"))
        .switch(Task)
        .join(opsec_post_bypass_user_operator, p.JOIN.LEFT_OUTER, on=(Task.opsec_post_bypass_user == opsec_post_bypass_user_operator.id).alias("opsec_post_bypass_user"))
    )
task_query = query_task()

def query_tasktag():
    return (
        TaskTag.select(TaskTag, Task, Operation)
        .join(Task)
        .switch(TaskTag)
        .join(Operation)
        .switch(TaskTag)
    )
tasktag_query = query_tasktag()

def query_response():
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
response_query = query_response()

def query_filemeta():
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
filemeta_query = query_filemeta()

def query_attack():
    return ATTACK.select()
attack_query = query_attack()

def query_attackcommand():
    return (
        ATTACKCommand.select(ATTACKCommand, ATTACK, Command, PayloadType)
        .join(ATTACK)
        .switch(ATTACKCommand)
        .join(Command)
        .join(PayloadType)
        .switch(ATTACKCommand)
    )
attackcommand_query = query_attackcommand()

def query_attacktask():
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
attacktask_query = query_attacktask()

def query_credential():
    return (
        Credential.select(Credential, Operation, Operator, Task)
        .join(Operation)
        .switch(Credential)
        .join(Operator)
        .switch(Credential)
        .join(Task, p.JOIN.LEFT_OUTER)
        .switch(Credential)
    )
credential_query = query_credential()

def query_keylog():
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
keylog_query = query_keylog()

def query_artifact():
    return Artifact.select()
artifact_query = query_artifact()

def query_taskartifact():
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
taskartifact_query = query_taskartifact()

def query_staginginfo():
    return (StagingInfo.select(StagingInfo, Payload, PayloadType, Operation)
            .join(Payload).join(PayloadType)
            .switch(Payload).join(Operation)
            .switch(StagingInfo)
            )
staginginfo_query = query_staginginfo()

def query_apitokens():
    return APITokens.select(APITokens, Operator).join(Operator).switch(APITokens)
apitokens_query = query_apitokens()

def query_browserscript():
    return (
        BrowserScript.select(BrowserScript, Operator, PayloadType)
        .join(Operator, p.JOIN.LEFT_OUTER)
        .switch(BrowserScript)
        .join(PayloadType)
        .switch(BrowserScript)
    )
browserscript_query = query_browserscript()

def query_browserscriptoperation():
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
        .switch(BrowserScript)
        .join(PayloadType)
        .switch(BrowserScript)
        .join(Operator)
        .switch(BrowserScriptOperation)
        .join(Operation)
        .switch(BrowserScriptOperation)
    )
browserscriptoperation_query = query_browserscriptoperation()

def query_process():
    return (
        Process.select(Process, Task, Callback, Operation)
            .join(Task)
            .join(Callback)
            .switch(Process)
            .join(Operation)
            .switch(Process)
    )
process_query = query_process()


def query_filebrowserobj():
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
filebrowserobj_query = query_filebrowserobj()

def query_operationeventlog():
    return (
        OperationEventLog.select(OperationEventLog, Operator, Operation)
        .join(Operator, p.JOIN.LEFT_OUTER)
        .switch(OperationEventLog)
        .join(Operation)
        .switch(OperationEventLog)
    )
operationeventlog_query = query_operationeventlog()

def query_callbackgraphedge():
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
callbackgraphedge_query = query_callbackgraphedge()

def query_buildparameter():
    return (
        BuildParameter.select(BuildParameter, PayloadType)
        .join(PayloadType)
        .switch(BuildParameter)
    )
buildparameter_query = query_buildparameter()

def query_buildparameterinstance():
    buildparam_payloadtype = PayloadType.alias()
    return (
        BuildParameterInstance.select(
            BuildParameterInstance, BuildParameter, Payload, PayloadType, buildparam_payloadtype
        )
        .join(BuildParameter)
        .join(buildparam_payloadtype)
        .switch(BuildParameterInstance)
        .join(Payload)
        .join(PayloadType)
        .switch(BuildParameterInstance)
    )
buildparameterinstance_query = query_buildparameterinstance()

def query_logonsession():
    return (
        LogonSession.select(LogonSession, Task)
        .join(Task, p.JOIN.LEFT_OUTER)
        .switch(LogonSession)
    )
logonsession_query = query_logonsession()

def query_token():
    return (
        Token.select(Token, Task, LogonSession)
        .join(Task, p.JOIN.LEFT_OUTER)
        .switch(Token)
        .join(LogonSession, p.JOIN.LEFT_OUTER)
        .switch(Token)
    )
token_query = query_token()

def query_callbacktoken():
    return (
        CallbackToken.select(CallbackToken, Token, Callback, Task)
        .join(Token)
        .switch(CallbackToken)
        .join(Callback)
        .switch(CallbackToken)
        .join(Task)
        .switch(CallbackToken)
    )
callbacktoken_query = query_callbacktoken()

def query_authenticationpackage():
    return (
        AuthenticationPackage.select(AuthenticationPackage, LogonSession, Task)
        .join(LogonSession, p.JOIN.LEFT_OUTER)
        .switch(AuthenticationPackage)
        .join(Task, p.JOIN.LEFT_OUTER)
        .switch(AuthenticationPackage)
    )
authenticationpackage_query = query_authenticationpackage()

def query_callbackaccesstime():
    return (
        CallbackAccessTime.select(CallbackAccessTime, Callback)
        .join(Callback)
        .switch(CallbackAccessTime)
    )
callbackaccesstimes_query = query_callbackaccesstime()

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
        "token",
        "logonsession",
        "authenticationpackage",
        "process",
        "commandopsec",
        "translationcontainer"
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
        "process",
        "filebrowserobj",
        "browserscriptoperation",
        "callbackgraphedge",
        "callbackc2profiles",
        "payloadonhost",
        "wrappedpayloadtypes",
        "buildparameter",
        "buildparameterinstance",
        "token",
        "authenticationpackage",
        "logonsession",
        "commandopsec",
        "translationcontainer"
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
    # create updates for filebrowserobj timestamp
    create_function = (
        "DROP FUNCTION IF EXISTS update_filebrowserobj_timestamp_on_update() cascade;"
        + "CREATE FUNCTION update_filebrowserobj_timestamp_on_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN "
        + "NEW.timestamp := now(); RETURN NEW; END; $$;"
    )
    create_trigger = (
        "CREATE TRIGGER update_filebrowserobj_timestamp_trigger BEFORE UPDATE on filebrowserobj FOR EACH ROW EXECUTE PROCEDURE "
        + "update_filebrowserobj_timestamp_on_update()"
    )
    mythic_db.execute_sql(create_function)
    mythic_db.execute_sql(create_trigger)
    create_function = (
            "DROP FUNCTION IF EXISTS update_task_timestamp_on_update() cascade;"
            + "CREATE FUNCTION update_task_timestamp_on_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN "
            + "NEW.timestamp := now(); RETURN NEW; END; $$;"
    )
    create_trigger = (
            "CREATE TRIGGER update_task_timestamp_trigger BEFORE UPDATE on task FOR EACH ROW EXECUTE PROCEDURE "
            + "update_task_timestamp_on_update()"
    )
    mythic_db.execute_sql(create_function)
    mythic_db.execute_sql(create_trigger)


def pg_created_response_text_field():
    func_response_response = """CREATE OR REPLACE FUNCTION public.response(response_row response)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT encode(response_row.response, 'base64')
$function$"""
    func_response_response_escape = """CREATE OR REPLACE FUNCTION public.response_escape(response_row response)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT encode(response_row.response, 'escape')
$function$"""
    func_filemeta_filename = """CREATE OR REPLACE FUNCTION public.filemeta_filename(meta_row filemeta)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT convert_from(meta_row.filename, 'utf8')
$function$"""
    func_filemeta_full_remote_path = """CREATE OR REPLACE FUNCTION public.filemeta_full_remote_path(meta_row filemeta)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT convert_from(meta_row.full_remote_path, 'utf8')
$function$"""
    func_fileobj_name = """CREATE OR REPLACE FUNCTION public.filebrowserobj_name(fileobj_row filebrowserobj)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT convert_from(fileobj_row.name, 'utf8')
$function$"""
    func_fileobj_parent_path = """CREATE OR REPLACE FUNCTION public.filebrowserobj_parent_path(fileobj_row filebrowserobj)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT convert_from(fileobj_row.parent_path, 'utf8')
$function$"""
    func_fileobj_full_path = """CREATE OR REPLACE FUNCTION public.filebrowserobj_full_path(fileobj_row filebrowserobj)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT convert_from(fileobj_row.full_path, 'utf8')
$function$"""
    func_artifact_instance = """CREATE OR REPLACE FUNCTION public.taskartifact_artifact_instance(taskartifact_row taskartifact)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT convert_from(taskartifact_row.artifact_instance, 'utf8')
$function$"""
    func_credential = """CREATE OR REPLACE FUNCTION public.credential_credentials(credential_row credential)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT convert_from(credential_row.credential, 'utf8')
$function$"""
    func_keylog = """CREATE OR REPLACE FUNCTION public.keylog_keystrokes(keylog_row keylog)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT convert_from(keylog_row.keystrokes, 'utf8')
$function$"""
    func_enc_key = """CREATE OR REPLACE FUNCTION public.c2profileparametersinstance_enckey(c2profileparametersinstance_row c2profileparametersinstance)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT encode(c2profileparametersinstance_row.enc_key, 'base64')
$function$"""
    func_dec_key = """CREATE OR REPLACE FUNCTION public.c2profileparametersinstance_deckey(c2profileparametersinstance_row c2profileparametersinstance)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT encode(c2profileparametersinstance_row.dec_key, 'base64')
$function$"""
    func_enc_key_callback = """CREATE OR REPLACE FUNCTION public.callback_enckey(callback_row callback)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT encode(callback_row.enc_key, 'base64')
$function$"""
    func_dec_key_callback = """CREATE OR REPLACE FUNCTION public.callback_deckey(callback_row callback)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT encode(callback_row.dec_key, 'base64')
$function$"""
    try:
        mythic_db.execute_sql(func_response_response)
        mythic_db.execute_sql(func_response_response_escape)
        mythic_db.execute_sql(func_filemeta_filename)
        mythic_db.execute_sql(func_filemeta_full_remote_path)
        mythic_db.execute_sql(func_fileobj_name)
        mythic_db.execute_sql(func_fileobj_parent_path)
        mythic_db.execute_sql(func_fileobj_full_path)
        mythic_db.execute_sql(func_artifact_instance)
        mythic_db.execute_sql(func_credential)
        mythic_db.execute_sql(func_keylog)
        mythic_db.execute_sql(func_enc_key)
        mythic_db.execute_sql(func_dec_key)
        mythic_db.execute_sql(func_enc_key_callback)
        mythic_db.execute_sql(func_dec_key_callback)
    except Exception as e:
        print(e)


def pg_register_deletes():
    updates = [
        "commandparameters",
        "browserscriptoperation",
        "credential",
        "loadedcommands",
        "wrappedpayloadtypes",
        "commandopsec"
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
TranslationContainer.create_table(True)
PayloadType.create_table(True)
BuildParameter.create_table(True)
WrappedPayloadTypes.create_table(True)
CommandOPSEC.create_table(True)
Command.create_table(True)
CommandParameters.create_table(True)
Operation.create_table(True)
DisabledCommandsProfile.create_table(True)
OperatorOperation.create_table(True)
C2Profile.create_table(True)
PayloadTypeC2Profile.create_table(True)
Payload.create_table(True)
BuildParameterInstance.create_table(True)
PayloadOnHost.create_table(True)
Callback.create_table(True)
Task.create_table(True)
TaskTag.create_table(True)
Process.create_table(True)
LogonSession.create_table(True)
Token.create_table(True)
AuthenticationPackage.create_table(True)
CallbackToken.create_table(True)
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
AgentStorage.create_table(True)
APITokens.create_table(True)
BrowserScript.create_table(True)
BrowserScriptOperation.create_table(True)
FileBrowserObj.create_table(True)
FileMeta.create_table(True)
OperationEventLog.create_table(True)
CallbackGraphEdge.create_table(True)
CallbackAccessTime.create_table(True)
# setup default admin user and c2 profile
# Create the ability to do LISTEN / NOTIFY on these tables
pg_register_newinserts()
pg_register_updates()
pg_register_deletes()
pg_created_response_text_field()
try:
    Task._schema.create_foreign_key(Task.token)
    Payload._schema.create_foreign_key(Payload.task)
    Payload._schema.create_foreign_key(Payload.file_id)
    Operator._schema.create_foreign_key(Operator.current_operation)
    PayloadOnHost._schema.create_foreign_key(PayloadOnHost.task)
    Callback._schema.create_foreign_key(Callback.socks_task)
except Exception as e:
    pass
