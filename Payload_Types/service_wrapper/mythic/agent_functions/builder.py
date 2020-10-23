from PayloadBuilder import *
import asyncio
import os
import tempfile
from distutils.dir_util import copy_tree
import traceback
from pathlib import PurePath
import base64


class ServiceWrapper(PayloadType):

    name = "service_wrapper"
    file_extension = "exe"
    author = "@its_a_feature_"
    supported_os = [SupportedOS.Windows]
    wrapper = True
    wrapped_payloads = []
    note = "This is a wrapper payload that takes in Raw shellcode and generates a .NET Service binary. The service does not perform any injection."
    supports_dynamic_loading = False
    build_parameters = {
        "version": BuildParameter(
            name="version",
            parameter_type=BuildParameterType.ChooseOne,
            description="Choose a target .NET Framework",
            choices=["3.5", "4.0"],
        ),
        "arch": BuildParameter(
            name="arch",
            parameter_type=BuildParameterType.ChooseOne,
            choices=["x64", "Any CPU"],
            default_value="x64",
            description="Target architecture",
        ),
        "config": BuildParameter(
            name="config",
            parameter_type=BuildParameterType.ChooseOne,
            choices=["Release"],
            default_value="Release",
            description="Configuration",
        ),
    }
    c2_profiles = []

    async def build(self) -> BuildResponse:
        # this function gets called to create an instance of your payload
        resp = BuildResponse(status=BuildStatus.Error)
        output = ""
        try:
            command = "nuget restore; msbuild"
            command += " -p:TargetFrameworkVersion=v{} -p:OutputType=WinExe -p:Configuration='{}' -p:Platform='{}'".format(
                self.get_parameter("version"),
                self.get_parameter("config"),
                self.get_parameter("arch"),
            )
            agent_build_path = tempfile.TemporaryDirectory(suffix=self.uuid).name
            # shutil to copy payload files over
            copy_tree(self.agent_code_path, agent_build_path)
            working_path = (
                PurePath(agent_build_path)
                / "WindowsService1"
                / "Resources"
                / "loader.bin"
            )
            with open(str(working_path), "wb") as f:
                f.write(base64.b64decode(self.wrapped_payload))
            with open(str(working_path), "rb") as f:
                header = f.read(2)
                if header == b"\x4d\x5a":  # checking for MZ header of PE files
                    resp.message = "Supplied payload is a PE instead of raw shellcode. Create an Atlas payload with an output type of Raw"
                    return resp
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=agent_build_path,
            )
            stdout, stderr = await proc.communicate()
            if stdout:
                output += f"[stdout]\n{stdout.decode()}"
            if stderr:
                output += f"[stderr]\n{stderr.decode()}"
            output_path = (
                PurePath(agent_build_path)
                / "WindowsService1"
                / "bin"
                / self.get_parameter("config")
                / "WindowsService1.exe"
            )
            output_path = str(output_path)
            if os.path.exists(output_path):
                resp.payload = open(output_path, "rb").read()
                resp.status = BuildStatus.Success
                resp.message = "New Service Executable created!"
            else:
                resp.payload = b""
                resp.message = output + "\n" + output_path
        except Exception as e:
            raise Exception(str(e) + "\n" + output)
        return resp
