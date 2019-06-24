import aiohttp
import asyncio
import json
from typing import Dict, List, Union


async def json_print(thing):
    print(json.dumps(thing, indent=2, default=lambda o: o.to_json()))


async def json_apfell_obj(thing):
    return json.loads(json.dumps(thing, default=lambda o: o.to_json()))


class APIToken:
    def __init__(self,
                 token_type: str = None,
                 token_value: str = None,
                 creation_time: str = None,
                 active: bool = None,
                 id: int = None,
                 operator: Union['Operator', str] = None):
        self._token_type = token_type
        self._token_value = token_value
        self._creation_time = creation_time
        self._active = active
        self._id = id
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._operator = operator

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, APIToken):
            return self._token_value == other.token_value
        return False

    @property
    def token_type(self) -> str:
        return self._token_type

    @token_type.setter
    def token_type(self, token_type):
        self._token_type = token_type

    @property
    def token_value(self) -> str:
        return self._token_value

    @token_value.setter
    def token_value(self, token_value):
        self._token_value = token_value

    @property
    def creation_time(self) -> str:
        return self._creation_time

    @creation_time.setter
    def creation_time(self, creation_time):
        self._creation_time = creation_time

    @property
    def active(self) -> bool:
        return self._active

    @active.setter
    def active(self, active):
        self._active = active

    @property
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def operator(self) -> 'Operator':
        return self._operator

    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)


class Operation:
    def __init__(self,
                 name: str = None,
                 admin: Union['Operator', str] = None,
                 complete: bool = None,
                 AESPSK: str = None,
                 id: int = None,
                 members: List[Union['Operator', str]] = None,
                 add_members: List[Union['Operator', str]] = None,
                 remove_members: List[Union['Operator', str]] = None):
        self._name = name
        if isinstance(admin, Operator) or admin is None:
            self._admin = admin
        else:
            self._admin = Operator(username=admin)
        self._complete = complete
        self._AESPSK = AESPSK
        self._id = id
        if add_members is not None:
            if isinstance(add_members, list):
                self._add_members = [Operator(username=x) if isinstance(x, str) else x for x in add_members]
            else:
                raise ValueError("add_members must be a list")
        else:
            self._add_members = add_members
        if remove_members is not None:
            if isinstance(remove_members, list):
                self._remove_members = [Operator(username=x) if isinstance(x, str) else x for x in remove_members]
            else:
                raise ValueError("remove_members must be a list")
        else:
            self._remove_members = remove_members
        if members is not None:
            if isinstance(members, list):
                self._members = [Operator(username=x) if isinstance(x, str) else x for x in members]
            else:
                raise ValueError("members must be a list")
        else:
            self._members = members

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Operation):
            return self._name == other.name or (self._id is not None and other.id is not None and self._id == other.id)
        return False

    @property
    def name(self) -> str:
        return self._name

    @name.setter
    def name(self, name):
        self._name = name

    @property
    def admin(self) -> 'Operator':
        return self._admin

    @admin.setter
    def admin(self, admin):
        if isinstance(admin, Operator) or admin is None:
            self._admin = admin
        else:
            self._admin = Operator(username=admin)

    @property
    def complete(self) -> bool:
        return self._complete

    @complete.setter
    def complete(self, complete):
        self._complete = complete

    @property
    def AESPSK(self) -> str:
        return self._AESPSK

    @AESPSK.setter
    def AESPSK(self, AESPSK):
        self._AESPSK = AESPSK

    @property
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def members(self) -> List['Operator']:
        return self._members

    @members.setter
    def members(self, members):
        if isinstance(members, list):
            self._members = [Operator(username=x) if isinstance(x, str) else x for x in members]
        else:
            raise ValueError("Must be list type")

    @property
    def add_members(self) -> List['Operator']:
        return self._add_members

    @add_members.setter
    def add_members(self, add_members):
        if isinstance(add_members, list):
            self._add_members = add_members
        else:
            raise ValueError("Must be list type")

    @property
    def remove_members(self) -> List['Operator']:
        return self._remove_members

    @remove_members.setter
    def remove_members(self, remove_members):
        if isinstance(remove_members, list):
            self._remove_members = remove_members
        else:
            raise ValueError("Must be list type")


class Operator:
    def __init__(self,
                 username: str = None,
                 password: str = None,
                 admin: bool = None,
                 creation_time: str = None,
                 last_login: str = None,
                 active: bool = None,
                 current_operation: Union[Operation, str] = None,
                 ui_config: str = None,
                 id: int = None):
        self._username = username
        self._admin = admin
        self._creation_time = creation_time
        self._last_login = last_login
        self._active = active
        if isinstance(current_operation, Operation) or current_operation is None:
            self._current_operation = current_operation
        else:
            self._current_operation = Operation(name=current_operation)
        self._ui_config = ui_config
        self._id = id
        self._password = password

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Operator):
            return self._username == other.username or (self._id is not None and other.id is not None and self._id == other.id)
        return False

    @property
    def username(self) -> str:
        return self._username

    @username.setter
    def username(self, username):
        self._username = username

    @property
    def admin(self) -> bool:
        return self._admin

    @admin.setter
    def admin(self, admin):
        self._admin = admin

    @property
    def creation_time(self) -> str:
        return self._creation_time

    @creation_time.setter
    def creation_time(self, creation_time):
        self._creation_time = creation_time

    @property
    def last_login(self) -> str:
        return self._last_login

    @last_login.setter
    def last_login(self, last_login):
        self._last_login = last_login

    @property
    def active(self) -> bool:
        return self._active

    @active.setter
    def active(self, active):
        self._active = active

    @property
    def current_operation(self) -> Operation:
        return self._current_operation

    @current_operation.setter
    def current_operation(self, current_operation):
        if isinstance(current_operation, Operation) or current_operation is None:
            self._current_operation = current_operation
        else:
            self._current_operation = Operation(name=current_operation)

    @property
    def ui_config(self) -> str:
        return self._ui_config

    @ui_config.setter
    def ui_config(self, ui_config):
        self._ui_config = ui_config

    @property
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def password(self) -> str:
        return self._password

    @password.setter
    def password(self, password):
        self._password = password


class PayloadType:
    def __init__(self,
                 ptype: str = None,
                 operator: Union[Operator, str] = None,
                 creation_time: str = None,
                 file_extension: str = None,
                 wrapper: bool = False,
                 wrapped_payload_type: Union['PayloadType', str] = None,
                 command_template: str = None,
                 supported_os: str = None,
                 execute_help: str = None,
                 external: bool = False,
                 last_heartbeat: str = None,
                 container_running: bool = None,
                 service: str = None,
                 id: int = None):
        self._ptype = ptype
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._creation_time = creation_time
        self._file_extension = file_extension
        self._wrapper = wrapper
        if isinstance(wrapped_payload_type, PayloadType) or wrapped_payload_type is None:
            self._wrapped_payload_type = wrapped_payload_type
        else:
            self._wrapped_payload_type = PayloadType(ptype=wrapped_payload_type)
        self._command_template = command_template
        self._supported_os = supported_os
        self._execute_help = execute_help
        self._external = external
        self._last_heartbeat = last_heartbeat
        self._container_running = container_running
        self._service = service
        self._id = id

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, PayloadType):
            return self._ptype == other.ptype or (self._id is not None and other.id is not None and self._id == other.id)
        return False

    @property
    def ptype(self) -> str:
        return self._ptype
    @ptype.setter
    def ptype(self, ptype):
        self._ptype = ptype
    @property
    def operator(self) -> Operator:
        return self._operator
    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
    @property
    def creation_time(self) -> str:
        return self._creation_time
    @creation_time.setter
    def creation_time(self, creation_time):
        self._creation_time = creation_time
    @property
    def file_extension(self) -> str:
        return self._file_extension
    @file_extension.setter
    def file_extension(self, file_extension):
        self._file_extension = file_extension
    @property
    def wrapper(self) -> bool:
        return self._wrapper
    @wrapper.setter
    def wrapper(self, wrapper):
        self._wrapper = wrapper
    @property
    def wrapped_payload_type(self) -> 'PayloadType':
        return self._wrapped_payload_type
    @wrapped_payload_type.setter
    def wrapped_payload_type(self, wrapped_payload_type):
        if isinstance(wrapped_payload_type, PayloadType) or wrapped_payload_type is None:
            self._wrapped_payload_type = wrapped_payload_type
        else:
            self._wrapped_payload_type = PayloadType(ptype=wrapped_payload_type)
    @property
    def command_template(self) -> str:
        return self._command_template
    @command_template.setter
    def command_template(self, command_template):
        self._command_template = command_template
    @property
    def supported_os(self) -> str:
        return self._supported_os
    @supported_os.setter
    def supported_os(self, supported_os):
        self._supported_os = supported_os
    @property
    def execute_help(self) -> str:
        return self._execute_help
    @execute_help.setter
    def execute_help(self, execute_help):
        self._execute_help = execute_help
    @property
    def external(self) -> bool:
        return self._external
    @external.setter
    def external(self, external):
        self._external = external
    @property
    def last_heartbeat(self) -> str:
        return self._last_heartbeat
    @last_heartbeat.setter
    def last_heartbeat(self, last_heartbeat):
        self._last_heartbeat = last_heartbeat
    @property
    def container_running(self) -> bool:
        return self._container_running
    @container_running.setter
    def container_running(self, container_running):
        self._container_running = container_running
    @property
    def service(self) -> str:
        return self._service
    @service.setter
    def service(self, service):
        self._service = service
    @property
    def id(self) -> int:
        return self._id
    @id.setter
    def id(self, id):
        self._id = id


