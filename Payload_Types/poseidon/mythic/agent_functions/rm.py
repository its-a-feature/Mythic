from CommandBase import *
import json


class RmArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                tmp_json = json.loads(self.command_line)
                self.command_line = tmp_json["path"] + "/" + tmp_json["file"]


class RmCommand(CommandBase):
    cmd = "rm"
    needs_admin = False
    help_cmd = "rm [path]"
    description = "Delete a file."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = True
    is_upload_file = False
    author = "@xorrior"
    argument_class = RmArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
