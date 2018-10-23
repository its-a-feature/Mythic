from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operator, PayloadType, Command
from sanic_jwt.decorators import protected, inject_user
from urllib.parse import unquote_plus
import os
from shutil import rmtree
import json as js


# payloadtypes aren't inherent to an operation
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/", methods=['GET'])
@inject_user()
@protected()
async def get_all_payloadtypes(request, user):
    payloads = await db_objects.execute(PayloadType.select())
    return json([p.to_json() for p in payloads])


# anybody can create a payload type for now, maybe just admins in the future?
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/", methods=['POST'])
@inject_user()
@protected()
async def create_payloadtype(request, user):
    # this needs to know the name of the type, everything else is done for you
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    try:
        if "ptype" not in data:
            return json({'status': 'error', 'error': '"ptype" is a required field and must be unique'})
        if "file_extension" not in data:
            data["file_extension"] = ""
        if "compile_command" not in data:
            data['compile_command'] = ""
        if 'wrapper' not in data:
            data['wrapper'] = False
        operator = await db_objects.get(Operator, username=user['username'])
        if data['wrapper']:
            if "wrapped_encoding_type" not in data:
                return json({"status": 'error', 'error': '"wrapped_encoding_type" is required for a wraper type payload'})
            if "wrapped_payload_type" not in data:
                return json({'status': 'error', 'error': '"wrapped_payload_type" is required for a wraper type payload'})
            try:
                wrapped_payload_type = await db_objects.get(PayloadType, ptype=data['wrapped_payload_type'])
            except Exception as e:
                print(e)
                return json({'status': 'error', 'error': "failed to find that wrapped payload type"})
            payloadtype = await db_objects.create(PayloadType, ptype=data['ptype'], operator=operator,
                                                  file_extension=data['file_extension'],
                                                  compile_command=data['compile_command'],
                                                  wrapper=data['wrapper'],
                                                  wrapped_encoding_type=data['wrapped_encoding_type'],
                                                  wrapped_payload_type=wrapped_payload_type)
        else:
            payloadtype = await db_objects.create(PayloadType, ptype=data['ptype'], operator=operator,
                                                  file_extension=data['file_extension'],
                                                  compile_command=data['compile_command'],
                                                  wrapper=data['wrapper'])
        os.mkdir("./app/payloads/{}".format(payloadtype.ptype))  # make the directory structure
        if request.files:
            code = request.files['upload_file'][0].body.decode('UTF-8')
            code_file = open("./app/payloads/{}/{}".format(payloadtype.ptype, request.files['upload_file'][0].name), "w")
            code_file.write(code)
            code_file.close()
            for i in range(1, int(request.form.get('file_length'))):
                code = request.files['upload_file_' + str(i)][0].body.decode('UTF-8')
                code_file = open("./app/payloads/{}/{}".format(payloadtype.ptype, request.files['upload_file_' + str(i)][0].name),
                                 "w")
                code_file.write(code)
                code_file.close()
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to create new payload type: ' + str(e)})
    status = {'status': 'success'}
    ptype_json = payloadtype.to_json()
    return json({**status, **ptype_json})