class Command:
    def __init__(self,
                 needs_admin: bool = None,
                 help_cmd: str = None,
                 description: str = None,
                 cmd: str = None,
                 payload_type: Union[PayloadType, str] = None,
                 operator: Union[Operator, str] = None,
                 creation_time: str = None,
                 version: int = None,
                 is_exit: bool = None,
                 id: int = None,
                 apfell_version: int = None,
                 params: List[Union['CommandParameters', Dict[str, str]]] = None,
                 transforms: List[Union['CommandTransform', Dict[str, str]]] = None):
        self._needs_admin = needs_admin
        self._help_cmd = help_cmd
        self._description = description
        self._cmd = cmd
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._creation_time = creation_time
        self._version = version
        self._is_exit = is_exit
        self._id = id
        self._apfell_version = apfell_version
        if params is not None and params != []:
            if isinstance(params, list):
                self._params = [CommandParameters(**x) if isinstance(x, Dict) else x for x in params]
            else:
                raise ValueError("params must be a list")
        else:
            self._params = None
        if transforms is not None and transforms != []:
            print(transforms)
            if isinstance(transforms, list):
                print(transforms)
                self._transforms = [CommandTransform(**x) if isinstance(x, Dict) else x for x in params]
            else:
                raise ValueError("transforms must be a list")
        else:
            self._transforms = None

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Command):
            return (self._cmd == other.cmd and self._payload_type.ptype == other.payload_type.ptype) or (self._id is not None and other.id is not None and self._id == other.id)
        return False

    @property
    def needs_admin(self) -> bool:
        return self._needs_admin
    @needs_admin.setter
    def needs_admin(self, needs_admin):
        self._needs_admin = needs_admin
    @property
    def help_cmd(self) -> str:
        return self._help_cmd
    @help_cmd.setter
    def help_cmd(self, help_cmd):
        self._help_cmd = help_cmd
    @property
    def description(self) -> str:
        return self._description
    @description.setter
    def description(self, description):
        self._description = description
    @property
    def cmd(self) -> str:
        return self._cmd
    @cmd.setter
    def cmd(self, cmd):
        self._cmd = cmd
    @property
    def payload_type(self) -> PayloadType:
        return self._payload_type
    @payload_type.setter
    def payload_type(self, payload_type):
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
    @property
    def operator(self) -> Operator:
        return self._operator
    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
    @property
    def creation_time(self) -> str:
        return self._creation_time
    @creation_time.setter
    def creation_time(self, creation_time):
        self._creation_time = creation_time
    @property
    def version(self) -> int:
        return self._version
    @version.setter
    def version(self, version):
        self._version = version
    @property
    def is_exit(self) -> bool:
        return self._is_exit
    @is_exit.setter
    def is_exit(self, is_exit):
        self._is_exit = is_exit
    @property
    def id(self) -> int:
        return self._id
    @id.setter
    def id(self, id):
        self._id = id
    @property
    def apfell_version(self) -> int:
        return self._apfell_version
    @apfell_version.setter
    def apfell_version(self, apfell_version):
        self._apfell_version = apfell_version
    @property
    def params(self) -> List['CommandParameters']:
        return self._params
    @params.setter
    def params(self, params):
        if isinstance(params, list):
            self._params = [CommandParameters(**x) if isinstance(x, Dict) else x for x in params]
        elif params is None or params == []:
            self._params = None
        else:
            raise ValueError("params must be a list")
    @property
    def transforms(self) -> List['CommandTransform']:
        return self._transforms
    @transforms.setter
    def transforms(self, transforms):
        if isinstance(transforms, list):
            self._transforms = [CommandTransform(**x) if isinstance(x, Dict) else x for x in transforms]
        elif transforms is None or transforms == []:
            self._transforms = None
        else:
            raise ValueError("transforms must be a list")


class CommandParameters:
    def __init__(self,
                 command: Union[Command, int] = None,  # database ID for the corresponding command
                 cmd: str = None,  # cmd string the command refers to (like shell)
                 payload_type: Union[PayloadType, str] = None,
                 name: str = None,
                 type: str = None,
                 hint: str = None,
                 choices: Union[List[str], str] = None,
                 required: bool = None,
                 operator: Union[Operator, str] = None,
                 id: int = None):
        if isinstance(command, Command) or command is None:
            self._command = command
        else:
            self._command = Command(id=command)
        self._cmd = cmd
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
        self._name = name
        self._type = type
        self._hint = hint
        if isinstance(choices, List) or choices is None:
            self._choices = choices
        else:
            self._choices = choices.split("\n")
        self._required = required
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._id = id

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, CommandParameters):
            return (self._name == other.name and (self._command == other.command) or (self._cmd == other.cmd)) or (self._id is not None and other.id is not None and self._id == other.id)
        return False

    @property
    def command(self) -> Command:
        return self._command
    @command.setter
    def command(self, command):
        if isinstance(command, Command) or command is None:
            self._command = command
        else:
            self._command = Command(id=command)
    @property
    def name(self) -> str:
        return self._name
    @name.setter
    def name(self, name):
        self._name = name
    @property
    def type(self) -> str:
        return self._type
    @type.setter
    def type(self, type):
        self._type = type
    @property
    def hint(self) -> str:
        return self._hint
    @hint.setter
    def hint(self, hint):
        self._hint = hint
    @property
    def choices(self) -> List[str]:
        return self._choices
    @choices.setter
    def choices(self, choices):
        if isinstance(choices, List) or choices is None:
            self._choices = choices
        else:
            self._choices = choices.split("\n")
    @property
    def required(self) -> bool:
        return self._required
    @required.setter
    def required(self, required):
        self._required = required
    @property
    def operator(self) -> Operator:
        return self._operator
    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
    @property
    def id(self) -> int:
        return self._id
    @id.setter
    def id(self, id):
        self._id = id
    @property
    def cmd(self) -> str:
        return self._cmd
    @cmd.setter
    def cmd(self, cmd):
        self._cmd = cmd
    @property
    def payload_type(self) -> PayloadType:
        return self._payload_type
    @payload_type.setter
    def payload_type(self, payload_type):
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)


