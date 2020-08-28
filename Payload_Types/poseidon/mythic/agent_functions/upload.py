from CommandBase import *
import json
from MythicFileRPC import *


class UploadArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "remote_path": CommandParameter(
                name="remote_path",
                type=ParameterType.String,
                description="Remote file path.",
            ),
            "file_id": CommandParameter(
                name="file_id",
                type=ParameterType.File,
                description="Select the file to upload",
            ),
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class UploadCommand(CommandBase):
    cmd = "upload"
    needs_admin = False
    help_cmd = "upload"
    description = "upload a file to the target."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = True
    author = "@xorrior"
    argument_class = UploadArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        original_file_name = json.loads(task.original_params)["file_id"]
        response = await MythicFileRPC(task).register_file(
            file=task.args.get_arg("file_id"),
            saved_file_name=original_file_name,
            delete_after_fetch=False,
        )
        if response.status == MythicStatus.Success:
            task.args.add_arg("file_id", response.agent_file_id)
        else:
            raise Exception("Error from Mythic: " + response.error_message)
        return task

    async def process_response(self, response: AgentResponse):
        pass
