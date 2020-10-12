from CommandBase import *
import json
from MythicResponseRPC import *


class SystemInfoArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class SystemInfoCommand(CommandBase):
    cmd = "system_info"
    needs_admin = False
    help_cmd = "system_info"
    description = "This uses JXA to get some system information. It doesn't send Apple Events to any other applications though, so it shouldn't cause popups."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1082"]
    argument_class = SystemInfoArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="currentApp.systemInfo()",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