class CommandTransform:
    def __init__(self,
                 command: Union[Command, str] = None,
                 command_id: int = None,
                 payload_type: Union[PayloadType, str] = None,
                 name: str = None,
                 operator: Union[Operator, str] = None,
                 timestamp: str = None,
                 order: int = None,
                 parameter: str = None,
                 operation: Union[Operation, str] = None,
                 active: bool = None,
                 id: int = None):
        if isinstance(command, Command) or command is None:
            self._command = command
        else:
            self.command = Command(cmd=command, id=command_id)
        self._command_id = command_id
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
        self._name = name
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._timestamp = timestamp
        self._order = order
        self._parameter = parameter
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
        self._active = active
        self._id = id

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, CommandTransform):
            return self._id == other.id
        return False

    @property
    def command(self) -> Command:
        return self._command
    @command.setter
    def command(self, command):
        if isinstance(command, Command) or command is None:
            self._command = command
        else:
            self._command = Command(cmd=command, id=self._command_id)
    @property
    def command_id(self) -> int:
        return self._command_id
    @command_id.setter
    def command_id(self, command_id):
        self._command_id = command_id
    @property
    def payload_type(self) -> PayloadType:
        return self._payload_type
    @payload_type.setter
    def payload_type(self, payload_type):
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
    @property
    def name(self) -> str:
        return self._name
    @name.setter
    def name(self, name):
        self._name = name
    @property
    def operator(self) -> Operator:
        return self._operator
    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
    @property
    def timestamp(self) -> str:
        return self._timestamp
    @timestamp.setter
    def timestamp(self, timestamp):
        self._timestamp = timestamp
    @property
    def order(self) -> int:
        return self._order
    @order.setter
    def order(self, order):
        self._order = order
    @property
    def parameter(self) -> str:
        return self._parameter
    @parameter.setter
    def parameter(self, parameter):
        self._parameter = parameter
    @property
    def operation(self) -> Operation:
        return self._operation
    @operation.setter
    def operation(self, operation):
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
    @property
    def active(self) -> bool:
        return self._active
    @active.setter
    def active(self, active):
        self._active = active
    @property
    def id(self) -> int:
        return self._id
    @id.setter
    def id(self, id):
        self._id = id


class C2Profile:
    def __init__(self,
                 name: str = None,
                 description: str = None,
                 operator: Union[Operator, str] = None,
                 creation_time: str = None,
                 running: bool = None,
                 last_heartbeat: str = None,
                 container_running: bool = None,
                 id: int = None,
                 ptype: List[Union[PayloadType, str]] = None):  # list of payload types that support this c2 profile
        self._name = name
        self._description = description
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._creation_time = creation_time
        self._running = running
        self._last_heartbeat = last_heartbeat
        self._container_running = container_running
        self._id = id
        if ptype is not None:
            if isinstance(ptype, list):
                self._ptype = [PayloadType(ptype=x) if isinstance(x, str) else x for x in ptype]
            else:
                raise ValueError("ptype must be a list")
        else:
            self._ptype = ptype

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, C2Profile):
            return self._name == other.name or (self._id is not None and other.id is not None and self._id == other.id)
        return False

    @property
    def name(self) -> str:
        return self._name
    @name.setter
    def name(self, name):
        self._name = name
    @property
    def description(self) -> str:
        return self._description
    @description.setter
    def description(self, description):
        self._description = description
    @property
    def operator(self) -> Operator:
        return self._operator
    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
    @property
    def creation_time(self) -> str:
        return self._creation_time
    @creation_time.setter
    def creation_time(self, creation_time):
        self._creation_time = creation_time
    @property
    def running(self) -> bool:
        return self._running
    @running.setter
    def running(self, running):
        self._running = running
    @property
    def last_heartbeat(self) -> str:
        return self._last_heartbeat
    @last_heartbeat.setter
    def last_heartbeat(self, last_heartbeat):
        self._last_heartbeat = last_heartbeat
    @property
    def container_running(self) -> bool:
        return self._container_running
    @container_running.setter
    def container_running(self, container_running):
        self._container_running = container_running
    @property
    def id(self) -> int:
        return self._id
    @id.setter
    def id(self, id):
        self._id = id
    @property
    def ptype(self) -> List[PayloadType]:
        return self._ptype
    @ptype.setter
    def ptype(self, ptype):
        if isinstance(ptype, list):
            self._ptype = [PayloadType(ptype=x) if isinstance(x, str) else x for x in ptype]
        elif ptype is None:
            self._ptype = ptype
        else:
            raise ValueError("ptype must be a list")


class C2ProfileParameters:
    """
    This class combines C2ProfileParameters and C2ProfileParametersInstance
    Thus, c2_profile_name maps to name,
          c2_profile_key maps to key
    """
    def __init__(self,
                 c2_profile: Union[C2Profile, str] = None,
                 name: str = None,
                 key: str = None,
                 hint: str = None,
                 id: int = None,
                 value: str = None,
                 payload: Union['Payload', str] = None,
                 c2_profile_name: str = None,
                 c2_profile_key: str = None):
        if isinstance(c2_profile, C2Profile) or c2_profile is None:
            self._c2_profile = c2_profile
        else:
            self._c2_profile = C2Profile(name=c2_profile)
        self._name = name
        self._key = key
        self._hint = hint
        self._value = value
        self._id = id
        if isinstance(payload, Payload) or payload is None:
            self._payload = payload
        else:
            self._payload = Payload(uuid=payload)
        if self._name is None:
            self._name = c2_profile_name
        if self._key is None:
            self._key = c2_profile_key

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, C2ProfileParameters):
            return self._name == other.name and self._c2_profile == other.c2_profile
        return False

    @property
    def c2_profile(self) -> C2Profile:
        return self._c2_profile
    @c2_profile.setter
    def c2_profile(self, c2_profile):
        if isinstance(c2_profile, C2Profile) or c2_profile is None:
            self._c2_profile = c2_profile
        else:
            self._c2_profile = C2Profile(name=c2_profile)
    @property
    def name(self) -> str:
        return self._name
    @name.setter
    def name(self, name):
        self._name = name
    @property
    def key(self) -> str:
        return self._key
    @key.setter
    def key(self, key):
        self._key = key
    @property
    def hint(self) -> str:
        return self._hint
    @hint.setter
    def hint(self, hint):
        self._hint = hint
    @property
    def id(self) -> int:
        return self._id
    @id.setter
    def id(self, id):
        self._id = id
    @property
    def value(self) -> str:
        return self._value
    @value.setter
    def value(self, value):
        self._value = value
    @property
    def payload(self) -> 'Payload':
        return self._payload
    @payload.setter
    def payload(self, payload):
        if isinstance(payload, Payload) or payload is None:
            self._payload = payload
        else:
            self._payload = Payload(uuid=payload)


