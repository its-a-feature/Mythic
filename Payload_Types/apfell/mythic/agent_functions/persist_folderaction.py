from CommandBase import *
import json
from MythicResponseRPC import *


class PersistFolderactionArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "code": CommandParameter(
                name="code",
                type=ParameterType.String,
                description="osascript code",
                required=False,
            ),
            "url": CommandParameter(
                name="url",
                required=False,
                type=ParameterType.String,
                description="http://url.of.host/payload",
            ),
            "folder": CommandParameter(
                name="folder",
                type=ParameterType.String,
                description="/path/to/folder/to/watch",
            ),
            "script_path": CommandParameter(
                name="script_path",
                type=ParameterType.String,
                description="/path/to/script/to/create/on/disk",
            ),
            "language": CommandParameter(
                name="language",
                type=ParameterType.ChooseOne,
                choices=["JavaScript", "AppleScript"],
                description="If supplying custom 'code', this is the language",
            ),
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                raise ValueError("Missing JSON argument")
        else:
            raise ValueError("Missing arguments")


class PersistFolderactionCommand(CommandBase):
    cmd = "persist_folderaction"
    needs_admin = False
    help_cmd = "persist_folderaction"
    description = "Use Folder Actions to persist a compiled script on disk. You can either specify a 'URL' and automatically do a backgrounding one-liner, or supply your own code and language."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = []
    argument_class = PersistFolderactionArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="Target Application of System Events",
            artifact_type="AppleEvent Sent",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
