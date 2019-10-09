def jobs(apfell, c2, params="", task_id=""):
    import json
    try:
        apfell.remove_job(task_id)
        output = json.dumps({"user_output": apfell.get_jobs(), "completed": True})
        c2.post_response(response=output, task_id=task_id)
    except Exception as e:
        output = json.dumps({"user_output": "Failed to remove job", "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
        apfell.remove_job(task_id)
COMMAND_ENDS_HERE