from abc import abstractmethod, ABCMeta
import json
from enum import Enum
import base64
import uuid
from pathlib import Path


class MythicStatus(Enum):
    Success = "success"
    Error = "error"
    Completed = "completed"
    Processed = "processed"
    Processing = "processing"


class ParameterType(Enum):
    String = "String"
    Boolean = "Boolean"
    File = "File"
    Array = "Array"
    ChooseOne = "Choice"
    ChooseMultiple = "ChoiceMultiple"
    Credential_JSON = "Credential-JSON"
    Credential_Account = "Credential-Account"
    Credential_Realm = "Credential-Realm"
    Credential_Type = ("Credential-Type",)
    Credential_Value = "Credential-Credential"
    Number = "Number"
    Payload = "PayloadList"
    ConnectionInfo = "AgentConnect"


class CommandParameter:
    def __init__(
        self,
        name: str,
        type: ParameterType,
        description: str = "",
        choices: [any] = None,
        required: bool = True,
        default_value: any = None,
        validation_func: callable = None,
        value: any = None,
        supported_agents: [str] = None,
    ):
        self.name = name
        self.type = type
        self.description = description
        if choices is None:
            self.choices = []
        else:
            self.choices = choices
        self.required = required
        self.validation_func = validation_func
        if value is None:
            self.value = default_value
        else:
            self.value = value
        self.default_value = default_value
        self.supported_agents = supported_agents if supported_agents is not None else []

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, name):
        self._name = name

    @property
    def type(self):
        return self._type

    @type.setter
    def type(self, type):
        self._type = type

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
    def choices(self):
        return self._choices

    @choices.setter
    def choices(self, choices):
        self._choices = choices

    @property
    def validation_func(self):
        return self._validation_func

    @validation_func.setter
    def validation_func(self, validation_func):
        self._validation_func = validation_func

    @property
    def supported_agents(self):
        return self._supported_agents

    @supported_agents.setter
    def supported_agents(self, supported_agents):
        self._supported_agents = supported_agents

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, value):
        if value is not None:
            type_validated = TypeValidators().validate(self.type, value)
            if self.validation_func is not None:
                try:
                    self.validation_func(type_validated)
                    self._value = type_validated
                except Exception as e:
                    raise ValueError(
                        "Failed validation check for parameter {} with value {}".format(
                            self.name, str(value)
                        )
                    )
                return
            else:
                # now we do some verification ourselves based on the type
                self._value = type_validated
                return
        self._value = value

    def to_json(self):
        return {
            "name": self._name,
            "type": self._type.value,
            "description": self._description,
            "choices": "\n".join(self._choices),
            "required": self._required,
            "default_value": self._value,
            "supported_agents": "\n".join(self._supported_agents),
        }


class TypeValidators:
    def validateString(self, val):
        return str(val)

    def validateNumber(self, val):
        try:
            return int(val)
        except:
            return float(val)

    def validateBoolean(self, val):
        if isinstance(val, bool):
            return val
        else:
            raise ValueError("Value isn't bool")

    def validateFile(self, val):
        try:  # check if the file is actually a file-id
            uuid_obj = uuid.UUID(val, version=4)
            return str(uuid_obj)
        except ValueError:
            pass
        return base64.b64decode(val)

    def validateArray(self, val):
        if isinstance(val, list):
            return val
        else:
            raise ValueError("value isn't array")

    def validateCredentialJSON(self, val):
        if isinstance(val, dict):
            return val
        else:
            raise ValueError("value ins't a dictionary")

    def validatePass(self, val):
        return val

    def validateChooseMultiple(self, val):
        if isinstance(val, list):
            return val
        else:
            raise ValueError("Choices aren't in a list")

    def validatePayloadList(self, val):
        return str(uuid.UUID(val, version=4))

    def validateAgentConnect(self, val):
        if isinstance(val, dict):
            return val
        else:
            raise ValueError("Not instance of dictionary")

    switch = {
        "String": validateString,
        "Number": validateNumber,
        "Boolean": validateBoolean,
        "File": validateFile,
        "Array": validateArray,
        "Credential-JSON": validateCredentialJSON,
        "Credential-Account": validatePass,
        "Credential-Realm": validatePass,
        "Credential-Type": validatePass,
        "Credential-Credential": validatePass,
        "Choice": validatePass,
        "ChoiceMultiple": validateChooseMultiple,
        "PayloadList": validatePayloadList,
        "AgentConnect": validateAgentConnect,
    }

    def validate(self, type: ParameterType, val: any):
        return self.switch[type.value](self, val)


