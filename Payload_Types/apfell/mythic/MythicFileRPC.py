from MythicBaseRPC import *
import base64
import uuid


class MythicFileRPCResponse(RPCResponse):
    def __init__(self, file: RPCResponse):
        super().__init__(file._raw_resp)
        if file.status == MythicStatus.Success:
            self.agent_file_id = file.response["agent_file_id"]
            self.task = file.response["task"]
            self.timestamp = file.response["timestamp"]
            self.deleted = file.response["deleted"]
            self.operator = file.response["operator"]
            self.delete_after_fetch = file.response["delete_after_fetch"]
            self.filename = file.response["filename"]
            self.md5 = file.response["md5"]
            self.sha1 = file.response["sha1"]
            self.chunks_received = file.response["chunks_received"]
            self.total_chunks = file.response["total_chunks"]
            if "contents" in file.response:
                self.contents = base64.b64decode(file.response["contents"])
            else:
                self.contents = None
        else:
            self.agent_file_id = None
            self.task = None
            self.timestamp = None
            self.deleted = None
            self.operator = None
            self.delete_after_fetch = None
            self.filename = None
            self.md5 = None
            self.sha1 = None
            self.chunks_received = None
            self.total_chunks = None
            self.contents = None

    @property
    def agent_file_id(self):
        return self._agent_file_id

    @agent_file_id.setter
    def agent_file_id(self, agent_file_id):
        self._agent_file_id = agent_file_id

    @property
    def task(self):
        return self._task

    @task.setter
    def task(self, task):
        self._task = task

    @property
    def timestamp(self):
        return self._timestamp

    @timestamp.setter
    def timestamp(self, timestamp):
        self._timestamp = timestamp

    @property
    def deleted(self):
        return self._deleted

    @deleted.setter
    def deleted(self, deleted):
        self._deleted = deleted

    @property
    def operator(self):
        return self._operator

    @operator.setter
    def operator(self, operator):
        self._operator = operator

    @property
    def delete_after_fetch(self):
        return self._delete_after_fetch

    @delete_after_fetch.setter
    def delete_after_fetch(self, delete_after_fetch):
        self._delete_after_fetch = delete_after_fetch

    @property
    def filename(self):
        return self._filename

    @filename.setter
    def filename(self, filename):
        self._filename = filename

    @property
    def md5(self):
        return self._md5

    @md5.setter
    def md5(self, md5):
        self._md5 = md5

    @property
    def sha1(self):
        return self._sha1

    @sha1.setter
    def sha1(self, sha1):
        self._sha1 = sha1

    @property
    def chunks_received(self):
        return self._chunks_received

    @chunks_received.setter
    def chunks_received(self, chunks_received):
        self._chunks_received = chunks_received

    @property
    def total_chunks(self):
        return self._total_chunks

    @total_chunks.setter
    def total_chunks(self, total_chunks):
        self._total_chunks = total_chunks

    @property
    def contents(self):
        return self._contents

    @contents.setter
    def contents(self, contents):
        self._contents = contents


class MythicFileRPC(MythicBaseRPC):
    async def register_file(
        self,
        file: bytes,
        delete_after_fetch: bool = None,
        saved_file_name: str = None,
        remote_path: str = None,
        is_screenshot: bool = None,
        is_download: bool = None,
    ) -> MythicFileRPCResponse:
        resp = await self.call(
            {
                "action": "register_file",
                "file": base64.b64encode(file).decode(),
                "delete_after_fetch": delete_after_fetch
                if delete_after_fetch is not None
                else True,
                "saved_file_name": saved_file_name
                if saved_file_name is not None
                else str(uuid.uuid4()),
                "task_id": self.task_id,
                "remote_path": remote_path if remote_path is not None else "",
                "is_screenshot": is_screenshot if is_screenshot is not None else False,
                "is_download": is_download if is_download is not None else False,
            }
        )
        return MythicFileRPCResponse(resp)

    async def get_file_by_name(self, filename: str) -> MythicFileRPCResponse:
        resp = await self.call(
            {
                "action": "get_file_by_name",
                "task_id": self.task_id,
                "filename": filename,
            }
        )
        return MythicFileRPCResponse(resp)
