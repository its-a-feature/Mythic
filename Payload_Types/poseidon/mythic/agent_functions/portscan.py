from CommandBase import *
import json


class PortScanArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "ports": CommandParameter(
                name="ports",
                type=ParameterType.String,
                description="List of ports to scan. Can use the dash separator to specify a range.",
            ),
            "hosts": CommandParameter(
                name="hosts",
                type=ParameterType.Array,
                description="List of hosts to scan",
            ),
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class PortScanCommand(CommandBase):
    cmd = "portscan"
    needs_admin = False
    help_cmd = "portscan"
    description = "Scan host(s) for open ports."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@djhohnstein"
    argument_class = PortScanArguments
    attackmapping = ["T1046"]
    browser_script = BrowserScript(script_name="portscan", author="@djhohnstein")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
