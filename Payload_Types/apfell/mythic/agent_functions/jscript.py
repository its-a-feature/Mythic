from CommandBase import *
import json


class JscriptArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "command": CommandParameter(
                name="command",
                type=ParameterType.String,
                description="The JXA command to execute",
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


class JscriptCommand(CommandBase):
    cmd = "jscript"
    needs_admin = False
    help_cmd = "jscript {command}"
    description = "This runs the JavaScript command, {command}, and returns its output via an eval(). The output will get passed through ObjC.deepUnwrap to parse out basic data types from ObjectiveC and get strings back"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1064"]
    argument_class = JscriptArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
