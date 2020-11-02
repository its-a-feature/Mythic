import aiohttp
import asyncio
import json
import sys
from typing import Dict, List, Union
from time import time
import base64


async def json_print(thing):
    print(json.dumps(thing, indent=2, default=lambda o: o.to_json()))


async def obj_to_json(thing):
    return json.loads(json.dumps(thing, default=lambda o: o.to_json()))


class APIToken:
    def __init__(
        self,
        token_type: str = None,
        token_value: str = None,
        creation_time: str = None,
        active: bool = None,
        id: int = None,
        operator: Union["Operator", str] = None,
    ):
        self._token_type = token_type
        self._token_value = token_value
        self._creation_time = creation_time
        self._active = active
        self._id = id
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
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
    def operator(self) -> "Operator":
        return self._operator

    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)


class Operation:
    def __init__(
        self,
        name: str = None,
        admin: Union["Operator", str] = None,
        complete: bool = None,
        AESPSK: str = None,
        webhook: str = None,
        id: int = None,
        members: List[Union["Operator", Dict[str, str], str]] = None,
    ):
        self._name = name
        if isinstance(admin, Operator) or admin is None:
            self._admin = admin
        else:
            self._admin = Operator(username=admin)
        self._complete = complete
        self._AESPSK = AESPSK
        self._webhook = webhook
        self._id = id
        if members is not None:
            if isinstance(members, list):
                self._members = [
                    Operator(username=x) if isinstance(x, str) else Operator(**x) if isinstance(x, Dict) else x for x in members
                ]
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
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Operation):
            return self._name == other.name or (
                self._id is not None and other.id is not None and self._id == other.id
            )
        return False

    @property
    def name(self) -> str:
        return self._name

    @name.setter
    def name(self, name):
        self._name = name

    @property
    def admin(self) -> "Operator":
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
    def webhook(self) -> str:
        return self._webhook

    @webhook.setter
    def webhook(self, webhook):
        self._webhook = webhook

    @property
    def members(self) -> List["Operator"]:
        return self._members

    @members.setter
    def members(self, members):
        if members is not None:
            if isinstance(members, list):
                self._members = [
                    Operator(username=x) if isinstance(x, str) else Operator(**x) if isinstance(x, Dict) else x for x in members
                ]
            else:
                raise ValueError("members must be a list")
        else:
            self._members = members


class Operator:
    def __init__(
        self,
        username: str = None,
        password: str = None,
        admin: bool = None,
        creation_time: str = None,
        last_login: str = None,
        active: bool = None,
        current_operation: Union[Operation, str] = None,
        current_operation_id: int = None,
        ui_config: str = None,
        id: int = None,
        view_utc_time: bool = None,
        deleted: bool = None,
        view_mode: str = None,
        base_disabled_commands: str = None,
    ):
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
        self._view_utc_time = view_utc_time
        self._deleted = deleted
        if self._current_operation is not None:
            self._current_operation.id = current_operation_id
        if view_mode in ["spectator", "operator", "developer", None]:
            self._view_mode = view_mode
        else:
            raise Exception("Bad value for view_mode")
        self._base_disabled_commands = base_disabled_commands

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Operator):
            return self._username == other.username or (
                self._id is not None and other.id is not None and self._id == other.id
            )
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

    @property
    def view_utc_time(self) -> bool:
        return self._view_utc_time

    @view_utc_time.setter
    def view_utc_time(self, view_utc_time):
        self._view_utc_time = view_utc_time

    @property
    def deleted(self) -> bool:
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted

    @property
    def view_mode(self) -> str:
        return self._view_mode

    @view_mode.setter
    def view_mode(self, view_mode):
        if view_mode in ["spectator", "operator", "developer", None]:
            self._view_mode = view_mode
        else:
            raise Exception("Bad value for view_mode")

    @property
    def base_disabled_commands(self) -> str:
        return self._base_disabled_commands

    @base_disabled_commands.setter
    def base_disabled_commands(self, base_disabled_commands):
        self._base_disabled_commands = base_disabled_commands


class PayloadType:
    def __init__(
        self,
        ptype: str = None,
        creation_time: str = None,
        file_extension: str = None,
        wrapper: bool = None,
        wrapped: Union["PayloadType", str] = None,
        supported_os: str = None,
        last_heartbeat: str = None,
        container_running: bool = None,
        service: str = None,
        author: str = None,
        note: str = None,
        supports_dynamic_loading: bool = None,
        deleted: bool = None,
        build_parameters: List[Dict] = None,
        id: int = None,
        c2_profiles: List[Union["C2Profile", Dict]] = None,
        commands: List[Union["Command", str, Dict]] = None,
    ):
        self._ptype = ptype
        self._creation_time = creation_time
        self._file_extension = file_extension
        self._wrapper = wrapper
        if isinstance(wrapped, PayloadType) or wrapped is None:
            self._wrapped = wrapped
        else:
            self._wrapped_ = PayloadType(ptype=wrapped)
        self._supported_os = supported_os
        self._last_heartbeat = last_heartbeat
        self._container_running = container_running
        self._service = service
        self._id = id
        self._author = author
        self._note = note
        self._build_parameters = build_parameters
        self._supports_dynamic_loading = supports_dynamic_loading
        self._deleted = deleted
        if isinstance(c2_profiles, List):
            self._c2_profiles = [
                C2Profile(**x) if isinstance(x, Dict) else x for x in c2_profiles
            ]
        else:
            self._c2_profiles = c2_profiles
        if isinstance(commands, List):
            self._commands = [
                Command(**x)
                if isinstance(x, Dict)
                else Command(cmd=x)
                if isinstance(x, str)
                else x
                for x in commands
            ]
        else:
            self._commands = commands

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, PayloadType):
            return self._ptype == other.ptype or (
                self._id is not None and other.id is not None and self._id == other.id
            )
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
    def wrapped(self) -> "PayloadType":
        return self._wrapped

    @wrapped.setter
    def wrapped(self, wrapped):
        if isinstance(wrapped, PayloadType) or wrapped is None:
            self._wrapped = wrapped
        else:
            self._wrapped_ = PayloadType(ptype=wrapped)

    @property
    def supported_os(self) -> str:
        return self._supported_os

    @supported_os.setter
    def supported_os(self, supported_os):
        self._supported_os = supported_os

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

    @property
    def author(self) -> str:
        return self._author

    @author.setter
    def author(self, author):
        self._author = author

    @property
    def note(self) -> str:
        return self._note

    @note.setter
    def note(self, note):
        self._note = note

    @property
    def supports_dynamic_loading(self) -> bool:
        return self._supports_dynamic_loading

    @supports_dynamic_loading.setter
    def supports_dynamic_loading(self, supports_dynamic_loading):
        self._supports_dynamic_loading = supports_dynamic_loading

    @property
    def deleted(self) -> bool:
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted

    @property
    def build_parameters(self) -> List[Dict]:
        return self._build_parameters

    @build_parameters.setter
    def build_parameters(self, build_parameters):
        self._build_parameters = build_parameters

    @property
    def c2_profiles(self) -> List["C2Profile"]:
        return self._c2_profiles

    @c2_profiles.setter
    def c2_profiles(self, c2_profiles):
        if isinstance(c2_profiles, List):
            self._c2_profiles = [
                C2Profile(**x) if isinstance(x, Dict) else x for x in c2_profiles
            ]
        else:
            self._c2_profiles = c2_profiles

    @property
    def commands(self) -> List["Command"]:
        return self._commands

    @commands.setter
    def commands(self, commands):
        if isinstance(commands, List):
            self._commands = [
                Command(**x)
                if isinstance(x, Dict)
                else Command(cmd=x)
                if isinstance(x, str)
                else x
                for x in commands
            ]
        else:
            self._commands = commands


class Command:
    def __init__(
        self,
        needs_admin: bool = None,
        help_cmd: str = None,
        description: str = None,
        cmd: str = None,
        payload_type: Union[PayloadType, str] = None,
        creation_time: str = None,
        version: int = None,
        is_exit: bool = None,
        is_file_browse: bool = None,
        is_process_list: bool = None,
        is_download_file: bool = None,
        is_remove_file: bool = None,
        is_upload_file: bool = None,
        author: str = None,
        mythic_version: int = None,
        deleted: bool = None,
        id: int = None,
        params: List[Union["CommandParameters", Dict[str, str]]] = None,
    ):
        self._needs_admin = needs_admin
        self._help_cmd = help_cmd
        self._description = description
        self._cmd = cmd
        if isinstance(payload_type, PayloadType) or payload_type is None:
            self._payload_type = payload_type
        else:
            self._payload_type = PayloadType(ptype=payload_type)
        self._creation_time = creation_time
        self._version = version
        self._is_exit = is_exit
        self._is_file_browse = is_file_browse
        self._is_process_list = is_process_list
        self._is_download_file = is_download_file
        self._is_remove_file = is_remove_file
        self._is_upload_file = is_upload_file
        self._author = author
        self._delted = deleted
        self._mythic_version = mythic_version
        self._id = id
        if params is not None and params != []:
            if isinstance(params, list):
                self._params = [
                    CommandParameters(**x) if isinstance(x, Dict) else x for x in params
                ]
            else:
                raise ValueError("params must be a list")
        else:
            self._params = None

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Command):
            return (
                self._cmd == other.cmd
                and self._payload_type.ptype == other.payload_type.ptype
            ) or (
                self._id is not None and other.id is not None and self._id == other.id
            )
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
    def is_file_browse(self) -> bool:
        return self._is_file_browse

    @is_file_browse.setter
    def is_file_browse(self, is_file_browse):
        self._is_file_browse = is_file_browse

    @property
    def is_process_list(self) -> bool:
        return self._is_process_list

    @is_process_list.setter
    def is_process_list(self, is_process_list):
        self._is_process_list = is_process_list

    @property
    def is_download_file(self) -> bool:
        return self._is_download_file

    @is_download_file.setter
    def is_download_file(self, is_download_file):
        self._is_download_file = is_download_file

    @property
    def is_remove_file(self) -> bool:
        return self._is_remove_file

    @is_remove_file.setter
    def is_remove_file(self, is_remove_file):
        self._is_remove_file = is_remove_file

    @property
    def is_upload_file(self) -> bool:
        return self._is_upload_file

    @is_upload_file.setter
    def is_upload_file(self, is_upload_file):
        self._is_upload_file = is_upload_file

    @property
    def deleted(self) -> bool:
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted

    @property
    def author(self) -> str:
        return self._author

    @author.setter
    def author(self, author):
        self._author = author

    @property
    def mythic_version(self) -> int:
        return self._mythic_version

    @mythic_version.setter
    def mythic_version(self, mythic_version):
        self._mythic_version = mythic_version

    @property
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def params(self) -> List["CommandParameters"]:
        return self._params

    @params.setter
    def params(self, params):
        if isinstance(params, list):
            self._params = [
                CommandParameters(**x) if isinstance(x, Dict) else x for x in params
            ]
        elif params is None or params == []:
            self._params = None
        else:
            raise ValueError("params must be a list")


