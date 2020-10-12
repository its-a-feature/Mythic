from CommandBase import *
import json
from MythicResponseRPC import *


class ListAppsArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class ListAppsCommand(CommandBase):
    cmd = "list_apps"
    needs_admin = False
    help_cmd = "list_apps"
    description = "This uses NSApplication.RunningApplications api to get information about running applications."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = True
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1057"]
    argument_class = ListAppsArguments
    browser_script = BrowserScript(script_name="list_apps", author="@its_a_feature_")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="$.NSWorkspace.sharedWorkspace.runningApplications",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
