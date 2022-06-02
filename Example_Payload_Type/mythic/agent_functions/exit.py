from mythic_payloadtype_container.MythicCommandBase import *
import json
from mythic_payloadtype_container.MythicRPC import *


class ExitArguments(TaskArguments):
    def __init__(self, command_line, **kwargs):
        super().__init__(command_line, **kwargs)
        self.args = []

    async def parse_arguments(self):
        pass


class ExitCommand(CommandBase):
    cmd = "exit"
    needs_admin = False
    help_cmd = "exit"
    description = "This exits the current apfell agent by leveraging the ObjectiveC bridge's NSApplication terminate function."
    version = 1
    supported_ui_features = ["callback_table:exit"]
    author = "@its_a_feature_"
    attackmapping = []
    argument_class = ExitArguments
    attributes = CommandAttributes(
        builtin=True
    )

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicRPC().execute("create_artifact", task_id=task.id,
            artifact="$.NSApplication.sharedApplication.terminate",
            artifact_type="API Called",
        )
        return task

    async def process_response(self, response: AgentResponse):
        pass
