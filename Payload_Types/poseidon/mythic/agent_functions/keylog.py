from CommandBase import *
import json


class KeylogArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class KeylogCommand(CommandBase):
    cmd = "keylog"
    needs_admin = False
    help_cmd = "keylog"
    description = "Keylog users as root on Linux."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = KeylogArguments
    attackmapping = ["T1056"]

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