class CommandParameters:
    def __init__(
        self,
        command: Union[
            Command, int
        ] = None,  # database ID for the corresponding command
        cmd: str = None,  # cmd string the command refers to (like shell)
        payload_type: Union[PayloadType, str] = None,
        name: str = None,
        type: str = None,
        default_value: str = None,
        description: str = None,
        supported_agents: str = None,
        choices: Union[List[str], str] = None,
        required: bool = None,
        id: int = None,
    ):
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
        self._description = description
        self._supported_agents = supported_agents
        self._default_value = default_value
        if isinstance(choices, List) or choices is None:
            self._choices = choices
        else:
            self._choices = choices.split("\n")
        self._required = required
        self._id = id

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, CommandParameters):
            return (
                self._name == other.name
                and (self._command == other.command)
                or (self._cmd == other.cmd)
            ) or (
                self._id is not None and other.id is not None and self._id == other.id
            )
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
    def description(self) -> str:
        return self._description

    @description.setter
    def description(self, description):
        self._description = description

    @property
    def supported_agents(self) -> str:
        return self._supported_agents

    @supported_agents.setter
    def supported_agents(self, supported_agents):
        self._supported_agents = supported_agents

    @property
    def default_value(self) -> str:
        return self._default_value

    @default_value.setter
    def default_value(self, default_value):
        self._default_value = default_value

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


class C2Profile:
    def __init__(
        self,
        name: str = None,
        description: str = None,
        creation_time: str = None,
        running: bool = None,
        last_heartbeat: str = None,
        container_running: bool = None,
        author: str = None,
        is_p2p: bool = None,
        is_server_routed: bool = None,
        mythic_encrypts: bool = None,
        deleted: bool = None,
        id: int = None,
        ptype: List[Union[PayloadType, str]] = None,
        parameters: Dict = None,
    ):  # list of payload types that support this c2 profile
        self._name = name
        self._description = description
        self._creation_time = creation_time
        self._running = running
        self._last_heartbeat = last_heartbeat
        self._container_running = container_running
        self._id = id
        self._author = author
        self._is_p2p = is_p2p
        self._is_server_routed = is_server_routed
        self._mythic_encrypts = mythic_encrypts
        self._deleted = deleted
        if ptype is not None:
            if isinstance(ptype, list):
                self._ptype = [
                    PayloadType(ptype=x) if isinstance(x, str) else x for x in ptype
                ]
            else:
                raise ValueError("ptype must be a list")
        else:
            self._ptype = ptype
        self._parameters = parameters

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, C2Profile):
            return self._name == other.name or (
                self._id is not None and other.id is not None and self._id == other.id
            )
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
            self._ptype = [
                PayloadType(ptype=x) if isinstance(x, str) else x for x in ptype
            ]
        elif ptype is None:
            self._ptype = ptype
        else:
            raise ValueError("ptype must be a list")

    @property
    def author(self) -> str:
        return self._author

    @author.setter
    def author(self, author):
        self._author = author

    @property
    def is_p2p(self) -> bool:
        return self._is_p2p

    @is_p2p.setter
    def is_p2p(self, is_p2p):
        self._is_p2p = is_p2p

    @property
    def is_server_routed(self) -> bool:
        return self._iis_server_routed

    @is_server_routed.setter
    def is_server_routed(self, is_server_routed):
        self._is_server_routed = is_server_routed

    @property
    def mythic_encrypts(self) -> bool:
        return self._mythic_encrypts

    @mythic_encrypts.setter
    def is_server_routed(self, mythic_encrypts):
        self._mythic_encrypts = mythic_encrypts

    @property
    def deleted(self) -> bool:
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted
    @property
    def parameters(self) -> Dict:
        return self._parameters

    @parameters.setter
    def parameters(self, parameters):
        self._parameters = parameters


class C2ProfileParameters:
    """
    This class combines C2ProfileParameters and C2ProfileParametersInstance
    """

    def __init__(
        self,
        c2_profile: Union[C2Profile, str] = None,
        name: str = None,
        default_value: any = None,
        required: bool = None,
        verifier_regex: str = None,
        randomize: bool = None,
        parameter_type: str = None,
        description: str = None,
        id: int = None,
        value: any = None,
        instance_name: str = None,
        operation: Union[Operation, str] = None,
        callback: Union["Callback", int] = None,
        payload: Union["Payload", str] = None,
    ):
        if isinstance(c2_profile, C2Profile) or c2_profile is None:
            self._c2_profile = c2_profile
        else:
            self._c2_profile = C2Profile(name=c2_profile)
        self._name = name
        self._default_value = default_value
        self._required = required
        self._verifier_regex = verifier_regex
        self._parameter_type = parameter_type
        self._description = description
        self._instance_name = instance_name
        self._value = value
        self._randomize = randomize
        self._id = id
        if isinstance(payload, Payload) or payload is None:
            self._payload = payload
        else:
            self._payload = Payload(uuid=payload)
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
        if isinstance(callback, Callback) or callback is None:
            self._callback = callback
        else:
            self._callback = Callback(id=callback)

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
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
    def verifier_regex(self) -> str:
        return self._verifier_regex

    @verifier_regex.setter
    def verifier_regex(self, verifier_regex):
        self._verifier_regex = verifier_regex

    @property
    def parameter_type(self) -> str:
        return self._parameter_type

    @parameter_type.setter
    def parameter_type(self, parameter_type):
        self._parameter_type = parameter_type

    @property
    def description(self) -> str:
        return self._description

    @description.setter
    def description(self, description):
        self._description = description

    @property
    def instance_name(self) -> str:
        return self._instance_name

    @instance_name.setter
    def instance_name(self, instance_name):
        self._instance_name = instance_name

    @property
    def default_value(self) -> any:
        return self._default_value

    @default_value.setter
    def default_value(self, default_value):
        self._default_value = default_value

    @property
    def required(self) -> bool:
        return self._required

    @required.setter
    def required(self, required):
        self._required = required

    @property
    def randomize(self) -> bool:
        return self._randomize

    @randomize.setter
    def randomize(self, randomize):
        self._randomize = randomize

    @property
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def value(self) -> any:
        return self._value

    @value.setter
    def value(self, value):
        self._value = value

    @property
    def payload(self) -> "Payload":
        return self._payload

    @payload.setter
    def payload(self, payload):
        if isinstance(payload, Payload) or payload is None:
            self._payload = payload
        else:
            self._payload = Payload(uuid=payload)

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
    def callback(self) -> "Callback":
        return self._callback

    @callback.setter
    def callback(self, callback):
        if isinstance(callback, Callback) or callback is None:
            self._callback = callback
        else:
            self._callback = Callback(id=callback)


class Callback:
    def __init__(
        self,
        init_callback: str = None,
        last_checkin: str = None,
        user: str = None,
        host: str = None,
        pid: int = None,
        ip: str = None,
        os: str = None,
        domain: str = None,
        architecture: str = None,
        description: str = None,
        operator: Union[Operator, str] = None,
        active: bool = None,
        port: int = None,
        socks_task: int = None,
        pcallback: Union["Callback", int] = None,
        registered_payload: str = None,  # corresponding payload's UUID
        payload_type: Union[PayloadType, str] = None,  # corresponding payload's type
        c2_profile: Union[C2Profile, str] = None,  # corresponding payload's c2 profile
        payload_description: str = None,  # corresponding payload's description
        integrity_level: int = None,
        operation: Union[Operation, str] = None,
        encryption_type: str = None,
        decryption_key: str = None,
        encryption_key: str = None,
        locked: bool = None,
        locked_operator: str = None,
        tasks: List[Union["Task", Dict]] = None,
        id: int = None,
        agent_callback_id: str = None,
        extra_info: str = None,
        sleep_info: str = None,
        external_ip: str = None,
        payload_type_id: int = None,
        supported_profiles: List[Union[C2Profile, Dict]] = None,
    ):
        self._init_callback = init_callback
        self._last_checkin = last_checkin
        self._user = user
        self._host = host
        self._pid = pid
        self._ip = ip
        self._port = port
        self._socks_task = socks_task
        self._domain = domain
        self._description = description
        self._agent_callback_id = agent_callback_id
        self._external_ip = external_ip
        self._payload_type_id = payload_type_id
        self._locked_operator = locked_operator
        self._os = os
        self._architecture = architecture
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._active = active
        if isinstance(pcallback, Callback) or pcallback is None:
            self._pcallback = pcallback
        elif pcallback == "null":
            self._pcallback = None
        else:
            self._pcallback = Callback(id=pcallback)
        if registered_payload is None:
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
        if supported_profiles is None:
            self._supported_profiles = supported_profiles
        else:
            self._supported_profiles = [x if isinstance(x, C2Profile) else C2Profile(**x) for x in supported_profiles]

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
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
    def pcallback(self) -> "Callback":
        return self._pcallback

    @pcallback.setter
    def pcallback(self, pcallback):
        if isinstance(pcallback, Callback) or pcallback is None:
            self._pcallback = pcallback
        elif pcallback == "null":
            self._pcallback = None
        else:
            self._pcallback = Callback(id=pcallback)

    @property
    def registered_payload(self) -> "Payload":
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
    def tasks(self) -> List["Task"]:
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

    @property
    def supported_profiles(self) -> List[C2Profile]:
        return self._supported_profiles

    @supported_profiles.setter
    def supported_profiles(self, supported_profiles):
        if supported_profiles is None:
            self._supported_profiles = supported_profiles
        else:
            self._supported_profiles = [x if isinstance(x, C2Profile) else C2Profile(**x) for x in supported_profiles]


