from CommandBase import *
import json


class DrivesArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class DrivesCommand(CommandBase):
    cmd = "drives"
    needs_admin = False
    help_cmd = "drives"
    description = "Get information about mounted drives on Linux hosts only."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = DrivesArguments
    attackmapping = ["T1135"]

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
