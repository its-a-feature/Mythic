from MythicBaseRPC import *
import base64


class MythicCryptoRPCResponse(RPCResponse):
    def __init__(self, resp: RPCResponse):
        super().__init__(resp._raw_resp)
        if resp.status == MythicStatus.Success:
            self.data = resp.response["data"]
        else:
            self.data = None

    @property
    def data(self):
        return self._data

    @data.setter
    def data(self, data):
        self._data = data


class MythicCryptoRPC(MythicBaseRPC):
    async def encrypt_bytes(
        self, data: bytes, with_uuid: bool = False
    ) -> MythicCryptoRPCResponse:
        resp = await self.call(
            {
                "action": "encrypt_bytes",
                "data": base64.b64encode(data).decode(),
                "task_id": self.task_id,
                "with_uuid": with_uuid,
            }
        )
        return MythicCryptoRPCResponse(resp)

    async def decrypt_bytes(
        self, data: bytes, with_uuid: bool = False
    ) -> MythicCryptoRPCResponse:
        resp = await self.call(
            {
                "action": "decrypt_bytes",
                "task_id": self.task_id,
                "data": base64.b64encode(data).decode(),
                "with_uuid": with_uuid,
            }
        )
        return MythicCryptoRPCResponse(resp)
