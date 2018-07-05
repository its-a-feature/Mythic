from app import apfell, db_objects, auth
from sanic.response import json
from app.database_models.model import Operator
from sanic import response
from sanic.exceptions import abort
from app import crypto
from sanic_auth import User


# ------------ OPERATORS ------------------------
@apfell.route("/api/v1.0/operators/", methods=['GET'])
async def get_all_operators(request):
    ops = await db_objects.execute(Operator.select())
    return json([p.to_json() for p in ops])


@apfell.route("/api/v1.0/operators/", methods=['POST'])
async def create_operator(request):
    data = request.json
    if not 'username' in data:
        return json({'status': 'error',
                     'error': '"username" field is required'})
    if not isinstance(data['username'], str) or not len(data['username']):
        return json({'status': 'error',
                     'error': '"username" must be string with at least one character'})
    password = await crypto.hash_SHA512(data['password'])
    # we need to create a new user
    try:
        user = await db_objects.create(Operator, username=data['username'], password=password)
        # login_user = User(id=user.id, name=user.username)
        # auth.login_user(request, login_user)
        return response.json({'status': 'success'})
    except:
        return json({'status': 'error',
                     'error': 'failed to add user'})


@apfell.route("/api/v1.0/operators/<id:int>", methods=['GET'])
async def get_one_operator(request, id):
    try:
        op = await db_objects.get(Operator, id=id)
        return json(str(op))
    except:
        print("Failed in /api/v1.0/operators/id for a GET request")
        return abort(404)


@apfell.route("/api/v1.0/operators/<id:int>", methods=["PUT"])
async def update_operator(request, id):
    try:
        op = await db_objects.get(Operator, id=id)
        data = request.json
        if 'username' in data:
            op.username = data['username']
        if 'password' in data:
            op.password = await crypto.hash_SHA512(data['password'])
        await db_objects.update(op)
        return json({'status': 'success'})
    except:
        abort(404)


@apfell.route("/api/v1.0/operators/<id:int>", methods=["DELETE"])
async def remove_operator(request, id):
    try:
        op = await db_objects.get(Operator, id=id)
        await db_objects.delete(op)
        return json({'status': 'success'})
    except:
        abort(404)