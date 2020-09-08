from MythicBaseRPC import *


class MythicRPCResponse(RPCResponse):
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


class MythicCallbackRPC(MythicBaseRPC):
    # returns dictionary of `{"raw": raw_tasking, "encrypted": base64(uuid+encrypted_tasking)}`
    async def get_tasking(
        self, uuid: str, tasking_size: int = 1
    ) -> MythicRPCResponse:
        resp = await self.call(
            {
                "action": "get_tasking",
                "uuid": uuid,
                "tasking_size": tasking_size,
            }
        )
        return MythicRPCResponse(resp)

    async def add_route(
        self,
        source_uuid: str,
        destination_uuid: str,
        direction: int = 1,
        metadata: str = None,
    ) -> MythicRPCResponse:
        resp = await self.call(
            {
                "action": "add_route",
                "source": source_uuid,
                "destination": destination_uuid,
                "direction": direction,
                "metadata": metadata,
            }
        )
        return MythicRPCResponse(resp)

    async def remove_route(
        self,
        source_uuid: str,
        destination_uuid: str,
        direction: int = 1,
        metadata: str = None,
    ) -> MythicRPCResponse:
        resp = await self.call(
            {
                "action": "remove_route",
                "source": source_uuid,
                "destination": destination_uuid,
                "direction": direction,
                "metadata": metadata,
            }
        )
        return MythicRPCResponse(resp)

    async def get_callback_info(self, uuid: str) -> MythicRPCResponse:
        resp = await self.call({"action": "get_callback_info", "uuid": uuid})
        return MythicRPCResponse(resp)

    async def get_encryption_data(self, uuid: str, profile: str) -> MythicRPCResponse:
        resp = await self.call(
            {
                "action": "get_encryption_data",
                "uuid": uuid,
                "c2_profile": profile,
            }
        )
        return MythicRPCResponse(resp)

    async def update_callback_info(self, uuid: str, info: dict) -> MythicRPCResponse:
        resp = await self.call(
            {"action": "update_callback_info", "uuid": uuid, "data": info}
        )
        return MythicRPCResponse(resp)

    async def add_event_message(
        self, message: str, level: str = "info"
    ) -> MythicRPCResponse:
        resp = await self.call(
            {"action": "add_event_message", "level": level, "message": message}
        )
        return MythicRPCResponse(resp)
