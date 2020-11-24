#! /bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'

# Allow us to exit from a function (see https://stackoverflow.com/questions/9893667/is-there-a-way-to-write-a-bash-function-which-aborts-the-whole-execution-no-mat)
trap "exit 1" TERM
export TOP_PID=$$

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
        eval $var_name+="('$value')"
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

# stand up the docker services and build if needed, started them detached
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
if [ ! -d "./mythic-docker/app/ssl" ]; then
  echo -e "${BLUE}[*]${NC} Failed to find ./mythic-docker/app/ssl folder, creating it"
  mkdir ./mythic-docker/app/ssl > /dev/null 2>&1
fi

if [ ! -f "./mythic-docker/app/ssl/mythic-ssl.key" ]; then
   echo -e "${BLUE}[*]${NC} Failed to find ssl keys, generating new ones"
   openssl req -new -x509 -keyout ./mythic-docker/app/ssl/mythic-ssl.key -out ./mythic-docker/app/ssl/mythic-cert.pem -days 365 -nodes -subj "/C=US" >/dev/null 2>&1
   echo -e "${GREEN}[+]${NC} Generated new SSL self signed certificates"
fi

# Get settings
config_file="./mythic-docker/config.json"

# Validate that the config.json is valid JSON
if ! jq -e . >/dev/null 2>&1 < $config_file; then
  echo -e "${RED}[-]${NC} Invalid JSON in '${config_file}'"
  exit 1
fi

get_config_value $config_file server_port "listen_port"
get_config_value $config_file start_documentation "start_documentation_container"
get_config_value $config_file documentation_port "documentation_container_port"
get_config_value $config_file debug "debug" "False"

get_config_value $config_file postgres_host "postgres_host" "127.0.0.1"
get_config_value $config_file postgres_port "postgres_port" "5432"
get_config_value $config_file postgres_db "postgres_db" "mythic_db"
get_config_value $config_file postgres_user "postgres_user" "mythic_user"
get_config_value $config_file postgres_password "postgres_password" "null"

get_config_value $config_file rabbitmq_host "rabbitmq_host" "127.0.0.1"
get_config_value $config_file rabbitmq_port "rabbitmq_port" "5672"
get_config_value $config_file rabbitmq_user "rabbitmq_user" "mythic_user"
get_config_value $config_file rabbitmq_password "rabbitmq_password" "mythic_password"
get_config_value $config_file rabbitmq_vhost "rabbitmq_vhost" "mythic_vhost"

get_config_value $config_file excluded_payload_types "excluded_payload_types"
get_config_value $config_file excluded_c2_profiles "excluded_c2_profiles"


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
fi

mkdir -p "./postgres-docker/database"
mkdir -p "./rabbitmq-docker/storage"

# make sure things are stopped first
docker-compose stop
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to stop docker-compose properly. Aborting"
  exit 1
fi

# stop old containers
./stop_c2_profiles.sh
./stop_payload_types.sh
./stop_documentation.sh


# check if postgres or mythic ports are in use already, could be an issue
ss -tulpn | grep :5432
if [ $? -eq 0 ]
then
  echo -e "${RED}[-]${NC} Postgres port 5432 is already in use"
  exit 1
fi
ss -tulpn | grep -i ":$server_port"
if [ $? -eq 0 ]
then
  echo -e "${RED}[-]${NC} Mythic port $server_port is already in use"
  exit 1
fi
if $start_documentation
then
    ss -tulpn | grep -i ":$documentation_port"
    if [ $? -eq 0 ]
    then
      echo -e "${RED}[-]${NC} Mythic documentation port $documentation_port is already in use"
      exit 1
    fi
fi

# start the main mythic components
export COMPOSE_PROJECT_NAME=mythic
export DEBUG=$debug
docker-compose up --build -d
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to start docker-compose properly. Aborting"
  exit 1
fi

# Start C2 Profile, Payload, and Documentation containers
excluded_payload_types_args=""
for i in ${excluded_payload_types[*]}
do
    excluded_payload_types_args="$excluded_payload_types_args -e $i"
done

excluded_c2_profiles_args=""
for i in ${excluded_c2_profiles[*]}
do
    excluded_c2_profiles_args="$excluded_c2_profiles_args -e $i"
done

./start_c2_profiles.sh $excluded_c2_profiles_args
./start_payload_types.sh $excluded_payload_types_args

if $start_documentation
then
    ./start_documentation.sh $documentation_port
fi

echo -e "${BLUE}[*]${NC} Testing connection to server via curl at: https://127.0.0.1:$server_port"
output=`curl -s --retry-connrefused --retry 5 https://127.0.0.1:$server_port --insecure`
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to hit specified Mythic endpoint."
  echo -e "${RED}[-]${NC} Consider running './display_output.sh mythic_server' to determine why the Mythic server cannot start"
  exit 1
else
  echo -e "${GREEN}[+]${NC} Successfully connected to endpoint"
  echo -e "${GREEN}[+]${NC} Mythic containers succssfully started!"
fi
echo -e "${BLUE}[*]${NC} use ./status_check.sh to check status of docker containers"
echo -e "${BLUE}[*]${NC} use ./display_output.sh [container name] to display the output of that container"
echo -e "${BLUE}[*]${NC}    ex: ./display_output.sh mythic_server (shows output of main mythic web server)"
echo -e "${BLUE}[*]${NC}    ex: ./display_output.sh apfell (shows output of apfell container)"
