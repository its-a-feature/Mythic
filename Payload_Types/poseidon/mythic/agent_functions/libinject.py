from CommandBase import *
import json


class LibinjectArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "pid": CommandParameter(
                name="pid",
                type=ParameterType.Number,
                description="PID of process to inject into.",
            ),
            "library": CommandParameter(
                name="library",
                type=ParameterType.String,
                description="Path to the dylib to inject",
            ),
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class LibinjectCommand(CommandBase):
    cmd = "libinject"
    needs_admin = True
    help_cmd = "libinject"
    description = "Inject a library from on-host into a process."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = LibinjectArguments
    attackmapping = ["T1055"]

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        if task.callback.integrity_level <= 2:
            raise Exception("Error: the libinject command requires elevated privileges")
        else:
            return task

    async def process_response(self, response: AgentResponse):
        pass
