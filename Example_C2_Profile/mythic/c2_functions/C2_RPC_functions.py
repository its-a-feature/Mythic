from mythic_c2_container.C2ProfileBase import *
import sys

# request is a dictionary: {"action": func_name, "message": "the input",  "task_id": task id num}
# must return an RPCResponse() object and set .status to an instance of RPCStatus and response to str of message
async def test(request):
    response = RPCResponse()
    response.status = RPCStatus.Success
    response.response = "hello"
    #resp = await MythicCallbackRPC.MythicCallbackRPC().add_event_message(message="got a POST message")
    return response


# The opsec function is called when a payload is created as a check to see if the parameters supplied are good
# The input for "request" is a dictionary of:
# {
#   "action": "opsec",
#   "parameters": {
#       "param_name": "param_value",
#       "param_name2: "param_value2",
#   }
# }
# This function should return one of two things:
#   For success: {"status": "success", "message": "your success message here" }
#   For error: {"status": "error", "error": "your error message here" }
async def opsec(request):
    return {"status": "success", "message": "No OPSEC Check Performed"}