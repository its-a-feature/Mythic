from mythic_payloadtype_container.MythicCommandBase import *
import json


class JsimportCallArguments(TaskArguments):
    def __init__(self, command_line, **kwargs):
        super().__init__(command_line, **kwargs)
        self.args = [
            CommandParameter(
                name="command",
                type=ParameterType.String,
                description="The command to execute within a file loaded via jsimport",
                parameter_group_info=[ParameterGroupInfo()]
            )
        ]

    async def parse_arguments(self):
        if len(self.command_line) == 0:
            raise ValueError("Must supply a path to a file")
        self.add_arg("command", self.command_line)

    async def parse_dictionary(self, dictionary_arguments):
        if "command" in dictionary_arguments:
            self.add_arg("command", dictionary_arguments["command"])
        else:
            raise ValueError("Missing 'command' argument")


class JsimportCallCommand(CommandBase):
    cmd = "jsimport_call"
    needs_admin = False
    help_cmd = "jsimport_call function_call();"
    description = "call a function from within the JS file that was imported with 'jsimport'. This function call is appended to the end of the jsimport code and called via eval."
    version = 1
    author = "@its_a_feature_"
    attackmapping = ["T1059.002"]
    argument_class = JsimportCallArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
