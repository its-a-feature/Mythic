from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import ATTACK, Task, ATTACKCommand, ATTACKTask, Operation, Callback
from sanic_jwt.decorators import protected, inject_user


@apfell.route(apfell.config['API_BASE'] + "/mitreattack/", methods=['GET'])
@inject_user()
@protected()
async def get_all_mitre_attack_ids(request, user):
    attack_entries = await db_objects.execute(ATTACK.select())
    matrix = {}
    for entry in attack_entries:
        tactics = entry.tactic.split(" ")
        for t in tactics:
            if t not in matrix:
                matrix[t] = []
            matrix[t].append({**entry.to_json(), "tactic": t, "mappings": {}})
    return json({'status': 'success', 'attack': matrix})


@apfell.route(apfell.config['API_BASE'] + "/mitreattack/listing", methods=['GET'])
@inject_user()
@protected()
async def get_all_mitre_attack_ids(request, user):
    try:
        attack_entries = await db_objects.execute(ATTACK.select())
        return json({'status': 'success', 'attack': [a.to_json() for a in attack_entries]})
    except Exception as e:
        return json({'status': 'error', 'error': str(e)})


@apfell.route(apfell.config['API_BASE'] + "/mitreattack/bycommand", methods=['GET'])
@inject_user()
@protected()
async def get_all_mitre_attack_ids_by_command(request, user):
    attack_entries = await db_objects.execute(ATTACK.select())
    matrix = {}
    for entry in attack_entries:
        tactics = entry.tactic.split(" ")
        for t in tactics:
            if t not in matrix:
                matrix[t] = []
            entry_json = entry.to_json()
            entry_json['mappings'] = {}  # this is where we'll store payload_type and command mappings
            entry_json['tactic'] = t
            mappings = await db_objects.execute(ATTACKCommand.select().where(ATTACKCommand.attack == entry))
            for m in mappings:
                if m.command.payload_type.ptype not in entry_json['mappings']:
                    entry_json['mappings'][m.command.payload_type.ptype] = []
                entry_json['mappings'][m.command.payload_type.ptype].append(m.to_json())
            matrix[t].append(entry_json)
    return json({'status': 'success', 'attack': matrix})


@apfell.route(apfell.config['API_BASE'] + "/mitreattack/bytask", methods=['GET'])
@inject_user()
@protected()
async def get_all_mitre_attack_ids_by_task(request, user):
    attack_entries = await db_objects.execute(ATTACK.select())
    matrix = {}
    for entry in attack_entries:
        tactics = entry.tactic.split(" ")
        for t in tactics:
            if t not in matrix:
                matrix[t] = []
            entry_json = entry.to_json()
            entry_json['mappings'] = {}  # this is where we'll store payload_type and command mappings
            entry_json['tactic'] = t
            mappings = await db_objects.execute(ATTACKTask.select().where(ATTACKTask.attack == entry))
            for m in mappings:
                if m.task.command.payload_type.ptype not in entry_json['mappings']:
                    entry_json['mappings'][m.task.command.payload_type.ptype] = []
                entry_json['mappings'][m.task.command.payload_type.ptype].append(m.to_json())
            matrix[t].append(entry_json)
    return json({'status': 'success', 'attack': matrix})


@apfell.route(apfell.config['API_BASE'] + "/mitreattack/regex", methods=['POST'])
@inject_user()
@protected()
async def regex_against_tasks(request, user):
    data = request.json
    try:
        operation = await db_objects.get(Operation, name=user['current_operation'])
    except Exception as e:
        return json({'status': 'error', 'error': "Failed to find current operation"})
    if 'regex' not in data:
        return json({'status': 'error', 'error': 'regex is a required field'})
    if 'apply' not in data:
        return json({'status': 'error', 'error': 'apply is a required field'})
    if 'attack' not in data:
        return json({'status': 'error', 'error': 'an attack T# is required'})
    try:
        attack = await db_objects.get(ATTACK, t_num=data['attack'])
    except Exception as e:
        return json({'status': 'error', 'error': 'Failed to find that T#. Make sure you specify "attack": "T1124" for example'})
    matching_tasks = await db_objects.execute(Task.select().join(Callback).where(Callback.operation == operation).switch().where(
        (Task.params.regexp(data['regex'])) | (Task.original_params.regexp(data['regex']))).order_by(Task.id))
    if data['apply']:
        # actually apply the specified att&ck id to the matched tasks
        for t in matching_tasks:
            # don't create duplicates
            attacktask, create = await db_objects.get_or_create(ATTACKTask, attack=attack, task=t)
        return json({'status': 'success'})
    else:
        # simply return which tasks would have matched
        # for each matching task, also return which other ATT&CK IDs are associated
        tasks = []
        for t in matching_tasks:
            sub_attacks = []
            matching_attacks = await db_objects.execute(ATTACKTask.select().where(ATTACKTask.task == t))
            for ma in matching_attacks:
                sub_attacks.append({'t_num': ma.attack.t_num, 'name': ma.attack.name})
            tasks.append({**t.to_json(), "attack": sub_attacks})
        return json({'status': 'success', 'matches': tasks})


@apfell.route(apfell.config['API_BASE'] + "/mitreattack/task/<tid:int>/attack/<tnum:string>", methods=['DELETE'])
@inject_user()
@protected()
async def remove_task_attack_mapping(request, user, tid, tnum):
    try:
        task = await db_objects.get(Task, id=tid)
        attack = await db_objects.get(ATTACK, t_num=tnum)
        mapping = await db_objects.get(ATTACKTask, task=task, attack=attack)
        await db_objects.delete(mapping)
        return json({'status': 'success', "task_id": tid, "attack": tnum})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': str(e)})