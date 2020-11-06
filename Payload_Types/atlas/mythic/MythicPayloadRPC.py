from MythicBaseRPC import *
import base64
import pathlib


class MythicPayloadRPCResponse(RPCResponse):
    def __init__(self, payload: RPCResponse):
        super().__init__(payload._raw_resp)
        if payload.status == MythicStatus.Success:
            self.uuid = payload.response["uuid"]
            self.tag = payload.response["tag"]
            self.operator = payload.response["operator"]
            self.creation_time = payload.response["creation_time"]
            self.payload_type = payload.response["payload_type"]
            self.operation = payload.response["operation"]
            self.wrapped_payload = payload.response["wrapped_payload"]
            self.deleted = payload.response["deleted"]
            self.auto_generated = payload.response["auto_generated"]
            self.task = payload.response["task"]
            if "contents" in payload.response:
                self.contents = payload.response["contents"]
            self.build_phase = payload.response["build_phase"]
            self.agent_file_id = payload.response["file_id"]["agent_file_id"]
            self.filename = payload.response["file_id"]["filename"]
            self.c2info = payload.response["c2info"]
            self.commands = payload.response["commands"]
            self.build_parameters = payload.response["build_parameters"]
        else:
            self.uuid = None
            self.tag = None
            self.operator = None
            self.creation_time = None
            self.payload_type = None
            self.operation = None
            self.wrapped_payload = None
            self.deleted = None
            self.auto_generated = None
            self.task = None
            self.contents = None
            self.build_phase = None
            self.agent_file_id = None
            self.filename = None
            self.c2info = None
            self.commands = None
            self.build_parameters = None

    @property
    def uuid(self):
        return self._uuid

    @uuid.setter
    def uuid(self, uuid):
        self._uuid = uuid

    @property
    def tag(self):
        return self._tag

    @tag.setter
    def tag(self, tag):
        self._tag = tag

    @property
    def operator(self):
        return self._operator

    @operator.setter
    def operator(self, operator):
        self._operator = operator

    @property
    def creation_time(self):
        return self._creation_time

    @creation_time.setter
    def creation_time(self, creation_time):
        self._creation_time = creation_time

    @property
    def payload_type(self):
        return self._payload_type

    @payload_type.setter
    def payload_type(self, payload_type):
        self._payload_type = payload_type

    @property
    def location(self):
        return self._location

    @property
    def operation(self):
        return self._operation

    @operation.setter
    def operation(self, operation):
        self._operation = operation

    @property
    def wrapped_payload(self):
        return self._wrapped_payload

    @wrapped_payload.setter
    def wrapped_payload(self, wrapped_payload):
        self._wrapped_payload = wrapped_payload

    @property
    def deleted(self):
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted

    @property
    def auto_generated(self):
        return self._auto_generated

    @auto_generated.setter
    def auto_generated(self, auto_generated):
        self._auto_generated = auto_generated

    @property
    def task(self):
        return self._task

    @task.setter
    def task(self, task):
        self._task = task

    @property
    def contents(self):
        return self._contents

    @contents.setter
    def contents(self, contents):
        try:
            self._contents = base64.b64decode(contents)
        except:
            self._contents = contents

    @property
    def build_phase(self):
        return self._build_phase

    @build_phase.setter
    def build_phase(self, build_phase):
        self._build_phase = build_phase

    @property
    def c2info(self):
        return self._c2info

    @c2info.setter
    def c2info(self, c2info):
        self._c2info = c2info

    @property
    def build_parameters(self):
        return self._build_parameters

    @build_parameters.setter
    def build_parameters(self, build_parameters):
        self._build_parameters = build_parameters

    def set_profile_parameter_value(self,
                                    c2_profile: str,
                                    parameter_name: str,
                                    value: any):
        if self.c2info is None:
            raise Exception("Can't set value when c2 info is None")
        for c2 in self.c2info:
            if c2["name"] == c2_profile:
                c2["parameters"][parameter_name] = value
                return
        raise Exception("Failed to find c2 name")

    def set_build_parameter_value(self,
                                  parameter_name: str,
                                  value: any):
        if self.build_parameters is None:
            raise Exception("Can't set value when build parameters are None")
        for param in self.build_parameters:
            if param["name"] == parameter_name:
                param["value"] = value
                return
        self.build_parameters.append({"name": parameter_name, "value": value})


