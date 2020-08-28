from MythicBaseRPC import *
import base64


class MythicResponseRPCResponse(RPCResponse):
    def __init__(self, resp: RPCResponse):
        super().__init__(resp._raw_resp)


class MythicResponseRPC(MythicBaseRPC):
    async def user_output(self, user_output: str) -> MythicResponseRPCResponse:
        resp = await self.call(
            {
                "action": "user_output",
                "user_output": user_output,
                "task_id": self.task_id,
            }
        )
        return MythicResponseRPCResponse(resp)

    async def update_callback(self, callback_info: dict) -> MythicResponseRPCResponse:
        resp = await self.call(
            {
                "action": "update_callback",
                "callback_info": callback_info,
                "task_id": self.task_id,
            }
        )
        return MythicResponseRPCResponse(resp)

    async def register_artifact(
        self, artifact_instance: str, artifact_type: str, host: str = None
    ) -> MythicResponseRPCResponse:
        resp = await self.call(
            {
                "action": "register_artifact",
                "task_id": self.task_id,
                "host": host,
                "artifact_instance": artifact_instance,
                "artifact": artifact_type,
            }
        )
        return MythicResponseRPCResponse(resp)
