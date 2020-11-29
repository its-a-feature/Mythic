from C2ProfileBase import *
import MythicCallbackRPC

# request is a dictionary: {"action": func_name, "message": "the input",  "task_id": task id num}
# must return an RPCResponse() object and set .status to an instance of RPCStatus and response to str of message
async def test(request):
    response = RPCResponse()
    response.status = RPCStatus.Success
    response.response = "hello"
    #resp = await MythicCallbackRPC.MythicCallbackRPC().add_event_message(message="got a POST message")
    return response
