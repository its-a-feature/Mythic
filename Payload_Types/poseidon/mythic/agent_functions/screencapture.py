from CommandBase import *
import json


class ScreencaptureArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class ScreencaptureCommand(CommandBase):
    cmd = "screencapture"
    needs_admin = False
    help_cmd = "screencapture"
    description = (
        "Capture a screenshot of the targets desktop (not implemented on Linux)."
    )
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = ScreencaptureArguments
    attackmapping = ["T1113"]
    browser_script = BrowserScript(script_name="screencapture", author="@djhohnstein")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
