#! /bin/bash

# Set working directory for unattended starts
cd "${0%/*}"

RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'

# Allow us to exit from a function (see https://stackoverflow.com/questions/9893667/is-there-a-way-to-write-a-bash-function-which-aborts-the-whole-execution-no-mat)
trap "exit 1" TERM
export TOP_PID=$$
export COMPOSE_PROJECT_NAME=mythic
# Returns a single value or an array of values
function get_config_value() {
    local config_file=$1
    local var_name=$2
    local value_name=$3
    local default_value=$4

    local value=`jq -r ".${value_name} | if type==\"array\" then .[] else . end" "${config_file}"`
    if [[ $value == "null"  ]]
    then
        if [[ -z ${default_value} ]]
        then
            echo -e "${RED}[-]${NC} Failed to find value '${value_name}' in ${config_file}"
            kill -s TERM $TOP_PID
        else
            value=$default_value
        fi
    fi

    unset $var_name
    for i in ${value[*]}
    do
        eval $var_name+="('$i')"
    done
}

function generate_random_password() {
  local password=$(tr -cd '[:alnum:]' < /dev/urandom | fold -w30 | head -n1)
  echo $password
}

if [ "$EUID" -ne 0 ]
  then echo -e "${RED}[-]${NC} Please run as root"
  exit 1
fi
if ! which docker > /dev/null; then
    echo -e "${RED}[-]${NC} Sorry, docker needs to be installed."
    exit 1
elif ! which docker-compose > /dev/null; then
    echo -e "${RED}[-]${NC} Sorry, docker-compose needs to be installed"
    exit 1
fi

if ! which realpath > /dev/null; then
  apt-get install -y realpath
  if [ $? -ne 0 ]
  then
    echo -e "${RED}[-]${NC} Failed to install 'realpath'. Aborting"
    exit 1
  fi
fi
if ! which jq > /dev/null; then
  apt-get install -y jq
  if [ $? -ne 0 ]
  then
    echo -e "${RED}[-]${NC} Failed to install 'jq'. Aborting"
    exit 1
  fi
fi
#generate a self-signed cert for us to use
if [ ! -d "./nginx-docker/ssl" ]; then
  echo -e "${BLUE}[*]${NC} Failed to find ./nginx-docker/ssl folder, creating it"
  mkdir ./nginx-docker/ssl > /dev/null 2>&1
fi

if [ ! -f "./nginx-docker/ssl/mythic-ssl.key" ]; then
   echo -e "${BLUE}[*]${NC} Failed to find ssl keys, generating new ones"
   openssl req -x509 -newkey rsa:2048 -keyout ./nginx-docker/ssl/mythic-ssl.key -out ./nginx-docker/ssl/mythic-cert.crt -days 365 -extensions v3_req -nodes -subj "/C=US" >/dev/null 2>&1
   echo -e "${GREEN}[+]${NC} Generated new SSL self signed certificates"
fi

# Get settings
config_file="./mythic-docker/config.json"
# Validate that the config.json is valid JSON
if ! jq -e . >/dev/null 2>&1 < $config_file; then
  echo -e "${RED}[-]${NC} Invalid JSON in '${config_file}'"
  exit 1
fi

#nginx configuration
get_config_value $config_file nginx_port "nginx_port" "7443"
#mythic server configuration
get_config_value $config_file documentation_host "documentation_container_host" "127.0.0.1"
get_config_value $config_file documentation_port "documentation_container_port" "8090"
get_config_value $config_file debug "debug" "false"
get_config_value $config_file excluded_payload_types "excluded_payload_types"
get_config_value $config_file excluded_c2_profiles "excluded_c2_profiles"
get_config_value $config_file mythic_server_port "mythic_server_port" "17443"
get_config_value $config_file mythic_server_host "mythic_server_host" "127.0.0.1"
#postgres configuration
get_config_value $config_file postgres_host "postgres_host" "127.0.0.1"
get_config_value $config_file postgres_port "postgres_port" "5432"
get_config_value $config_file postgres_db "postgres_db" "mythic_db"
get_config_value $config_file postgres_user "postgres_user" "mythic_user"
get_config_value $config_file postgres_password "postgres_password" "null"
#rabbitmq configuration
get_config_value $config_file rabbitmq_host "rabbitmq_host" "127.0.0.1"
get_config_value $config_file rabbitmq_port "rabbitmq_port" "5672"
get_config_value $config_file rabbitmq_user "rabbitmq_user" "mythic_user"
get_config_value $config_file rabbitmq_password "rabbitmq_password" "mythic_password"
get_config_value $config_file rabbitmq_vhost "rabbitmq_vhost" "mythic_vhost"
#jwt configuration
get_config_value $config_file jwt_secret "jwt_secret" "null"
#hasura configuration
get_config_value $config_file hasura_host "hasura_host" "127.0.0.1"
get_config_value $config_file hasura_port "hasura_port" "8080"
get_config_value $config_file hasura_secret "hasura_secret" "null"
#redis configuration
get_config_value $config_file redis_port "redis_port" "6379"

