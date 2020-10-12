from CommandBase import *
import json
from MythicFileRPC import *


class UploadArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "assembly_id": CommandParameter(
                name="assembly_id", type=ParameterType.File, description=""
            ),
            "remote_path": CommandParameter(
                name="remote_path",
                type=ParameterType.String,
                description="Take a file from the database and store it on disk through the callback.",
            ),
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                raise ValueError("Missing JSON argument")
        else:
            raise ValueError("Missing required parameters")


class UploadCommand(CommandBase):
    cmd = "upload"
    needs_admin = False
    help_cmd = "upload"
    description = "Upload a file to the remote host"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = ""
    argument_class = UploadArguments
    attackmapping = ["T1132", "T1030"]

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        filename = json.loads(task.original_params)["assembly_id"]
        resp = await MythicFileRPC(task).register_file(
            file=task.args.get_arg("assembly_id"),
            saved_file_name=filename,
            delete_after_fetch=False,
        )
        if resp.status == MythicStatus.Success:
            task.args.add_arg("assembly_id", resp.agent_file_id)
        else:
            raise ValueError(
                "Failed to register file with Mythic: {}".format(resp.error_message)
            )
        return task

    async def process_response(self, response: AgentResponse):
        pass
