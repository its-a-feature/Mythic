from CommandBase import *
import json
from MythicResponseRPC import *


class ChromeJsArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "window": CommandParameter(
                name="window",
                type=ParameterType.Number,
                description="Window # from chrome_tabs",
            ),
            "javascript": CommandParameter(
                name="javascript",
                type=ParameterType.String,
                description="javascript to execute",
            ),
            "tab": CommandParameter(
                name="tab",
                type=ParameterType.Number,
                description="Tab # from chrome_tabs",
            ),
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                raise ValueError("Missing JSON arguments")
        else:
            raise ValueError("Missing arguments")


class ChromeJsCommand(CommandBase):
    cmd = "chrome_js"
    needs_admin = False
    help_cmd = "chrome_js"
    description = "This uses AppleEvents to execute the specified JavaScript code into a specific browser tab. The chrome_tabs function will specify for each tab the window/tab numbers that you can use for this function. Note: by default this ability is disabled in Chrome now, you will need to go to view->Developer->Allow JavaScript from Apple Events."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1106", "T1064"]
    argument_class = ChromeJsArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="Target Application of Chrome",
            artifact_type="AppleEvent Sent",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
