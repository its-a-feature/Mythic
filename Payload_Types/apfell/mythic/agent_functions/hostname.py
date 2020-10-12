from CommandBase import *
import json
from MythicResponseRPC import *


class HostnameArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class HostnameCommand(CommandBase):
    cmd = "hostname"
    needs_admin = False
    help_cmd = "hostname"
    description = "Get the various hostnames associated with the host, including the NETBIOS name if the computer is domain joined"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = []
    argument_class = HostnameArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="$.NSHost.currentHost.names",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
