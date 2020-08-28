from CommandBase import *
from MythicFileRPC import *
import json


class JsimportArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "file": CommandParameter(
                name="file",
                type=ParameterType.File,
                description="Select a JXA file to upload",
            )
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                raise ValueError("Missing JSON arguments")
        else:
            raise ValueError("Missing arguments")
        pass


class JsimportCommand(CommandBase):
    cmd = "jsimport"
    needs_admin = False
    help_cmd = "jsimport"
    description = "import a JXA file into memory. Only one can be imported at a time."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = []
    argument_class = JsimportArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        original_file_name = json.loads(task.original_params)["file"]
        response = await MythicFileRPC(task).register_file(
            file=task.args.get_arg("file"),
            saved_file_name=original_file_name,
            delete_after_fetch=True,
        )
        if response.status == MythicStatus.Success:
            task.args.add_arg("file", response.agent_file_id)
        else:
            raise Exception("Error from Mythic: " + response.error_message)
        return task

    async def process_response(self, response: AgentResponse):
        pass
