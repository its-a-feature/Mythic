from CommandBase import *
import json
from MythicResponseRPC import *


class TerminalsSendArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "window": CommandParameter(
                name="window",
                type=ParameterType.Number,
                description="window # to send command to",
            ),
            "tab": CommandParameter(
                name="tab",
                type=ParameterType.Number,
                description="tab # to send command to",
            ),
            "command": CommandParameter(
                name="command",
                type=ParameterType.String,
                description="command to execute",
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


class TerminalsSendCommand(CommandBase):
    cmd = "terminals_send"
    needs_admin = False
    help_cmd = "terminals_send"
    description = """
    This uses AppleEvents to inject the shell command, {command}, into the specified terminal shell as if the user typed it from the keyboard. This is pretty powerful. Consider the instance where the user is SSH-ed into another machine via terminal - with this you can inject commands to run on the remote host. Just remember, the user will be able to see the command, but you can always see what they see as well with the "terminals_read contents" command.
    """
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1059", "T1184"]
    argument_class = TerminalsSendArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="{}".format(
                task.args.get_arg("command"),
            ),
            artifact_type="Process Create",
        )
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="Target Application of Terminal",
            artifact_type="AppleEvent Sent",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