class TaskFile:
    def __init__(self, content: Union[bytes, str], filename: str, param_name: str):
        self._filename = filename
        if isinstance(content, bytes):
            self._content = content
        else:
            self._content = base64.b64decode(content)
        self._param_name = param_name

    @property
    def filename(self):
        return self._filename

    @filename.setter
    def filename(self, filename):
        self._filename = filename

    @property
    def param_name(self):
        return self._param_name

    @param_name.setter
    def param_name(self, param_name):
        self._param_name = param_name

    @property
    def content(self):
        return self._content

    @content.setter
    def content(self, content):
        if isinstance(content, bytes):
            self._content = content
        else:
            self._content = base64.b64decode(content)

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())


class Task:
    def __init__(
        self,
        command: Union[Command, str] = None,
        agent_task_id: str = None,
        command_id: str = None,
        params: str = None,
        files: List[TaskFile] = None,
        timestamp: str = None,
        callback: Union[Callback, int, Dict] = None,
        operator: Union[Operator, str] = None,
        status: str = None,
        task_status: str = None,  # sometimes this is set to not conflict with overall status message
        original_params: str = None,
        comment: str = None,
        comment_operator: Union[Operator, str] = None,
        completed: bool = None,
        id: int = None,
        status_timestamp_preprocessing: str = None,
        status_timestamp_processed: str = None,
        status_timestamp_submitted: str = None,
        status_timestamp_processing: str = None,
        operation: str = None,
        responses: List[Union["Response", Dict]] = None,
    ):
        if isinstance(command, Command) or command is None:
            self._command = command
        else:
            self._command = Command(cmd=command)
        self.params = params
        self.timestamp = timestamp
        self.agent_task_id = agent_task_id
        self.command_id = command_id
        self.status_timestamp_preprocessing = status_timestamp_preprocessing
        self.status_timestamp_processed = status_timestamp_processed
        self.status_timestamp_submitted = status_timestamp_submitted
        self.status_timestamp_processing = status_timestamp_processing
        self.operation = operation
        self.completed = completed
        if isinstance(callback, Callback) or callback is None:
            self._callback = callback
        elif isinstance(callback, Dict):
            self._callback = Callback(**callback)
        else:
            self._callback = Callback(id=callback)
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self.status = status
        self._original_params = original_params
        if comment == "":
            self._comment = None
        else:
            self._comment = comment
        if isinstance(comment_operator, Operator) or comment_operator is None:
            self._comment_operator = comment_operator
        elif comment_operator == "null":
            self._comment_operator = None
        else:
            self._comment_operator = Operator(username=comment_operator)
        self._id = id
        if isinstance(responses, List):
            self._responses = [
                Response(**x) if isinstance(x, Dict) else x for x in responses
            ]
        elif responses is None:
            self._responses = responses
        else:
            self._responses = [
                Response(**responses)
                if isinstance(responses, Dict)
                else Response(response=responses)
            ]
        if self._status is None:
            self._status = task_status
        if isinstance(files, List):
            self._files = files
        elif isinstance(files, TaskFile):
            self._files = [files]
        elif files is None:
            self._files = None
        else:
            raise Exception("Invalid value for files parameter")

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
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
        if params is None:
            self._params = ""
        else:
            self._params = params

    @property
    def files(self) -> List[TaskFile]:
        return self._files

    @files.setter
    def files(self, files):
        if isinstance(files, List):
            self._files = files
        elif isinstance(files, TaskFile):
            self._files = [files]
        elif files is None:
            self._files = None
        else:
            raise Exception("Invalid value for files parameter")

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
        elif comment_operator == "null":
            self._comment_operator = None
        else:
            self._comment_operator = Operator(username=comment_operator)

    @property
    def responses(self) -> List["Response"]:
        return self._responses

    @responses.setter
    def responses(self, responses):
        if isinstance(responses, List):
            self._responses = [
                Response(**x) if isinstance(x, Dict) else x for x in responses
            ]
        elif responses is None:
            self._responses = responses
        else:
            self._responses = [
                Response(**responses)
                if isinstance(responses, Dict)
                else Response(response=responses)
            ]

    @property
    def id(self):
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def task_status(self) -> str:
        return self._status

    @task_status.setter
    def task_status(self, task_status):
        self._status = task_status

    @property
    def completed(self) -> bool:
        return self._completed

    @completed.setter
    def completed(self, completed):
        self._completed = completed


class Payload:
    def __init__(
        self,
        uuid: str = None,
        tag: str = None,
        operator: Union[Operator, str] = None,
        creation_time: str = None,
        payload_type: Union[PayloadType, str] = None,
        pcallback: Union["Callback", int] = None,
        c2_profiles: Dict[
            Union[C2Profile, str, Dict], List[Union[C2ProfileParameters, Dict]]
        ] = None,
        operation: Union[Operation, str] = None,
        wrapped_payload: Union["Payload", str] = None,
        deleted: bool = None,
        build_container: str = None,
        build_phase: str = None,
        build_message: str = None,
        callback_alert: bool = None,
        auto_generated: bool = None,
        task: Union[Task, Dict] = None,
        file_id: Union["FileMeta", Dict] = None,
        id: int = None,
        build_parameters: List[Dict] = None,
        commands: List = None,
        filename: str = None,
    ):
        self._uuid = uuid
        self._tag = tag
        self._build_container = build_container
        self._callback_alert = callback_alert
        self._auto_generated = auto_generated
        self._build_parameters = build_parameters
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
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
        if isinstance(task, Task) or task is None:
            self._task = task
        else:
            self._task = Task(**task)
        if isinstance(file_id, FileMeta) or file_id is None:
            self._file_id = file_id
        else:
            self._file_id = FileMeta(**file_id)
        if isinstance(wrapped_payload, Payload) or wrapped_payload is None:
            self._wrapped_payload = wrapped_payload
        else:
            self._wrapped_payload = Payload(uuid=wrapped_payload)
        self._deleted = deleted
        self._build_phase = build_phase
        self._build_message = build_message
        self._id = id
        if isinstance(commands, List) and len(commands) > 0:
            if isinstance(commands[0], Command):
                self._commands = commands
            elif isinstance(commands[0], Dict):
                self._commands = [Command(**x) for x in commands]
            else:
                self._commands = [Command(cmd=x) for x in commands]
        else:
            self._commands = None
        if isinstance(c2_profiles, Dict):
            self._c2_profiles = {}
            for k, v in c2_profiles.items():
                key = (
                    k["name"]
                    if isinstance(k, Dict)
                    else k.name
                    if isinstance(k, C2Profile)
                    else k
                )
                self._c2_profiles[key] = []
                for i in v:
                    # now iterate over each list of parameters for the profile
                    if isinstance(i, C2ProfileParameters):
                        self._c2_profiles[key].append(i)
                    elif isinstance(i, Dict):
                        self._c2_profiles[key].append(C2ProfileParameters(**i))
        else:
            self._c2_profiles = None
        self._filename = filename

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
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
    def pcallback(self) -> "Callback":
        return self._pcallback

    @pcallback.setter
    def pcallback(self, pcallback):
        if isinstance(pcallback, Callback) or pcallback is None:
            self._pcallback = pcallback
        else:
            self._pcallback = Callback(id=pcallback)

    @property
    def c2_profiles(self) -> Dict:
        return self._c2_profiles

    @c2_profiles.setter
    def c2_profiles(self, c2_profiles):
        if isinstance(c2_profiles, Dict):
            self._c2_profiles = {}
            for k, v in c2_profiles.items():
                key = (
                    k["name"]
                    if isinstance(k, Dict)
                    else k.name
                    if isinstance(k, C2Profile)
                    else k
                )
                self._c2_profiles[key] = []
                for i in v:
                    # now iterate over each list of parameters for the profile
                    if isinstance(i, C2ProfileParameters):
                        self._c2_profiles[key].append(i)
                    elif isinstance(i, Dict):
                        self._c2_profiles[key].append(C2ProfileParameters(**i))
        else:
            self._c2_profiles = None

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
    def wrapped_payload(self) -> "Payload":
        return self._wrapped_payload

    @wrapped_payload.setter
    def wrapped_payload(self, wrapped_payload):
        if isinstance(wrapped_payload, Payload) or wrapped_payload is None:
            self._wrapped_payload = wrapped_payload
        else:
            self._wrapped_payload = Payload(uuid=payload)

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
    def build_container(self) -> str:
        return self._build_container

    @build_container.setter
    def build_container(self, build_container):
        self._build_container = build_container

    @property
    def commands(self) -> List[Command]:
        return self._commands

    @commands.setter
    def commands(self, commands):
        if isinstance(commands, List):
            self._commands = [
                Command(**x) if isinstance(x, Dict) else x for x in commands
            ]
        else:
            self._commands = None

    @property
    def build_parameters(self) -> List[Dict]:
        return self._build_parameters

    @build_parameters.setter
    def build_parameters(self, build_parameters):
        self._build_parameters = build_parameters

    @property
    def file_id(self) -> "FileMeta":
        return self._file_id

    @file_id.setter
    def file_id(self, file_id):
        if isinstance(file_id, "FileMeta") or file_id is None:
            self._file_id = file_id
        else:
            self._file_id = FileMeta(**file_id)

    @property
    def filename(self) -> str:
        return self._filename

    @filename.setter
    def filename(self, filename):
        self._filename = filename


