from mythic_payloadtype_container.MythicCommandBase import *
import json
from mythic_payloadtype_container.MythicRPC import *
import sys


class LsArguments(TaskArguments):
    def __init__(self, command_line, **kwargs):
        super().__init__(command_line, **kwargs)
        self.args = [
            CommandParameter(
                name="path",
                type=ParameterType.String,
                default_value=".",
                description="Path of file or folder on the current system to list",
                parameter_group_info=[ParameterGroupInfo(
                    required=False
                )]
            ),
            CommandParameter(
                name="fetch_attributes",
                type=ParameterType.Boolean,
                default_value=False,
                description="Indicate if extended attributes should be fetched for this command",
                parameter_group_info=[ParameterGroupInfo(
                    required=False
                )]
            )
        ]

    async def parse_arguments(self):
        self.add_arg("path", self.command_line)

    async def parse_dictionary(self, dictionary):
        if "host" in dictionary:
            # then this came from the file browser
            self.add_arg("path", dictionary["path"] + "/" + dictionary["file"])
            self.add_arg("file_browser", type=ParameterType.Boolean, value=True)
        else:
            self.load_args_from_dictionary(dictionary)


class LsCommand(CommandBase):
    cmd = "ls"
    needs_admin = False
    help_cmd = "ls /path/to/file"
    description = "Get attributes about a file and display it to the user via API calls. No need for quotes and relative paths are fine"
    version = 2
    author = "@its_a_feature_"
    attackmapping = ["T1106", "T1083"]
    supported_ui_features = ["file_browser:list"]
    argument_class = LsArguments
    browser_script = [BrowserScript(script_name="ls", author="@its_a_feature_"),
                      BrowserScript(script_name="ls_new", author="@its_a_feature_", for_new_ui=True)]
    attributes = CommandAttributes(
        spawn_and_injectable=True,
        supported_os=[SupportedOS.MacOS],
    )

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicRPC().execute("create_artifact", task_id=task.id,
            artifact="fileManager.attributesOfItemAtPathError, fileManager.contentsOfDirectoryAtPathError",
            artifact_type="API Called",
        )
        if task.args.has_arg("file_browser") and task.args.get_arg("file_browser"):
            host = task.callback.host
            task.display_params = host + ":" + task.args.get_arg("path")
        else:
            task.display_params = task.args.get_arg("path")
        return task

    async def process_response(self, response: AgentResponse):
        pass
