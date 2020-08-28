from PayloadBuilder import *
import asyncio
import os
from distutils.dir_util import copy_tree
import tempfile

# define your payload type class here, it must extend the PayloadType class though
class Atlas(PayloadType):

    name = "atlas"  # name that would show up in the UI
    file_extension = "exe"  # default file extension to use when creating payloads
    author = "@Airzero24"  # author of the payload type
    supported_os = [SupportedOS.Windows]  # supported OS and architecture combos
    wrapper = False  # does this payload type act as a wrapper for another payloads inside of it?
    wrapped_payloads = []  # if so, which payload types
    note = """Any note you want to show up about your payload type in the UI"""
    supports_dynamic_loading = False  # setting this to True allows users to only select a subset of commands when generating a payload
    build_parameters = {
        #  these are all the build parameters that will be presented to the user when creating your payload
        "version": BuildParameter(
            name="version",
            parameter_type=BuildParameterType.ChooseOne,
            description="Choose a target .NET Framework",
            choices=["4.0", "3.5"],
        ),
    }
    #  the names of the c2 profiles that your agent supports
    c2_profiles = ["HTTP"]
    # after your class has been instantiated by the mythic_service in this docker container and all required build parameters have values
    # then this function is called to actually build the payload
    async def build(self) -> BuildResponse:
        # this function gets called to create an instance of your payload
        resp = BuildResponse(status=BuildStatus.Error)
        return resp
