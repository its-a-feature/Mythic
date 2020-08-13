from sanic import Sanic, log
import uvloop
from peewee_async import Manager
from peewee_asyncext import PooledPostgresqlExtDatabase
from sanic_jwt import Initialize
from ipaddress import ip_network
from logging import Formatter
import json
import os

# --------------------------------------------
# --------------------------------------------
config = json.loads(open("./config.json", "r").read())
mythic_admin_user = config['mythic_admin_user']
mythic_admin_password = config['mythic_admin_password']
default_operation_name = config['default_operation_name']
listen_port = str(config['listen_port'])
ssl_cert_path = config['ssl_cert_path']
ssl_key_path = config['ssl_key_path']
allowed_ip_blocks = config['allowed_ip_blocks']  # only allow connections from these IPs to the /login and /register pages
use_ssl = config['use_ssl']
server_header = config["server_header"]
log_size = config["log_size"]  # grows indefinitely (0), or specify a max size in Bytes (1MB). If 0, will not rotate!
keep_logs = config['keep_logs']  # set to false for speed improvement, but no logs will be kept
# don't start the following c2_profile docker containers when starting mythic
excluded_c2_profiles = config['excluded_c2_profiles']
# don't start the following payload_type docker containers when starting mythic
excluded_payload_types = config['excluded_payload_types']
documentation_port = config['documentation_container_port']
# --------------------------------------------
# --------------------------------------------
listen_ip = '0.0.0.0'  # IP to bind to for the server, 0.0.0.0 means all local IPv4 addresses
db_name = 'mythic_db'
db_user = 'mythic_user'
db_pass = 'super_secret_mythic_user_password'
max_log_count = 1  # if log_size > 0, rotate and make a max of max_log_count files to hold logs
# custom loop to pass to db manager
dbloop = uvloop.new_event_loop()
mythic_db = PooledPostgresqlExtDatabase(db_name, user=db_user, password=db_pass, host='127.0.0.1', max_connections=10000, register_hstore=False)
mythic_db.connect_async(loop=dbloop)
db_objects = Manager(mythic_db, loop=dbloop)

mythic_logging = log.LOGGING_CONFIG_DEFAULTS


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

mythic_logging['handlers']['rotating_log'] = {
    "class": "logging.handlers.RotatingFileHandler",
    "formatter": "mythic_format",
    "filename": "mythic_access.log",
    "maxBytes": log_size,
    "backupCount": max_log_count
}
mythic_logging['formatters']['mythic_format'] = {
    "()": AccessLogFormatter
}

mythic_logging['handlers']['rotating_root_log'] = {
    "class": "logging.handlers.RotatingFileHandler",
    "formatter": "mythic_root_format",
    "filename": "mythic_access.log",
    "maxBytes": log_size,
    "backupCount": max_log_count
}
mythic_logging['formatters']['mythic_root_format'] = {
    "()": RootLogFormatter
}
mythic_logging['loggers']['sanic.access']['level'] = "INFO"
mythic_logging['loggers']['sanic.root']['level'] = "INFO"
mythic_logging['loggers']['sanic.access']['handlers'].append("rotating_log")
mythic_logging['loggers']['sanic.error']['handlers'].append("rotating_log")
mythic_logging['loggers']['sanic.root']['handlers'].append("rotating_root_log")

mythic = Sanic(__name__, strict_slashes=False, log_config=mythic_logging)
mythic.config['WTF_CSRF_SECRET_KEY'] = 'really secure super secret key here, and change me!'
mythic.config['SERVER_IP_ADDRESS'] = "127.0.0.1"
mythic.config['SERVER_PORT'] = listen_port
mythic.config['DB_USER'] = db_user
mythic.config['DB_PASS'] = db_pass
mythic.config['DB_NAME'] = db_name
mythic.config['DB_POOL_CONNECT_STRING'] = "dbname='{}' user='{}' password='{}' host='127.0.0.1'".format(mythic.config['DB_NAME'], mythic.config['DB_USER'], mythic.config['DB_PASS'])
mythic.config['API_VERSION'] = "1.4"
mythic.config['API_BASE'] = "/api/v" + mythic.config['API_VERSION']
mythic.config['REQUEST_MAX_SIZE'] = 1000000000
mythic.config['REQUEST_TIMEOUT'] = 60
mythic.config['RESPONSE_TIMEOUT'] = 60
mythic.config['ALLOWED_IPS'] = [ip_network(ip) for ip in allowed_ip_blocks]

links = {'server_ip': mythic.config['SERVER_IP_ADDRESS'],
         'server_port': mythic.config['SERVER_PORT'],
         'api_base': mythic.config['API_BASE']}

if use_ssl:
    links['WEB_BASE'] = "https://" + mythic.config['SERVER_IP_ADDRESS'] + ":" + mythic.config['SERVER_PORT']
else:
    links['WEB_BASE'] = "http://" + mythic.config['SERVER_IP_ADDRESS'] + ":" + mythic.config['SERVER_PORT']
links['DOCUMENTATION_PORT'] = documentation_port
import app.routes
import app.api

my_views = (
    ('/register', app.routes.routes.Register),
    ('/login', app.routes.routes.Login),
    ('/uirefresh', app.routes.routes.UIRefresh)
)

session = {}


@mythic.middleware('request')
async def add_session(request):
  request['session'] = session

Initialize(mythic,
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
           secret='mythic_secret jwt for signing here',
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
