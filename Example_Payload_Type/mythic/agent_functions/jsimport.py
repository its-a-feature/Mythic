from mythic_payloadtype_container.MythicCommandBase import *
from mythic_payloadtype_container.MythicRPC import *


class JsimportArguments(TaskArguments):
    def __init__(self, command_line, **kwargs):
        super().__init__(command_line, **kwargs)
        self.args = [
            CommandParameter(
                name="file",
                type=ParameterType.File,
                description="Select a JXA file to upload",
                parameter_group_info=[ParameterGroupInfo()]
            )
        ]

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                raise ValueError("Missing JSON arguments")
        else:
            raise ValueError("Missing arguments")
        pass

    async def parse_dictionary(self, dictionary_arguments):
        if "file" in dictionary_arguments:
            self.add_arg("file", dictionary_arguments["file"])
        else:
            raise ValueError("Missing 'file' argument")


class JsimportCommand(CommandBase):
    cmd = "jsimport"
    needs_admin = False
    help_cmd = "jsimport"
    description = "import a JXA file into memory"
    version = 1
    author = "@its_a_feature_"
    attackmapping = ["T1020", "T1030", "T1041", "T1620", "T1105"]
    argument_class = JsimportArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        file_resp = await MythicRPC().execute("get_file",
                                              file_id=task.args.get_arg("file"),
                                              task_id=task.id,
                                              get_contents=False)
        if file_resp.status == MythicRPCStatus.Success:
            original_file_name = file_resp.response[0]["filename"]
        else:
            raise Exception("Error from Mythic: " + str(file_resp.error))
        task.display_params = f"{original_file_name} into memory"
        file_resp = await MythicRPC().execute("update_file",
                                              file_id=task.args.get_arg("file"),
                                              delete_after_fetch=False,
                                              comment="Uploaded into memory for jsimport")

        return task

    async def process_response(self, response: AgentResponse):
        pass
