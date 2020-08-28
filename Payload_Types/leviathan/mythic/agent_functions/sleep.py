from CommandBase import *
import json


class SleepArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "sleep": CommandParameter(
                name="sleep",
                type=ParameterType.Number,
                description="Adjust the callback interval in seconds",
            ),
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class SleepCommand(CommandBase):
    cmd = "sleep"
    needs_admin = False
    help_cmd = 'sleep {"sleep":10}'
    description = "Change the sleep interval for an agent"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = SleepArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
