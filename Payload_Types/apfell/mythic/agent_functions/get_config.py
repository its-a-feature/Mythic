from CommandBase import *
import json
from MythicResponseRPC import *


class GetConfigArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class GetConfigCommand(CommandBase):
    cmd = "get_config"
    needs_admin = False
    help_cmd = "get_config"
    description = "Gets the current running config via the C2 class"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1082"]
    argument_class = GetConfigArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="$.NSProcessInfo.processInfo.*, $.NSHost.currentHost.*",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
