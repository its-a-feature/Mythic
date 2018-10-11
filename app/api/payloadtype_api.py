from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operator, PayloadType
from sanic_jwt.decorators import protected, inject_user
from urllib.parse import unquote_plus
import os


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
    try:
        data = request.json
        if "ptype" not in data:
            return json({'status': 'error', 'error': '"ptype" is a required field and must be unique'})
        operator = await db_objects.get(Operator, username=user['username'])
        payloadtype = await db_objects.create(PayloadType, ptype=data['ptype'], operator=operator)
        os.mkdir("./app/payloads/{}".format(payloadtype.ptype))  # make the directory structure
    except Exception as e:
        return json({'status': 'error', 'error': 'failed to create new payload type: ' + str(e)})
    status = {'status': 'success'}
    ptype_json = payloadtype.to_json()
    return json({**status, **ptype_json})


# payloadtypes aren't inherent to an operation
@apfell.route(apfell.config['API_BASE'] + "/payloadtypes/<ptype:string>", methods=['DELETE'])
@inject_user()
@protected()
async def delete_one_payloadtype(request, user, ptype):
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
            return json({'status': 'success', **payloadtype_json})
        except Exception as e:
            print(e)
            return json({'status': 'error', 'error': 'failed to delete payloadtype'})
    else:
        return json({'status': 'error', 'error': 'you must be admin or the creator of the payload type to delete it'})
