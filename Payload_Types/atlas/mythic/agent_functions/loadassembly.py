from CommandBase import *
import json
from MythicFileRPC import *


class LoadAssemblyArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "assembly_id": CommandParameter(
                name="assembly_id",
                type=ParameterType.File,
                description="",
                required=False,
            )
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)


class LoadAssemblyCommand(CommandBase):
    cmd = "loadassembly"
    needs_admin = False
    help_cmd = "loadassembly"
    description = "Load an arbitrary .NET assembly via Assembly.Load and track the assembly FullName to call for execution with the runassembly command. If assembly is loaded through Apfell's services -> host file, then operators can simply specify the filename from the uploaded file"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = ""
    argument_class = LoadAssemblyArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        task.args.add_arg("remote_path", "")
        if task.args.get_arg("assembly_id") is None:
            # the user supplied an assembly name instead of uploading one, see if we can find it
            resp = await MythicFileRPC(task).get_file_by_name(task.args.command_line)
            if resp.status == MythicStatus.Success:
                task.args.add_arg("assembly_id", resp.agent_file_id)
            else:
                raise ValueError(
                    "Failed to find file:  {}".format(task.args.command_line)
                )
        else:
            filename = json.loads(task.original_params)["assembly_id"]
            resp = await MythicFileRPC(task).register_file(
                file=task.args.get_arg("assembly_id"),
                saved_file_name=filename,
                delete_after_fetch=False,
            )
            if resp.status == MythicStatus.Success:
                task.args.add_arg("assembly_id", resp.agent_file_id)
            else:
                raise ValueError(
                    "Failed to register file with Mythic: {}".format(resp.error_message)
                )
        return task

    async def process_response(self, response: AgentResponse):
        pass
