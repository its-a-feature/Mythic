from CommandBase import *
import json
from MythicResponseRPC import *


class RunArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "args": CommandParameter(
                name="args",
                type=ParameterType.Array,
                description="Arguments to pass to the binary",
            ),
            "path": CommandParameter(
                name="path",
                type=ParameterType.String,
                description="Full path to binary to execute",
            ),
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                raise ValueError("Missing JSON arguments")
        else:
            raise ValueError("Missing arguments")


class RunCommand(CommandBase):
    cmd = "run"
    needs_admin = False
    help_cmd = "run"
    description = "The command uses the ObjectiveC bridge to spawn that process with those arguments on the computer and get your output back. It is not interactive and does not go through a shell, so be sure to specify the full path to the binary you want to run."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1106"]
    argument_class = RunArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="{} {}".format(
                task.args.get_arg("path"),
                " ".join(task.args.get_arg("args"))
            ),
            artifact_type="Process Create",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
