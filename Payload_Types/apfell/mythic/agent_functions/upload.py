from CommandBase import *
from MythicFileRPC import *
import json


class UploadArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "file": CommandParameter(
                name="file", type=ParameterType.File, description="file to upload"
            ),
            "remote_path": CommandParameter(
                name="remote_path",
                type=ParameterType.String,
                description="/remote/path/on/victim.txt",
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


class UploadCommand(CommandBase):
    cmd = "upload"
    needs_admin = False
    help_cmd = "upload"
    description = (
        "Upload a file to the target machine by selecting a file from your computer. "
    )
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = True
    author = "@its_a_feature_"
    attackmapping = ["T1132", "T1030", "T1105"]
    argument_class = UploadArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        original_file_name = json.loads(task.original_params)["file"]
        response = await MythicFileRPC(task).register_file(
            file=task.args.get_arg("file"),
            saved_file_name=original_file_name,
            delete_after_fetch=False,
        )
        if response.status == MythicStatus.Success:
            task.args.add_arg("file", response.agent_file_id)
        else:
            raise Exception("Error from Mythic: " + response.error_message)
        return task

    async def process_response(self, response: AgentResponse):
        pass