class Payload:
    def __init__(self,
                 uuid: str = None,
                 tag: str = None,
                 operator: Union[Operator, str] = None,
                 creation_time: str = None,
                 payload_type: Union[PayloadType, str] = None,
                 pcallback: Union['Callback', int] = None,
                 location: str = None,
                 c2_profile: Union[C2Profile, str] = None,
                 operation: Union[Operation, str] = None,
                 wrapped_payload: bool = None,
                 deleted: bool = None,
                 build_phase: str = None,
                 build_message: str = None,
                 id: int = None,
                 external: bool = None,
                 commands: List[Union[Command, Dict]] = None,
                 c2_profile_parameters_instance: List[Union[C2ProfileParameters, Dict]] = None):
        self._uuid = uuid
        self._tag = tag
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._creation_time = creation_time
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
        if isinstance(pcallback, Callback) or pcallback is None:
            self._pcallback = pcallback
        else:
            self._pcallback = Callback(id=pcallback)
        self._location = location
        if isinstance(c2_profile, C2Profile) or c2_profile is None:
            self._c2_profile = c2_profile
        else:
            self._c2_profile = C2Profile(name=c2_profile)
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
        self._wrapped_payload = wrapped_payload
        self._deleted = deleted
        self._build_phase = build_phase
        self._build_message = build_message
        self._id = id
        self._external = external
        if isinstance(commands, List):
            self._commands = [Command(**x) if isinstance(x, Dict) else x for x in commands]
        else:
            self._commands = None
        if isinstance(c2_profile_parameters_instance, List):
            self._c2_profile_parameters_instance = [C2ProfileParameters(**x) if isinstance(x, Dict) else x for x in c2_profile_parameters_instance]
        else:
            self._c2_profile_parameters_instance = None

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Payload):
            return self._uuid == other.uuid
        return False

    @property
    def uuid(self) -> str:
        return self._uuid
    @uuid.setter
    def uuid(self, uuid):
        self._uuid = uuid
    @property
    def tag(self) -> str:
        return self._tag
    @tag.setter
    def tag(self, tag):
        self._tag = tag
    @property
    def operator(self) -> Operator:
        return self._operator
    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
    @property
    def creation_time(self) -> str:
        return self._creation_time
    @creation_time.setter
    def creation_time(self, creation_time):
        self._creation_time = creation_time
    @property
    def payload_type(self) -> PayloadType:
        return self._payload_type
    @payload_type.setter
    def payload_type(self, payload_type):
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
    @property
    def pcallback(self) -> 'Callback':
        return self._pcallback
    @pcallback.setter
    def pcallback(self, pcallback):
        if isinstance(pcallback, Callback) or pcallback is None:
            self._pcallback = pcallback
        else:
            self._pcallback = Callback(id=pcallback)
    @property
    def location(self) -> str:
        return self._location
    @location.setter
    def location(self, location):
        self._location = location
    @property
    def c2_profile(self) -> C2Profile:
        return self._c2_profile
    @c2_profile.setter
    def c2_profile(self, c2_profile):
        if isinstance(c2_profile, C2Profile) or c2_profile is None:
            self._c2_profile = c2_profile
        else:
            self._c2_profile = C2Profile(name=c2_profile)
    @property
    def operation(self) -> Operation:
        return self._operation
    @operation.setter
    def operation(self, operation):
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
    @property
    def wrapped_payload(self) -> bool:
        return self._wrapped_payload
    @wrapped_payload.setter
    def wrapped_payload(self, wrapped_payload):
        self._wrapped_payload = wrapped_payload
    @property
    def deleted(self) -> bool:
        return self._deleted
    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted
    @property
    def build_phase(self) -> str:
        return self._build_phase
    @build_phase.setter
    def build_phase(self, build_phase):
        self._build_phase = build_phase
    @property
    def build_message(self) -> str:
        return self._build_message
    @build_message.setter
    def build_message(self, build_message):
        self._build_message = build_message
    @property
    def id(self) -> int:
        return self._id
    @id.setter
    def id(self, id):
        self._id = id
    @property
    def external(self) -> bool:
        return self._external
    @external.setter
    def external(self, external):
        self._external = external
    @property
    def commands(self) -> List[Command]:
        return self._commands
    @commands.setter
    def commands(self, commands):
        if isinstance(commands, List):
            self._commands = [Command(**x) if isinstance(x, Dict) else x for x in commands]
        else:
            self._commands = None
    @property
    def c2_profile_parameters_instance(self) -> List[C2ProfileParameters]:
        return self._c2_profile_parameters_instance
    @c2_profile_parameters_instance.setter
    def c2_profile_parameters_instance(self, c2_profile_parameters_instance):
        if isinstance(c2_profile_parameters_instance, List):
            self._c2_profile_parameters_instance = [C2ProfileParameters(**x) if isinstance(x, Dict) else x for x in c2_profile_parameters_instance]
        else:
            self._c2_profile_parameters_instance = None


class Callback:
    def __init__(self,
                 init_callback: str = None,
                 last_checkin: str = None,
                 user: str = None,
                 host: str = None,
                 pid: int = None,
                 ip: str = None,
                 description: str = None,
                 operator: Union[Operator, str] = None,
                 active: bool = None,
                 pcallback: Union['Callback', int] = None,
                 registered_payload: Union[Payload, str] = None,  # corresponding payload's UUID
                 payload_type: Union[PayloadType, str] = None,  # corresponding payload's type
                 c2_profile: Union[C2Profile, str] = None,  # corresponding payload's c2 profile
                 payload_description: str = None,  # corresponding payload's description
                 integrity_level: int = None,
                 operation: Union[Operation, str] = None,
                 encryption_type: str = None,
                 decryption_key: str = None,
                 encryption_key: str = None,
                 tasks: List[Union['Task', Dict]] = None,
                 id: int = None
                 ):
        self._init_callback = init_callback
        self._last_checkin = last_checkin
        self._user = user
        self._host = host
        self._pid = pid
        self._ip = ip
        self._description = description
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operation)
        self._active = active
        if isinstance(pcallback, Callback) or pcallback is None:
            self._pcallback = pcallback
        elif pcallback == 'null':
            self._pcallback = None
        else:
            self._pcallback = Callback(id=pcallback)
        if isinstance(registered_payload, Payload) or registered_payload is None:
            self._registered_payload = registered_payload
        else:
            self._registered_payload = Payload(uuid=registered_payload)
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
        if isinstance(c2_profile, C2Profile) or c2_profile is None:
            self._c2_profile = c2_profile
        else:
            self._c2_profile = C2Profile(name=c2_profile)
        self._payload_description = payload_description
        self._integrity_level = integrity_level
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
        self._encryption_type = encryption_type
        self._decryption_key = decryption_key
        self._encryption_key = encryption_key
        if isinstance(tasks, List):
            self._tasks = [Task(**x) if isinstance(x, Dict) else x for x in tasks]
        elif tasks is None:
            self._tasks = tasks
        else:
            self._tasks = [Task(**tasks) if isinstance(tasks, Dict) else tasks]
        self._id = id

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Callback):
            return self._id == other.id
        return False

    @property
    def init_callback(self) -> str:
        return self._init_callback
    @init_callback.setter
    def init_callback(self, init_callback):
        self._init_callback = init_callback
    @property
    def last_checkin(self) -> str:
        return self._last_checkin
    @last_checkin.setter
    def last_checkin(self, last_checkin):
        self._last_checkin = last_checkin
    @property
    def user(self) -> str:
        return self._user
    @user.setter
    def user(self, user):
        self._user = user
    @property
    def host(self) -> str:
        return self._host
    @host.setter
    def host(self, host):
        self._host = host
    @property
    def pid(self) -> int:
        return self._pid
    @pid.setter
    def pid(self, pid):
        self._pid = pid
    @property
    def ip(self) -> str:
        return self._ip
    @ip.setter
    def ip(self, ip):
        self._ip = ip
    @property
    def description(self) -> str:
        return self._description
    @description.setter
    def description(self, description):
        self._description = description
    @property
    def operator(self) -> Operator:
        return self._operator
    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
    @property
    def active(self) -> bool:
        return self._active
    @active.setter
    def active(self, active):
        self._active = active
    @property
    def pcallback(self) -> 'Callback':
        return self._pcallback
    @pcallback.setter
    def pcallback(self, pcallback):
        if isinstance(pcallback, Callback) or pcallback is None:
            self._pcallback = pcallback
        elif pcallback == 'null':
            self._pcallback = None
        else:
            self._pcallback = Callback(id=pcallback)
    @property
    def registered_payload(self) -> Payload:
        return self._registered_payload
    @registered_payload.setter
    def registered_payload(self, registered_payload):
        if isinstance(registered_payload, Payload) or registered_payload is None:
            self._registered_payload = registered_payload
        else:
            self._registered_payload = Payload(uuid=registered_payload)
    @property
    def payload_type(self) -> PayloadType:
        return self._payload_type
    @payload_type.setter
    def payload_type(self, payload_type):
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
    @property
    def c2_profile(self) -> C2Profile:
        return self._c2_profile
    @c2_profile.setter
    def c2_profile(self, c2_profile):
        if isinstance(c2_profile, C2Profile) or c2_profile is None:
            self._c2_profile = c2_profile
        else:
            self._c2_profile = C2Profile(name=c2_profile)
    @property
    def payload_description(self) -> str:
        return self._payload_description
    @payload_description.setter
    def payload_description(self, payload_description):
        self._payload_description = payload_description
    @property
    def integrity_level(self) -> int:
        return self._integrity_level
    @integrity_level.setter
    def integrity_level(self, integrity_level):
        self._integrity_level = integrity_level
    @property
    def operation(self) -> Operation:
        return self._operation
    @operation.setter
    def operation(self, operation):
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
    @property
    def encryption_type(self) -> str:
        return self._encryption_type
    @encryption_type.setter
    def encryption_type(self, encryption_type):
        self._encryption_type = encryption_type
    @property
    def decryption_key(self) -> str:
        return self._decryption_key
    @decryption_key.setter
    def decryption_key(self, decryption_key):
        self._decryption_key = decryption_key
    @property
    def encryption_key(self) -> str:
        return self._encryption_key
    @encryption_key.setter
    def encryption_key(self, encryption_key):
        self._encryption_key = encryption_key
    @property
    def tasks(self) -> List['Task']:
        return self._tasks
    @tasks.setter
    def tasks(self, tasks):
        if isinstance(tasks, List):
            self._tasks = [Task(**x) if isinstance(x, Dict) else x for x in tasks]
        elif tasks is None:
            self._tasks = tasks
        else:
            self._tasks = [Task(**tasks) if isinstance(tasks, Dict) else tasks]
    @property
    def id(self) -> int:
        return self._id
    @id.setter
    def id(self, id):
        self._id = id