# anybody can create a payload type for now, maybe just admins in the future?
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>", methods=['PUT'])
@inject_user()
@protected()
async def create_payloadtype(request, user, ptype):
    if request.form:
        data = js.loads(request.form.get('json'))
    else:
        data = request.json
    try:
        payload_type = unquote_plus(ptype)
        payloadtype = await db_objects.get(PayloadType, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': "failed to find that payload type"})
    operator = await db_objects.get(Operator, username=user['username'])
    if user['admin'] or payloadtype.operator == operator:
        if 'file_extension' in data:
            payloadtype.file_extension = data['file_extension']
        if 'compile_command' in data:
            payloadtype.compile_command = data['compile_command']
        if 'wrapper' in data:
            payloadtype.wrapper = data['wrapper']
        if 'wrapped_encoding_type' in data:
            payloadtype.wrapped_encoding_type = data['wrapped_encoding_type']
        if 'wrapped_payload_type' in data:
            try:
                wrapped_payload_type = await db_objects.get(PayloadType, ptype=data['wrapped_payload_type'])
            except Exception as e:
                print(e)
                return json({'status': 'error', 'error': "failed to find that wrapped payload type"})
            payloadtype.wrapped_payload_type = wrapped_payload_type
        await db_objects.update(payloadtype)
        if request.files:
            code = request.files['upload_file'][0].body.decode('UTF-8')
            code_file = open("./app/payloads/{}/{}".format(payloadtype.ptype, request.files['upload_file'][0].name), "w")
            code_file.write(code)
            code_file.close()
            for i in range(1, int(request.form.get('file_length'))):
                code = request.files['upload_file_' + str(i)][0].body.decode('UTF-8')
                code_file = open("./app/payloads/{}/{}".format(payloadtype.ptype, request.files['upload_file_' + str(i)][0].name),
                                 "w")
                code_file.write(code)
                code_file.close()
        return json({'status': 'success', **payloadtype.to_json()})
    else:
        return json({'status': 'error', 'error': "must be an admin or the creator of the type to edit it"})


@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/upload", methods=['POST'])
@inject_user()
@protected()
async def upload_payload_code(request, user, ptype):
    payload_type = unquote_plus(ptype)
    try:
        payloadtype = await db_objects.get(PayloadType, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find payload'})
    # only the original creator or an admin can update the file on disk for the payload type through here
    operator = await db_objects.get(Operator, username=user['username'])
    if user['admin'] or payloadtype.operator == operator:
        if request.files:
            code = request.files['upload_file'][0].body.decode('UTF-8')
            code_file = open("./app/payloads/{}/{}".format(payloadtype.ptype, request.files['upload_file'][0].name),
                             "w")
            code_file.write(code)
            code_file.close()
            for i in range(1, int(request.form.get('file_length'))):
                code = request.files['upload_file_' + str(i)][0].body.decode('UTF-8')
                code_file = open(
                    "./app/payloads/{}/{}".format(payloadtype.ptype, request.files['upload_file_' + str(i)][0].name),
                    "w")
                code_file.write(code)
                code_file.close()
    else:
        return json({'status': 'error', 'error': 'must be an admin or the original creator to change the file on disk'})


# payloadtypes aren't inherent to an operation
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/<fromDisk:int>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_one_payloadtype(request, user, ptype, fromDisk):
    payload_type = unquote_plus(ptype)
    try:
        payloadtype = await db_objects.get(PayloadType, ptype=payload_type)
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to find payload type'})
    operator = await db_objects.get(Operator, username=user['username'])
    if payloadtype.operator == operator or user['admin']:
        # only delete a payload type if you created it or if you're an admin
        try:
            payloadtype_json = payloadtype.to_json()
            await db_objects.delete(payloadtype, recursive=True)
            if fromDisk == 1:
                # this means we should delete the corresponding folder from disk as well
                rmtree("./app/payloads/{}".format(payloadtype_json['ptype']))
            return json({'status': 'success', **payloadtype_json})
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to delete payloadtype. There are probably a lot of things dependent on this. Try clearing those out with the database management tab first.'})
    else:
        return json({'status': 'error', 'error': 'you must be admin or the creator of the payload type to delete it'})


# get all the commands associated with a specitic payload_type
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>/commands", methods=['GET'])
@inject_user()
@protected()
async def get_commands_for_paylooadtype(request, user, ptype):
    payload_type = unquote_plus(ptype)
    try:
        payloadtype = await db_objects.get(PayloadType, ptype=payload_type)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to get payload type'})
    commands = await db_objects.execute(Command.select().where(Command.payload_type == payloadtype))
    status = {'status': 'success'}
    cmd_list = [x.to_json() for x in commands]
    return json({**status, 'commands': cmd_list})