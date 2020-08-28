from MythicBaseRPC import *


class MythicC2RPCResponse(RPCResponse):
    def __init__(self, resp: RPCResponse):
        super().__init__(resp._raw_resp)
        if resp.status == MythicStatus.Success:
            self.data = resp.response
        else:
            self.data = None

    @property
    def data(self):
        return self._data

    @data.setter
    def data(self, data):
        self._data = data


class MythicC2RPC(MythicBaseRPC):
    async def call_c2_func(
        self, c2_profile: str, function_name: str, message: str
    ) -> MythicC2RPCResponse:
        resp = await self.call(
            {"action": function_name, "message": message, "task_id": self.task_id},
            c2_profile,
        )
        return MythicC2RPCResponse(resp)