class FileMeta:
    def __init__(
        self,
        agent_file_id: str = None,
        total_chunks: int = None,
        chunks_received: int = None,
        chunk_size: int = None,
        task: Union[Task, Dict] = None,
        complete: bool = None,
        path: str = None,
        full_remote_path: str = None,
        host: str = None,
        is_payload: bool = None,
        is_screenshot: bool = None,
        is_download_from_agent: bool = None,
        file_browser: Dict = None,
        filename: str = None,
        delete_after_fetch: bool = None,
        operation: Union[Operation, str] = None,
        timestamp: str = None,
        deleted: bool = None,
        operator: Union[Operator, str] = None,
        md5: str = None,
        sha1: str = None,
        id: int = None,
        cmd: str = None,
        comment: str = None,
        upload: dict = None,
        params: dict = None,
    ):
        self._agent_file_id = agent_file_id
        self._total_chunks = total_chunks
        self._chunks_received = chunks_received
        self._chunk_size = chunk_size
        if isinstance(task, Task) or task is None:
            self._task = task
        else:
            self._task = Task(id=task)
        self._complete = complete
        self._path = path
        self._full_remote_path = full_remote_path
        self._host = host
        self._is_payload = is_payload
        self._is_screenshot = is_screenshot
        self._is_download_from_agent = is_download_from_agent
        self._file_browser = file_browser
        self._filename = filename
        self._delete_after_fetch = delete_after_fetch
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
        self._timestamp = timestamp
        self._deleted = deleted
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        self._md5 = md5
        self._sha1 = sha1
        self._id = id
        self._cmd = cmd
        self._comment = comment
        self._upload = upload
        self._params = params

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, FileMeta):
            return self._id == other.id
        return False

    @property
    def agent_file_id(self):
        return self._agent_file_id

    @agent_file_id.setter
    def total_chunks(self, agent_file_id):
        self._agent_file_id = agent_file_id

    @property
    def total_chunks(self):
        return self._total_chunks

    @total_chunks.setter
    def total_chunks(self, total_chunks):
        self._total_chunks = total_chunks

    @property
    def chunks_received(self):
        return self._chunks_received

    @chunks_received.setter
    def chunks_received(self, chunks_received):
        self._chunks_received = chunks_received

    @property
    def chunk_size(self):
        return self._chunk_size

    @chunk_size.setter
    def chunk_size(self, chunk_size):
        self._chunk_size = chunk_size

    @property
    def task(self):
        return self._task

    @task.setter
    def task(self, task):
        if isinstance(task, Task) or task is None:
            self._task = task
        else:
            self._task = Task(id=task)

    @property
    def complete(self):
        return self._complete

    @complete.setter
    def complete(self, complete):
        self._complete = complete

    @property
    def path(self):
        return self._path

    @path.setter
    def path(self, path):
        self._path = path

    @property
    def full_remote_path(self):
        return self._full_remote_path

    @full_remote_path.setter
    def full_remote_path(self, full_remote_path):
        self._full_remote_path = full_remote_path

    @property
    def host(self):
        return self._host

    @host.setter
    def host(self, host):
        self._host = host

    @property
    def is_payload(self):
        return self._is_payload

    @is_payload.setter
    def is_payload(self, is_payload):
        self._is_payload = is_payload

    @property
    def is_screenshot(self):
        return self._is_screenshot

    @is_screenshot.setter
    def is_screenshot(self, is_screenshot):
        self._is_screenshot = is_screenshot

    @property
    def is_download_from_agent(self):
        return self._is_download_from_agent

    @is_download_from_agent.setter
    def is_download_from_agent(self, is_download_from_agent):
        self._is_download_from_agent = is_download_from_agent

    @property
    def file_browser(self):
        return self._file_browser

    @file_browser.setter
    def file_browser(self, file_browser):
        self._file_browser = file_browser

    @property
    def filename(self):
        return self._filename

    @filename.setter
    def filename(self, filename):
        self._filename = filename

    @property
    def delete_after_fetch(self):
        return self._delete_after_fetch

    @delete_after_fetch.setter
    def delete_after_fetch(self, delete_after_fetch):
        self._delete_after_fetch = delete_after_fetch

    @property
    def operation(self):
        return self._operation

    @operation.setter
    def operation(self, operation):
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)

    @property
    def timestamp(self):
        return self._timestamp

    @timestamp.setter
    def timestamp(self, timestamp):
        self._timestamp = timestamp

    @property
    def deleted(self):
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted

    @property
    def operator(self):
        return self._operator

    @operator.setter
    def operator(self, operator):
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)

    @property
    def md5(self):
        return self._md5

    @md5.setter
    def md5(self, md5):
        self._md5 = md5

    @property
    def sha1(self):
        return self._sha1

    @sha1.setter
    def sha1(self, sha1):
        self._sha1 = sha1

    @property
    def id(self):
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def cmd(self):
        return self._cmd

    @cmd.setter
    def cmd(self, cmd):
        self._cmd = cmd

    @property
    def comment(self):
        return self._comment

    @comment.setter
    def comment(self, comment):
        self._comment = comment

    @property
    def upload(self):
        return self._upload

    @upload.setter
    def upload(self, upload):
        self._upload = upload

    @property
    def params(self):
        return self._params

    @params.setter
    def params(self, params):
        self._params = params


class Response:
    def __init__(
        self,
        response: str = None,
        timestamp: str = None,
        task: Union[Task, int, Dict] = None,  # JSON string of the corresponding task
        id: int = None,
    ):
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
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
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


class Credential:
    def __init__(
        self,
        type: str = None,
        task: Union[Task, int] = None,
        task_command: Union[Command, str] = None,
        account: str = None,
        realm: str = None,
        id: int = None,
        operator: Union[Operator, str] = None,
        operation: Union[Operation, str] = None,
        timestamp: str = None,
        credential: bytes = None,
        comment: str = None,
        deleted: bool = None,
        new: bool = None,
    ):
        self._type = type
        if isinstance(task, Task) or task is None:
            self._task = task
        else:
            self._task = Task(id=task)
        if isinstance(task_command, Command) or task_command is None:
            self._task_command = task_command
        else:
            self._task_command = Command(cmd=task_command)
        self._account = account
        self._realm = realm
        self._id = id
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
        self._timestamp = timestamp
        self._credential = credential
        self._comment = comment
        self._deleted = deleted
        self._new = new

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Credential):
            return self._id == other.id
        return False

    @property
    def type(self) -> str:
        return self._type

    @type.setter
    def type(self, type):
        self._type = type

    @property
    def task(self) -> Task:
        return self._task

    @task.setter
    def task(self, task):
        if isinstance(task, Task) or task is None:
            self._task = task
        else:
            self._task = Task(id=task)

    @property
    def task_command(self) -> Command:
        return self._task_command

    @task_command.setter
    def task_command(self, task_command):
        if isinstance(task_command, Command) or task_command is None:
            self._task_command = task_command
        else:
            self._task_command = Command(cmd=task_command)

    @property
    def account(self) -> str:
        return self._account

    @account.setter
    def account(self, account):
        self._account = account

    @property
    def realm(self) -> str:
        return self._realm

    @realm.setter
    def realm(self, realm):
        self._realm = realm

    @property
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

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
    def operation(self) -> Operation:
        return self._operation

    @operation.setter
    def operation(self, operation):
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)

    @property
    def timestamp(self) -> str:
        return self._timestamp

    @timestamp.setter
    def timestamp(self, timestamp):
        self._timestamp = timestamp

    @property
    def credential(self) -> bytes:
        return self._credential

    @credential.setter
    def credential(self, credential):
        self._credential = credential

    @property
    def comment(self) -> str:
        return self._comment

    @comment.setter
    def comment(self, comment):
        self._comment = comment

    @property
    def deleted(self) -> bool:
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted

    @property
    def new(self) -> bool:
        return self._new

    @new.setter
    def new(self, new):
        self._new = new


class Keylog:
    def __init__(
        self,
        task: Union[Task, int] = None,
        keystrokes: bytes = None,
        window: str = None,
        timestamp: str = None,
        operation: Union[Operation, str] = None,
        user: str = None,
        host: str = None,
        id: int = None,
        callback: Union[Callback, Dict] = None,
    ):
        self._keystrokes = keystrokes
        self._window = window
        self._timestamp = timestamp
        self._user = user
        self._host = host
        if isinstance(task, Task) or task is None:
            self._task = task
        else:
            self._task = Task(id=int)
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)
        if isinstance(callback, Callback) or callback is None:
            self._callback = callback
        else:
            self._callback = Callback(**callback)

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, Keylog):
            return self._id == other.id

    @property
    def keystrokes(self) -> bytes:
        return self._keystrokes

    @keystrokes.setter
    def keystrokes(self, keystrokes):
        self._keystrokes = keystrokes

    @property
    def window(self) -> str:
        return self._window

    @window.setter
    def window(self, window):
        self._window = window

    @property
    def timestamp(self) -> str:
        return self._timestamp

    @timestamp.setter
    def timestamp(self, timestamp):
        self._timestamp = timestamp

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
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def task(self) -> Task:
        return self._task

    @task.setter
    def task(self, task):
        if isinstance(task, Task) or task is None:
            self._task = task
        else:
            self._task = Task(id=int)

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
    def callback(self) -> Callback:
        return self._callback

    @callback.setter
    def callback(self, callback):
        if isinstance(callback, Callback) or callback is None:
            self._callback = callback
        else:
            self._callback = Callback(**callback)


class DisabledCommandsProfile:
    def __init__(
        self,
        payload_types: List[Union[PayloadType, str, Dict]] = None,
        name: str = None,
    ):
        self._name = name
        if isinstance(payload_types, List):
            self._payload_types = [
                PayloadType(ptype=x)
                if isinstance(x, str)
                else PayloadType(**x)
                if isinstance(x, Dict)
                else x
                for x in payload_types
            ]
        else:
            self._payload_types = payload_types

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, DisabledCommandsProfile):
            return self._name == other.name

    @property
    def name(self) -> str:
        return self._name

    @name.setter
    def name(self, name):
        self._name = name

    @property
    def payload_types(self) -> List[PayloadType]:
        return self._payload_types

    @payload_types.setter
    def payload_types(self, payload_types):
        if isinstance(payload_types, List):
            self._payload_types = [
                PayloadType(ptype=x)
                if isinstance(x, str)
                else PayloadType(**x)
                if isinstance(x, Dict)
                else x
                for x in payload_types
            ]
        else:
            self._payload_types = payload_types


