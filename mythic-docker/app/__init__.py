from sanic import Sanic, log
from peewee_asyncext import PooledPostgresqlExtDatabase
from sanic_jwt import Initialize
from ipaddress import ip_network
import ujson as json
import logging
from config import settings
import sys
import multiprocessing


# --------------------------------------------
# --------------------------------------------
mythic_admin_user = str(settings.get("ADMIN_USER", "mythic_admin"))
mythic_admin_password = str(settings.get("ADMIN_PASSWORD", "mythic_password"))
default_operation_name = str(settings.get("DEFAULT_OPERATION_NAME", "Operation Chimera"))
nginx_port = str(settings.get("NGINX_PORT", 7443))
nginx_host = str(settings.get("NGINX_HOST", "127.0.0.1"))
listen_port = str(settings.get("SERVER_PORT", 17443))
allowed_ip_blocks = settings.get("ALLOWED_IP_BLOCKS", "0.0.0.0/0").split(",")
server_header = settings.get("SERVER_HEADER", "nginx 1.2")
log_size = settings.get("WEB_LOG_SIZE", 1024000)
keep_logs = bool(settings.get("WEB_KEEP_LOGS", True))
siem_log_name = settings.get("SIEM_LOG_NAME", "")
db_host = settings.get('POSTGRES_HOST', "127.0.0.1")
db_port = settings.get('POSTGRES_PORT', 5432)
db_name = settings.get('POSTGRES_DB', "mythic_db")
db_user = settings.get('POSTGRES_USER', "mythic_user")
db_pass = settings.get('POSTGRES_PASSWORD', None)
dynamic_ports_env = settings.get("server_dynamic_ports", "7000-7100")
dynamic_ports_env = dynamic_ports_env.split(",")
dynamic_ports = []
for dp in dynamic_ports_env:
    if "-" in dp:
        tmp = dp.split("-")
        try:
            dynamic_ports.append(
                (int(tmp[0]), int(tmp[1]))
            )
        except Exception as e:
            logging.error("Failed to parse mythic_server_dynamic_ports: " + str(dynamic_ports_env))
            sys.exit(1)
    else:
        try:
            dynamic_ports.append(
                (int(dp), int(dp))
            )
        except Exception as e:
            logging.error("Failed to parse mythic_server_dynamic_ports: " + str(dynamic_ports_env))
            sys.exit(1)
if db_pass is None:
    logging.exception("No MYTHIC_POSTGRES_PASSWORD in environment variables")
    sys.exit(1)
debugging_enabled = bool(settings.get("DEBUG", False))
rabbitmq_host = settings.get("RABBITMQ_HOST", "127.0.0.1")
rabbitmq_port = settings.get("RABBITMQ_PORT", 5672)
rabbitmq_user = settings.get("RABBITMQ_USER", "mythic_user")
rabbitmq_password = str(settings.get("RABBITMQ_PASSWORD", "mythic_password"))
rabbitmq_vhost = settings.get("RABBITMQ_VHOST", "mythic_vhost")
jwt_secret = settings.get("JWT_SECRET", None)
if jwt_secret is None:
    logging.exception(
        "No MYTHIC_JWT_SECRET environment variable found")
    sys.exit(1)
redis_port = int(settings.get("REDIS_PORT", 6379))
redis_host = settings.get("REDIS_HOST", "127.0.0.1")
# --------------------------------------------
# --------------------------------------------
# IP to bind to for the server, 0.0.0.0 means all local IPv4 addresses
listen_ip = "0.0.0.0"
# if log_size > 0, rotate and make a max of max_log_count files to hold logs
max_log_count = 1
valid_payload_container_version_bounds = [11, 12]
valid_c2_container_version_bounds = [3, 4]
valid_translation_container_version_bounds = [4, 4]
valid_restful_scripting_bounds = [3, 3]
max_worker_connection = 50
mythic_db = PooledPostgresqlExtDatabase(
    db_name,
    user=db_user,
    password=db_pass,
    host=db_host,
    port=db_port,
    max_connections=max_worker_connection,
    register_hstore=False,
    autorollback=True,
    autocommit=False
)
db_objects = None
websocket_pool = None
redis_pool = None

mythic_logging = log.LOGGING_CONFIG_DEFAULTS


class RootLogFormatter(logging.Formatter):
    def __init__(self, **kwargs):
        logging.Formatter.__init__(self, kwargs)

    def format(self, record):
        #print(record.__dict__)
        if "request" in record.__dict__:
            jsondata = {
                "type": "root_log",
                "time": record.asctime,
                "level": record.levelname,
                "request": record.request,
                "host": record.host,
                "status": record.status,
            }
        else:
            jsondata = {
                "type": "root_log",
                "time": record.asctime,
                "level": record.levelname,
                "message": record.message,
            }
        if record.stack_info:
            jsondata["stack_info"] = record.stack_info
        formattedjson = json.dumps(jsondata)
        return formattedjson


