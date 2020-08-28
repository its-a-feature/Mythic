from CommandBase import *
import json


class JobKillArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "job_id": CommandParameter(
                name="job_id",
                type=ParameterType.String,
                description="The Job Id for the running job to be killed",
            )
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                self.add_arg("job_id", self.command_line)
        else:
            raise ValueError("Missing arguments")


class JobKillCommand(CommandBase):
    cmd = "jobkill"
    needs_admin = False
    help_cmd = "jobkill [job id]"
    description = "Kills a running job and removes it from the atlas instance's list of running jobs."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = ""
    argument_class = JobKillArguments
    attackmapping = []

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