# Setup database
if [[ ! -f ".env" ]];
then
  if [[ $postgres_password == "null" ]];
  then
    echo -e "${BLUE}[*]${NC} Generating random database password and saving it to .env"
    postgres_password=$(generate_random_password)
  fi
  echo "POSTGRES_HOST=${postgres_host}" > .env
  echo "POSTGRES_PORT=${postgres_port}" >> .env
  echo "POSTGRES_DB=${postgres_db}" >> .env
  echo "POSTGRES_USER=${postgres_user}" >> .env
  echo "POSTGRES_PASSWORD=${postgres_password}" >> .env
  if [[ $rabbitmq_password == "null" ]];
  then
    echo -e "${BLUE}[*]${NC} Generating random RabbitMQ password and saving it to .env"
    rabbitmq_password=$(generate_random_password)
  fi
  echo "RABBITMQ_HOST=${rabbitmq_host}" >> .env
  echo "RABBITMQ_PORT=${rabbitmq_port}" >> .env
  echo "RABBITMQ_USER=${rabbitmq_user}" >> .env
  echo "RABBITMQ_PASSWORD=${rabbitmq_password}" >> .env
  echo "RABBITMQ_VHOST=${rabbitmq_vhost}" >> .env
  mkdir -p "./postgres-docker/database"
  mkdir -p "./rabbitmq-docker/storage"
  if [[ $jwt_secret == "null" ]];
  then
    echo -e "${BLUE}[*]${NC} Generating random JWT secret and saving it to .env"
    jwt_secret=$(generate_random_password)$(generate_random_password)
  fi
  echo "JWT_SECRET=${jwt_secret}" >> .env
  echo "NGINX_PORT=${nginx_port}" >> .env
  echo "DOCUMENTATION_HOST=${documentation_host}" >> .env
  echo "DOCUMENTATION_PORT=${documentation_port}" >> .env
  echo "HASURA_HOST=${hasura_host}" >> .env
  echo "HASURA_PORT=${hasura_port}" >> .env
  if [[ $hasura_secret == "null" ]];
  then
    echo -e "${BLUE}[*]${NC} Generating random Hasura secret and saving it to .env"
    hasura_secret=$(generate_random_password)$(generate_random_password)
  fi
  echo "HASURA_SECRET=${hasura_secret}" >> .env
  echo "MYTHIC_SERVER_PORT=${mythic_server_port}" >> .env
  echo "MYTHIC_SERVER_HOST=${mythic_server_host}" >> .env
  echo "REDIS_PORT=${redis_port}" >> .env
  echo ""
fi


# make sure things are stopped first
./reset_rabbitmq.sh
# check if postgres or mythic ports are in use already, could be an issue
if [[ $postgres_host == "127.0.0.1" || $postgres_host == "localhost" ]];
then
  ss -tulpn | grep ":$postgres_port"
  if [ $? -eq 0 ]
  then
    echo -e "${RED}[-]${NC} Postgres port $postgres_port is already in use"
    exit 1
  fi
fi
ss -tulpn | grep -i ":$nginx_port "
if [ $? -eq 0 ]
then
  echo -e "${RED}[-]${NC} Nginx external port $nginx_port is already in use"
  exit 1
fi
ss -tulpn | grep -i ":$mythic_server_port "
if [ $? -eq 0 ]
then
  echo -e "${RED}[-]${NC} Mythic port $mythic_server_port is already in use"
  exit 1
fi
if [[ $documentation_host == "127.0.0.1" || $documentation_host == "localhost" ]];
then
    ss -tulpn | grep -i ":$documentation_port"
    if [ $? -eq 0 ]
    then
      echo -e "${RED}[-]${NC} Mythic documentation port $documentation_port is already in use"
      exit 1
    fi
    ./start_documentation.sh $documentation_port
fi

# start the main mythic components
export DEBUG=$debug
docker-compose up --build -d
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to start docker-compose properly. Aborting"
  exit 1
fi
excluded_payload_types_args=""
for i in "${excluded_payload_types[@]}"
do
  excluded_payload_types_args="$excluded_payload_types_args -e $i"
done
excluded_c2_profiles_args=""
for i in "${excluded_c2_profiles[@]}"
do
  excluded_c2_profiles_args="$excluded_c2_profiles_args -e $i"
done
# stand up c2 profiles
./start_c2_profiles.sh $excluded_c2_profiles_args
# stand up payload types
./start_payload_types.sh $excluded_payload_types_args

echo -e "${BLUE}[*]${NC} Testing connection to server via curl through nginx at: https://127.0.0.1:$nginx_port"
output=`curl -s --retry-connrefused --retry 5 https://127.0.0.1:$nginx_port --insecure`
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to hit specified Nginx endpoint."
  echo -e "${RED}[-]${NC} Consider running './display_output.sh mythic_server' to determine why the Mythic server cannot start"
  exit 1
else
  echo -e "${GREEN}[+]${NC} Successfully connected to endpoint"
  echo -e "${GREEN}[+]${NC} Mythic containers successfully started!"
fi
echo -e "${BLUE}[*]${NC} use ./status_check.sh to check status of docker containers"
echo -e "${BLUE}[*]${NC} use ./display_output.sh [container name] to display the output of that container"
echo -e "${BLUE}[*]${NC}    ex: ./display_output.sh mythic_server \(shows output of main mythic web server\)"
echo -e "${BLUE}[*]${NC}    ex: ./display_output.sh apfell (shows output of apfell container)"
