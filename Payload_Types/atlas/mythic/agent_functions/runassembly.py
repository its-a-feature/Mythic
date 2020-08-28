from CommandBase import *
import json
from MythicFileRPC import *


class RunAssemblyArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "assembly_id": CommandParameter(
                name="assembly_id", type=ParameterType.String, description=""
            ),
            "args": CommandParameter(
                name="args", type=ParameterType.String, required=False
            ),
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                pieces = self.command_line.split(" ")
                self.add_arg("assembly_id", pieces[0])
                self.add_arg("args", " ".join(pieces[1:]))
        else:
            raise ValueError("Missing required arguments")


class RunAssemblyCommand(CommandBase):
    cmd = "runassembly"
    needs_admin = False
    help_cmd = "runassembly [filename] [assembly arguments]"
    description = "Execute the entrypoint of a assembly loaded by the loadassembly command and redirect the console output back to the Apfell server."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = ""
    argument_class = RunAssemblyArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicFileRPC(task).get_file_by_name(
            task.args.get_arg("assembly_id")
        )
        if resp.status == MythicStatus.Success:
            task.args.add_arg("assembly_id", resp.agent_file_id)
        else:
            raise ValueError(
                "Failed to find file:  {}".format(task.args.get_arg("assembly_id"))
            )
        return task

    async def process_response(self, response: AgentResponse):
        pass
