from CommandBase import *
import json


def positiveTime(val):
    if val < 0:
        raise ValueError("Value must be positive")


class SleepArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "jitter": CommandParameter(
                name="jitter",
                type=ParameterType.Number,
                validation_func=positiveTime,
                required=False,
                description="Percentage of C2's interval to use as jitter",
            ),
            "interval": CommandParameter(
                name="interval",
                type=ParameterType.Number,
                required=False,
                validation_func=positiveTime,
                description="Number of seconds between checkins",
            ),
        }

    async def parse_arguments(self):
        if self.command_line[0] != "{":
            pieces = self.command_line.split(" ")
            if len(pieces) == 1:
                self.add_arg("interval", pieces[0])
            elif len(pieces) == 2:
                self.add_arg("interval", pieces[0])
                self.add_arg("jitter", pieces[1])
            else:
                raise Exception("Wrong number of parameters, should be 1 or 2")
        else:
            self.load_args_from_json_string(self.command_line)


class SleepCommand(CommandBase):
    cmd = "sleep"
    needs_admin = False
    help_cmd = "sleep [interval] [jitter]"
    description = "Modify the time between callbacks in seconds."
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = ["T1029"]
    argument_class = SleepArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