class MythicPayloadRPC(MythicBaseRPC):
    async def get_payload_by_uuid(self, uuid: str) -> MythicPayloadRPCResponse:
        resp = await self.call(
            {"action": "get_payload_by_uuid", "uuid": uuid, "task_id": self.task_id}
        )
        return MythicPayloadRPCResponse(resp)

    async def build_payload_from_template(
        self,
        uuid: str,
        destination_host: str = None,
        wrapped_payload: str = None,
        description: str = None,
    ) -> MythicPayloadRPCResponse:
        resp = await self.call(
            {
                "action": "build_payload_from_template",
                "uuid": uuid,
                "task_id": self.task_id,
                "destination_host": destination_host,
                "wrapped_payload": wrapped_payload,
                "description": description,
            }
        )
        return MythicPayloadRPCResponse(resp)

    async def build_payload_from_parameters(self,
                                            payload_type: str,
                                            c2_profiles: list,
                                            commands: list,
                                            build_parameters: list,
                                            filename: str = None,
                                            tag: str = None,
                                            destination_host: str = None,
                                            wrapped_payload: str = None) -> MythicPayloadRPCResponse:
        """
        :param payload_type: String value of a payload type name
        :param c2_profiles: List of c2 dictionaries of the form:
        { "c2_profile": "HTTP",
          "c2_profile_parameters": {
            "callback_host": "https://domain.com",
            "callback_interval": 20
          }
        }
        :param filename: String value of the name of the resulting payload
        :param tag: Description for the payload for the active callbacks page
        :param commands: List of string names for the commands that should be included
        :param build_parameters: List of build parameter dictionaries of the form:
        {
          "name": "version", "value": 4.0
        }
        :param destination_host: String name of the host where the payload will go
        :param wrapped_payload: If payload_type is a wrapper, wrapped payload UUID
        :return:
        """
        resp = await self.call(
            {
                "action": "build_payload_from_parameters",
                "task_id": self.task_id,
                "payload_type": payload_type,
                "c2_profiles": c2_profiles,
                "filename": filename,
                "tag": tag,
                "commands": commands,
                "build_parameters": build_parameters,
                "destination_host": destination_host,
                "wrapped_payload": wrapped_payload
            }
        )
        return MythicPayloadRPCResponse(resp)

    async def build_payload_from_MythicPayloadRPCResponse(self,
                                                          resp: MythicPayloadRPCResponse,
                                                          destination_host: str = None) -> MythicPayloadRPCResponse:
        c2_list = []
        for c2 in resp.c2info:
            c2_list.append({
                "c2_profile": c2["name"],
                "c2_profile_parameters": c2["parameters"]
            })
        resp = await self.call(
            {
                "action": "build_payload_from_parameters",
                "task_id": self.task_id,
                "payload_type": resp.payload_type,
                "c2_profiles": c2_list,
                "filename": resp.filename,
                "tag": resp.tag,
                "commands": resp.commands,
                "build_parameters": resp.build_parameters,
                "destination_host": destination_host,
                "wrapped_payload": resp.wrapped_payload
            }
        )
        return MythicPayloadRPCResponse(resp)

    async def register_payload_on_host(self,
                                       uuid: str,
                                       host: str):
        """
        Register a payload on a host for linking purposes
        :param uuid:
        :param host:
        :return:
        """
        resp = await self.call(
            {
                "action": "register_payload_on_host",
                "task_id": self.task_id,
                "uuid": uuid,
                "host": host
            }
        )
        return MythicPayloadRPCResponse(resp)
