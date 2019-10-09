def sleep_time(apfell, c2, params="", task_id=""):
    import json
    try:
        param_pieces = json.loads(params)
        c2.interval = abs(param_pieces['interval']) if 'interval' in param_pieces and param_pieces['interval'] != -1 else c2.interval
        c2.jitter = abs(param_pieces['jitter']) if 'jitter' in param_pieces and param_pieces['jitter'] != -1 else c2.jitter
        output = json.dumps({"user_output": "Updated interval ({}) and jitter ({})".format(str(c2.interval), str(c2.jitter)), "completed": True})
        c2.post_response(response=output, task_id=task_id)
    except Exception as e:
        output = json.dumps({"user_output": "Failed to update sleep time: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
    apfell.remove_job(task_id) # need to do this to remove your task from the list

COMMAND_ENDS_HERE