class EventMessage:
    def __init__(
        self,
        operator: Union[Operator, str] = None,
        timestamp: str = None,
        message: str = None,
        operation: Union[Operation, str] = None,
        level: str = None,
        deleted: bool = None,
        resolved: bool = None,
        id: int = None,
        channel: str = None,
        alerts: List[Dict] = None,
    ):
        self._timestamp = timestamp
        self._message = message
        self._level = level
        self._deleted = deleted
        self._resolved = resolved
        self._id = id
        self._channel = channel
        self._alerts = alerts
        if isinstance(operator, Operator) or operator is None:
            self._operator = operator
        else:
            self._operator = Operator(username=operator)
        if isinstance(operation, Operation) or operation is None:
            self._operation = operation
        else:
            self._operation = Operation(name=operation)

    def to_json(self):
        r = {}
        for k in vars(self):
            if getattr(self, k) is not None:
                try:
                    r[k[1:]] = getattr(self, k)
                except:
                    r[k[1:]] = json.dumps(
                        getattr(self, k), default=lambda o: o.to_json()
                    )
        return r

    def __str__(self):
        return json.dumps(self.to_json())

    def __eq__(self, other):
        """Overrides the default implementation"""
        if isinstance(other, EventMessage):
            return self._id == other.id

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
    def message(self) -> str:
        return self._message

    @message.setter
    def message(self, message):
        self._message = message

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
    def level(self) -> str:
        return self._level

    @level.setter
    def level(self, level):
        self._level = level

    @property
    def deleted(self) -> bool:
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted

    @property
    def resolved(self) -> bool:
        return self._resolved

    @resolved.setter
    def resolved(self, resolved):
        self._resolved = resolved

    @property
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, id):
        self._id = id

    @property
    def channel(self) -> str:
        return self._channel

    @channel.setter
    def channel(self, channel):
        self._channel = channel

    @property
    def alerts(self) -> List[Dict]:
        return self._alerts

    @alerts.setter
    def alerts(self, alerts):
        self._alerts = alerts


class MythicResponse:
    def __init__(
        self,
        response=None,
        raw_response: Dict[str, str] = None,
        response_code: int = None,
        status: str = None,
    ):
        # set the response_code and raw_response automatically
        self.response_code = response_code
        self.raw_response = raw_response
        # determine and set status if it's not explicitly specified
        if status is None and "status" in raw_response:
            self.status = raw_response["status"]
        elif status is None and self.response_code != 200:
            self.status = "error"
        else:
            self.status = status
        # if the raw_response has a status indicator, remove it and set the response
        #   otherwise just set response to raw_response and process later
        if "status" in raw_response and response is None:
            del raw_response["status"]
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


