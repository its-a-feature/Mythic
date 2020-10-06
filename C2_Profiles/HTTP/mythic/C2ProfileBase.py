from enum import Enum
from abc import abstractmethod
import json


class ParameterType(Enum):
    String = "String"
    ChooseOne = "ChooseOne"
    Array = "Array"
    Date = "Date"
    Dictionary = "Dictionary"


class C2ProfileParameter:
    def __init__(
        self,
        name: str,
        description: str,
        default_value: str = "",
        randomize: bool = False,
        format_string: str = "",
        parameter_type: ParameterType = ParameterType.String,
        required: bool = True,
        verifier_regex: str = "",
        choices: [str] = None,
    ):
        self.name = name
        self.description = description
        self.randomize = randomize
        self.format_string = format_string
        self.parameter_type = parameter_type
        self.required = required
        self.verifier_regex = verifier_regex
        self.choices = choices
        self.default_value = ""
        if self.parameter_type == ParameterType.ChooseOne and choices is not None:
            self.default_value = "\n".join(choices)
        else:
            self.default_value = default_value


    def to_json(self):
        return {
            "name": self.name,
            "description": self.description,
            "default_value": self.default_value if self.parameter_type not in [ParameterType.Array, ParameterType.Dictionary] else json.dumps(self.default_value),
            "randomize": self.randomize,
            "format_string": self.format_string,
            "required": self.required,
            "parameter_type": self.parameter_type.value,
            "verifier_regex": self.verifier_regex,
        }


class C2Profile:
    @property
    @abstractmethod
    def name(self):
        pass

    @property
    @abstractmethod
    def description(self):
        pass

    @property
    @abstractmethod
    def author(self):
        pass

    @property
    @abstractmethod
    def is_p2p(self):
        pass

    @property
    @abstractmethod
    def is_server_routed(self):
        pass

    @property
    @abstractmethod
    def mythic_encrypts(self):
        pass

    @property
    @abstractmethod
    def parameters(self):
        pass

    def to_json(self):
        return {
            "name": self.name,
            "description": self.description,
            "author": self.author,
            "mythic_encrypts": self.mythic_encrypts,
            "is_p2p": self.is_p2p,
            "is_server_routed": self.is_server_routed,
            "params": [x.to_json() for x in self.parameters],
        }


class RPCStatus(Enum):
    Success = "success"
    Error = "error"


class RPCResponse:
    def __init__(self, status: RPCStatus = None, response: str = None):
        self.status = status
        self.response = response

    @property
    def status(self):
        return self._status

    @status.setter
    def status(self, status):
        self._status = status

    @property
    def response(self):
        return self._response

    @response.setter
    def response(self, response):
        self._response = response

    def to_json(self):
        return {"status": self.status.value, "response": self.response}
