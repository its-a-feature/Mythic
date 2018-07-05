from sanic import Sanic
from sanic_auth import Auth
import uvloop
from peewee_async import Manager, PooledPostgresqlDatabase

# -------------------------------------------
# --------------------------------------------
# -------- CONFIGURE SETTINGS HERE -----------
db_name = 'apfell_db'
db_user = 'postgres'
db_pass = 'postgres'
server_ip = '192.168.0.119'
# --------------------------------------------
# --------------------------------------------
# --------------------------------------------
# custom loop to pass to db manager
dbloop = uvloop.new_event_loop()
apfell_db = PooledPostgresqlDatabase(db_name, user=db_user, password=db_pass)
apfell_db.connect_async(loop=dbloop)
db_objects = Manager(apfell_db, loop=dbloop)

apfell = Sanic(__name__)
apfell.config.AUTH_LOGIN_ENDPOINT = 'login'
apfell.config['WTF_CSRF_SECRET_KEY'] = 'really secure super secret key here, and change me!'
apfell.config['SERVER_IP_ADDRESS'] = server_ip  # change this to be IP/hostname of server
apfell.config['DB_USER'] = db_user  # change to actual username
apfell.config['DB_PASS'] = db_pass  # change to actual password
apfell.config['DB_NAME'] = db_name  # change to actual db if needed from default
apfell.config['DB_POOL_CONNECT_STRING'] = 'dbname=' + apfell.config['DB_NAME'] + ' user=' + apfell.config['DB_USER'] + ' password=' + apfell.config['DB_PASS']
auth = Auth(apfell)

session = {}
links = {'server_ip': apfell.config['SERVER_IP_ADDRESS']}


@apfell.middleware('request')
async def add_session(request):
    request['session'] = session

import app.routes
import app.api
