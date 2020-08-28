from CommandBase import *
from MythicSocksRPC import *


class SocksArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "action": CommandParameter(
                name="action",
                type=ParameterType.ChooseOne,
                choices=["start", "stop"],
                description="Start or Stop socks through this callback.",
            ),
            "port": CommandParameter(
                name="port",
                type=ParameterType.Number,
                description="Port number on Mythic server to open for socksv5",
            ),
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class SocksCommand(CommandBase):
    cmd = "socks"
    needs_admin = False
    help_cmd = "socks"
    description = "start or stop socks."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = SocksArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        if task.args.get_arg("action") == "start":
            resp = await MythicSocksRPC(task).start_socks(task.args.get_arg("port"))
            if resp.status != MythicStatus.Success:
                task.status = MythicStatus.Error
                raise Exception(resp.error_message)
        else:
            resp = await MythicSocksRPC(task).stop_socks()
            if resp.status != MythicStatus.Success:
                task.status = MythicStatus.Error
                raise Exception(resp.error_message)
        return task

    async def process_response(self, response: AgentResponse):
        pass
