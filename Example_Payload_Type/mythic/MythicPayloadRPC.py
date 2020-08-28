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
            self.c2info = payload.response["c2info"]
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
            self.c2info = None
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
