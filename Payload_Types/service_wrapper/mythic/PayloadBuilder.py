from enum import Enum
from abc import abstractmethod
from pathlib import Path
import base64
from CommandBase import *


class BuildStatus(Enum):
    Success = "success"
    Error = "error"


class SupportedOS(Enum):
    Windows = "Windows"
    MacOS = "macOS"
    Linux = "Linux"
    WebShell = "WebShell"
    Chrome = "Chrome"


class BuildParameterType(Enum):
    String = "String"
    ChooseOne = "ChooseOne"


class BuildParameter:
    def __init__(
        self,
        name: str,
        parameter_type: BuildParameterType = None,
        description: str = None,
        required: bool = None,
        verifier_regex: str = None,
        default_value: str = None,
        choices: [str] = None,
        value: any = None,
        verifier_func: callable = None,
    ):
        self.name = name
        self.verifier_func = verifier_func
        self.parameter_type = (
            parameter_type if parameter_type is not None else ParameterType.String
        )
        self.description = description if description is not None else ""
        self.required = required if required is not None else True
        self.verifier_regex = verifier_regex if verifier_regex is not None else ""
        self.default_value = default_value
        if value is None:
            self.value = default_value
        else:
            self.value = value
        self.choices = choices

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, name):
        self._name = name

    @property
    def parameter_type(self):
        return self._parameter_type

    @parameter_type.setter
    def parameter_type(self, parameter_type):
        self._parameter_type = parameter_type

    @property
    def description(self):
        return self._description

    @description.setter
    def description(self, description):
        self._description = description

    @property
    def required(self):
        return self._required

    @required.setter
    def required(self, required):
        self._required = required

    @property
    def verifier_regex(self):
        return self._verifier_regex

    @verifier_regex.setter
    def verifier_regex(self, verifier_regex):
        self._verifier_regex = verifier_regex

    @property
    def default_value(self):
        return self._default_value

    @default_value.setter
    def default_value(self, default_value):
        self._default_value = default_value

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, value):
        if value is None:
            self._value = value
        else:
            if self.verifier_func is not None:
                self.verifier_func(value)
                self._value = value
            else:
                self._value = value

    def to_json(self):
        return {
            "name": self._name,
            "parameter_type": self._parameter_type.value,
            "description": self._description,
            "required": self._required,
            "verifier_regex": self._verifier_regex,
            "parameter": self._default_value
            if self._parameter_type == BuildParameterType.String
            else "\n".join(self.choices),
        }


class C2ProfileParameters:
    def __init__(self, c2profile: dict, parameters: dict = None):
        self.parameters = {}
        self.c2profile = c2profile
        if parameters is not None:
            self.parameters = parameters

    def get_parameters_dict(self):
        return self.parameters

    def get_c2profile(self):
        return self.c2profile


class CommandList:
    def __init__(self, commands: [str] = None):
        self.commands = []
        if commands is not None:
            self.commands = commands

    def get_commands(self) -> [str]:
        return self.commands

    def remove_command(self, command: str):
        self.commands.remove(command)

    def add_command(self, command: str):
        for c in self.commands:
            if c == command:
                return
        self.commands.append(command)

    def clear(self):
        self.commands = []


class BuildResponse:
    def __init__(self, status: BuildStatus, payload: bytes = None, message: str = None):
        self.status = status
        self.payload = payload if payload is not None else b""
        self.message = message if message is not None else ""

    def get_status(self) -> BuildStatus:
        return self.status

    def set_status(self, status: BuildStatus):
        self.status = status

    def get_payload(self) -> bytes:
        return self.payload

    def set_payload(self, payload: bytes):
        self.payload = payload

    def set_message(self, message: str):
        self.message = message

    def get_message(self) -> str:
        return self.message


class PayloadType:

    support_browser_scripts = []

    def __init__(
        self,
        uuid: str = None,
        agent_code_path: Path = None,
        c2info: [C2ProfileParameters] = None,
        commands: CommandList = None,
        wrapped_payload: str = None,
    ):
        self.commands = commands
        self.base_path = agent_code_path
        self.agent_code_path = agent_code_path / "agent_code"
        self.c2info = c2info
        self.uuid = uuid
        self.wrapped_payload = wrapped_payload

    @property
    @abstractmethod
    def name(self):
        pass

    @property
    @abstractmethod
    def file_extension(self):
        pass

    @property
    @abstractmethod
    def author(self):
        pass

    @property
    @abstractmethod
    def supported_os(self):
        pass

    @property
    @abstractmethod
    def wrapper(self):
        pass

    @property
    @abstractmethod
    def wrapped_payloads(self):
        pass

    @property
    @abstractmethod
    def note(self):
        pass

    @property
    @abstractmethod
    def supports_dynamic_loading(self):
        pass

    @property
    @abstractmethod
    def c2_profiles(self):
        pass

    @property
    @abstractmethod
    def build_parameters(self):
        pass

    @abstractmethod
    async def build(self) -> BuildResponse:
        pass

    def get_parameter(self, key):
        if key in self.build_parameters:
            return self.build_parameters[key].value
        else:
            return None

    async def set_and_validate_build_parameters(self, buildinfo: dict):
        # set values for all of the key-value pairs presented to us
        for key, bp in self.build_parameters.items():
            if key in buildinfo and buildinfo[key] is not None:
                bp.value = buildinfo[key]
            if bp.required and bp.value is None:
                raise ValueError(
                    "{} is a required parameter but has no value".format(key)
                )

    def get_build_instance_values(self):
        values = {}
        for key, bp in self.build_parameters.items():
            if bp.value is not None:
                values[key] = bp.value
        return values

    def to_json(self):
        return {
            "ptype": self.name,
            "file_extension": self.file_extension,
            "author": self.author,
            "supported_os": ",".join([x.value for x in self.supported_os]),
            "wrapper": self.wrapper,
            "wrapped": self.wrapped_payloads,
            "supports_dynamic_loading": self.supports_dynamic_loading,
            "note": self.note,
            "build_parameters": [b.to_json() for k, b in self.build_parameters.items()],
            "c2_profiles": self.c2_profiles,
            "support_scripts": [
                a.to_json(self.base_path) for a in self.support_browser_scripts
            ],
        }
