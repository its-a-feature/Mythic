from CommandBase import *
import json


class DownloadArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                tmp_json = json.loads(self.command_line)
                self.command_line = tmp_json["path"] + "/" + tmp_json["file"]


class DownloadCommand(CommandBase):
    cmd = "download"
    needs_admin = False
    help_cmd = "download /remote/path/to/file"
    description = "Download a file from the target."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = True
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = DownloadArguments
    attackmapping = ["T1022", "T1030", "T1041"]
    browser_script = BrowserScript(script_name="download", author="@djhohnstein")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