class TaskArguments(metaclass=ABCMeta):
    def __init__(self, command_line: str):
        self.command_line = str(command_line)

    @property
    def args(self):
        return self._args

    @args.setter
    def args(self, args):
        self._args = args

    def get_arg(self, key: str):
        if key in self.args:
            return self.args[key].value
        else:
            return None

    def has_arg(self, key: str) -> bool:
        return key in self.args

    def get_commandline(self) -> str:
        return self.command_line

    def is_empty(self) -> bool:
        return len(self.args) == 0

    def add_arg(self, key: str, value, type: ParameterType = None):
        if key in self.args:
            self.args[key].value = value
        else:
            if type is None:
                self.args[key] = CommandParameter(
                    name=key, type=ParameterType.String, value=value
                )
            else:
                self.args[key] = CommandParameter(name=key, type=type, value=value)

    def rename_arg(self, old_key: str, new_key: str):
        if old_key not in self.args:
            raise Exception("{} not a valid parameter".format(old_key))
        self.args[new_key] = self.args.pop(old_key)

    def remove_arg(self, key: str):
        self.args.pop(key, None)

    def to_json(self):
        temp = []
        for k, v in self.args.items():
            temp.append(v.to_json())
        return temp

    def load_args_from_json_string(self, command_line: str):
        temp_dict = json.loads(command_line)
        for k, v in temp_dict.items():
            for k2,v2 in self.args.items():
                if v2.name == k:
                    v2.value = v

    async def verify_required_args_have_values(self):
        for k, v in self.args.items():
            if v.value is None:
                v.value = v.default_value
            if v.required and v.value is None:
                raise ValueError("Required arg {} has no value".format(k))

    def __str__(self):
        if len(self.args) > 0:
            temp = {}
            for k, v in self.args.items():
                if isinstance(v.value, bytes):
                    temp[k] = base64.b64encode(v.value).decode()
                else:
                    temp[k] = v.value
            return json.dumps(temp)
        else:
            return self.command_line

    @abstractmethod
    async def parse_arguments(self):
        pass


class AgentResponse:
    def __init__(self, response: dict):
        self.response = response


class Callback:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class BrowserScript:
    # if a browserscript is specified as part of a PayloadType, then it's a support script
    # if a browserscript is specified as part of a command, then it's for that command
    def __init__(self, script_name: str, author: str = None):
        self.script_name = script_name
        self.author = author

    def to_json(self, base_path: Path):
        try:
            code_file = (
                base_path
                / "mythic"
                / "browser_scripts"
                / "{}.js".format(self.script_name)
            )
            if code_file.exists():
                code = code_file.read_bytes()
                code = base64.b64encode(code).decode()
            else:
                code = ""
            return {"script": code, "name": self.script_name, "author": self.author}
        except Exception as e:
            return {"script": str(e), "name": self.script_name, "author": self.author}


class MythicTask:
    def __init__(
        self, taskinfo: dict, args: TaskArguments, status: MythicStatus = None
    ):
        self.task_id = taskinfo["id"]
        self.original_params = taskinfo["original_params"]
        self.completed = taskinfo["completed"]
        self.callback = Callback(**taskinfo["callback"])
        self.agent_task_id = taskinfo["agent_task_id"]
        self.operator = taskinfo["operator"]
        self.args = args
        self.status = MythicStatus.Success
        if status is not None:
            self.status = status

    def get_status(self) -> MythicStatus:
        return self.status

    def set_status(self, status: MythicStatus):
        self.status = status

    def __str__(self):
        return str(self.args)


class CommandBase(metaclass=ABCMeta):
    def __init__(self, agent_code_path: Path):
        self.base_path = agent_code_path
        self.agent_code_path = agent_code_path / "agent_code"

    @property
    @abstractmethod
    def cmd(self):
        pass

    @property
    @abstractmethod
    def needs_admin(self):
        pass

    @property
    @abstractmethod
    def help_cmd(self):
        pass

    @property
    @abstractmethod
    def description(self):
        pass

    @property
    @abstractmethod
    def version(self):
        pass

    @property
    @abstractmethod
    def is_exit(self):
        pass

    @property
    @abstractmethod
    def is_file_browse(self):
        pass

    @property
    @abstractmethod
    def is_process_list(self):
        pass

    @property
    @abstractmethod
    def is_download_file(self):
        pass

    @property
    @abstractmethod
    def is_remove_file(self):
        pass

    @property
    @abstractmethod
    def is_upload_file(self):
        pass

    @property
    @abstractmethod
    def author(self):
        pass

    @property
    @abstractmethod
    def argument_class(self):
        pass

    @property
    @abstractmethod
    def attackmapping(self):
        pass

    @property
    def browser_script(self):
        pass

    @abstractmethod
    async def create_tasking(self, task: MythicTask) -> MythicTask:
        pass

    @abstractmethod
    async def process_response(self, response: AgentResponse):
        pass

    def to_json(self):
        params = self.argument_class("").to_json()
        if self.browser_script is not None:
            bscript = {"browser_script": self.browser_script.to_json(self.base_path)}
        else:
            bscript = {}
        return {
            "cmd": self.cmd,
            "needs_admin": self.needs_admin,
            "help_cmd": self.help_cmd,
            "description": self.description,
            "version": self.version,
            "is_exit": self.is_exit,
            "is_file_browse": self.is_file_browse,
            "is_process_list": self.is_process_list,
            "is_download_file": self.is_download_file,
            "is_remove_file": self.is_remove_file,
            "is_upload_file": self.is_upload_file,
            "author": self.author,
            "attack": [{"t_num": a} for a in self.attackmapping],
            "parameters": params,
            **bscript,
        }