class AccessLogFormatter(logging.Formatter):
    def __init__(self, **kwargs):
        logging.Formatter.__init__(self, kwargs)

    def format(self, record):
        #print(record.__dict__)
        if "request" in record.__dict__:
            jsondata = {
                "type": "access_log",
                "time": record.asctime,
                "level": record.levelname,
                "request": record.request,
                "host": record.host,
                "status": record.status,
            }
        else:
            jsondata = {
                "type": "access_log",
                "time": record.asctime,
                "level": record.levelname,
                "request": record.msg,
                "status": 404,
                "host": "Mythic"
            }
        if record.stack_info:
            jsondata["stack_info"] = record.stack_info
        formattedjson = json.dumps(jsondata)
        return formattedjson


mythic_logging["handlers"]["rotating_log"] = {
    "class": "logging.handlers.RotatingFileHandler",
    "formatter": "mythic_format",
    "filename": "mythic_access.log",
    "maxBytes": log_size,
    "backupCount": max_log_count,
}
mythic_logging["formatters"]["mythic_format"] = {"()": AccessLogFormatter}

mythic_logging["handlers"]["rotating_root_log"] = {
    "class": "logging.handlers.RotatingFileHandler",
    "formatter": "mythic_root_format",
    "filename": "mythic_access.log",
    "maxBytes": log_size,
    "backupCount": max_log_count,
}
mythic_logging["formatters"]["mythic_root_format"] = {"()": RootLogFormatter}
mythic_logging["loggers"]["sanic.access"]["level"] = "INFO"
mythic_logging["loggers"]["sanic.root"]["level"] = "INFO"
mythic_logging["loggers"]["sanic.access"]["handlers"].append("rotating_log")
mythic_logging["loggers"]["sanic.error"]["handlers"].append("rotating_log")
mythic_logging["loggers"]["sanic.root"]["handlers"].append("rotating_root_log")

mythic = Sanic(__name__, strict_slashes=False, log_config=mythic_logging)

mythic.config["SERVER_IP_ADDRESS"] = nginx_host
mythic.config["SERVER_PORT"] = nginx_port
mythic.config["DB_HOST"] = db_host
mythic.config["DB_PORT"] = db_port
mythic.config["DB_USER"] = db_user
mythic.config["DB_PASS"] = db_pass
mythic.config["DB_NAME"] = db_name
mythic.config[
    "DB_POOL_CONNECT_STRING"
] = "dbname='{}' user='{}' password='{}' host='{}' port='{}'".format(
    mythic.config["DB_NAME"], mythic.config["DB_USER"], mythic.config["DB_PASS"], mythic.config["DB_HOST"],
    mythic.config["DB_PORT"]
)
# postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
mythic.config["DB_POOL_ASYNCPG_CONNECT_STRING"] = f"postgres://{mythic.config['DB_USER']}:{mythic.config['DB_PASS']}@{mythic.config['DB_HOST']}:{mythic.config['DB_PORT']}/{mythic.config['DB_NAME']}"
mythic.config["RABBITMQ_HOST"] = rabbitmq_host
mythic.config["RABBITMQ_PORT"] = rabbitmq_port
mythic.config["RABBITMQ_USER"] = rabbitmq_user
mythic.config["RABBITMQ_PASSWORD"] = rabbitmq_password
mythic.config["RABBITMQ_VHOST"] = rabbitmq_vhost
mythic.config["API_VERSION"] = "1.4"
mythic.config["API_BASE"] = "/api/v" + mythic.config["API_VERSION"]
mythic.config["REQUEST_MAX_SIZE"] = 500000000
mythic.config["REQUEST_TIMEOUT"] = 60
mythic.config["RESPONSE_TIMEOUT"] = 60
mythic.config["ALLOWED_IPS"] = [ip_network(ip) for ip in allowed_ip_blocks]

links = {"server_ip": mythic.config["SERVER_IP_ADDRESS"], "server_port": mythic.config["SERVER_PORT"],
         "api_base": mythic.config["API_BASE"], "WEB_BASE": (
            "https://"
            + str(mythic.config["SERVER_IP_ADDRESS"])
            + ":"
            + str(mythic.config["SERVER_PORT"])
    )}

import app.api
import app.routes

my_views = (
    ("/login", app.routes.routes.Login),
    ("/uirefresh", app.routes.routes.UIRefresh)
)

Initialize(
    mythic,
    authentication_class=app.routes.authentication.MyAuthentication,
    configuration_class=app.routes.authentication.MyConfig,
    responses_class=app.routes.authentication.MyResponses,
    cookie_set=True,
    cookie_strict=False,
    cookie_access_token_name="access_token",
    cookie_refresh_token_name="refresh_token",
    cookie_httponly=True,
    scopes_enabled=True,
    add_scopes_to_payload=app.routes.authentication.add_scopes_to_payload,
    scopes_name="scope",
    secret=jwt_secret,
    url_prefix="/",
    class_views=my_views,
    path_to_authenticate="/auth",
    path_to_retrieve_user="/me",
    path_to_verify="/verify",
    path_to_refresh="/refresh",
    refresh_token_enabled=True,
    expiration_delta=14400,  # initial token expiration time, 8hrs
    login_redirect_url="/login",
)
