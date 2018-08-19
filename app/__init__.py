from sanic import Sanic
from sanic_auth import Auth
import uvloop
from peewee_async import Manager, PooledPostgresqlDatabase

# -------------------------------------------
# --------------------------------------------
# -------- CONFIGURE SETTINGS HERE -----------
db_name = 'apfell_db'
db_user = 'apfell_user'
db_pass = 'super_secret_apfell_user_password'
server_ip = 'localhost'  # this will be used by the browser to callback here
listen_port = '443'
listen_ip = '0.0.0.0'  # IP to bind to for the server, 0.0.0.0 means all local IPv4 addresses
ssl_cert_path = './app/ssl/apfell-cert.pem'
ssl_key_path = './app/ssl/apfell-ssl.key'
use_ssl = True
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
apfell.config['SERVER_IP_ADDRESS'] = server_ip
apfell.config['SERVER_PORT'] = listen_port
apfell.config['DB_USER'] = db_user
apfell.config['DB_PASS'] = db_pass
apfell.config['DB_NAME'] = db_name
apfell.config['DB_POOL_CONNECT_STRING'] = 'dbname=' + apfell.config['DB_NAME'] + ' user=' + apfell.config['DB_USER'] + ' password=' + apfell.config['DB_PASS']
apfell.config['API_VERSION'] = "1.0"
apfell.config['API_BASE'] = "/api/v" + apfell.config['API_VERSION']
auth = Auth(apfell)


session = {}
links = {'server_ip': apfell.config['SERVER_IP_ADDRESS'],
         'server_port': apfell.config['SERVER_PORT'],
         'api_base': "/api/v" + apfell.config['API_VERSION']}


@apfell.middleware('request')
async def add_session(request):
    request['session'] = session

import app.routes
import app.api
