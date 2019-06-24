from apfell_cli import *


async def main():
    # sample login
    apfell = Apfell(username="apfell_admin", password="apfell_password",
                    server_ip="192.168.205.151", server_port="80", ssl=False)
    await apfell.login()
    # either set an api token to use or create a new one to start using
    resp = await apfell.set_or_create_apitoken()
    await json_print(apfell)
    # await test_get_c2profiles(apfell)
    # await test_get_payloadtypes(apfell)
    # await test_get_payloads(apfell)
    # await test_create_payload(apfell)
    # await test_api_tokens(apfell)
    # await test_websocket_stream(apfell, 18)
    # await test_task_callback(apfell, 20)
    # await test_create_and_remove_operator(apfell)
    # await test_create_operation(apfell)


async def test_websocket_stream(apfell, callback_id, callback_function=None):
    t = await apfell.listen_for_all_callback_notifications(callback_id, callback_function)
    await asyncio.sleep(60)


async def test_api_tokens(apfell):
    # ======== test getting api tokens ==========
    tokens = await apfell.get_apitokens()
    await json_print(tokens.response)


async def test_get_c2profiles(apfell):
    resp = await apfell.get_c2profiles()
    await json_print(resp.response)


async def test_get_payloadtypes(apfell):
    resp = await apfell.get_payloadtypes()
    #await json_print(resp.response)
    # iterate through all the types individually
    for p in resp.response:
        #one_type = await apfell.get_payloadtype(payload_type=p)
        #print(await json_print(one_type.response))
        commands = await apfell.get_payloadtype_commands(payload_type=p)
        await json_print(commands.response)


async def test_create_payload(apfell):
    # ======= test creating a payload ===================
    """
        Need a few things to make a payload:
            C2 profile
            C2 profile parameters
            Payload Type
            Commands
            Payload information (tag, location)
    """
    payload_info = Payload(tag="my tag", location="made via api", payload_type="apfell-jxa", c2_profile="default")
    c2_profile_params = await apfell.get_c2profile_parameters(c2_profile=payload_info.c2_profile)
    for p in c2_profile_params.response:
        if p.name == "callback host":
            p.value = "http://192.168.205.151"
        elif p.name == "callback port":
            p.value = "80"
    commands = await apfell.get_payloadtype_commands(payload_type=PayloadType(ptype="apfell-jxa"))
    payload_info.commands = commands
    payload_info.c2_profile_parameters_instance = c2_profile_params
    create_payload = await apfell.create_payload(payload_info)
    await json_print(create_payload)


async def test_get_payloads(apfell):
    # ======= test get information about payloads =========
    resp = await apfell.get_payloads()
    await json_print(resp.response)
    for payload in resp.response:
        # ========== test getting information about a payload =========
        info = await apfell.get_payload_info(payload=payload)
        await json_print(info.response)


async def test_create_and_remove_operator(apfell):
    # ======== test getting, creating, and removing an operator ==========
    operators = await apfell.get_operators()
    await json_print(operators.response)
    # create a base operator object with the info we need
    new_operator_obj = Operator(username="bob", password="bob")
    operator_resp = await apfell.create_operator(operator=new_operator_obj)
    await json_print(operator_resp.response)
    # set our object to the full thing now
    new_operator_obj = operator_resp.response
    operator = await apfell.remove_operator(operator=new_operator_obj)
    await json_print(operator.response)
    print("getting operators")
    operators = await apfell.get_operators()
    await json_print(operators.response)


async def test_create_operation(apfell):
    # ================ TEST CREATE AN OPERATION =======================
    resp = await apfell.create_operation(operation=Operation(name="test op", admin="apfell_admin",
                                                             members=["apfell_admin"]))
    # ================ MAKE SURE IT SHOWS UP IN ALL OPERATIONS ========
    resp = await apfell.get_operations()
    await json_print(resp.response)
    # ================ GET INFORMATION ON ONE OPERATION ===============
    resp = await apfell.get_operation(Operation(name="test op"))
    test_op_operation = resp.response
    await json_print(test_op_operation)
    # ================ CREATE AN OPERATOR ====================
    new_operator_obj = Operator(username="bob", password="bob")
    operator_resp = await apfell.create_operator(operator=new_operator_obj)
    new_operator_obj = operator_resp.response
    await json_print(new_operator_obj)
    # ================ ADD OPERATOR TO OPERATION =============
    test_op_operation.add_members = [new_operator_obj]
    resp = await apfell.update_operation(operation=test_op_operation)
    test_op_operation = resp.response
    await json_print(test_op_operation)
    # ================ REMOVE OPERATOR FROM OPERATION ===========
    test_op_operation.remove_members = [new_operator_obj]
    resp = await apfell.update_operation(operation=test_op_operation)
    test_op_operation = resp.response
    await json_print(test_op_operation)
    # ================ REMOVE OPERATOR =======================
    operator = await apfell.remove_operator(operator=new_operator_obj)
    await json_print(operator.response)
    # ================ REMOVE OPERATION
    removed_op = await apfell.remove_operation(operation=test_op_operation)
    await json_print(removed_op.response)


async def test_task_callback(apfell, callback_id):
    # ======= TESTING ALL TASKS ============
    all_tasks = await apfell.get_tasks()
    await json_print(all_tasks.response)
    # ======= TESTING ALL TASKS PER CALLBACK =======
    # all_tasks = await apfell.get_tasks_per_callback(callback_id)
    # await json_print(all_tasks.response)
    # ======= GET TASK AND RESPONSE ================
    # task = await apfell.get_task_and_responses(16)
    # await json_print(task.response)
    # ======= GET ALL TASKS / RESPONSES BY CALLBACK ========
    # tasks = await apfell.get_all_tasks_and_responses_by_callback()
    # await json_print(tasks.response)
    # ====== ISSUE A TASK AND GET RESPONSE =================
    # task = Task(callback=callback_id, command=Command(cmd="shell"), params="whoami")
    # t = await apfell.listen_for_all_callback_notifications(callback_id, None)
    # submit = await apfell.create_task(task)
    # await json_print(submit.response)
    # await asyncio.sleep(30)
    # t.cancel()
    # resp = await apfell.get_task_and_responses(submit.response)
    # await json_print(resp.response)


loop = asyncio.get_event_loop()
loop.run_until_complete(main())
