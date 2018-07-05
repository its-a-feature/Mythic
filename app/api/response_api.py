from app import apfell, db_objects
from sanic.response import json
from app.database_models.model import Callback, Operator, Task, Response
from sanic import response
import datetime


# ---------- RESPONSE GET ---------------------------
# This gets all responses in the database
@apfell.route("/api/v1.0/responses/", methods=['GET'])
async def get_all_tasks(request):
    try:
        all_responses = await db_objects.execute(Response.select())
    except Exception as e:
        return json({'status': 'error',
                     'error': 'Cannot get responses'})
    return json([c.to_json() for c in all_responses])