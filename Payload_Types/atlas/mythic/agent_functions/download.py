from CommandBase import *
import json


class DownloadArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "file_path": CommandParameter(
                name="file_path",
                type=ParameterType.String,
                description="Path to remote file to be downloaded",
            )
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                self.add_arg("path", self.command_line)
        else:
            raise ValueError("Missing arguments")


class DownloadCommand(CommandBase):
    cmd = "download"
    needs_admin = False
    help_cmd = "download [path to remote file]"
    description = "Download a file from the victim machine to the apfell server in chunks (no need for quotes in the path). It will be saved to app/files/{operation name}/downloads/{hostname}/{filename}"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = True
    is_remove_file = False
    is_upload_file = False
    author = ""
    argument_class = DownloadArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
