from app import apfell, db_objects
from sanic.response import json
from sanic_jwt.decorators import scoped, inject_user
import app.database_models.model as db_model
from sanic.exceptions import abort


@apfell.route(apfell.config['API_BASE'] + "/event_message", methods=['POST'])
@inject_user()
@scoped('auth:user')
async def add_event_message(request, user):
    if user['auth'] not in ['access_token', 'apitoken']:
        abort(status_code=403, message="Cannot access via Cookies. Use CLI or access via JS in browser")
    try:
        query = await db_model.operator_query()
        operator = await db_objects.get(query, username=user['username'])
        query = await db_model.operation_query()
        operation = await db_objects.get(query, name=user['current_operation'])
        data = request.json
        if 'message' not in data:
            return json({'status': 'error', 'error': 'message is required'})
        await db_objects.create(db_model.OperationEventLog, operator=operator, operation=operation,
                                message=data['message'])
        return json({'status': 'success'})
    except Exception as e:
        return json({'status': 'error', 'error': str(e)})
