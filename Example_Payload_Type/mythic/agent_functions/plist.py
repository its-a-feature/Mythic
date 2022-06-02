from mythic_payloadtype_container.MythicCommandBase import *
import json
from mythic_payloadtype_container.MythicRPC import *


class PlistArguments(TaskArguments):
    def __init__(self, command_line, **kwargs):
        super().__init__(command_line, **kwargs)
        self.args = [
            CommandParameter(
                name="filename",
                type=ParameterType.String,
                description="full filename path of type is just read",
                parameter_group_info=[ParameterGroupInfo(group_name="read")]
            ),
            CommandParameter(
                name="type",
                type=ParameterType.ChooseOne,
                choices=["readLaunchAgents", "readLaunchDaemons"],
                description="read all launchagents/launchdaemons",
                default_value="readLaunchAgents",
                parameter_group_info=[ParameterGroupInfo()]
            ),
        ]

    async def parse_arguments(self):
        if len(self.command_line) == 0:
            raise ValueError("Must supply arguments")
        raise ValueError("Must supply named arguments or use the modal")

    async def parse_dictionary(self, dictionary_arguments):
        self.load_args_from_dictionary(dictionary_arguments)


class PlistCommand(CommandBase):
    cmd = "plist"
    needs_admin = False
    help_cmd = "plist"
    description = "Read plists and their associated attributes for attempts to privilege escalate."
    version = 1
    author = "@its_a_feature_"
    attackmapping = ["T1083", "T1007"]
    argument_class = PlistArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicRPC().execute("create_artifact", task_id=task.id,
            artifact="$.NSMutableDictionary.alloc.initWithContentsOfFile, fileManager.attributesOfItemAtPathError",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
