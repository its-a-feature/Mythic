from sanic import Sanic, log
import uvloop
from peewee_async import Manager
from peewee_asyncext import PooledPostgresqlExtDatabase
from sanic_jwt import Initialize
from ipaddress import ip_network
from logging import Formatter
import json

# -------------------------------------------
# --------------------------------------------
# -------- CONFIGURE SETTINGS HERE -----------
db_pass = 'super_secret_apfell_user_password'
server_ip = '192.168.205.151'  # this will be used by the browser to callback here
listen_port = '80'
listen_ip = '0.0.0.0'  # IP to bind to for the server, 0.0.0.0 means all local IPv4 addresses
ssl_cert_path = './app/ssl/apfell-cert.pem'
ssl_key_path = './app/ssl/apfell-ssl.key'
whitelisted_ip_blocks = ['0.0.0.0/0']  # only allow connections from these IPs to the /login and /register pages
use_ssl = False
server_header = "nginx 1.2"
log_size = 0  # grows indefinitely, or specify a max size in Bytes
keep_logs = True  # set to false for speed improvement, but no logs will be kept
# --------------------------------------------
# --------------------------------------------
# --------------------------------------------
db_name = 'apfell_db'
db_user = 'apfell_user'
# custom loop to pass to db manager
dbloop = uvloop.new_event_loop()
apfell_db = PooledPostgresqlExtDatabase(db_name, user=db_user, password=db_pass, host='127.0.0.1', max_connections=1000, register_hstore=False)
apfell_db.connect_async(loop=dbloop)
db_objects = Manager(apfell_db, loop=dbloop)

apfell_logging = log.LOGGING_CONFIG_DEFAULTS


class RootLogFormatter(Formatter):
    def __init__(self, **kwargs):
        Formatter.__init__(self, kwargs)

    def format(self, record):
        #print(record.__dict__)
        jsondata = {'type': 'root_log', 'time': record.asctime,  'level': record.levelname, 'message': record.message, }
        if record.stack_info:
            jsondata['stack_info'] = record.stack_info
        formattedjson = json.dumps(jsondata)
        return formattedjson


class AccessLogFormatter(Formatter):
    def __init__(self, **kwargs):
        Formatter.__init__(self, kwargs)

    def format(self, record):
        #print(record.__dict__)
        jsondata = {'type': 'access_log', 'time': record.asctime, 'level': record.levelname, 'request': record.request, 'host': record.host, 'status': record.status, 'return_size': record.byte}
        if record.stack_info:
            jsondata['stack_info'] = record.stack_info
        formattedjson = json.dumps(jsondata)
        return formattedjson

apfell_logging['handlers']['rotating_log'] = {
    "class": "logging.handlers.RotatingFileHandler",
    "formatter": "apfell_format",
    "filename": "apfell_access.log",
    "maxBytes": log_size,
    "backupCount": 0
}
apfell_logging['formatters']['apfell_format'] = {
    "()": AccessLogFormatter
}

apfell_logging['handlers']['rotating_root_log'] = {
    "class": "logging.handlers.RotatingFileHandler",
    "formatter": "apfell_root_format",
    "filename": "apfell_access.log",
    "maxBytes": log_size,
    "backupCount": 0
}
apfell_logging['formatters']['apfell_root_format'] = {
    "()": RootLogFormatter
}
apfell_logging['loggers']['sanic.access']['level'] = "INFO"
apfell_logging['loggers']['sanic.root']['level'] = "INFO"
apfell_logging['loggers']['sanic.access']['handlers'].append("rotating_log")
apfell_logging['loggers']['sanic.error']['handlers'].append("rotating_log")
apfell_logging['loggers']['sanic.root']['handlers'].append("rotating_root_log")

apfell = Sanic(__name__, strict_slashes=False, log_config=apfell_logging)
apfell.config['WTF_CSRF_SECRET_KEY'] = 'really secure super secret key here, and change me!'
apfell.config['SERVER_IP_ADDRESS'] = server_ip
apfell.config['SERVER_PORT'] = listen_port
apfell.config['DB_USER'] = db_user
apfell.config['DB_PASS'] = db_pass
apfell.config['DB_NAME'] = db_name
apfell.config['DB_POOL_CONNECT_STRING'] = "dbname='{}' user='{}' password='{}' host='127.0.0.1'".format(apfell.config['DB_NAME'], apfell.config['DB_USER'], apfell.config['DB_PASS'])
apfell.config['API_VERSION'] = "1.4"
apfell.config['API_BASE'] = "/api/v" + apfell.config['API_VERSION']
apfell.config['REQUEST_MAX_SIZE'] = 1000000000
apfell.config['REQUEST_TIMEOUT'] = 60
apfell.config['RESPONSE_TIMEOUT'] = 60
apfell.config['WHITELISTED_IPS'] = [ip_network(ip) for ip in whitelisted_ip_blocks]

links = {'server_ip': apfell.config['SERVER_IP_ADDRESS'],
         'server_port': apfell.config['SERVER_PORT'],
         'api_base': apfell.config['API_BASE']}

if use_ssl:
    links['WEB_BASE'] = "https://" + server_ip + ":" + listen_port
else:
    links['WEB_BASE'] = "http://" + server_ip + ":" + listen_port

import app.routes
import app.api

my_views = (
    ('/register', app.routes.routes.Register),
    ('/login', app.routes.routes.Login),
    ('/uirefresh', app.routes.routes.UIRefresh)
)

session = {}


@apfell.middleware('request')
async def add_session(request):
  request['session'] = session

Initialize(apfell,
           authentication_class=app.routes.authentication.MyAuthentication,
           configuration_class=app.routes.authentication.MyConfig,
           cookie_set=True,
           cookie_strict=False,
           cookie_access_token_name='access_token',
           cookie_refresh_token_name='refresh_token',
           cookie_httponly=True,
           scopes_enabled=True,
           add_scopes_to_payload=app.routes.authentication.add_scopes_to_payload,
           scopes_name='scope',
           secret='apfell_secret jwt for signing here',
           url_prefix='/',
           class_views=my_views,
           path_to_authenticate='/auth',
           path_to_retrieve_user='/me',
           path_to_verify='/verify',
           path_to_refresh='/refresh',
           refresh_token_enabled=True,
           expiration_delta=28800,  # initial token expiration time, 8hrs
           store_refresh_token=app.routes.authentication.store_refresh_token,
           retrieve_refresh_token=app.routes.authentication.retrieve_refresh_token,
           login_redirect_url="/login")
