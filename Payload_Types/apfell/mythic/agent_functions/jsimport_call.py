from CommandBase import *
import json


class JsimportCallArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "command": CommandParameter(
                name="command",
                type=ParameterType.String,
                description="The command to execute within a file loaded via jsimport",
            )
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                self.add_arg("command", self.command_line)
        else:
            raise ValueError("Missing arguments")
        pass


class JsimportCallCommand(CommandBase):
    cmd = "jsimport_call"
    needs_admin = False
    help_cmd = "jsimport_call function_call();"
    description = "call a function from within the JS file that was imported with 'jsimport'. This function call is appended to the end of the jsimport code and called via eval."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1155", "T1064"]
    argument_class = JsimportCallArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
