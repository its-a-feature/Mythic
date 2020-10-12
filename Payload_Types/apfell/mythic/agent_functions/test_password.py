from CommandBase import *
import json
from MythicResponseRPC import *


class TestPasswordArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "password": CommandParameter(
                name="password",
                type=ParameterType.Credential_Value,
                description="Password to test",
            ),
            "username": CommandParameter(
                name="username",
                type=ParameterType.Credential_Account,
                description="Local user to test against",
            ),
        }

    async def parse_arguments(self):
        if self.command_line[0] != "{":
            pieces = self.command_line.split(" ")
            if len(pieces) < 2:
                raise Exception("Wrong number of parameters, should be 2")
            self.add_arg("username", pieces[0])
            self.add_arg("password", " ".join(pieces[1:]))
        else:
            self.load_args_from_json_string(self.command_line)


class TestPasswordCommand(CommandBase):
    cmd = "test_password"
    needs_admin = False
    help_cmd = "test_password username password"
    description = "Tests a password against a user to see if it's valid via an API call"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1110"]
    argument_class = TestPasswordArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="$.CBIdentity.identityWithNameAuthority",
            artifact_type="API Called",
        )
        resp = await MythicResponseRPC(task).register_artifact(
            artifact_instance="user.authenticateWithPassword",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
