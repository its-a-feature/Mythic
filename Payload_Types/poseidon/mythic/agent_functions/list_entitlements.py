from CommandBase import *
import json


class ListEntitlementsArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "pid": CommandParameter(
                name="pid",
                type=ParameterType.Number,
                description="PID of process to query (-1 for all)",
            )
        }

    async def parse_arguments(self):
        self.load_args_from_json_string(self.command_line)


class ListEntitlementCommand(CommandBase):
    cmd = "list_entitlements"
    needs_admin = False
    help_cmd = "list_entitlements"
    description = "Use CSOps Syscall to list the entitlements for processes (-1 for all processes)"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    argument_class = ListEntitlementsArguments
    attackmapping = []
    browser_script = BrowserScript(script_name="list_entitlements", author="@its_a_feature_")

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        return task

    async def process_response(self, response: AgentResponse):
        pass
