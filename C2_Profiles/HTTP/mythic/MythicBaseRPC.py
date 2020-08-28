from aio_pika import connect_robust, IncomingMessage, Message
import asyncio
import uuid
import json
from enum import Enum


class MythicStatus(Enum):
    Success = "success"
    Error = "error"


class RPCResponse:
    def __init__(self, resp: dict):
        self._raw_resp = resp
        if resp["status"] == "success":
            self.status = MythicStatus.Success
            self.response = resp["response"] if "response" in resp else ""
            self.error_message = None
        else:
            self.status = MythicStatus.Error
            self.error_message = resp["error"]
            self.response = None

    @property
    def status(self):
        return self._status

    @status.setter
    def status(self, status):
        self._status = status

    @property
    def error_message(self):
        return self._error_message

    @error_message.setter
    def error_message(self, error_message):
        self._error_message = error_message

    @property
    def response(self):
        return self._response

    @response.setter
    def response(self, response):
        self._response = response


class MythicBaseRPC:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.callback_queue = None
        self.futures = {}
        self.loop = asyncio.get_event_loop()

    async def connect(self):
        config_file = open("/Mythic/mythic/rabbitmq_config.json", "rb")
        main_config = json.loads(config_file.read().decode("utf-8"))
        config_file.close()
        self.connection = await connect_robust(
            host=main_config["host"],
            login=main_config["username"],
            password=main_config["password"],
            virtualhost=main_config["virtual_host"],
        )
        self.channel = await self.connection.channel()
        self.callback_queue = await self.channel.declare_queue(exclusive=True)
        await self.callback_queue.consume(self.on_response)

        return self

    def on_response(self, message: IncomingMessage):
        future = self.futures.pop(message.correlation_id)
        future.set_result(message.body)

    async def call(self, n, receiver: str = None) -> RPCResponse:
        if self.connection is None:
            await self.connect()
        correlation_id = str(uuid.uuid4())
        future = self.loop.create_future()

        self.futures[correlation_id] = future
        if receiver is None:
            router = "c2rpc_queue"
        else:
            router = "{}_rpc_queue".format(receiver)
        await self.channel.default_exchange.publish(
            Message(
                json.dumps(n).encode(),
                content_type="application/json",
                correlation_id=correlation_id,
                reply_to=self.callback_queue.name,
            ),
            routing_key=router,
        )

        return RPCResponse(json.loads(await future))
