from mythic_payloadtype_container.MythicCommandBase import *
from mythic_payloadtype_container.MythicRPC import *
import sys

class UploadArguments(TaskArguments):
    def __init__(self, command_line, **kwargs):
        super().__init__(command_line, **kwargs)
        self.args = [
            CommandParameter(
                name="file", cli_name="new-file", display_name="File to upload", type=ParameterType.File, description="Select new file to upload",
                parameter_group_info=[
                    ParameterGroupInfo(
                        required=True,
                        group_name="Default",
                        ui_position=0
                    )
                ]
            ),
            CommandParameter(
                name="filename", cli_name="registered-filename", display_name="Filename within Mythic", description="Supply existing filename in Mythic to upload",
                type=ParameterType.ChooseOne,
                dynamic_query_function=self.get_files,
                parameter_group_info=[
                    ParameterGroupInfo(
                        required=True,
                        ui_position=0,
                        group_name="specify already uploaded file by name"
                    )
                ]
            ),
            CommandParameter(
                name="remote_path",
                cli_name="remote_path",
                display_name="Upload path (with filename)",
                type=ParameterType.String,
                description="Provide the path where the file will go (include new filename as well)",
                parameter_group_info=[
                    ParameterGroupInfo(
                        required=True,
                        group_name="Default",
                        ui_position=1
                    ),
                    ParameterGroupInfo(
                        required=True,
                        group_name="specify already uploaded file by name",
                        ui_position=1
                    )
                ]
            ),
        ]

    async def parse_arguments(self):
        if len(self.command_line) == 0:
            raise ValueError("Must supply arguments")
        raise ValueError("Must supply named arguments or use the modal")

    async def parse_dictionary(self, dictionary_arguments):
        self.load_args_from_dictionary(dictionary_arguments)

    async def get_files(self, callback: dict) -> [str]:
        file_resp = await MythicRPC().execute("get_file", callback_id=callback["id"],
                                              limit_by_callback=False,
                                              get_contents=False,
                                              filename="",
                                              max_results=-1)
        if file_resp.status == MythicRPCStatus.Success:
            file_names = []
            for f in file_resp.response:
                # await MythicRPC().execute("get_file_contents", agent_file_id=f["agent_file_id"])
                if f["filename"] not in file_names:
                    file_names.append(f["filename"])
            return file_names
        else:
            await MythicRPC().execute("create_event_message", warning=True,
                                      message=f"Failed to get files: {file_resp.error}")
            return []


class UploadCommand(CommandBase):
    cmd = "upload"
    needs_admin = False
    help_cmd = "upload"
    description = (
        "Upload a file to the target machine by selecting a file from your computer. "
    )
    version = 1
    supported_ui_features = ["file_browser:upload"]
    author = "@its_a_feature_"
    attackmapping = ["T1020", "T1030", "T1041", "T1105"]
    argument_class = UploadArguments
    attributes = CommandAttributes(
        suggested_command=True
    )

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        try:
            groupName = task.args.get_parameter_group_name()
            if groupName == "Default":
                file_resp = await MythicRPC().execute("get_file",
                                                    file_id=task.args.get_arg("file"),
                                                    task_id=task.id,
                                                    get_contents=False)
                if file_resp.status == MythicRPCStatus.Success:
                    if len(file_resp.response) > 0:
                        original_file_name = file_resp.response[0]["filename"]
                        if len(task.args.get_arg("remote_path")) == 0:
                            task.args.add_arg("remote_path", original_file_name)
                        elif task.args.get_arg("remote_path")[-1] == "/":
                            task.args.add_arg("remote_path", task.args.get_arg("remote_path") + original_file_name)
                        task.display_params = f"{original_file_name} to {task.args.get_arg('remote_path')}"
                    else:
                        raise Exception("Failed to find that file")
                else:
                    raise Exception("Error from Mythic trying to get file: " + str(file_resp.error))
            elif groupName == "specify already uploaded file by name":
                # we're trying to find an already existing file and use that
                file_resp = await MythicRPC().execute("get_file", task_id=task.id,
                                                      filename=task.args.get_arg("filename"),
                                                      limit_by_callback=False,
                                                      get_contents=False)
                if file_resp.status == MythicRPCStatus.Success:
                    if len(file_resp.response) > 0:
                        task.args.add_arg("file", file_resp.response[0]["agent_file_id"])
                        task.args.remove_arg("filename")
                        task.display_params = f"existing {file_resp.response[0]['filename']} to {task.args.get_arg('remote_path')}"
                    elif len(file_resp.response) == 0:
                        raise Exception("Failed to find the named file. Have you uploaded it before? Did it get deleted?")
                else:
                    raise Exception("Error from Mythic trying to search files:\n" + str(file_resp.error))
        except Exception as e:
            raise Exception("Error from Mythic: " + str(sys.exc_info()[-1].tb_lineno) + " : " + str(e))
        return task

    async def process_response(self, response: AgentResponse):
        pass
