def jobs_kill(apfell, c2, params="", task_id=""):
    import json
    try:
        apfell.kill_job(params)
        output = json.dumps({"user_output": "Job Tasked to be removed", "completed": True})
        c2.post_response(response=output, task_id=task_id)
    except Exception as e:
        output = json.dumps({"user_output": "Failed to stop job: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response="Failed to stop job: {}".format(str(e)), task_id=task_id)
    apfell.remove_job(task_id)
COMMAND_ENDS_HERE