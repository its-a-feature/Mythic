from CommandBase import *
import json


class KeysArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "command": CommandParameter(
                name="command",
                type=ParameterType.ChooseOne,
                description="Choose a way to interact with keys.",
                choices=[
                    "dumpsession",
                    "dumpuser",
                    "dumpprocess",
                    "dumpthreads",
                    "search",
                ],
            ),
            "keyword": CommandParameter(
                name="keyword",
                type=ParameterType.String,
                description="Name of the key to search for",
                required=False,
            ),
            "typename": CommandParameter(
                name="typename",
                type=ParameterType.ChooseOne,
                description="Choose the type of key",
                choices=["keyring", "user", "login", "logon", "session"],
                required=False,
            ),
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class KeysCommand(CommandBase):
    cmd = "keys"
    needs_admin = False
    help_cmd = "keys"
    description = "Interact with the linux keyring."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = KeysArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