class Mythic:
    def __init__(
        self,
        username: str = None,
        password: str = None,
        apitoken: Union[APIToken, str] = None,
        access_token: str = None,
        refresh_token: str = None,
        server_ip: str = None,
        ssl: bool = False,
        server_port: str = None,
        server_api_version: int = 1.4,
        operator: Operator = None,
        global_timeout: int = None,
    ):
        self._username = username
        self._password = password
        if isinstance(apitoken, APIToken) or apitoken is None:
            self._apitoken = apitoken
        else:
            self._apitoken = APIToken(token_value=apitoken)
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
        self._global_timeout = global_timeout if global_timeout is not None else -1

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

    @property
    def global_timeout(self):
        return self._global_timeout

    # ========== SETTING INTERNAL VALUES ===============
    @username.setter
    def username(self, username=None):
        self._username = username

    @password.setter
    def password(self, password=None):
        self._password = password

    @apitoken.setter
    def apitoken(self, apitoken=None):
        if isinstance(apitoken, APIToken) or apitoken is None:
            self._apitoken = apitoken
        else:
            self._apitoken = APIToken(token_value=apitoken)

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

    def get_headers(self) -> dict:
        if self._apitoken is not None:
            return {"apitoken": self._apitoken.token_value}
        elif self._access_token is not None:
            return {"Authorization": "Bearer {}".format(self._access_token)}
        else:
            return {}

    async def get_json(self, url) -> MythicResponse:
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, ssl=False) as resp:
                    return MythicResponse(
                        response_code=resp.status, raw_response=await resp.json()
                    )
        except OSError as o:
            #print(o)
            return MythicResponse(
                response_code=0, raw_response={"status": "error", "error": str(o)}
            )
        except Exception as e:
            #print(e)
            return MythicResponse(
                response_code=0, raw_response={"status": "error", "error": str(e)}
            )

    async def get_file(self, url) -> bytes:
        headers = self.get_headers()
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, ssl=False) as resp:
                data = await resp.read()
                return data


    async def put_json(self, url, data) -> MythicResponse:
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.put(
                    url, json=data, headers=headers, ssl=False
                ) as resp:
                    return MythicResponse(
                        response_code=resp.status, raw_response=await resp.json()
                    )
        except OSError as o:
            return MythicResponse(
                response_code=0, raw_response={"status": "error", "error": str(o)}
            )
        except Exception as e:
            return MythicResponse(
                response_code=0, raw_response={"status": "error", "error": str(e)}
            )

    async def post_json(self, url, data) -> MythicResponse:
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=data, headers=headers, ssl=False
                ) as resp:
                    return MythicResponse(
                        response_code=resp.status, raw_response=await resp.json()
                    )
        except OSError as o:
            return MythicResponse(
                response_code=0, raw_response={"status": "error", "error": str(o)}
            )
        except Exception as e:
            return MythicResponse(
                response_code=0, raw_response={"status": "error", "error": str(e)}
            )

    async def delete_json(self, url) -> MythicResponse:
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.delete(url, headers=headers, ssl=False) as resp:
                    return MythicResponse(
                        response_code=resp.status, raw_response=await resp.json()
                    )
        except OSError as o:
            return MythicResponse(
                response_code=0, raw_response={"status": "error", "error": str(o)}
            )
        except Exception as e:
            return MythicResponse(
                response_code=0, raw_response={"status": "error", "error": str(e)}
            )

    # ======== WEBSOCKET BASED HELPER ENDPOINTS ========================

    async def print_websocket_output(self, mythic, data) -> None:
        try:
            await json_print(data)
        except Exception as e:
            raise Exception("Failed to decode json data: " + str(e))

    async def cast_data(self, data):
        try:
            json_data = json.loads(data)
            if "channel" in json_data:
                if "callback" in json_data["channel"]:
                    del json_data["channel"]
                    return Callback(**json_data)
                elif "task" in json_data["channel"]:
                    del json_data["channel"]
                    return Task(**json_data)
                elif "response" in json_data["channel"]:
                    del json_data["channel"]
                    return Response(**json_data)
                elif "historic" in json_data["channel"]:
                    return EventMessage(**json_data)
                elif "event" in json_data["channel"]:
                    return EventMessage(**json_data)
            elif "chunks_received" in json_data:
                return FileMeta(**json_data)
            elif "build_phase" in json_data:
                return Payload(**json_data)
            elif "agent_task_id" in json_data:
                return Task(**json_data)
            elif "response" in json_data:
                return Response(**json_data)
            elif "realm" in json_data:
                return Credential(**json_data)
            elif "level" in json_data:
                return EventMessage(**json_data)
            elif "agent_callback_id" in json_data:
                return Callback(**json_data)
            else:
                raise Exception("Unknown Mythic Object: " + json.dumps(json_data, indent=2))
        except Exception as e:
            raise Exception("Failed to decode json data: " + str(e))

    async def thread_output_helper(
        self, url, callback_function=None, timeout=None
    ) -> None:
        headers = self.get_headers()
        if timeout is None:
            timeout = self.global_timeout
        try:
            async with aiohttp.ClientSession() as session:
                ws = await session.ws_connect(url, headers=headers, ssl=False)
                start = time()
                while True:
                    try:
                        if timeout > 0 and (time() - start >= timeout):
                            raise Exception(
                                "Timeout in listening on websocket endpoint: {}".format(
                                    url
                                )
                            )
                        msg = await ws.receive()
                        if msg.data is None:
                            raise Exception(
                                "Got no data from websocket: {}".format(str(msg))
                            )
                        if msg.data != "":
                            task = asyncio.get_event_loop().create_task(
                                callback_function(self, await self.cast_data(msg.data))
                            )
                            asyncio.ensure_future(task)
                    except Exception as e:
                        raise Exception("Got exception reading from websocket, exiting websocket: " + str(e))
        except Exception as e:
            raise Exception("Failed to get websocket connection: " + str(e))

    async def stream_output(self, url, callback_function, timeout) -> asyncio.Task:
        task = asyncio.get_event_loop().create_task(
            self.thread_output_helper(url, callback_function, timeout)
        )
        asyncio.ensure_future(task)
        return task

    # ================== OPERATION ENDPOINTS ======================

    async def get_current_operation_info(self) -> MythicResponse:
        """
        Gets information about the current operation for the user
        """
        if self.operator is None:
            await self.get_self()
        url = "{}{}:{}/api/v{}/operations/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            self.operator.current_operation.id,
        )
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Operation(**resp.response)
        return resp

    async def get_all_operations(self) -> MythicResponse:
        """
        Gets information about all operations your operator can see
        """
        url = "{}{}:{}/api/v{}/operations".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            operations = []
            for o in resp.response["output"]:
                operations.append(Operation(**o))
            resp.response = operations
        return resp

    async def get_operation(self, operation: Operation) -> MythicResponse:
        """
        Gets information about the current user
        """
        if operation.id is None:
            resp = await self.get_all_operations()
            if resp.response_code == 200 and resp.status == "success":
                for o in resp.response:
                    if o.name == operation.name:
                        resp.response = o
                        return resp
            raise Exception("Failed to find operation: " + json.dumps(resp, indent=2, default=lambda o: o.to_json()))
        else:
            url = "{}{}:{}/api/v{}/operations/{}".format(
                self._http,
                self.server_ip,
                self._server_port,
                self._server_api_version,
                str(operation.id),
            )
            resp = await self.get_json(url)
            if resp.response_code == 200:
                resp.response = Operation(**resp.response)
            return resp

    async def add_or_update_operator_for_operation(
        self, operation: Operation, operator: Operator
    ) -> MythicResponse:
        """
        Adds an operator to an operation or updates an operator's view/block lists in an operation
        """
        resp = await self.get_operation(operation)
        if resp.status == "success":
            operation = resp.response
        else:
            raise Exception(
                "failed to get operation in add_or_update_operator_for_operation"
            )
        data = {"add_members": [await obj_to_json(operator)]}
        if operator.base_disabled_commands is not None:
            data["add_disabled_commands"] = [await obj_to_json(operator)]
        url = "{}{}:{}/api/v{}/operations/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(operation.id),
        )
        resp = await self.put_json(url, data=data)
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Operation(**resp.response)
        return resp

    async def remove_operator_from_operation(
        self, operation: Operation, operator: Operator
    ) -> MythicResponse:
        """
        Removes an operator from an operation
        """
        resp = await self.get_operation(operation)
        if resp.status == "success":
            operation = resp.response
        else:
            raise Exception("failed to get operation in remove_operator_for_operation")
        data = {"remove_members": [operator.username]}
        url = "{}{}:{}/api/v{}/operations/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(operation.id),
        )
        resp = await self.put_json(url, data=data)
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Operation(**resp.response)
        return resp

    async def update_operation(self, operation: Operation) -> MythicResponse:
        """
        Updates information about an operation such as webhook and completion status
        """
        if operation.id is None:
            resp = await self.get_operation(operation)
            if resp.status == "error":
                raise Exception("Failed to get_operation in update_operation")
            operation.id = resp.response.id
        url = "{}{}:{}/api/v{}/operations/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(operation.id),
        )
        resp = await self.put_json(url, data=await obj_to_json(operation))
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Operation(**resp.response)
        return resp

    async def create_operation(self, operation: Operation) -> MythicResponse:
        """
        Creates a new operation and specifies the admin of the operation
        """
        url = "{}{}:{}/api/v{}/operations/".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
        )
        data = {
            "name": operation.name,
            "admin": operation.admin.username
        }
        resp = await self.post_json(url, data=data)
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Operation(**resp.response)
        return resp

    # ================== OPERATOR ENDPOINTS ======================

    async def get_self(self) -> MythicResponse:
        """
        Gets information about the current user
        """
        url = "{}{}:{}/api/v{}/operators/me".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            self.operator = Operator(**resp.response)
            resp.response = Operator(**resp.response)
        return resp

    async def get_operator(self, operator: Operator) -> MythicResponse:
        """
        Gets information about the current user
        """
        if operator.id is None:
            # need to get the operator's ID first, which means we need to get all operators and match the username
            url = "{}{}:{}/api/v{}/operators/".format(
                self._http, self.server_ip, self._server_port, self._server_api_version
            )
            resp = await self.get_json(url)
            if resp.response_code == 200:
                if resp.status is None:
                    resp.status = "success"
                for o in resp.response:
                    if o["username"] == operator.username:
                        resp.response = Operator(**o)
                        return resp
                raise Exception("Operator not found: " + json.dumps(resp, indent=2, default=lambda o: o.to_json()))
            return resp
        else:
            url = "{}{}:{}/api/v{}/operators/{}".format(
                self._http,
                self.server_ip,
                self._server_port,
                self._server_api_version,
                str(operator.id),
            )
            resp = await self.get_json(url)
            if resp.response_code == 200:
                resp.response = Operator(**resp.response)
            return resp

    async def create_operator(self, operator: Operator) -> MythicResponse:
        """
        Creates a new operator with the specified username and password.
        If the operator name already exists, just returns information about that operator.
        """
        url = "{}{}:{}/api/v{}/operators".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.post_json(
            url, data={"username": operator.username, "password": operator.password}
        )
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Operator(**resp.response)
        elif resp.status == "error":
            resp = await self.get_operator(operator)
            if resp.status == "success":
                return resp
            raise Exception("Unable to create operator and no active operator found: " + json.dumps(resp, indent=2, default=lambda o: o.to_json()))
        return resp

    async def update_operator(self, operator: Operator) -> MythicResponse:
        """
        Updates information about the specified operator.
        """
        if operator.id is None:
            resp = await self.get_operator(operator)
            if resp.status == "error":
                raise Exception("Failed to get_operator in update_operator")
            operator.id = resp.response.id
        url = "{}{}:{}/api/v{}/operators/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(operator.id),
        )
        resp = await self.put_json(url, data=await obj_to_json(operator))
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Operator(**resp.response)
        return resp

    # ================== APITOKEN ENDPOINTS ======================

    async def get_apitokens(self) -> MythicResponse:
        """
        Gets all of the user's API tokens in a List
        :return:
        """
        url = "{}{}:{}/api/v{}/apitokens".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [APIToken(**x) for x in resp.response["apitokens"]]
        return resp

    async def create_apitoken(self, token_type="User") -> MythicResponse:
        """
        Creates an API token for the user
        :param token_type:
            must be either "User" or "C2"
        :return:
        """
        # token_type should be C2 or User
        url = "{}{}:{}/api/v{}/apitokens".format(
            self._http, self._server_ip, self._server_port, self._server_api_version
        )
        resp = await self.post_json(url, data={"token_type": token_type})
        if resp.response_code == 200 and resp.status == "success":
            # update the response to be an object
            resp.response = APIToken(**resp.response)
        return resp

    async def remove_apitoken(self, apitoken: Union[APIToken, Dict]) -> MythicResponse:
        """
        Removes the specified API token and invalidates it going forward
        :param apitoken:
            if using the APIToken class, the following must be set:
                id
        :return:
        """
        # take in an object and parse it if the value isn't explicitly given
        url = "{}{}:{}/api/v{}/apitokens/{}".format(
            self._http,
            self._server_ip,
            self._server_port,
            self._server_api_version,
            str(apitoken.id if isinstance(apitoken, APIToken) else apitoken["id"]),
        )
        resp = await self.delete_json(url)
        if resp.response_code == 200 and resp.status == "success":
            # update the response to ben an object
            resp.response = APIToken(**resp.response)
        return resp

    # ================= PAYLOAD ENDPOINTS =======================

    async def get_payloads(self) -> MythicResponse:
        """
        Get all the payloads for the current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/payloads/current_operation".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Payload(**x) for x in resp.response]
        return resp

    async def remove_payload(self, payload: Union[Payload, Dict]) -> MythicResponse:
        """
        Mark a payload as deleted in the database and remove it from disk
        Truly removing it from the database would delete any corresponding tasks/callbacks, so we don't do that
        :param payload:
        :return:
        """
        url = "{}{}:{}/api/v{}/payloads/{}".format(
            self._http,
            self._server_ip,
            self._server_port,
            self._server_api_version,
            str(payload.uuid if isinstance(payload, Payload) else payload["uuid"]),
        )
        resp = await self.delete_json(url)
        if resp.response_code == 200 and resp.status == "success":
            # update the response to ben an object
            resp.response = Payload(**resp.response)
        return resp

    async def create_payload(
        self,
        payload: Payload,
        all_commands: bool = None,
        timeout=None,
        wait_for_build: bool = None,
    ) -> MythicResponse:
        """
        :param payload:

        :return:
        {"payload_type":"poseidon",
        "c2_profiles":[
          {"c2_profile_parameters":
            {
              "AESPSK":"ElhUTijQn2klOtjlGyxs2uU6oq4PWD2Tboc5qaKzKCg=",
              "USER_AGENT":"Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko",
              "callback_host":"https://domain.com",
              "callback_interval":"10",
              "callback_jitter":"23",
              "callback_port":"80",
              "domain_front":"",
              "encrypted_exchange_check":"T",
              "killdate":"yyyy-mm-dd"
            },
          "c2_profile":"HTTP"
          }],
        "filename":"poseidon.bin",
        "tag":"this is my tag yo for initial access",
        "commands":["cat","cd","cp","curl","download","drives","exit","getenv","getuser","jobkill","jobs","jxa","keylog","keys","kill","libinject","listtasks","ls","mkdir","mv","portscan","ps","pwd","rm","screencapture","setenv","shell","sleep","socks","sshauth","triagedirectory","unsetenv","upload","xpc"],
        "build_parameters":[
          {"name":"mode","value":"default"},
          {"name":"os","value":"darwin"}
          ]
        }"
        """
        data = {}
        data["payload_type"] = payload.payload_type.ptype
        data["filename"] = payload.filename
        data["tag"] = payload.tag
        if payload.wrapped_payload is None:
            data["c2_profiles"] = []
            for k, v in payload.c2_profiles.items():
                parameters = {i.name: i.value for i in v}
                data["c2_profiles"].append(
                    {"c2_profile": k, "c2_profile_parameters": parameters}
                )
        data["build_parameters"] = []
        if all_commands:
            if payload.payload_type.id is None:
                resp = await self.get_payloadtypes()
                for p in resp.response:
                    if p.ptype == payload.payload_type.ptype:
                        payload.payload_type = p
            resp = await self.get_payloadtype_commands(payload.payload_type)
            payload.commands = resp.response
        if payload.commands is not None:
            data["commands"] = [c.cmd for c in payload.commands]
        else:
            data["commands"] = []
        if payload.build_parameters is not None:
            data['build_parameters'] = payload.build_parameters
        if payload.wrapped_payload is not None:
            data['wrapped_payload'] = payload.wrapped_payload.uuid
        url = "{}{}:{}/api/v{}/payloads/create".format(
            self._http, self._server_ip, self._server_port, self._server_api_version
        )
        resp = await self.post_json(url, data=data)
        if resp.response_code == 200 and resp.status == "success":
            # update the response to be an object
            # this will be a very basic payload with just the payload UUID
            resp.response = Payload(**resp.response)
            if wait_for_build is not None and wait_for_build:
                status = await self.wait_for_payload_status_change(
                    resp.response.uuid, "success", timeout
                )
                if status is None:
                    raise Exception(
                        "Failed to get final payload status from wait_for_payload_status_change in creat_payload"
                    )
                else:
                    resp.response = status
        return resp

    async def get_one_payload_info(
        self, payload: Union[Payload, Dict]
    ) -> MythicResponse:
        """
        Get information about a specific payload
        :param payload:
            if using the Payload class, the following must be set:
                uuid
        :return:
        """
        url = "{}{}:{}/api/v{}/payloads/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(payload.uuid if isinstance(payload, Payload) else payload["uuid"]),
        )
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            # update the response to ben an object
            resp.response = Payload(**resp.response)
        return resp

    async def download_payload(self, payload: Union[Payload, Dict]) -> bytes:
        """
        Get the final payload for a specified payload
        :param payload:
            if using Payload class, the following must be set:
                uuid
        :return:
        """
        url = "{}{}:{}/api/v{}/payloads/download/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(payload.uuid if isinstance(payload, Payload) else payload["uuid"]),
        )
        resp = await self.get_file(url)
        return resp

    # ================= FILE ENDPOINTS =======================

    async def download_file(self, file: FileMeta) -> bytes:
        """
        Download a file that is either scheduled for upload or is finished downloading
        """
        url = "{}{}:{}/api/v{}/files/download/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            file.agent_file_id,
        )
        resp = await self.get_file(url)
        return resp

    # ================ PAYLOAD TYPE ENDPOINTS ====================

    async def get_payloadtypes(self) -> MythicResponse:
        """
        Get all payload types registered with Apfell
        :return:
        """
        url = "{}{}:{}/api/v{}/payloadtypes/".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            tmp = []
            for x in resp.response["payloads"]:
                tmp.append(PayloadType(**x))
            for x in resp.response["wrappers"]:
                tmp.append(PayloadType(**x))
            resp.response = tmp
        return resp

    async def get_payloadtype(
        self, payload_type: Union[PayloadType, Dict]
    ) -> MythicResponse:
        """
        Get information about a specific payload type
        :param payload_type:
            if using PayloadType class, the following must be set:
                ptype
        :return:
        """
        url = "{}{}:{}/api/v{}/payloadtypes/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(
                payload_type.id
                if isinstance(payload_type, PayloadType)
                else payload_type["id"]
            ),
        )
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            # update the response with APIToken objects instead of just a dictionary
            resp.response = PayloadType(**resp.response)
        return resp

    async def get_payloadtype_commands(
        self, payload_type: Union[PayloadType, Dict]
    ) -> MythicResponse:
        """
        Get the commands registered for a specific payload type
        :param payload_type:
            if using PayloadType class, the following must be set:
                ptype
        :return:
        """
        url = "{}{}:{}/api/v{}/payloadtypes/{}/commands".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(
                payload_type.id
                if isinstance(payload_type, PayloadType)
                else payload_type["id"]
            ),
        )
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            resp.response = [Command(**x) for x in resp.response["commands"]]
        return resp

    # ================ TASKING ENDPOINTS ========================

    async def get_all_tasks(self) -> MythicResponse:
        """
        Get all of the tasks associated with the user's current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Task(**x) for x in resp.response]
        return resp

    async def get_all_tasks_for_callback(
        self, callback: Union[Callback, Dict]
    ) -> MythicResponse:
        """
        Get the tasks (no responses) for a specific callback
        :param callback:
            if using the Callback class, the following must be set:
                id
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/callback/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            callback.id if isinstance(callback, Callback) else callback["id"],
        )
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Task(**x) for x in resp.response]
        return resp

    async def get_all_responses_for_task(
        self, task: Union[Task, Dict]
    ) -> MythicResponse:
        """
        For the specified task, get all the responses
        :param task:
            if using the Task class, the following must be set:
                id
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            task.id if isinstance(task, Task) else task["id"],
        )
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            tsk = Task(**resp.response["task"])
            tsk.callback = Callback(**resp.response["callback"])
            tsk.responses = [Response(**x) for x in resp.response["responses"]]
            resp.response = tsk
        return resp

    async def get_all_tasks_and_responses_grouped_by_callback(self) -> MythicResponse:
        """
        Get all tasks and responses for all callbacks in the current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/task_report_by_callback".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Callback(**x) for x in resp.response["output"]]
        return resp

    async def create_task(
        self, task: Task, return_on="preprocessing", timeout=None
    ) -> MythicResponse:
        """
        Create a new task for a callback
        :param task:
            if using the Task class, the following must be set:
                callback: id
                command: cmd
                params
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/callback/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            task.callback.id if isinstance(task, Task) else task["callback"],
        )
        headers = self.get_headers()
        if task.files is None:
            data = {"command": task.command.cmd}
            if isinstance(task.params, str):
                data["params"] = task.params
            else:
                data["params"] = json.dumps(task.params)
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        url, json=data, headers=headers, ssl=False
                    ) as resp:
                        resp = MythicResponse(
                            response_code=resp.status, raw_response=await resp.json()
                        )
            except OSError as o:
                return MythicResponse(
                    response_code=0, raw_response={"status": "error", "error": str(o)}
                )
            except Exception as e:
                return MythicResponse(
                    response_code=0, raw_response={"status": "error", "error": str(e)}
                )
        else:
            form = aiohttp.FormData()
            data = {"command": task.command.cmd, "params": task.params}
            for f in task.files:
                data["params"][f.param_name] = "FILEUPLOAD"
                form.add_field("file" + f.param_name, f.content, filename=f.filename)
            data["params"] = json.dumps(data["params"])
            form.add_field("json", json.dumps(data))
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        url, data=form, headers=headers, ssl=False
                    ) as resp:
                        resp = MythicResponse(
                            response_code=resp.status, raw_response=await resp.json()
                        )
            except OSError as o:
                return MythicResponse(
                    response_code=0, raw_response={"status": "error", "error": str(o)}
                )
            except Exception as e:
                return MythicResponse(
                    response_code=0, raw_response={"status": "error", "error": str(e)}
                )
        if resp.response_code == 200 and resp.status == "success":
            resp.response = Task(**resp.response)
            if return_on == "preprocessing":
                return resp.response
            else:
                # we need to loop and wait for the status of the task to change
                resp.response = await self.wait_for_task_status_change(
                    resp.response.id, return_on, timeout
                )
        return resp

    async def set_comment_on_task(self, task:Task) -> MythicResponse:
        """
        Get all of the credentials associated with the user's current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/tasks/comments/{}".format(
            self._http, self.server_ip, self._server_port, self._server_api_version,
            task.id
        )
        if task.comment == "" or task.comment is None:
            resp = await self.delete_json(url)
        else:
            resp = await self.post_json(url, data={"comment": task.comment})
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = Task(**resp.response['task'])
        return resp

    # ============== CREDENTIAL ENDPOINTS ========================

    async def get_all_credentials(self) -> MythicResponse:
        """
        Get all of the credentials associated with the user's current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/credentials/current_operation".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = [Credential(**x) for x in resp.response["credentials"]]
        return resp

    async def create_credential(self, credential: Credential) -> MythicResponse:
        """
        Create a new credential associated with the user's current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/credentials".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.post_json(url, data=await obj_to_json(credential))
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = Credential(**resp.response)
        return resp

    async def update_credential(self, credential: Credential) -> MythicResponse:
        """
        Create a new credential associated with the user's current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/credentials/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(credential.id),
        )
        resp = await self.put_json(url, data=await obj_to_json(credential))
        if resp.response_code == 200:
            # update the response with APIToken objects instead of just a dictionary
            resp.response = Credential(**resp.response)
        return resp

    # =============== DISABLED COMMANDS PROFILES ENDPOINTS =======

    async def get_all_disabled_commands_profiles(self) -> MythicResponse:
        """
        Get all of the disabled command profiles associated with Mythic
        :return:
        """
        url = "{}{}:{}/api/v{}/operations/disabled_commands_profiles".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200:
            profile_entries = []
            for name, ptypes in resp.response["disabled_command_profiles"].items():
                new_entry = DisabledCommandsProfile(name=name, payload_types=[])
                for ptype, commands in ptypes.items():
                    payload_type = PayloadType(ptype=ptype, commands=[])
                    for command in commands:
                        payload_type.commands.append(
                            Command(cmd=command["command"], id=command["command_id"])
                        )
                    new_entry.payload_types.append(payload_type)
                profile_entries.append(new_entry)
            resp.response = profile_entries
        return resp

    async def create_disabled_commands_profile(
        self, profile: DisabledCommandsProfile
    ) -> MythicResponse:
        """
        Create a new disabled command profiles associated with Mythic
        :return:
        """
        url = "{}{}:{}/api/v{}/operations/disabled_commands_profile".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        data = {profile.name: {}}
        for payload_type in profile.payload_types:
            data[profile.name][payload_type.ptype] = []
            for command in payload_type.commands:
                data[profile.name][payload_type.ptype].append(command.cmd)
        resp = await self.post_json(url, data=data)
        if resp.response_code == 200 and resp.status == "success":
            profile_entries = []
            for entry in resp.response["disabled_command_profile"]:
                # first check if we have a profile for this
                found = False
                for p in profile_entries:
                    if p.name == entry["name"]:
                        found = True
                        ptype_found = False
                        for payload_type in p.payload_types:
                            if payload_type.ptype == entry["payload_type"]:
                                ptype_found = True
                                payload_type.commands.append(
                                    Command(
                                        cmd=entry["command"], id=entry["command_id"]
                                    )
                                )
                        if not ptype_found:
                            p.payload_types.append(
                                PayloadType(
                                    ptype=entry["payload_type"],
                                    commands=[
                                        Command(
                                            cmd=entry["command"], id=entry["command_id"]
                                        )
                                    ],
                                )
                            )
                if not found:
                    dcp = DisabledCommandsProfile(name=entry["name"], payload_types=[])
                    dcp.payload_types.append(
                        PayloadType(
                            ptype=entry["payload_type"],
                            commands=[
                                Command(cmd=entry["command"], id=entry["command_id"])
                            ],
                        )
                    )
                    profile_entries.append(dcp)
            resp.response = profile_entries
        return resp

    async def update_disabled_commands_profile(
        self, profile: DisabledCommandsProfile
    ) -> MythicResponse:
        """
        Create a new disabled command profiles associated with Mythic
        :return:
        """
        url = "{}{}:{}/api/v{}/operations/disabled_commands_profile".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        data = {profile.name: {}}
        for payload_type in profile.payload_types:
            data[profile.name][payload_type.ptype] = []
            for command in payload_type.commands:
                data[profile.name][payload_type.ptype].append(command.cmd)
        resp = await self.put_json(url, data=data)
        if resp.response_code == 200 and resp.status == "success":
            profile_entries = []
            for entry in resp.response["disabled_command_profile"]:
                # first check if we have a profile for this
                found = False
                for p in profile_entries:
                    if p.name == entry["name"]:
                        found = True
                        ptype_found = False
                        for payload_type in p.payload_types:
                            if payload_type.ptype == entry["payload_type"]:
                                ptype_found = True
                                payload_type.commands.append(
                                    Command(
                                        cmd=entry["command"], id=entry["command_id"]
                                    )
                                )
                        if not ptype_found:
                            p.payload_types.append(
                                PayloadType(
                                    ptype=entry["payload_type"],
                                    commands=[
                                        Command(
                                            cmd=entry["command"], id=entry["command_id"]
                                        )
                                    ],
                                )
                            )
                if not found:
                    dcp = DisabledCommandsProfile(name=entry["name"], payload_types=[])
                    dcp.payload_types.append(
                        PayloadType(
                            ptype=entry["payload_type"],
                            commands=[
                                Command(cmd=entry["command"], id=entry["command_id"])
                            ],
                        )
                    )
                    profile_entries.append(dcp)
            resp.response = profile_entries
        return resp

    async def update_disabled_commands_profile_for_operator(
        self,
        profile: Union[DisabledCommandsProfile, str],
        operator: Operator,
        operation: Operation,
    ) -> MythicResponse:
        # async def add_or_update_operator_for_operation(self, operation: Operation, operator: Operator)
        if isinstance(profile, DisabledCommandsProfile):
            operator.base_disabled_commands = profile.name
        else:
            operator.base_disabled_commands = profile
        resp = await self.add_or_update_operator_for_operation(operation, operator)
        return resp

    # =============== EVENT LOG MESSAGES ========================

    async def get_all_event_messages(self) -> MythicResponse:
        """
        Get all of the event messages associated with Mythic for the current operation that are not deleted
        :return:
        """
        url = "{}{}:{}/api/v{}/event_message".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.get_json(url)
        if resp.response_code == 200 and resp.status == "success":
            resp.response = [EventMessage(**x) for x in resp.response["alerts"]]
        return resp

    async def create_event_message(self, message: EventMessage) -> MythicResponse:
        """
        Create new event message for the current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/event_message".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.post_json(url, data=await obj_to_json(message))
        if resp.response_code == 200 and resp.status == "success":
            resp.response = EventMessage(resp.response)
        return resp

    async def update_event_message(self, message: EventMessage) -> MythicResponse:
        """
        Update event message for the current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/event_message/{}".format(
            self._http,
            self.server_ip,
            self._server_port,
            self._server_api_version,
            str(message.id),
        )
        resp = await self.put_json(url, data=await obj_to_json(message))
        if resp.response_code == 200 and resp.status == "success":
            resp.response = EventMessage(resp.response)
        return resp

    async def remove_event_message(self, message: EventMessage) -> MythicResponse:
        """
        Update event message for the current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/event_message/delete".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        resp = await self.post_json(url, data={"messages": [message.id]})
        if resp.response_code == 200 and resp.status == "success":
            resp.response = EventMessage(resp.response)
        return resp

    async def remove_event_messages(self, messages: List) -> MythicResponse:
        """
        Update event message for the current operation
        :return:
        """
        url = "{}{}:{}/api/v{}/event_message/delete".format(
            self._http, self.server_ip, self._server_port, self._server_api_version
        )
        msgs = [m.id for m in messages]
        resp = await self.post_json(url, data={"messages": msgs})
        if resp.response_code == 200 and resp.status == "success":
            resp.response = EventMessage(resp.response)
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
            self._access_token = resp.response["access_token"]
            self._refresh_token = resp.response["refresh_token"]
            return resp
        else:
            raise Exception("Failed to log in: " + json.dumps(resp, indent=2, default=lambda o: o.to_json()))
            sys.exit(1)

    async def set_or_create_apitoken(self, token_type="User"):
        """
        Use current auth to check if there are any user tokens. Either get one or create a new user one
        """
        resp = await self.get_apitokens()
        if resp.status == "success":
            for x in resp.response:
                if x.token_type == token_type:
                    self._apitoken = x
                    resp.response = x
                    return resp
        # if we get here, then we don't have a token of the right type for us to just leverage, so we need to get one
        token_resp = await self.create_apitoken(token_type=token_type)
        if token_resp.response_code == 200:
            self._apitoken = token_resp.response
        return token_resp

    async def wait_for_task_status_change(self, task_id, status, timeout=None):
        """
        Uses websockets to listen for notifications related to the specified task within a certain period of time
        if self.timeout is -1, then wait indefinitely
        :param task_id:
        :param status: the status we're waiting for (error is always included)
        :return:
        """
        if timeout is None:
            timeout = self.global_timeout
        url = "{}{}:{}/ws/task/{}".format(
            self._ws, self._server_ip, self._server_port, str(task_id)
        )
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                ws = await session.ws_connect(url, headers=headers, ssl=False)
                start = time()
                while True:
                    try:
                        if timeout > 0 and (time() - start >= timeout):
                            raise Exception("wait_for_task_status_change has timed out")
                        msg = await ws.receive()
                        if msg.data is None:
                            return None
                        if msg.data != "":
                            task = Task(**json.loads(msg.data))
                            if (
                                task.status == "error"
                                or task.completed == True
                                or task.status.lower() == status.lower()
                            ):
                                return task
                    except Exception as e:
                        raise Exception("Exception while waiting for task status change: " + str(e))
        except Exception as e:
            raise Exception("Exception in outer try/catch while waiting for task status change: " + str(e))

    async def wait_for_payload_status_change(self, payload_uuid, status, timeout=None):
        """
        Uses websockets to listen for notifications related to the specified pyaload within a certain period of time
        if self.timeout is -1, then wait indefinitely
        :param payload_uuid:
        :param status: the status we're waiting for (error is always included)
        :return:
        """
        if timeout is None:
            timeout = self.global_timeout
        url = "{}{}:{}/ws/payloads/{}".format(
            self._ws, self._server_ip, self._server_port, str(payload_uuid)
        )
        headers = self.get_headers()
        try:
            async with aiohttp.ClientSession() as session:
                ws = await session.ws_connect(url, headers=headers, ssl=False)
                start = time()
                while True:
                    try:
                        if timeout > 0 and (time() - start >= timeout):
                            raise Exception(
                                "wait_for_payload_status_change has timed out"
                            )
                        msg = await ws.receive()
                        if msg.data is None:
                            return None
                        if msg.data != "":
                            payload = Payload(**json.loads(msg.data))
                            if (
                                payload.build_phase == "error"
                                or payload.deleted == True
                                or payload.build_phase == status
                            ):
                                return payload
                    except Exception as e:
                        raise Exception("Exception while waiting for payload status change: " + str(e))
        except Exception as e:
            raise Exception("Exception in outer try/catch while waiting for payload status change: " + str(e))

    # ============= WEBSOCKET NOTIFICATION FUNCTIONS ===============

    async def listen_for_all_notifications_on_one_callback(
        self, callback_id, callback_function=None, timeout=None
    ):
        """
        Uses websockets to listen for all notifications related to a specific callback and prints to the screen.
        To stop listening, call cancel() on the result from this function call
        :param callback_id:
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/unified_callback/{}".format(
            self._ws, self._server_ip, self._server_port, str(callback_id)
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_new_callbacks(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for all notifications related new callbacks.
        To stop listening, call cancel() on the result from this function call
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/new_callbacks/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_responses_for_task(
        self, task_id, callback_function=None, timeout=None
    ):
        """
        Uses websockets to listen for all responses on a given task
        To stop listening, call cancel() on the result from this function call
        :param callback_id:
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/responses/by_task/{}".format(
            self._ws, self._server_ip, self._server_port, str(task_id)
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def gather_task_responses(self, task_id, timeout=None) -> List:
        """
        Uses websockets to listen for all responses related to task_id and gather them together into an array until the task is completed or errored.
        :param callback_id:
        :param callback_function: gets called on each notification
        :return:
        """
        if timeout is None:
            timeout = self.global_timeout
        url = "{}{}:{}/ws/responses/by_task/{}".format(
            self._ws, self._server_ip, self._server_port, str(task_id)
        )
        headers = self.get_headers()
        responses = []
        try:
            async with aiohttp.ClientSession() as session:
                ws = await session.ws_connect(url, headers=headers, ssl=False)
                start = time()
                while True:
                    try:
                        if timeout > 0 and (time() - start >= timeout):
                            raise Exception("gather_task_responses has timed out")
                        msg = await ws.receive()
                        if msg.data is None:
                            return responses
                        if msg.data != "":
                            rsp = Response(**json.loads(msg.data))
                            # await json_print(rsp)
                            responses.append(rsp)
                            if rsp.task.status == "error" or rsp.task.completed == True:
                                return responses
                    except Exception as e:
                        raise Exception("Exception while gathering responses: " + str(e))
        except Exception as e:
            raise Exception("Exception in our try/catch while gathering responses: " + str(e))

    async def listen_for_all_files(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for all file notifications within mythic for the current operation.
        This includes payloads, uploads, downloads, screenshots.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/files/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_new_files(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for all file notifications within mythic for the current operation.
        This includes uploads, downloads.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/files/new/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_all_responses(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for all response notifications within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/responses/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_new_responses(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for all new response notifications within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/responses/new/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_all_tasks(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for all tasks within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/tasks/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_new_tasks(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for all new tasks within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/tasks/new/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_all_payloads(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for all payloads within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/payloads/info/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_all_credentials(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for credentials within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/credentials/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_new_credentials(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for new credentials within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/credentials/new/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_all_event_messages(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for event messages within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/events_all/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task

    async def listen_for_new_event_messages(self, callback_function=None, timeout=None):
        """
        Uses websockets to listen for new event messages within mythic for the current operation.
        :param callback_function: gets called on each notification
        :return:
        """
        url = "{}{}:{}/ws/events_notifier/current_operation".format(
            self._ws, self._server_ip, self._server_port
        )
        if callback_function:
            task = await self.stream_output(url, callback_function, timeout)
        else:
            task = await self.stream_output(url, self.print_websocket_output, timeout)
        return task
