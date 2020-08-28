from CommandBase import *
import json


class SSHAuthArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "username": CommandParameter(
                name="username",
                type=ParameterType.String,
                description="Authenticate to the designated hosts using this username.",
            ),
            "source": CommandParameter(
                name="source",
                type=ParameterType.String,
                description="If doing SCP, this is the source file",
                required=False,
                default_value="",
            ),
            "destination": CommandParameter(
                name="destination",
                type=ParameterType.String,
                description="If doing SCP, this is the destination file",
                required=False,
                default_value="",
            ),
            "private_key": CommandParameter(
                name="private_key",
                type=ParameterType.String,
                description="Authenticate to the designated hosts using this private key",
                required=False,
            ),
            "port": CommandParameter(
                name="port",
                type=ParameterType.Number,
                description="SSH Port if different than 22",
                default_value="22",
            ),
            "password": CommandParameter(
                name="password",
                type=ParameterType.String,
                description="Authenticate to the designated hosts using this password",
                required=False,
                default_value="",
            ),
            "hosts": CommandParameter(
                name="hosts",
                type=ParameterType.Array,
                description="Hosts that you will auth to",
            ),
            "command": CommandParameter(
                name="command",
                type=ParameterType.String,
                description="Command to execute on remote systems if not doing SCP",
                required=False,
                default_value="",
            ),
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class SSHAuthCommand(CommandBase):
    cmd = "sshauth"
    needs_admin = False
    help_cmd = "sshauth"
    description = "SSH to specified host(s) using the designated credentials. You can also use this to execute a specific command on the remote hosts via SSH or use it to SCP files."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@xorrior"
    argument_class = SSHAuthArguments
    attackmapping = ["T1110"]
    browser_script = BrowserScript(script_name="sshauth", author="@djhohnstein")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
