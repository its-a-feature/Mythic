from CommandBase import *
import json
from MythicResponseRPC import *


class SecurityInfoArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class SecurityInfoCommand(CommandBase):
    cmd = "security_info"
    needs_admin = False
    help_cmd = "security_info"
    description = 'This uses JXA to list some security information about the system by contacting the "System Events" application via Apple Events. This can cause a popup or be denied in Mojave and later'
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1201"]
    argument_class = SecurityInfoArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="Target Application of System Events",
            artifact_type="AppleEvent Sent",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
