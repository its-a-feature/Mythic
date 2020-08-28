from PayloadBuilder import *


class Apfell(PayloadType):

    name = "apfell"
    file_extension = "js"
    author = "@its_a_feature_"
    supported_os = [SupportedOS.MacOS]
    wrapper = False
    wrapped_payloads = []
    note = """This payload uses JavaScript for Automation (JXA) for execution on macOS boxes."""
    supports_dynamic_loading = True
    build_parameters = {}
    c2_profiles = ["HTTP", "dynamicHTTP"]
    support_browser_scripts = [
        BrowserScript(script_name="create_table", author="@its_a_feature_")
    ]

    async def build(self) -> BuildResponse:
        # this function gets called to create an instance of your payload
        resp = BuildResponse(status=BuildStatus.Success)
        # create the payload
        try:
            command_code = ""
            for cmd in self.commands.get_commands():
                command_code += (
                    open(self.agent_code_path / "{}.js".format(cmd), "r").read() + "\n"
                )
            base_code = open(
                self.agent_code_path / "base" / "apfell-jxa.js", "r"
            ).read()
            base_code = base_code.replace("UUID_HERE", self.uuid)
            base_code = base_code.replace("COMMANDS_HERE", command_code)
            all_c2_code = ""
            if len(self.c2info) != 1:
                resp.set_status(BuildStatus.Error)
                resp.set_message(
                    "Error building payload - apfell only supports one c2 profile at a time."
                )
                return resp
            for c2 in self.c2info:
                profile = c2.get_c2profile()
                c2_code = open(
                    self.agent_code_path
                    / "c2_profiles"
                    / "{}.js".format(profile["name"]),
                    "r",
                ).read()
                for key, val in c2.get_parameters_dict().items():
                    c2_code = c2_code.replace(key, val)
                all_c2_code += c2_code
            base_code = base_code.replace("C2PROFILE_HERE", all_c2_code)
            resp.payload = base_code.encode()
            resp.message = "Successfully built!"
        except Exception as e:
            resp.set_status(BuildStatus.Error)
            resp.set_message("Error building payload: " + str(e))
        return resp