class Task:
    def __init__(self,
                 command: Union[Command, str] = None,
                 params: str = None,
                 timestamp: str = None,
                 callback: Union[Callback, int] = None,
                 operator: Union[Operator, str] = None,
                 status: str = None,
                 task_status: str = None,  # sometimes this is set to not conflict with overall status message
                 original_params: str = None,
                 comment: str = None,
                 comment_operator: Union[Operator, str] = None,
                 id: int = None,
                 responses: List[Union['Response', Dict]] = None,
                 test_command: bool = None):
        if isinstance(command, Command) or command is None:
            self._command = command
        else:
            self._command = Command(cmd=command)
        self._params = params
        self._timestamp = timestamp
        if isinstance(callback, Callback) or callback is None:
            self._callback = callback
        else:
            self._callback = Callback(id=callback)
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._status = status
        self._original_params = original_params
        if comment == "":
            self._comment = None
        else:
            self._comment = comment
        if isinstance(comment_operator, Operator) or comment_operator is None:
            self._comment_operator = comment_operator
        elif comment_operator == 'null':
            self._comment_operator = None
        else:
            self._comment_operator = Operator(username=comment_operator)
        self._id = id
        if isinstance(responses, List):
            self._responses = [Response(**x) if isinstance(x, Dict) else x for x in responses]
        elif responses is None:
            self._responses = responses
        else:
            self._responses = [Response(**responses) if isinstance(responses, Dict) else Response(response=responses)]
        self._test_command = test_command
        if task_status is not None:
            self._status = task_status

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Task):
            return self._id == other.id
        return False

    @property
    def command(self) -> Command:
        return self._command
    @command.setter
    def command(self, command):
        if isinstance(command, Command) or command is None:
            self._command = command
        else:
            self._command = Command(cmd=command)
    @property
    def params(self) -> str:
        return self._params
    @params.setter
    def params(self, params):
        self._params = params
    @property
    def timestamp(self) -> str:
        return self._timestamp
    @timestamp.setter
    def timestamp(self, timestamp):
        self._timestamp = timestamp
    @property
    def callback(self) -> Callback:
        return self._callback
    @callback.setter
    def callback(self, callback):
        if isinstance(callback, Callback):
            self._callback = callback
        else:
            self._callback = Callback(id=callback)
    @property
    def operator(self) -> Operator:
        return self._operator
    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
    @property
    def status(self) -> str:
        return self._status
    @status.setter
    def status(self, status):
        self._status = status
    @property
    def original_params(self) -> str:
        return self._original_params
    @original_params.setter
    def original_params(self, original_params):
        self._original_params = original_params
    @property
    def comment(self) -> str:
        return self._comment
    @comment.setter
    def comment(self, comment):
        if comment == "":
            self._comment = None
        else:
            self._comment = comment
    @property
    def comment_operator(self) -> Operator:
        return self._comment_operator
    @comment_operator.setter
    def comment_operator(self, comment_operator):
        if isinstance(comment_operator, Operator) or comment_operator is None:
            self._comment_operator = comment_operator
        elif comment_operator == 'null':
            self._comment_operator = None
        else:
            self._comment_operator = Operator(username=comment_operator)
    @property
    def responses(self) -> List['Response']:
        return self._responses
    @responses.setter
    def responses(self, responses):
        if isinstance(responses, List):
            self._responses = [Response(**x) if isinstance(x, Dict) else x for x in responses]
        elif responses is None:
            self._responses = responses
        else:
            self._responses = [Response(**responses) if isinstance(responses, Dict) else Response(response=responses)]
    @property
    def id(self):
        return self._id
    @id.setter
    def id(self, id):
        self._id = id
    @property
    def test_command(self) -> bool:
        return self._test_command
    @test_command.setter
    def test_command(self, test_command):
        self._test_command = test_command
    @property
    def task_status(self) -> str:
        return self._status
    @task_status.setter
    def task_status(self, task_status):
        self._status = task_status


class Response:
    def __init__(self,
                 response: str = None,
                 timestamp: str = None,
                 task: Union[Task, int, Dict] = None,  # JSON string of the corresponding task
                 id: int = None):
        self._response = response
        self._timestamp = timestamp
        if isinstance(task, Task) or task is None:
            self._task = task
        elif isinstance(task, Dict):
            self._task = Task(**task)
        else:
            self._task = Task(id=task)
        self._id = id

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(getattr(self, k), default=lambda o: o.to_json())
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Response):
            return self._id == other.id
        return False

    @property
    def response(self) -> str:
        return self._response
    @response.setter
    def response(self, response):
        self._response = response
    @property
    def timestamp(self) -> str:
        return self._timestamp
    @timestamp.setter
    def timestamp(self, timestamp):
        self._timestamp = timestamp
    @property
    def task(self) -> Task:
        return self._task
    @task.setter
    def task(self, task):
        if isinstance(task, Task) or task is None:
            self._task = task
        elif isinstance(task, Dict):
            self._task = Task(**task)
        else:
            self._task = Task(id=task)
    @property
    def id(self):
        return self._id
    @id.setter
    def id(self, id):
        self._id = id


class ApfellResponse:
    def __init__(self,
                 response=None,
                 raw_response: Dict[str, str] = None,
                 response_code: int = None,
                 status: str = None):
        # set the response_code and raw_response automatically
        self.response_code = response_code
        self.raw_response = raw_response
        # determine and set status if it's not explicitly specified
        if status is None and "status" in raw_response:
            self.status = raw_response['status']
        elif status is None and self.response_code != 200:
            self.status = "error"
        else:
            self.status = status
        # if the raw_response has a status indicator, remove it and set the response
        #   otherwise just set response to raw_response and process later
        if "status" in raw_response and response is None:
            del raw_response['status']
            self.response = raw_response
        elif response is None:
            self.response = raw_response

    def to_json(self):
        r = {}
        for k in vars(self):
            try:
                r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    @property
    def response(self):
        return self.__response

    @property
    def status(self):
        return self.__status

    @property
    def response_code(self):
        return self.__response_code

    @property
    def raw_response(self):
        return self.__raw_response

    @response.setter
    def response(self, response):
        self.__response = response

    @response_code.setter
    def response_code(self, response_code):
        self.__response_code = response_code

    @status.setter
    def status(self, status):
        self.__status = status

    @raw_response.setter
    def raw_response(self, raw_response):
        self.__raw_response = raw_response


