from CommandBase import *
import json


class CdArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class CdCommand(CommandBase):
    cmd = "cd"
    needs_admin = False
    help_cmd = "cd [new directory]"
    description = "Change working directory (can be relative, but no ~)."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = CdArguments
    attackmapping = ["T1005"]

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
