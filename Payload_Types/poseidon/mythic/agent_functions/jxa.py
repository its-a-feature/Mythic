from CommandBase import *
import base64


class JxaArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "code": CommandParameter(
                name="code",
                type=ParameterType.String,
                description="JXA Code to execute.",
            )
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class JxaCommand(CommandBase):
    cmd = "jxa"
    needs_admin = False
    help_cmd = 'jxa {  "code": "ObjC.import(\'Cocoa\'); $.NSBeep();" }'
    description = "Execute jxa code."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = JxaArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        task.args.add_arg(
            "code", base64.b64encode(task.args.get_arg("code").encode()).decode()
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
