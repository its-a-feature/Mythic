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
    light_config = json.dumps({
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
        "link-visited": "#192A45"
    })
    dark_config = json.dumps({
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
        "link-visited": ""
    })
    username = p.TextField(unique=True, null=False)
    password = p.TextField(null=False)
    admin = p.BooleanField(null=True, default=False)
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    last_login = p.DateTimeField(default=None, null=True)
    # option to simply de-activate an account instead of delete it so you keep all your relational data intact
    active = p.BooleanField(null=False, default=True)
    current_operation = p.ForeignKeyField(p.DeferredRelation('Operation'), null=True)
    ui_config = p.TextField(null=False, default=dark_config)
    view_utc_time = p.BooleanField(null=False, default=False)
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        ordering = ['-id', ]
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'current_operation':
                    r[k] = getattr(self, k).name
                elif k != 'password' and 'default' not in k:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        if 'last_login' in r and r['last_login'] is not None:
            r['last_login'] = r['last_login'].strftime('%m/%d/%Y %H:%M:%S')
        else:
            r['last_login'] = ""  # just indicate that account created, but they never logged in
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
    # allow the ability to specify a template for people tha want to extend the payload type with more commands
    supported_os = p.TextField(null=False, default="")  # indicate which OS/versions this payload works for
    # information about getting information to/from another container or machine for building/loading/transforming
    last_heartbeat = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    container_running = p.BooleanField(null=False, default=False)
    service = p.TextField(null=False, default="rabbitmq")
    author = p.TextField(null=False, default="")  # who created the code for the payload type, not just who imported it
    note = p.TextField(null=False, default="")
    supports_dynamic_loading = p.BooleanField(null=False, default=False)
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'wrapped_payload_type':
                    r[k] = getattr(self, k).ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        r['last_heartbeat'] = r['last_heartbeat'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class WrappedPayloadTypes(p.Model):
    # which payload type does the wrapping
    wrapper = p.ForeignKeyField(PayloadType, null=False)
    # which payload type is wrapped
    wrapped = p.ForeignKeyField(PayloadType, related_name="wrapped", null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'wrapper':
                    r[k] = getattr(self, k).ptype
                elif k == 'wrapped':
                    r[k] = getattr(self, k).ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
    payload_type = p.ForeignKeyField(PayloadType)
    required = p.BooleanField(default=True)
    verifier_regex = p.TextField(default="", null=False)
    deleted = p.BooleanField(default=False)
    parameter = p.TextField(null=False, default="")

    class Meta:
        indexes = ((('name', 'payload_type'), True),)
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload_type':
                    r[k] = getattr(self, k).ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
    cmd = p.CharField(null=False)  # shell, for example, doesn't have to be a globally unique name
    # this command applies to what payload types
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.utcnow)
    version = p.IntegerField(null=False, default=1)  # what version, so we can know if loaded commands are out of date
    is_exit = p.BooleanField(null=False, default=False)  # indicate if this command is the exit command for a payload type
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
        indexes = ((('cmd', 'payload_type'), True),)
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload_type':
                    r[k] = getattr(self, k).ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# these parameters are used to create an easily parsible JSON 'params' field for the agent to utilize
class CommandParameters(p.Model):
    command = p.ForeignKeyField(Command)
    name = p.TextField(null=False)  # what is the name of the parameter (what is displayed in the UI and becomes dictionary key)
    # String, Boolean, Number, Array, Choice, ChoiceMultiple, Credential, File, PayloadList, AgentConnect
    type = p.CharField(null=False, default="String")
    default_value = p.TextField(null=False, default="")  # give a hint as to what the operator should input here, only used if isBool is false
    choices = p.TextField(null=False, default="")  # comma separated list of possible choices
    required = p.BooleanField(null=False, default=False)
    description = p.TextField(null=False, default="")
    supported_agents = p.TextField(null=False, default="")

    class Meta:
        indexes = ((('command', 'name'), True),)
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'command' and getattr(self, k) is not None and getattr(self, k) != "null":
                    r[k] = getattr(self, k).id
                    r['cmd'] = getattr(self, k).cmd
                    r['payload_type'] = getattr(self, k).payload_type.ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
        r = {}
        for k in self._data.keys():
            try:
                if k == 'admin':
                    r[k] = getattr(self, k).username
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class DisabledCommandsProfile(p.Model):
    # A set of commands that are disabled for an operation due to OPSEC concerns
    # only the lead of an operation will be able to set this for other operators on that operation
    name = p.TextField(null=False)  # name to group a bunch of disabled commands together for an operator
    command = p.ForeignKeyField(Command, null=False)

    class Meta:
        indexes = ( (('command', 'name'), True), )
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'command':
                    r[k] = getattr(self, k).cmd
                    r['command_id'] = getattr(self, k).id
                    r['payload_type'] = getattr(self, k).payload_type.ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class DisabledCommands(p.Model):
    command = p.ForeignKeyField(Command, null=False)
    operator = p.ForeignKeyField(Operator, null=False)
    operation = p.ForeignKeyField(Operation, null=False)

    class Meta:
        indexes = ( (('command', 'operator', 'operation'), True), )
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'command':
                    r[k] = getattr(self, k).cmd
                    r['command_id'] = getattr(self, k).id
                    r['payload_type'] = getattr(self, k).payload_type.ptype
                elif k == "operator":
                    r[k] = getattr(self, k).username
                elif k == "operation":
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
        indexes = ( (('operator', 'operation'), True), )
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'base_disabled_commands':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# an instance of a c2profile
class C2Profile(p.Model):
    name = p.TextField(null=False, unique=True)  # registered unique name for this c2 profile
    description = p.TextField(null=True, default="")
    # list of payload types that are supported (i.e. have a corresponding module created for them on the client side
    # This has information about supported payload types, but that information is in a separate join table
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow, null=False)  # (indicates "when")
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
        r = {}
        for k in self._data.keys():
            try:
                r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        r['last_heartbeat'] = r['last_heartbeat'].strftime('%m/%d/%Y %H:%M:%S')
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
        indexes = ( (('payload_type', 'c2_profile'), True), )
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload_type':
                    r[k] = getattr(self, k).ptype
                    r['payload_type_id'] = getattr(self, k).id
                elif k == 'c2_profile':
                    r[k] = getattr(self, k).name
                    r['c2_profile_id'] = getattr(self, k).id
                    r['c2_profile_description'] = getattr(self, k).description
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
    creation_time = p.DateTimeField(default=datetime.datetime.utcnow, null=False)  # (indicates "when")
    # this is fine because this is an instance of a payload, so it's tied to one PayloadType
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    # this will signify if a current callback made / spawned a new callback that's checking in
    #   this helps track how we're getting callbacks (which payloads/tags/parents/operators)
    pcallback = p.ForeignKeyField(p.DeferredRelation('Callback'), null=True)
    # c2_profile = p.ForeignKeyField(C2Profile, null=False)  # identify which C2 profile is being used
    operation = p.ForeignKeyField(Operation, null=False)
    wrapped_payload = p.ForeignKeyField(p.DeferredRelation('Payload'), null=True)
    deleted = p.BooleanField(null=False, default=False)
    # if the payload is in the build process: building, success, error
    build_container = p.TextField(null=False)
    build_phase = p.TextField(null=False, default="building")
    build_message = p.TextField(null=False, default="")  # capture error or any other info
    # if there is a slack webhook for the operation, decide if this payload should generate an alert or not
    callback_alert = p.BooleanField(null=False, default=True)
    # when dealing with auto-generated payloads for lateral movement or spawning new callbacks
    auto_generated = p.BooleanField(null=False, default=False)
    task = p.ForeignKeyField(p.DeferredRelation('Task'), null=True)
    file_id = p.ForeignKeyField(p.DeferredRelation('FileMeta'), null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'pcallback':
                    r[k] = getattr(self, k).id
                elif k == 'payload_type':
                    r[k] = getattr(self, k).ptype
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'wrapped_payload':
                    r[k] = getattr(self, k).uuid
                elif k == 'task' and getattr(self, k) is not None:
                    r[k] = getattr(self, k).to_json()
                elif k == 'file_id' and getattr(self, k) is not None:
                    r[k] = getattr(self, k).to_json()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# this is an instance of a payload
class PayloadOnHost(p.Model):
    host = p.TextField(null=False)
    payload = p.ForeignKeyField(Payload)
    deleted = p.BooleanField(default=False, null=False)
    operation = p.ForeignKeyField(Operation)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    task = p.ForeignKeyField(p.DeferredRelation('Task'), null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload':
                    r[k] = getattr(self, k).to_json()
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'task' and getattr(self, k) is not None:
                    r[k] = getattr(self, k).to_json()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class BuildParameterInstance(p.Model): # this is the instance of actual values used to create a specific payload instance
    build_parameter = p.ForeignKeyField(BuildParameter, null=False)
    payload = p.ForeignKeyField(Payload, null=False)
    parameter = p.TextField(null=True) # what the user picked

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload':
                    r[k] = getattr(self, k).uuid
                elif k == 'build_parameter':
                    r[k] = getattr(self, k).to_json()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
        indexes = ((('payload', 'command'), True),)
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload':
                    r[k] = getattr(self, k).uuid
                elif k == 'command':
                    r[k] = getattr(self, k).cmd
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


#  C2 profiles will have various parameters that need to be stamped in at payload creation time
#    this will specify the name and value to look for
class C2ProfileParameters(p.Model):
    c2_profile = p.ForeignKeyField(C2Profile)
    description = p.TextField(null=False)  # what the parameter is called. ex: Callback address
    name = p.TextField(null=False)  # what the stamping should look for. ex: XXXXX
    default_value = p.TextField(null=False, default="")  # Hint for the user when setting the parameters
    randomize = p.BooleanField(null=False, default=False)
    format_string = p.TextField(null=False, default="")
    parameter_type = p.TextField(null=False, default="String")
    required = p.BooleanField(null=False, default=True)
    verifier_regex = p.TextField(null=False, default="")

    class Meta:
        indexes = ((('c2_profile', 'name'), True),)
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'c2_profile':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
    pcallback = p.ForeignKeyField(p.DeferredRelation('Callback'), null=True)
    registered_payload = p.ForeignKeyField(Payload, null=False)  # what payload is associated with this callback
    integrity_level = p.IntegerField(null=True, default=2)
    # an operator can lock a callback to themselves so that other users cannot issue commands as well
    locked = p.BooleanField(default=False)
    locked_operator = p.ForeignKeyField(Operator, null=True, related_name="locked_operator")
    operation = p.ForeignKeyField(Operation, null=False)
    # the following information comes from the c2 profile if it wants to provide some form of encryption
    encryption_type = p.CharField(null=True)  # the kind of encryption on this callback (aes, xor, rc4, etc)
    decryption_key = p.TextField(null=True)  # base64 of the key to use to decrypt traffic
    encryption_key = p.TextField(null=True)  # base64 of the key to use to encrypt traffic
    os = p.TextField(null=True)
    architecture = p.TextField(null=True)
    domain = p.TextField(null=True)
    # associated socks information
    port = p.IntegerField(null=True)
    socks_task = p.ForeignKeyField(p.DeferredRelation('Task'), null=True)
    # if you need to define extra context for a callback, like a webshell, supply that here
    extra_info = p.TextField(null=False, default="")
    # store information about sleep interval/jitter/waking hours/etc here
    sleep_info = p.TextField(null=False, default="")

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'pcallback':
                    r[k] = getattr(self, k).id
                elif k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'registered_payload' and getattr(self, k) is not None and getattr(self, k) != "null":
                    r[k] = getattr(self, k).uuid
                    r['payload_type'] = getattr(self, k).payload_type.ptype
                    r['payload_type_id'] = getattr(self, k).payload_type.id
                    r['payload_description'] = getattr(self, k).tag
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'locked_operator' and getattr(self, k) is not None and getattr(self, k) != "null":
                    r[k] = getattr(self, k).username
                # we don't need to include these things all over the place, explicitly ask for them for more control
                elif k == 'encryption_key' or k == 'decryption_key' or k == 'encryption_type':
                    pass
                elif k == 'socks_task':
                    r[k] = getattr(self, k).id
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['init_callback'] = r['init_callback'].strftime('%m/%d/%Y %H:%M:%S')
        r['last_checkin'] = r['last_checkin'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class PayloadC2Profiles(p.Model):
    # tracking which c2 profiles are in a payload
    payload = p.ForeignKeyField(Payload)
    c2_profile = p.ForeignKeyField(C2Profile)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload':
                    r[k] = getattr(self, k).uuid
                elif k == 'c2_profile':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class CallbackC2Profiles(p.Model):
    callback = p.ForeignKeyField(Callback)
    c2_profile = p.ForeignKeyField(C2Profile)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'callback':
                    r[k] = getattr(self, k).id
                elif k == 'c2_profile':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# c2 profiles will have various parameters that need to be stamped in when the payload is created
#   This is an opportunity to specify key-value pairs for specific C2 profiles
#   There can be many of these per c2 profile or none
#   This holds the specific values used in the C2ProfileParameters and which payload they're associated with
# If we want to save a collection off for repeated use, payload will be null, but instance_name and operation are set
class C2ProfileParametersInstance(p.Model):
    c2_profile_parameters = p.ForeignKeyField(C2ProfileParameters)
    c2_profile = p.ForeignKeyField(C2Profile)
    value = p.TextField(null=False)  # this is what we will stamp in instead
    payload = p.ForeignKeyField(Payload, null=True)  # the specific payload instance these values apply to
    # name the group of parameter instances if we want to save off values for later
    instance_name = p.TextField(null=True)
    operation = p.ForeignKeyField(Operation, null=True)  # tie this instance to an operation if there's no payload
    # when keeping track of which profile instances are in a given callback, set the callback variable
    # if this is just tracking what's in a payload, callback will be null
    callback = p.ForeignKeyField(Callback, null=True)

    class Meta:
        indexes = ((('c2_profile_parameters', 'payload'), True), (('c2_profile_parameters','instance_name', 'operation'),True))
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'c2_profile_parameters' and getattr(self, k) is not None and getattr(self, k) != "null":
                    r['name'] = getattr(self, k).name
                    r['default_value'] = getattr(self, k).default_value
                    r['required'] = getattr(self, k).required
                    r['randomize'] = getattr(self, k).randomize
                    r['verifier_regex'] = getattr(self, k).verifier_regex
                    r['parameter_type'] = getattr(self, k).parameter_type
                    r['description'] = getattr(self, k).description
                elif k == 'payload':
                    r[k] = getattr(self, k).uuid
                elif k == 'operation' and getattr(self, k) is not None:
                    r[k] = getattr(self, k).name
                elif k == 'callback' and getattr(self, k) is not None:
                    r[k] = getattr(self, k).id
                elif k == 'c2_profile':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class LoadedCommands(p.Model):
    # this keeps track of which commands and versions are currently loaded in which callbacks
    command = p.ForeignKeyField(Command, null=False)
    callback = p.ForeignKeyField(Callback, null=False)
    operator = p.ForeignKeyField(Operator, null=False)  # so we know who loaded which commands
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)  # when it was loaded
    version = p.IntegerField(null=False)  # which version of the command is loaded, so we know if it's out of date

    class Meta:
        indexes = ((('command', 'callback'), True),)  # can't have the same command loaded multiple times in a callback
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'command':
                    r[k] = getattr(self, k).cmd
                    r['version'] = getattr(self, k).version
                elif k == 'callback':
                    r[k] = getattr(self, k).id
                elif k == 'operator':
                    r[k] = getattr(self, k).username
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Task(p.Model):
    agent_task_id = p.TextField(unique=True, null=False, default=gen_uuid)
    command = p.ForeignKeyField(Command, null=True)  # could be added via task/clear or scripting by bot
    params = p.TextField(null=True)  # this will have the instance specific params (ex: id)
    # make room for ATT&CK ID (T#) if one exists or enable setting this later
    status_timestamp_preprocessing = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    status_timestamp_submitted = p.DateTimeField(null=True)
    status_timestamp_processing = p.DateTimeField(null=True)
    status_timestamp_processed = p.DateTimeField(null=True)
    # this is the last timestamp that something happened
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    # every task is associated with a specific callback that executes the task
    callback = p.ForeignKeyField(Callback, null=False)
    # the operator to issue the command can be different from the one that spawned the callback
    operator = p.ForeignKeyField(Operator, null=False)
    status = p.CharField(null=False, default="preprocessing")  # [preprocessing, submitted, processing, processed]
    # save off the original params in the scenarios where we to transforms on it for logging and tracking purposes
    original_params = p.TextField(null=True)
    # people can add a comment to the task
    comment = p.TextField(null=False, default="")
    # the user that added the above comment
    comment_operator = p.ForeignKeyField(Operator, related_name="comment_operator", null=True)
    completed = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'callback':
                    r[k] = getattr(self, k).id
                    r['operation'] = getattr(self, k).operation.name
                elif k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'command':
                    if getattr(self, k) and getattr(self, k) != "null":
                        r[k] = getattr(self, k).cmd
                        r['command_id'] = getattr(self, k).id
                elif k == 'comment_operator':
                    if getattr(self, k) and getattr(self, k) != "null":
                        r[k] = getattr(self, k).username
                    else:
                        r[k] = "null"
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        if r['status_timestamp_preprocessing'] is not None:
            r['status_timestamp_preprocessing'] = r['status_timestamp_preprocessing'].strftime('%m/%d/%Y %H:%M:%S')
        if 'status_timestamp_submitted' in r and r['status_timestamp_submitted'] is not None:
            r['status_timestamp_submitted'] = r['status_timestamp_submitted'].strftime('%m/%d/%Y %H:%M:%S')
        if 'status_timestamp_processing' in r and r['status_timestamp_processing'] is not None:
            r['status_timestamp_processing'] = r['status_timestamp_processing'].strftime('%m/%d/%Y %H:%M:%S')
        if 'status_timestamp_processed' in r and r['status_timestamp_processed'] is not None:
            r['status_timestamp_processed'] = r['status_timestamp_processed'].strftime('%m/%d/%Y %H:%M:%S')
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
        r = {}
        for k in self._data.keys():
            try:
                if k == 'task':
                    r[k] = (getattr(self, k)).to_json()
                elif k == 'response':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                else:
                    r[k] = getattr(self, k)
            except Exception as e:
                print(str(e))
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
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
        r = {}
        for k in self._data.keys():
            try:
                r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class ATTACKCommand(p.Model):
    attack = p.ForeignKeyField(ATTACK, null=False)
    command = p.ForeignKeyField(Command, null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'attack':
                    r['t_num'] = getattr(self, k).t_num
                    r['attack_name'] = getattr(self, k).name
                elif k == 'command':
                    r[k] = getattr(self, k).cmd
                    r['command_id'] = getattr(self, k).id
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class ATTACKTask(p.Model):
    attack = p.ForeignKeyField(ATTACK, null=False)
    task = p.ForeignKeyField(Task, null=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'attack':
                    r[k] = getattr(self, k).t_num
                    r['attack_name'] = getattr(self, k).name
                elif k == 'task':
                    r[k] = getattr(self, k).id
                    r['task_command'] = getattr(self, k).command.cmd
                    r['task_params'] = getattr(self, k).params
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Credential(p.Model):
    type = p.TextField(null=False)  # what kind of credential is it? [hash, password, certificate, etc]
    # if you know the task, you know who, what, where, when, etc that caused this thing to exist
    # task can be null though which means it was manually entered
    task = p.ForeignKeyField(Task, null=True)  # what task caused this credential to be here?
    account = p.TextField(null=False)  # whose credential is this
    realm = p.TextField()  # which domain does this credential apply?
    operation = p.ForeignKeyField(Operation)  # which operation does this credential belong to?
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)  # when did we get it?
    credential = p.BlobField(null=False)  # the actual credential we captured
    operator = p.ForeignKeyField(Operator, null=False)  # who got us this credential? Especially needed if manual entry
    comment = p.TextField(null=True)
    deleted = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'task':
                    if getattr(self, k) != "null" and getattr(self, k) is not None:
                        r[k] = getattr(self, k).id
                        r['task_command'] = getattr(self, k).command.cmd
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'credential':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Keylog(p.Model):
    # if you know the task, you know who, where, when, etc
    task = p.ForeignKeyField(Task)  # what command caused this to exist
    keystrokes = p.BlobField(null=False)  # what did you actually capture
    window = p.TextField()  # if possible, what's the window title for where these keystrokes happened
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)  # when did we get these keystrokes?
    operation = p.ForeignKeyField(Operation, null=False)
    user = p.TextField(null=False)  # whose keystrokes are these? The agent needs to tell us

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'task' and getattr(self, k) is not None and getattr(self, k) != "null":
                    r[k] = getattr(self, k).id
                    r['host'] = getattr(self, k).callback.host
                    r['callback'] = {"id": getattr(self, k).callback.id}
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'keystrokes':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
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
        r = {}
        for k in self._data.keys():
            try:
                if k == 'name' or k == 'description':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
        r = {}
        for k in self._data.keys():
            try:
                if k == 'artifact_instance':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                elif k == 'task':
                    if getattr(self, k) is not None and getattr(self, k) != "null":
                        r["task_id"] = getattr(self, k).id
                        r["task"] = getattr(self, k).params
                        r['command'] = getattr(self, k).command.cmd
                    else:
                        r[k] = ""
                        r["task_id"] = -1
                        r['command'] = "Manual Entry"
                elif k == 'artifact':
                    if getattr(self, k) is not None and getattr(self, k) != "null":
                        r['artifact_template'] = bytes(getattr(self, k).name).decode()
                    else:
                        r[k] = "null"
                elif k == 'operation':
                    if getattr(self, k) is not None and getattr(self, k) != "null":
                        r[k] = getattr(self, k).name
                    else:
                        r[k] = "null"
                elif k == 'host':
                    if k not in r:
                        r[k] = getattr(self, k)
                else:
                    r[k] = getattr(self, k)
            except Exception as e:
                print(str(e))
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
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
        r = {}
        for k in self._data.keys():
            try:
                r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
        r = {}
        for k in self._data.keys():
            try:
                if k == "operator":
                    r[k] = getattr(self, k).username
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class BrowserScript(p.Model):
    # keep a set of scripts with no operator so we can copy the scripts for a new operator added
    operator = p.ForeignKeyField(Operator, null=True)  # who does this script belong to
    script = p.TextField(null=False, default="")  # the actual script contents
    command = p.ForeignKeyField(Command, null=True)  # if this is null, it is a support function
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
    container_version_author = p.TextField(null=False,default="")

    class Meta:
        indexes = ((('command', 'name', 'operator'), True),)
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == "operator":
                    r[k] = getattr(self, k).username if getattr(self, k) is not None else ""
                elif k == "command" and getattr(self, k) is not None:
                    r[k] = getattr(self, k).cmd
                    r['payload_type'] = getattr(self, k).payload_type.ptype
                    r['command_id'] = getattr(self, k).id
                elif k == "payload_type":
                    r[k] = getattr(self, k).ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class BrowserScriptOperation(p.Model):
    browserscript = p.ForeignKeyField(BrowserScript)  # the script in question
    operation = p.ForeignKeyField(Operation)  # the operation in question

    class Meta:
        indexes = ((('browserscript', 'operation'), True),)  # can't assign 1 script to the same operation mult times
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == "browserscript":
                    r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
                elif k == "operation":
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
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
        r = {}
        for k in self._data.keys():
            try:
                if k == 'task':
                    r[k] = getattr(self, k).id
                    r['callback'] = getattr(self, k).callback.id
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'process_list':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                else:
                    r[k] = getattr(self, k)
            except Exception as e:
                print( str(e))
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
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
    parent = p.ForeignKeyField(p.DeferredRelation('FileBrowserObj'), null=True)
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
        r = {}
        for k in self._data.keys():
            try:
                if k == 'task':
                    r[k] = getattr(self, k).id
                    r['callback'] = getattr(self, k).callback.id
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'host' or k == 'name' or k == 'parent_path' or k == 'full_path':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                elif k == 'parent' and getattr(self, k) is not None:
                    r[k] = getattr(self, k).id
                else:
                    r[k] = getattr(self, k)
            except Exception as e:
                print("exception in filebrowserobj to_json: " + str(e))
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class FileMeta(p.Model):
    agent_file_id = p.TextField(unique=True, null=False, default=gen_uuid)
    total_chunks = p.IntegerField(null=False)  # how many total chunks will there be
    chunks_received = p.IntegerField(null=False, default=0)  # how many we've received so far
    chunk_size = p.IntegerField(null=False, default=0)
    task = p.ForeignKeyField(Task, null=True)  # what task caused this file to exist in the database
    complete = p.BooleanField(null=False, default=False)
    path = p.TextField(null=False)  # where the file is located on local disk
    full_remote_path = p.TextField(null=False, default="")  # path on victim if applicable
    host = p.TextField(null=False, default="")  # host of where the file was pulled from, can be remote
    is_payload = p.BooleanField(null=False, default=False)
    is_screenshot = p.BooleanField(null=False, default=False)
    is_download_from_agent = p.BooleanField(default=False)
    file_browser = p.ForeignKeyField(FileBrowserObj, null=True, related_name="files")
    filename = p.TextField(null=False, default="")
    delete_after_fetch = p.BooleanField(null=False, default=True)
    operation = p.ForeignKeyField(Operation, null=False)
    timestamp = p.DateTimeField(default=datetime.datetime.utcnow, null=False)
    deleted = p.BooleanField(null=False, default=False)
    operator = p.ForeignKeyField(Operator, null=True)  # specify this in case it was a manual registration
    md5 = p.TextField(null=True)
    sha1 = p.TextField(null=True)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'task' and getattr(self, k) is not None and getattr(self, k) != "null":
                    r[k] = getattr(self, k).id
                    r['cmd'] = getattr(self, k).command.cmd
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'file_browser':
                    r[k] = getattr(self, k).id
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class OperationEventLog(p.Model):
    # user-user messages, sign-on/off notifications, new callback notifications, file hosted, etc
    operator = p.ForeignKeyField(Operator, null=True)  # who sent the message
    timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow)  # when was the message
    message = p.BlobField(null=False)
    operation = p.ForeignKeyField(Operation, null=False)  # which operation has this message
    level = p.TextField(null=False, default="info")
    deleted = p.BooleanField(null=False, default=False)
    resolved = p.BooleanField(null=False, default=False)

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'message':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class CallbackGraphEdge(p.Model):
    # information about p2p connections and egress to p2p connections
    start_timestamp = p.DateTimeField(null=False, default=datetime.datetime.utcnow)  # when did this connection start
    end_timestamp = p.DateTimeField(null=True)  # when did the connection stop
    operation = p.ForeignKeyField(Operation, null=False)  # which operation does this apply to
    source = p.ForeignKeyField(Callback, related_name="source", null=False)  # source node for the relationship
    destination = p.ForeignKeyField(Callback, related_name="destination", null=False) # destination node for the relationship
    direction = p.IntegerField(null=False)  # 1 is src->dst, 2 is dst->src, 3 is src<->dst
    metadata = p.BlobField(null=False, default=b"")  # metadata about the connection, JSON string
    c2_profile = p.ForeignKeyField(C2Profile, null=False)  # which c2 profile does this connection belong to
    task_start = p.ForeignKeyField(Task, related_name="task_start", null=True)  # which task added the connection
    task_end = p.ForeignKeyField(Task, related_name="task_end", null=True)  # which task ended the connection

    class Meta:
        database = mythic_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'source':
                    r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
                elif k == 'destination':
                    r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'c2_profile':
                    r[k] = getattr(self, k).name
                elif k == 'task_start' and getattr(self, k) is not None:
                    r[k] = getattr(self, k).id
                elif k == 'task_end' and getattr(self, k) is not None:
                    r[k] = getattr(self, k).id
                elif k == 'metadata':
                    r[k] = bytes(getattr(self, k)).decode('unicode-escape', errors='backslashreplace').encode('utf-8', errors="backslashreplace").decode()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        r['start_timestamp'] = r['start_timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        if r['end_timestamp'] is not None:
            r['end_timestamp'] = r['end_timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return json.dumps(self.to_json())


# -------------- TABLE SPECIFIC ASYNC JOIN QUERIES -----------
async def operator_query():
    return Operator.select(Operator, Operation)\
        .join(Operation, p.JOIN.LEFT_OUTER).switch(Operator)


async def payloadtype_query():
    return PayloadType.select(PayloadType)


async def wrappedpayloadtypes_query():
    wrapped = PayloadType.alias()
    return WrappedPayloadTypes.select(WrappedPayloadTypes, PayloadType, wrapped)\
        .join(PayloadType).switch(WrappedPayloadTypes)\
        .join(wrapped).switch(WrappedPayloadTypes)


async def command_query():
    return Command.select(Command, PayloadType)\
        .join(PayloadType).switch(Command)


async def commandparameters_query():
    return CommandParameters.select(CommandParameters, Command, PayloadType)\
        .join(Command).join(PayloadType).switch(CommandParameters)


async def operation_query():
    return Operation.select(Operation, Operator)\
        .join(Operator).switch(Operation)


async def operatoroperation_query():
    current_op = Operation.alias()
    return OperatorOperation.select(OperatorOperation, Operator, Operation, current_op, DisabledCommandsProfile)\
        .join(Operator).join(current_op, p.JOIN.LEFT_OUTER, on=(Operator.current_operation == current_op.id)).switch(OperatorOperation)\
        .join(Operation).switch(OperatorOperation)\
        .join(DisabledCommandsProfile, p.JOIN.LEFT_OUTER).switch(OperatorOperation)


async def c2profile_query():
    return C2Profile.select(C2Profile)


async def payloadtypec2profile_query():
    return PayloadTypeC2Profile.select(PayloadTypeC2Profile, PayloadType, C2Profile)\
        .join(PayloadType).switch(PayloadTypeC2Profile)\
        .join(C2Profile).switch(PayloadTypeC2Profile)


async def payload_query():
    wrap_alias = Payload.alias()
    return Payload.select(Payload, Operator, PayloadType, Operation, wrap_alias, Task, FileMeta)\
        .join(Operator).switch(Payload)\
        .join(PayloadType).switch(Payload)\
        .join(Operation).switch(Payload)\
        .join(wrap_alias, p.JOIN.LEFT_OUTER, on=(
            (Payload.wrapped_payload == wrap_alias.id) &
            (Payload.wrapped_payload.is_null(False))
            )).switch(Payload)\
        .join(Task, p.JOIN.LEFT_OUTER).switch(Payload)\
        .join(FileMeta, p.JOIN.LEFT_OUTER).switch(Payload)


async def payloadonhost_query():
    return PayloadOnHost.select(PayloadOnHost, Payload, Operation, Task)\
        .join(Payload).switch(PayloadOnHost)\
        .join(Operation).switch(PayloadOnHost)\
        .join(Task, p.JOIN.LEFT_OUTER).switch(PayloadOnHost)


async def payloadcommand_query():
    return PayloadCommand.select(PayloadCommand, Payload, Command)\
        .join(Payload).switch(PayloadCommand)\
        .join(Command).switch(PayloadCommand)


async def c2profileparameters_query():
    return C2ProfileParameters.select(C2ProfileParameters, C2Profile)\
        .join(C2Profile).switch(C2ProfileParameters)


async def c2profileparametersinstance_query():
    return C2ProfileParametersInstance.select(C2ProfileParametersInstance, C2ProfileParameters, C2Profile, Payload, Operation, Callback)\
        .join(C2ProfileParameters).switch(C2ProfileParametersInstance)\
        .join(C2Profile).switch(C2ProfileParametersInstance)\
        .join(Payload, p.JOIN.LEFT_OUTER).switch(C2ProfileParametersInstance)\
        .join(Operation, p.JOIN.LEFT_OUTER).switch(C2ProfileParametersInstance)\
        .join(Callback, p.JOIN_LEFT_OUTER).switch(C2ProfileParametersInstance)


async def callback_query():
    calias = Callback.alias()
    loperator = Operator.alias()
    return Callback.select(Callback, Operator, Payload, Operation, PayloadType, calias, loperator)\
        .join(Operator).switch(Callback)\
        .join(Payload).join(PayloadType).switch(Payload).switch(Callback)\
        .join(Operation).switch(Callback)\
        .join(calias, p.JOIN.LEFT_OUTER, on=(Callback.pcallback).alias('pcallback')).switch(Callback)\
        .join(loperator, p.JOIN_LEFT_OUTER, on=(Callback.locked_operator).alias('locked_operator')).switch(Callback)


async def payloadc2profiles_query():
    return PayloadC2Profiles.select(PayloadC2Profiles, Payload, C2Profile)\
        .join(Payload).switch(PayloadC2Profiles)\
        .join(C2Profile).switch(PayloadC2Profiles)


async def callbackc2profiles_query():
    return CallbackC2Profiles.select(CallbackC2Profiles, Callback, C2Profile)\
        .join(Callback).switch(CallbackC2Profiles)\
        .join(C2Profile).switch(CallbackC2Profiles)


async def loadedcommands_query():
    return LoadedCommands.select(LoadedCommands, Command, Callback, Operator)\
        .join(Command).switch(LoadedCommands)\
        .join(Callback).switch(LoadedCommands)\
        .join(Operator).switch(LoadedCommands)


async def disabledcommandsprofile_query():
    return DisabledCommandsProfile.select(DisabledCommandsProfile, Command, PayloadType)\
        .join(Command).join(PayloadType).switch(DisabledCommandsProfile)


async def disabledcommands_query():
    return DisabledCommands.select(DisabledCommands, Command, PayloadType, Operation, Operator)\
        .join(Command).join(PayloadType).switch(DisabledCommands)\
        .join(Operation).switch(DisabledCommands)\
        .join(Operator).switch(DisabledCommands)


async def task_query():
    comment_operator = Operator.alias()
    return Task.select(Task, Callback, Operator, comment_operator, Operation, Command, PayloadType)\
        .join(Callback)\
            .join(Operation).switch(Callback).switch(Task)\
        .join(Operator).switch(Task)\
        .join(comment_operator, p.JOIN.LEFT_OUTER, on=(Task.comment_operator == comment_operator.id).alias('comment_operator')).switch(Task)\
        .join(Command, p.JOIN.LEFT_OUTER).join(PayloadType, p.JOIN_LEFT_OUTER).switch(Task)


async def response_query():
    comment_operator = Operator.alias()
    return Response.select(Response, Task, Callback, Operator, Command, comment_operator)\
        .join(Task)\
            .join(Callback).switch(Task)\
            .join(Operator).switch(Task)\
            .join(Command, p.JOIN.LEFT_OUTER).switch(Task)\
            .join(comment_operator, p.JOIN.LEFT_OUTER, on=(Task.comment_operator == comment_operator.id).alias('comment_operator')).switch(Response)


async def filemeta_query():
    return FileMeta.select(FileMeta, Operation, Operator, Task, FileBrowserObj)\
        .join(Operation).switch(FileMeta)\
        .join(Operator, p.JOIN.LEFT_OUTER).switch(FileMeta)\
        .join(Task, p.JOIN.LEFT_OUTER).switch(FileMeta)\
        .join(FileBrowserObj, p.JOIN.LEFT_OUTER).switch(FileMeta)


async def attack_query():
    return ATTACK.select()


async def attackcommand_query():
    return ATTACKCommand.select(ATTACKCommand, ATTACK, Command, PayloadType)\
        .join(ATTACK).switch(ATTACKCommand)\
        .join(Command).join(PayloadType).switch(ATTACKCommand)


async def attacktask_query():
    return ATTACKTask.select(ATTACKTask, ATTACK, Task, Command, PayloadType, Operation, Callback)\
        .join(ATTACK).switch(ATTACKTask)\
        .join(Task).join(Command).join(PayloadType).switch(Task).join(Callback).join(Operation).switch(ATTACKTask)


async def credential_query():
    return Credential.select(Credential, Operation, Operator)\
        .join(Operation).switch(Credential)\
        .join(Operator).switch(Credential)


async def keylog_query():
    comment_operator = Operator.alias()
    return Keylog.select(Keylog, Task, Operation, Command, Operator, Callback, comment_operator)\
        .join(Task)\
            .join(Callback).switch(Task)\
            .join(Operator).switch(Task)\
            .join(Command).switch(Task)\
            .join(comment_operator, p.JOIN.LEFT_OUTER, on=(Task.comment_operator == comment_operator.id).alias('comment_operator')).switch(Keylog)\
        .join(Operation).switch(Keylog)


async def artifact_query():
    return Artifact.select()


async def taskartifact_query():
    return TaskArtifact.select(TaskArtifact, Task, Command, Artifact, Operation)\
        .join(Task, p.JOIN.LEFT_OUTER).join(Command, p.JOIN.LEFT_OUTER).switch(TaskArtifact)\
        .join(Artifact, p.JOIN.LEFT_OUTER).switch(TaskArtifact)\
        .join(Operation, p.JOIN.LEFT_OUTER).switch(TaskArtifact)


async def staginginfo_query():
    return StagingInfo.select()


async def apitokens_query():
    return APITokens.select(APITokens, Operator)\
        .join(Operator).switch(APITokens)


async def browserscript_query():
    return BrowserScript.select(BrowserScript, Operator, Command, PayloadType)\
        .join(Operator, p.JOIN.LEFT_OUTER).switch(BrowserScript)\
        .join(Command, p.JOIN.LEFT_OUTER).switch(BrowserScript)\
        .join(PayloadType).switch(BrowserScript)


async def browserscriptoperation_query():
    return BrowserScriptOperation.select(BrowserScriptOperation, BrowserScript, Operation, Command, PayloadType, Operator)\
        .join(BrowserScript).join(Command, p.JOIN_LEFT_OUTER).join(PayloadType, p.JOIN_LEFT_OUTER).switch(BrowserScript).join(Operator).switch(BrowserScriptOperation)\
        .join(Operation).switch(BrowserScriptOperation)


async def processlist_query():
    return ProcessList.select(ProcessList, Task, Callback, Operation)\
        .join(Task).join(Callback).switch(ProcessList)\
        .join(Operation).switch(ProcessList)


async def filebrowserobj_query():
    parent = FileBrowserObj.alias()
    return FileBrowserObj.select(FileBrowserObj, Task, Callback, Operation, parent)\
        .join(Task).join(Callback).switch(FileBrowserObj)\
        .join(Operation).switch(FileBrowserObj)\
        .join(parent, p.JOIN_LEFT_OUTER, on=(FileBrowserObj.parent).alias('parent')).switch(FileBrowserObj)


async def operationeventlog_query():
    return OperationEventLog.select(OperationEventLog, Operator, Operation)\
        .join(Operator, p.JOIN_LEFT_OUTER).switch(OperationEventLog)\
        .join(Operation).switch(OperationEventLog)


async def callbackgraphedge_query():
    destination = Callback.alias()
    task_end = Task.alias()
    return CallbackGraphEdge.select(CallbackGraphEdge, Callback, destination, Operation, Task, task_end, C2Profile)\
        .join(Callback).switch(CallbackGraphEdge)\
        .join(destination, on=(CallbackGraphEdge.destination).alias('destination')).switch(CallbackGraphEdge)\
        .join(Operation).switch(CallbackGraphEdge)\
        .join(Task, p.JOIN_LEFT_OUTER).switch(CallbackGraphEdge)\
        .join(task_end, p.JOIN.LEFT_OUTER, on=(CallbackGraphEdge.task_end).alias('task_end')).switch(CallbackGraphEdge)\
        .join(C2Profile).switch(CallbackGraphEdge)


async def buildparameter_query():
    return BuildParameter.select(BuildParameter, PayloadType)\
        .join(PayloadType).switch(BuildParameter)


async def buildparameterinstance_query():
    return BuildParameterInstance.select(BuildParameterInstance, BuildParameter, Payload, PayloadType)\
        .join(BuildParameter).switch(BuildParameterInstance)\
        .join(Payload).join(PayloadType).switch(BuildParameterInstance)


# ------------ LISTEN / NOTIFY ---------------------
def pg_register_newinserts():
    inserts = ['callback', 'task', 'payload', 'c2profile', 'operator', 'operation', 'payloadtype',
               'command', 'operatoroperation', 'payloadtypec2profile', 'filemeta', 'payloadcommand',
               'attack', 'credential', 'keylog', 'commandparameters', 'loadedcommands',
               'response', 'attackcommand', 'attacktask', 'artifact',
               'taskartifact', 'staginginfo', 'apitokens', 'browserscript', 'disabledcommandsprofile',
               'disabledcommands', 'processlist', 'filebrowserobj', 'browserscriptoperation',
               'operationeventlog', 'callbackgraphedge', 'payloadc2profiles', 'buildparameter', 'buildparameterinstance',
               'callbackc2profiles', 'payloadonhost', 'wrappedpayloadtypes']
    for table in inserts:
        create_function_on_insert = "DROP FUNCTION IF EXISTS notify_new" + table + "() cascade;" + \
                                    "CREATE FUNCTION notify_new" + table + \
                                    "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('new" + table + \
                                    "', NEW.id::text); RETURN NULL; END; $$;"
        create_trigger_on_insert = "CREATE TRIGGER new" + table + \
                                   "_trigger AFTER INSERT ON " + table + " FOR EACH ROW EXECUTE PROCEDURE notify_new" + \
                                   table + "();"
        try:
            mythic_db.execute_sql(create_function_on_insert)
            mythic_db.execute_sql(create_trigger_on_insert)
        except Exception as e:
            print(e)


def pg_register_updates():
    updates = ['callback', 'task', 'response', 'payload', 'c2profile', 'operator', 'operation', 'payloadtype',
               'command', 'operatoroperation', 'payloadtypec2profile', 'filemeta', 'payloadcommand',
               'attack', 'credential', 'keylog', 'commandparameters',  'loadedcommands',
               'attackcommand', 'attacktask', 'artifact', 'taskartifact', 'operationeventlog',
               'staginginfo', 'apitokens', 'browserscript', 'disabledcommandsprofile', 'disabledcommands',
               'processlist', 'filebrowserobj', 'browserscriptoperation', 'callbackgraphedge', 'callbackc2profiles',
               'payloadonhost', 'wrappedpayloadtypes', 'buildparameter', 'buildparameterinstance']
    for table in updates:
        create_function_on_changes = "DROP FUNCTION IF EXISTS notify_updated" + table + "() cascade;" + \
                                     "CREATE FUNCTION notify_updated" + table + \
                                     "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('updated" + \
                                     table + "', NEW.id::text); RETURN NULL; END; $$;"
        create_trigger_on_changes = "CREATE TRIGGER updated" + table + \
                                    "_trigger AFTER UPDATE ON " + table + \
                                    " FOR EACH ROW EXECUTE PROCEDURE notify_updated" + table + "();"
        try:
            mythic_db.execute_sql(create_function_on_changes)
            mythic_db.execute_sql(create_trigger_on_changes)
        except Exception as e:
            print(e)


def pg_register_deletes():
    updates = ['commandparameters', 'disabledcommands', 'browserscriptoperation', 'credential',
               'wrappedpayloadtypes']
    for table in updates:
        create_function_on_deletes = "DROP FUNCTION IF EXISTS notify_deleted" + table + "() cascade;" + \
                                     "CREATE FUNCTION notify_deleted" + table + \
                                     "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('deleted" + \
                                     table + "', row_to_json(OLD)::text); RETURN NULL; END; $$;"
        create_trigger_on_deletes = "CREATE TRIGGER deleted" + table + \
                                    "_trigger AFTER DELETE ON " + table + \
                                    " FOR EACH ROW EXECUTE PROCEDURE notify_deleted" + table + "();"
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

