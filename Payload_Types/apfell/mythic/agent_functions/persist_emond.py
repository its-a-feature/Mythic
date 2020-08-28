from CommandBase import *
import json


class PersistEmondArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "rule_name": CommandParameter(
                name="rule_name",
                type=ParameterType.String,
                description="Rule name for inside of the plist",
            ),
            "payload_type": CommandParameter(
                name="payload_type",
                type=ParameterType.ChooseOne,
                choices=["oneliner-jxa", "custom_bash-c"],
            ),
            "url": CommandParameter(
                name="url",
                type=ParameterType.String,
                description="url of payload for oneliner-jxa for download cradle",
                required=False,
            ),
            "command": CommandParameter(
                name="command",
                type=ParameterType.String,
                required=False,
                description="Command if type is custom_bash-c to execute via /bin/bash -c",
            ),
            "file_name": CommandParameter(
                name="file_name",
                type=ParameterType.String,
                description="Name of plist in /etc/emond.d/rules/",
            ),
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                raise ValueError("missing JSON arguments")
        else:
            raise ValueError("Missing arguments")
        pass


class PersistEmondCommand(CommandBase):
    cmd = "persist_emond"
    needs_admin = False
    help_cmd = "persist_emond"
    description = "Create persistence with an emond plist file in /etc/emond.d/rules/ and a .DS_Store file to trigger it"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1150"]
    argument_class = PersistEmondArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
