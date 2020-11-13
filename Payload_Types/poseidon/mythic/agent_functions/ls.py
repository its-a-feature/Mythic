from CommandBase import *
import json


class LsArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        self.add_arg("file_browser", False, type=ParameterType.Boolean)
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                tmp_json = json.loads(self.command_line)
                self.command_line = tmp_json["path"] + "/" + tmp_json["file"]
                self.add_arg("file_browser", True, type=ParameterType.Boolean)
            self.add_arg("path", self.command_line)
        else:
            self.add_arg("path", ".")


class LsCommand(CommandBase):
    cmd = "ls"
    needs_admin = False
    help_cmd = "ls [directory]"
    description = "List directory."
    version = 1
    is_exit = False
    is_file_browse = True
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = LsArguments
    attackmapping = ["T1083"]
    browser_script = BrowserScript(script_name="ls", author="@its_a_feature_")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