class Apfell:
    def __init__(self,
                 username: str = None,
                 password: str = None,
                 apitoken: APIToken = None,
                 access_token: str = None,
                 refresh_token: str = None,
                 server_ip: str = None,
                 ssl: bool = False,
                 server_port: str = None,
                 server_api_version: int = 1.2,
                 operator: Operator = None):
        self._username = username
        self._password = password
        self._apitoken = apitoken
        self._access_token = access_token
        self._refresh_token = refresh_token
        self._server_ip = server_ip
        self._server_port = server_port
        self._server_api_version = server_api_version
        self._operator = operator
        self._ssl = ssl
        self._http = "http://" if not ssl else "https://"
        self._ws = "ws://" if not ssl else "wss://"

    def to_json(self):
        r = {}
        for k in vars(self):
            try:
                r[k[1:]] = getattr(self, k)
            except:
                r[k[1:]] = json.dumps(getattr(self, k))
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    # ======== GETTING INTERNAL VALUES ==================
    @property
    def username(self):
        return self._username

    @property
    def password(self):
        return self._password

    @property
    def apitoken(self):
        return self._apitoken

    @property
    def access_token(self):
        return self._access_token

    @property
    def refresh_token(self):
        return self._refresh_token

    @property
    def server_ip(self):
        return self._server_ip

    @property
    def server_port(self):
        return self._server_port

    @property
    def operator(self):
        return self._operator

    @property
    def server_api_version(self):
        return self._server_api_version

    @property
    def ssl(self):
        return self._ssl

    # ========== SETTING INTERNAL VALUES ===============
    @username.setter
    def username(self, username=None):
        self._username = username

    @password.setter
    def password(self, password=None):
        self._password = password

    @apitoken.setter
    def apitoken(self, apitoken=None):
        self._apitoken = apitoken

    @access_token.setter
    def access_token(self, access_token=None):
        self._access_token = access_token

    @refresh_token.setter
    def refresh_token(self, refresh_token=None):
        self._refresh_token = refresh_token

    @server_ip.setter
    def server_ip(self, server_ip=None):
        self._server_ip = server_ip

    @server_port.setter
    def server_port(self, server_port=None):
        self._server_port = server_port

    @operator.setter
    def operator(self, operator=None):
        self._operator = operator

    @server_api_version.setter
    def server_api_version(self, server_api_version=None):
        self._server_api_version = server_api_version

    @ssl.setter
    def ssl(self, ssl=False):
        self._ssl = ssl
        self._http = "http://" if not ssl else "https://"
        self._ws = "ws://" if not ssl else "wss://"

    # ======== BASIC GET/POST/PUT/DELETE JSON WEB REQUESTS =========

    def get_headers(self):
        if self._apitoken is not None:
            return {'apitoken': self._apitoken.token_value}
        elif self._access_token is not None:
            return {'Authorization': "Bearer {}".format(self._access_token)}
        else:
            return {}

    async def get_json(self, url):
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as resp:
                    return ApfellResponse(response_code=resp.status, raw_response=await resp.json())
                    # return (resp.status, await resp.json())
        except Exception as e:
            # print(e)
            if resp.status == 200:
                if len(resp.history) > 0 and str(resp.url) == '{}{}:{}/login'.format(self._http, self._server_ip, self._server_port):
                    # this means we got redirected to login from our request
                    return ApfellResponse(response_code=302, raw_response={})
                else:
                    return ApfellResponse(response_code=403, raw_response={})
            else:
                return ApfellResponse(response_code=403, raw_response={})

    async def get_file(self, url):
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as resp:
                    data = await resp.text()
                    try:
                        json_data = json.loads(data)
                        return ApfellResponse(response_code=resp.status, raw_response=json_data)
                    except:
                        return ApfellResponse(response_code=resp.status, raw_response={"status": "success", "file": data})
                    # return (resp.status, await resp.json())
        except Exception as e:
            # print(e)
            if resp.status == 200:
                if len(resp.history) > 0 and str(resp.url) == '{}{}:{}/login'.format(self._http, self._server_ip, self._server_port):
                    # this means we got redirected to login from our request
                    return ApfellResponse(response_code=302, raw_response={})
                else:
                    return ApfellResponse(response_code=403, raw_response={})
            else:
                return ApfellResponse(response_code=403, raw_response={})

    async def put_json(self, url, data):
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.put(url, json=data, headers=headers) as resp:
                    return ApfellResponse(response_code=resp.status, raw_response=await resp.json())
        except Exception as e:
            # print(e)
            if resp.status == 200:
                if len(resp.history) > 0 and str(resp.url) == '{}{}:{}/login'.format(self._http, self._server_ip, self._server_port):
                    # this means we got redirected to login from our request
                    return ApfellResponse(response_code=302, raw_response={})
                else:
                    return ApfellResponse(response_code=403, raw_response={})
            else:
                return ApfellResponse(response_code=403, raw_response={})

    async def post_json(self, url, data):
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data, headers=headers) as resp:
                    return ApfellResponse(response_code=resp.status, raw_response=await resp.json())
        except Exception as e:
            # print(e)
            if resp.status == 200:
                if len(resp.history) > 0 and str(resp.url) == '{}{}:{}/login'.format(self._http, self._server_ip, self._server_port):
                    # this means we got redirected to login from our request
                    return ApfellResponse(response_code=302, raw_response={})
                else:
                    return ApfellResponse(response_code=403, raw_response={})
            else:
                return ApfellResponse(response_code=403, raw_response={})

    async def delete_json(self, url):
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.delete(url, headers=headers) as resp:
                    return ApfellResponse(response_code=resp.status, raw_response=await resp.json())
        except Exception as e:
            # print(e)
            if resp.status == 200:
                if len(resp.history) > 0 and str(resp.url) == '{}{}:{}/login'.format(self._http, self._server_ip, self._server_port):
                    # this means we got redirected to login from our request
                    return ApfellResponse(response_code=302, raw_response={})
                else:
                    return ApfellResponse(response_code=403, raw_response={})
            else:
                return ApfellResponse(response_code=403, raw_response={})

    # ======== WEBSOCKET BASED HELPER ENDPOINTS ========================

    async def get_websocket(self, url):
        headers = self.get_headers()
        session = aiohttp.ClientSession()
        try:
            ws = await session.ws_connect(url, headers=headers)
            return ws
        except Exception as e:
            print("Failed to get websocket connection: " + str(e))
            return None

    async def print_websocket_output(self, data):
        try:
            json_data = json.loads(data)
            if "channel" in json_data:
                if "callback" in json_data['channel']:
                    del json_data['channel']
                    await json_print(Callback(**json_data))
                elif 'task' in json_data['channel']:
                    del json_data['channel']
                    await json_print(Task(**json_data))
                elif 'response' in json_data['channel']:
                    del json_data['channel']
                    await json_print(Response(**json_data))
            else:
                print(json.dumps(json_data, indent=2))
        except Exception as e:
            print("Failed to decode json data: " + str(e))
            return None

    async def thread_output_helper(self, ws, callback_function):
        while True:
            msg = await ws.receive()
            if msg.data is None:
                return
            if msg.data != '':
                await callback_function(data=msg.data)

    async def stream_output(self, ws, callback_function):
        task = asyncio.get_event_loop().create_task(self.thread_output_helper(ws, callback_function))
        asyncio.ensure_future(task)
        return task

    # ================== APITOKEN ENDPOINTS ======================

    async def get_apitokens(self):
        """
        Gets all of the user's API tokens in a List
        :return:
        """
        url = "{}{}:{}/api/v{}/apitokens".format(self._http, self.server_ip, self._server_port, self._server_api_version)
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [APIToken(**x) for x in resp.response['apitokens']]
        return resp

    async def create_apitoken(self, token_type="User"):
        """
        Creates an API token for the user
        :param token_type:
            must be either "User" or "C2"
        :return:
        """
        # token_type should be C2 or User
        url = "{}{}:{}/api/v{}/apitokens".format(self._http, self._server_ip, self._server_port, self._server_api_version)
        resp = await self.post_json(url, data={"token_type": token_type})
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to be an object
            resp.response = APIToken(**resp.response)
        return resp

    async def remove_apitoken(self, apitoken: Union[APIToken, Dict]):
        """
        Removes the specified API token and invalidates it going forward
        :param apitoken:
            if using the APIToken class, the following must be set:
                id
        :return:
        """
        # take in an object and parse it if the value isn't explicitly given
        url = "{}{}:{}/api/v{}/apitokens/{}".format(self._http, self._server_ip, self._server_port, self._server_api_version,
                                                  str(apitoken.id if isinstance(apitoken, APIToken) else apitoken['id']))
        resp = await self.delete_json(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to ben an object
            resp.response = APIToken(**resp.response)
        return resp

    async def update_apitoken(self, apitoken: Union[APIToken, Dict]):
        """
        Updates information about a specific APIToken
        :param apitoken:
            if using APIToken class, the following must be set:
                id
            if using APIToken class, the following can be set:
                active
        :return:
        """
        # take in an object and parse it if the value isn't explicitly given
        url = "{}{}:{}/api/v{}/apitokens/{}".format(self._http, self._server_ip, self._server_port, self._server_api_version,
                                                  str(apitoken.id if isinstance(apitoken, APIToken) else apitoken['id']))
        if isinstance(apitoken, APIToken):
            data = await json_apfell_obj(apitoken)
        else:
            data = apitoken
        resp = await self.put_json(url, data=data)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to be an object
            resp.response = APIToken(**resp.response)
        return resp

    # ================== OPERATION ENDPOINTS =====================

    async def get_operations(self):
        """
        Get information about all of the operations the current user is a member of
        :return:
        """
        url = "{}{}:{}/api/v{}/operations".format(self._http, self.server_ip, self._server_port, self._server_api_version)
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Operation(**x) for x in resp.response]
        return resp

    async def get_operation(self, operation: Union[Operation, Dict]):
        """
        Get information about a single operation
        :param operation:
            if using the Operation class, the following must be set:
                name
        :return:
        """
        url = "{}{}:{}/api/v{}/operations/{}".format(self._http, self.server_ip, self._server_port, self._server_api_version,
                                                   str(operation.name if isinstance(operation, Operation) else operation['name']))
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response with APIToken objects instead of just a dictionary
            resp.response = Operation(**resp.response)
        return resp

    async def create_operation(self, operation: Union[Operation, Dict]):
        """
        Create a new operation, but you must have "admin" set on your operator profile to do so
        :param operation:
            if using the Operation class, the following must be set:
                name
            if using the Operation class, the following can be set:
                admin
                members
        :return:
        """
        data = {}
        if isinstance(operation, Operation):
            data['name'] = operation.name
            if operation.admin is not None:
                data['admin'] = operation.admin.username
            if operation.add_members is not None:
                data['members'] = [x.username for x in operation.members]
        elif isinstance(operation, Dict):
            data['name'] = operation['name']
            if 'admin' in operation:
                data['admin'] = operation['admin']['username']
            if 'add_members' in operation:
                data['members'] = [x['username'] for x in operation['members']]
        else:
            raise ValueError("operation must be Operation or Dict")
        url = "{}{}:{}/api/v{}/operations".format(self._http, self._server_ip, self._server_port, self._server_api_version)
        resp = await self.post_json(url, data=data)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to be an object
            resp.response = Operation(**resp.response)
        return resp

    async def update_operation(self, operation: Union[Operation, Dict]):
        """
        Update an operation
        :param operation:
            if using Operation class, the following must be set:
                name
            if using Operation class, the following can be set:
                admin
                add_members
                remove_members
                complete
        :return:
        """
        data = {}
        if isinstance(operation, Operation):
            if operation.admin is not None:
                data['admin'] = operation.admin.username
            if operation.add_members is not None:
                data['add_members'] = [o.username for o in operation.add_members]
            if operation.remove_members is not None:
                data['remove_members'] = [o.username for o in operation.remove_members]
            if operation.complete is not None:
                data['complete'] = operation.complete
        elif isinstance(operation, Dict):
            if 'admin' in operation:
                data['admin'] = operation['admin']['username']
            if 'add_members' in operation:
                data['add_members'] = [o['username'] for o in operation['add_members']]
            if 'remove_members' in operation:
                data['remove_members'] = [o['username'] for o in operation['remove_members']]
            if 'complete' in operation:
                data['complete'] = operation['complete']
        else:
            raise ValueError("operation must be Operation or Dict")
        url = "{}{}:{}/api/v{}/operations/{}".format(self._http, self._server_ip, self._server_port, self._server_api_version,
                                                  str(operation.name if isinstance(operation, Operation) else operation['name']))
        resp = await self.put_json(url, data=data)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to be an object
            resp.response = Operation(**resp.response)
        return resp

    async def remove_operation(self, operation: Union[Operation, Dict]):
        """
        Remove the operation. This will remove all associated data in the database as well!
        :param operation:
            if using Operation class, the following must be set:
                name
        :return:
        """
        url = "{}{}:{}/api/v{}/operations/{}".format(self._http, self._server_ip, self._server_port, self._server_api_version,
                                                  str(operation.name if isinstance(operation, Operation) else operation['name']))
        resp = await self.delete_json(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to ben an object
            resp.response = Operation(**resp.response)
        return resp

    # ================== OPERATOR ENDPOINTS ======================

    async def get_operators(self):
        """
        Gets all operators registed in Apfell
        :return:
        """
        url = "{}{}:{}/api/v{}/operators".format(self._http, self.server_ip, self._server_port, self._server_api_version)
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Operator(**x) for x in resp.response]
        return resp

    async def create_operator(self, operator: Union[Operator, Dict]):
        """
        Create a new operator
        :param operator:
            if using Operator class, the following must be set:
                username
                password
        :return:
        """
        if isinstance(operator, Operator):
            data = await json_apfell_obj(operator)
        else:
            data = operator
        url = "{}{}:{}/api/v{}/operators".format(self._http, self._server_ip, self._server_port, self._server_api_version)
        resp = await self.post_json(url, data=data)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to be an object
            resp.response = Operator(**resp.response)
        return resp

    async def update_operator(self, operator: Union[Operator, Dict]):
        """
        Update an operator
        :param operator:
            if using Operator class, the following must be set:
                username
            if using Operator class, the following can be set:
                current_operation
                ui_config
                active
                admin
        :return:
        """
        data = {}
        if isinstance(operator, Operator):
            if operator.current_operation is not None:
                data['current_operation'] = operator.current_operation.name
            if operator.ui_config is not None:
                data['ui_config'] = operator.ui_config
            if operator.active is not None:
                data['active'] = operator.active
            if operator.admin is not None:
                data['admin'] = operator.admin
        elif isinstance(operator, Dict):
            if 'current_operation' in operator:
                data['current_operation'] = operator['current_operation']['name']
            if 'ui_config' in operator:
                data['ui_config'] = operator['ui_config']
            if 'active' in operator:
                data['active'] = operator['active']
            if 'admin' in operator:
                data['admin'] = operator['admin']
        else:
            raise ValueError("operator must be Operator or Dict")

        url = "{}{}:{}/api/v{}/operators/{}".format(self._http, self._server_ip, self._server_port, self._server_api_version,
                                                  str(operator.username if isinstance(operator, Operator) else operator['username']))
        resp = await self.put_json(url, data=data)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to be an object
            resp.response = Operator(**resp.response)
        return resp

    async def remove_operator(self, operator: Union[Operator, Dict]):
        """
        Delete an operator
        :param operator:
            if using Operator class, the following must be set:
                username
        :return:
        """
        url = "{}{}:{}/api/v{}/operators/{}".format(self._http, self._server_ip, self._server_port, self._server_api_version,
                                                  str(operator.username if isinstance(operator, Operator) else operator['username']))
        resp = await self.delete_json(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to ben an object
            resp.response = Operator(**resp.response)
        return resp

    # ================= PAYLOAD ENDPOINTS =======================

    async def get_payloads(self):
        """
        Get all the payloads for the current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/payloads/current_operation".format(self._http, self.server_ip, self._server_port, self._server_api_version)
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Payload(**x) for x in resp.response]
        return resp

    async def remove_payload(self, payload: Union[Payload, Dict]):
        """
        Mark a payload as deleted in the database and remove it from disk
        Truly removing it from the database would delete any corresponding tasks/callbacks, so we don't do that
        :param payload:
        :return:
        """
        url = "{}{}:{}/api/v{}/payloads/{}/{}".format(self._http, self._server_ip, self._server_port, self._server_api_version,
                                                  str(payload.uuid if isinstance(payload, Payload) else payload['uuid']), 1)
        resp = await self.delete_json(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to ben an object
            resp.response = Payload(**resp.response)
        return resp

    async def create_payload(self, payload: Payload):
        """
        :param payload:
            the following must be set:
                payload_type: PayloadType with ptype set
                c2_profile: C2Profile with name set
                c2_profile_parameters_instance: C2ProfileParameters with name and value or hint set
            the following can be set:
                tag
                location (filename essentially)
        :return:
        """
        data = {}
        if payload.tag is not None:
            data['tag'] = payload.tag
        data['payload_type'] = payload.payload_type.ptype
        data['c2_profile'] = payload.c2_profile.name
        if payload.commands is not None:
            data['commands'] = [x.cmd for x in payload.commands]
        if payload.location is not None:
            data['location'] = payload.location
        data['c2_profile_parameters'] = {value.name: value.value if value.value is not None else value.hint for value in payload.c2_profile_parameters_instance}
        url = "{}{}:{}/api/v{}/payloads/create".format(self._http, self._server_ip, self._server_port, self._server_api_version)
        resp = await self.post_json(url, data=data)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to be an object
            # this will be a very basic payload with just the payload UUID
            resp.response = Payload(**resp.response)
        return resp

    async def get_payload_info(self, payload: Union[Payload, Dict]):
        """
        Get information about a specific payload
        :param payload:
            if using the Payload class, the following must be set:
                uuid
        :return:
        """
        url = "{}{}:{}/api/v{}/payloads/{}".format(self._http, self.server_ip, self._server_port,
                                                  self._server_api_version, str(payload.uuid if isinstance(payload, Payload) else payload['uuid']))
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to ben an object
            resp.response = Payload(**resp.response)
        return resp

    async def download_payload(self, payload: Union[Payload, Dict]):
        """
        Get the final payload for a specified payload
        :param payload:
            if using Payload class, the following must be set:
                uuid
        :return:
        """
        url = "{}{}:{}/api/v{}/payloads/download/{}".format(self._http, self.server_ip, self._server_port,
                                                          self._server_api_version, str(payload.uuid if isinstance(payload, Payload) else payload['uuid']))
        resp = await self.get_file(url)
        if resp.response_code == 200 and resp.status == 'success':
            # update the response to ben an object
            resp.response = resp.response['file']
        return resp

    # ================ C2 PROFILE ENDPOINTS ======================

    async def get_c2profile_parameters(self, c2_profile: Union[C2Profile, Dict]):
        """
        Get the parameters for a specific c2 profile
        :param c2_profile:
            if using the C2Profile class, the following must be set:
                name
        :return:
        """
        url = "{}{}:{}/api/v{}/c2profiles/{}/parameters".format(self._http, self.server_ip, self._server_port,
                                                              self._server_api_version, c2_profile.name if isinstance(c2_profile, C2Profile) else c2_profile['name'])
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [C2ProfileParameters(**x) for x in resp.response['c2profileparameters']]
        return resp

    async def get_c2profiles(self):
        """
        Get all c2 profiles registered in Apfell
        :return:
        """
        url = "{}{}:{}/api/v{}/c2profiles/".format(self._http, self.server_ip, self._server_port,
                                                 self._server_api_version)
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [C2Profile(**x) for x in resp.response]
        return resp

    # ================ PAYLOAD TYPE ENDPOINTS ====================

    async def get_payloadtypes(self):
        """
        Get all payload types registered with Apfell
        :return:
        """
        url = "{}{}:{}/api/v{}/payloadtypes/".format(self._http, self.server_ip, self._server_port,
                                                   self._server_api_version)
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [PayloadType(**x) for x in resp.response]
        return resp

    async def get_payloadtype(self, payload_type: Union[PayloadType, Dict]):
        """
        Get information about a specific payload type
        :param payload_type:
            if using PayloadType class, the following must be set:
                ptype
        :return:
        """
        url = "{}{}:{}/api/v{}/payloadtypes/{}".format(self._http, self.server_ip, self._server_port,
                                                   self._server_api_version, str(payload_type.ptype if isinstance(payload_type, PayloadType) else payload_type['ptype']))
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            # update the response with APIToken objects instead of just a dictionary
            resp.response = PayloadType(**resp.response)
        return resp

    async def get_payloadtype_commands(self, payload_type: Union[PayloadType, Dict]):
        """
        Get the commands registered for a specific payload type
        :param payload_type:
            if using PayloadType class, the following must be set:
                ptype
        :return:
        """
        url = "{}{}:{}/api/v{}/payloadtypes/{}/commands".format(self._http, self.server_ip, self._server_port,
                                                   self._server_api_version, str(payload_type.ptype if isinstance(payload_type, PayloadType) else payload_type['ptype']))
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            resp.response = [Command(**x) for x in resp.response['commands']]
        return resp

    # ================ TASKING ENDPOINTS ========================

    async def get_tasks(self):
        """
        Get all of the tasks associated with the user's current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/".format(self._http, self.server_ip, self._server_port,
                                                     self._server_api_version)
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Task(**x) for x in resp.response]
        return resp

    async def get_tasks_per_callback(self, callback: Union[Callback, Dict]):
        """
        Get the tasks (no responses) for a specific callback
        :param callback:
            if using the Callback class, the following must be set:
                id
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/callback/{}".format(self._http, self.server_ip, self._server_port,
                                              self._server_api_version, callback.id if isinstance(callback, Callback) else callback['id'])
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Task(**x) for x in resp.response]
        return resp

    async def get_task_and_responses(self, task: Union[Task, Dict]):
        """
        For the specified task, get all the responses
        :param task:
            if using the Task class, the following must be set:
                id
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/{}".format(self._http, self.server_ip, self._server_port,
                                              self._server_api_version, task.id if isinstance(task, Task) else task['id'])
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = {"callback": Callback(**resp.response['callback']),
                             "task": Task(**resp.response['task']),
                             "responses": [Response(**x) for x in resp.response['responses']]}
        return resp

    async def get_all_tasks_and_responses_by_callback(self):
        """
        Get all tasks and responses for all callbacks in the current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/task_report_by_callback".format(self._http, self.server_ip, self._server_port,
                                                self._server_api_version)
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Callback(**x) for x in resp.response['output']]
        return resp

    async def create_task(self, task: Union[Task, Dict]):
        """
        Create a new task for a callback
        :param task:
            if using the Task class, the following must be set:
                callback: id
                command: cmd
                params
            if using the Task class, the following can be set:
                test_command
                command: transforms: [active and parameter fields]
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/callback/{}".format(self._http, self.server_ip, self._server_port,
                                                               self._server_api_version, task.callback.id if isinstance(task, Task) else task['callback'])
        if isinstance(task, Task):
            data = {"command": task.command.cmd, "params": task.params}
            if task.test_command is not None:
                data['test_command'] = task.test_command
            if task.command.transforms is not None:
                data['transform_status'] = {x.order: x.active for x in task.command.transforms}
        else:
            data = task
        resp = await self.post_json(url, data=data)
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Task(**resp.response)
        return resp

    # ============= CUSTOM HELPER FUNCTIONS ======================

    async def login(self):
        """
        Login with username/password and store resulting access_token and refresh_token
        """
        url = "{}{}:{}/auth".format(self._http, self._server_ip, self._server_port)
        data = {"username": self.username, "password": self.password}
        resp = await self.post_json(url, data)
        if resp.response_code == 200:
            self._access_token = resp.response['access_token']
            self._refresh_token = resp.response['refresh_token']
        return resp

    async def set_or_create_apitoken(self, token_type="User"):
        """
        Use current auth to check if there are any user tokens. Either get one or create a new user one
        """
        resp = await self.get_apitokens()
        if resp.status == "success":
            for x in resp.response:
                if x.token_type == token_type:
                    self._apitoken = x
                    return resp
        # if we get here, then we don't have a token of the right type for us to just leverage, so we need to get one
        token_resp = await self.create_apitoken(token_type=token_type)
        if token_resp.response_code == 200:
            self._apitoken = token_resp.response
        return token_resp

    async def listen_for_all_callback_notifications(self, callback_id, callback_function=None):
        """
        Uses websockets to listen for all notifications related to a specific callback and prints to the screen.
        To stop listening, call cancel() on the result from this function call
        :param callback_id:
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/unified_callback/{}".format(self._ws, self._server_ip, self._server_port, str(callback_id))
        ws = await self.get_websocket(url)
        if callback_function:
            task = await self.stream_output(ws, callback_function)
        else:
            task = await self.stream_output(ws, self.print_websocket_output)
        return task
