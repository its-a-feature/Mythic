from mythic_payloadtype_container.MythicCommandBase import *
from mythic_payloadtype_container.MythicRPC import *


class ShellArguments(TaskArguments):
    def __init__(self, command_line, **kwargs):
        super().__init__(command_line, **kwargs)
        self.args = [
            CommandParameter(name="command", display_name="Command", type=ParameterType.String, description="Command to run"),
        ]

    async def parse_arguments(self):
        if len(self.command_line) == 0:
            raise ValueError("Must supply a command to run")
        self.add_arg("command", self.command_line)

    async def parse_dictionary(self, dictionary_arguments):
        self.load_args_from_dictionary(dictionary_arguments)


class ShellOPSEC(CommandOPSEC):
    injection_method = ""
    process_creation = "/bin/bash -c"
    authentication = ""

    async def opsec_pre(self, task: MythicTask):
        # processes = await MythicRPC().execute("search_database", task_id=task.id, table="process",
        #                                       host=task.callback.host)
        # if processes.status == MythicStatus.Success:
        #     if len(processes.response) == 0:
        #         task.opsec_pre_blocked = True
        #         task.opsec_pre_message = f"This spawns {self.process_creation} and there is no process data on the host yet."
        #         task.opsec_pre_message += "\nRun \"list_apps\" first to check for dangerous processes"
        #         task.opsec_pre_bypass_role = "operator"
        #         return
        #     else:
        #         processes = await MythicRPC().execute("search_database", task_id=task.id, table="process",
        #                                               name="Microsoft Defender", host=task.callback.host)
        #         if len(processes.response) > 0:
        #             task.opsec_pre_blocked = True
        #             task.opsec_pre_message = f"Microsoft Defender spotted on the host in running processes. Don't spawn commands this way"
        # else:
        #     task.opsec_pre_blocked = True
        #     task.opsec_pre_message = f"Failed to query processes from Mythic:\n{processes}"
        pass

    async def opsec_post(self, task: MythicTask):
        # processes = await MythicRPC().execute("search_database", task_id=task.id,
        #     table="process", name="Microsoft Defender", host=task.callback.host)
        # if processes.status == MythicStatus.Success:
        #     if len(processes.response) > 0:
        #         task.opsec_post_blocked = True
        #         task.opsec_post_message = f"Microsoft Defender spotted on the host in running processes. Really, don't do this"
        # else:
        #     task.opsec_post_blocked = True
        #     task.opsec_post_message = f"Failed to query processes from Mythic:\n{processes}"
        pass


class ShellCommand(CommandBase):
    cmd = "shell"
    needs_admin = False
    help_cmd = "shell {command}"
    description = """This runs {command} in a terminal by leveraging JXA's Application.doShellScript({command}).
WARNING! THIS IS SINGLE THREADED, IF YOUR COMMAND HANGS, THE AGENT HANGS!"""
    version = 1
    author = "@its_a_feature_"
    attackmapping = ["T1059", "T1059.004"]
    argument_class = ShellArguments
    opsec_class = ShellOPSEC
    attributes = CommandAttributes(
        suggested_command=True
    )

    async def create_tasking(self, task: MythicTask) -> MythicTask:
        resp = await MythicRPC().execute("create_artifact", task_id=task.id,
            artifact="/bin/sh -c {}".format(task.args.get_arg("command")),
            artifact_type="Process Create",
        )
        resp = await MythicRPC().execute("create_artifact", task_id=task.id,
            artifact="{}".format(task.args.get_arg("command")),
            artifact_type="Process Create",
        )
        task.display_params = task.args.get_arg("command")
        return task

    async def process_response(self, response: AgentResponse):
        pass
