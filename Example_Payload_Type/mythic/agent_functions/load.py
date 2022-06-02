from mythic_payloadtype_container.MythicCommandBase import *
from mythic_payloadtype_container.MythicRPC import *
import base64
import sys


class LoadArguments(TaskArguments):
    def __init__(self, command_line, **kwargs):
        super().__init__(command_line, **kwargs)
        self.args = [
            CommandParameter(name="commands",
                 type=ParameterType.ChooseMultiple,
                 description="One or more commands to send to the agent",
                 choices_are_all_commands=True),
        ]

    async def parse_arguments(self):
        if len(self.command_line) == 0:
            raise ValueError("Must supply a set of commands")
        self.add_arg("commands", self.command_line.split(" "))

    async def parse_dictionary(self, dictionary_arguments):
        if "commands" in dictionary_arguments:
            if isinstance(dictionary_arguments["commands"], str):
                self.add_arg("commands", dictionary_arguments["commands"].split(" "))
            else:
                self.add_arg("commands", dictionary_arguments["commands"])
        else:
            raise ValueError("Missing 'commands' argument")


class LoadCommand(CommandBase):
    cmd = "load"
    needs_admin = False
    help_cmd = "load cmd1 cmd2 cmd3..."
    description = "This loads new functions into memory via the C2 channel."
    version = 1
    author = "@its_a_feature_"
    parameters = []
    attackmapping = ["T1030", "T1129", "T1059.002", "T1620"]
    argument_class = LoadArguments
    attributes = CommandAttributes(
        suggested_command=True
    )

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        total_code = ""
        commands = await MythicRPC().execute("get_commands",
                                             payload_type_name="apfell",
                                             commands=task.args.get_arg("commands"),
                                             os="macOS")
        if commands.status == "success":
            for cmd in commands.response:
                if cmd["script_only"]:
                    # trying to load a script only command, so just tell mythic to load it
                    add_resp = await MythicRPC().execute("add_commands_to_callback",
                                                         task_id=task.id,
                                                         commands=[cmd["cmd"]])
                    if add_resp.status != "success":
                        await MythicRPC().execute("create_output", task_id=task.id,
                                                  output="Failed to add command to callback: " + add_resp.error)
                else:
                    try:
                        code_path = self.agent_code_path / "{}.js".format(cmd["cmd"])
                        total_code += open(code_path, "r").read() + "\n"
                    except Exception as e:
                        await MythicRPC().execute("create_output",
                                                  task_id=task.id,
                                                  output=f"Failed to find code for {cmd['cmd']}, skipping it\n")
            if total_code != "":
                resp = await MythicRPC().execute("create_file", task_id=task.id,
                    file=base64.b64encode(total_code.encode()).decode(),
                    comment="Loading the following commands: " + task.args.command_line
                )
                if resp.status == MythicStatus.Success:
                    task.args.add_arg("file_id", resp.response["agent_file_id"])
                    task.display_params = f"the following commands: {' '.join(task.args.get_arg('commands'))}"
                else:
                    raise Exception("Failed to register file: " + resp.error)
            else:
                task.status = "completed"
                task.display_params = f"the following commands: {' '.join(task.args.get_arg('commands'))}"
                await MythicRPC().execute("create_output", task_id=task.id,
                                          output="Loaded commands")
        else:
            raise Exception("Failed to fetch commands from Mythic: " + commands.error)
        return task

    async def process_response(self, response: AgentResponse):
        pass
