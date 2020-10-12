from CommandBase import *
import json
from MythicResponseRPC import *


class LsArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "path": CommandParameter(
                name="path",
                type=ParameterType.String,
                default_value=".",
                description="Path of file or folder on the current system to list",
            )
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                temp_json = json.loads(self.command_line)
                if "host" in temp_json:
                    # this means we have tasking from the file browser rather than the popup UI
                    # the apfell agent doesn't currently have the ability to do _remote_ listings, so we ignore it
                    self.add_arg("path", temp_json["path"] + "/" + temp_json["file"])
                    self.add_arg("file_browser", "true")
                else:
                    self.add_arg("path", temp_json["path"])
            else:
                self.add_arg("path", self.command_line)


class LsCommand(CommandBase):
    cmd = "ls"
    needs_admin = False
    help_cmd = "ls /path/to/file"
    description = "Get attributes about a file and display it to the user via API calls. No need for quotes and relative paths are fine"
    version = 1
    is_exit = False
    is_file_browse = True
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1106", "T1083"]
    argument_class = LsArguments
    browser_script = BrowserScript(script_name="ls", author="@its_a_feature_")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="fileManager.attributesOfItemAtPathError, fileManager.contentsOfDirectoryAtPathError",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
