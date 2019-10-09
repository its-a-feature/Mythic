def quit(apfell, c2, params="", task_id=""):
    import json
    try:
        import thread
        c2.post_response(response=json.dumps({"user_output": "Quitting", "completed": True}), task_id=task_id)
        thread.interrupt_main()
    except Exception as e:
        c2.post_response(response=json.dumps({"user_output": "Failed to load module", "completed": True, "status": "error"}), task_id=task_id)
        apfell.remove_job(task_id)
        return

COMMAND_ENDS_HERE