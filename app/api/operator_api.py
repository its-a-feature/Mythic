from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Operator
from sanic import response
from app import crypto
from urllib.parse import unquote_plus
from sanic_jwt.decorators import inject_user
from sanic_jwt import protected


@apfell.route(apfell.config['API_BASE'] + "/operators/", methods=['GET'])
@inject_user()
@protected()
async def get_all_operators(request, user):
    ops = await db_objects.execute(Operator.select())
    return json([p.to_json() for p in ops])


@apfell.route(apfell.config['API_BASE'] + "/operators/", methods=['POST'])
@inject_user()
@protected()
async def create_operator(request, user):
    data = request.json
    if not 'username' in data:
        return json({'status': 'error',
                     'error': '"username" field is required'})
    if not isinstance(data['username'], str) or not len(data['username']):
        return json({'status': 'error',
                     'error': '"username" must be string with at least one character'})
    password = await crypto.hash_SHA512(data['password'])
    admin = False
    if 'admin' in data:
        admin = data['admin']
    # we need to create a new user
    try:
        user = await db_objects.create(Operator, username=data['username'], password=password, admin=admin)
        success = {'status': 'success'}
        new_user = user.to_json()
        return response.json({**success, **new_user})
    except:
        return json({'status': 'error',
                     'error': 'failed to add user'})


@apfell.route(apfell.config['API_BASE'] + "/operators/<name:string>", methods=['GET'])
@inject_user()
@protected()
async def get_one_operator(request, name, user):
    name = unquote_plus(name)
    try:
        op = await db_objects.get(Operator, username=name)
        return json(op.to_json())
    except:
        print("Failed to get operator")
        return json({'status':'error', 'error':'failed to get operator'})


@apfell.route(apfell.config['API_BASE'] + "/operators/<name:string>", methods=["PUT"])
@inject_user()
@protected()
async def update_operator(request, name, user):
    name = unquote_plus(name)
    try:
        op = await db_objects.get(Operator, username=name)
        data = request.json
        if 'old_password' not in data and 'password' in data:
            return json({'status': 'error', 'error': 'cannot set a new password without verifying original password'})
        if 'username' in data and data['username'] is not "apfell_admin":  # right now hard-coded to not change this username
            op.username = data['username']
        if 'password' in data:
            # first verify old_password matches
            old_password = await crypto.hash_SHA512(data['old_password'])
            if old_password.lower() == op.password.lower() or user['admin']:
                op.password = await crypto.hash_SHA512(data['password'])
        if 'admin' in data and user['admin']:
            op.admin = data['admin']
        await db_objects.update(op)
        success = {'status': 'success'}
        updated_operator = op.to_json()
        return json({**success, **updated_operator})
    except:
        return json({'status': 'error', 'error': 'failed to update operator'})


@apfell.route(apfell.config['API_BASE'] + "/operators/<name:string>", methods=["DELETE"])
@inject_user()
@protected()
async def remove_operator(request, name, user):
    name = unquote_plus(name)
    try:
        op = await db_objects.get(Operator, username=name)
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to find operator'})
    try:
        updated_operator = {'username': str(op.username)}
        await db_objects.delete(op)
        success = {'status': 'success'}
        return json({**success, **updated_operator})
    except Exception as e:
        print(e)
        return json({'status': 'error', 'error': 'failed to delete operator. Potentially linked to operational objects?'})
