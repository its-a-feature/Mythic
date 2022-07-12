from mythic_payloadtype_container.PayloadBuilder import *
from mythic_payloadtype_container.MythicCommandBase import *
from mythic_payloadtype_container.MythicRPC import *
import sys
import json

#define your payload type class here, it must extend the PayloadType class though
class MyAgent(PayloadType):

    name = "my_agent"  # name that would show up in the UI
    file_extension = "exe"  # default file extension to use when creating payloads
    author = "@YourHandleHere"  # author of the payload type
    supported_os = [  # supported OS and architecture combos
        SupportedOS.Windows, SupportedOS.Linux # update this list with all the OSes your agent supports
    ]
    wrapper = False  # does this payload type act as a wrapper for another payloads inside of it?
    # if the payload supports any wrapper payloads, list those here
    wrapped_payloads = [] # ex: "service_wrapper"
    note = "Any note you want to show up about your payload type in the UI"
    supports_dynamic_loading = False  # setting this to True allows users to only select a subset of commands when generating a payload
    build_parameters = [
        #  these are all the build parameters that will be presented to the user when creating your payload
        # we'll leave this blank for now
    ]
    #  the names of the c2 profiles that your agent supports
    c2_profiles = ["http"]
    translation_container = None
    # after your class has been instantiated by the mythic_service in this docker container and all required build parameters have values
    # then this function is called to actually build the payload
    async def build(self) -> BuildResponse:
        # this function gets called to create an instance of your payload
        resp = BuildResponse(status=BuildStatus.Success)
        resp.payload = b""
        return resp
