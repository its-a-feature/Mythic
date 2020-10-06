#! /bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'
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
server_port=`jq ".listen_port" "mythic-docker/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find server_port"
  exit 1
fi
start_documentation=`jq ".start_documentation_container" "mythic-docker/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find start_documentation_container"
  exit 1
fi
documentation_port=`jq ".documentation_container_port" "mythic-docker/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find start_documentation_container"
  exit 1
fi
use_ssl=`jq ".use_ssl" "mythic-docker/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find use_ssl"
  exit 1
fi
if [[ "$use_ssl" == "true" ]]
  then
    use_ssl="https"
  else
    use_ssl="http"
fi
excluded_payload_types=(`jq -rc ".excluded_payload_types" "mythic-docker/config.json" | jq -rc .[]`)
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find excluded_payload_types"
  exit 1
else
  excluded_payload_types_args=""
  for i in "${excluded_payload_types[@]}"
  do
     excluded_payload_types_args="$excluded_payload_types_args -e $i"
  done
  printf -v excluded_payload_types "%s " "${excluded_payload_types[@]}"
fi
excluded_c2_profiles=(`jq -rc ".excluded_c2_profiles" "mythic-docker/config.json" | jq -rc .[]`)
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find excluded_c2_profiles"
  exit 1
else
  excluded_c2_profiles_args=""
  for i in "${excluded_c2_profiles[@]}"
  do
     excluded_c2_profiles_args="$excluded_c2_profiles_args -e $i"
  done
  printf -v excluded_c2_profiles "%s " "${excluded_c2_profiles[@]}"
fi

# make sure things are stopped first
docker-compose stop
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to stop docker-compose properly. Aborting"
  exit 1
fi
# stop c2 profiles
./stop_c2_profiles.sh
# stop payload types
./stop_payload_types.sh
# stop documentation
./stop_documentation.sh

if [ ! -d "./postgres-docker/database" ]; then
    mkdir "./postgres-docker/database"
fi
if [ ! -d "./rabbitmq-docker/storage" ]; then
  mkdir "./rabbitmq-docker/storage"
fi
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
docker-compose up --build -d
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to start docker-compose properly. Aborting"
  exit 1
fi
# stand up c2 profiles
./start_c2_profiles.sh $excluded_c2_profiles_args
# stand up payload types
./start_payload_types.sh $excluded_payload_types_args
if $start_documentation
then
    ./start_documentation.sh $documentation_port
fi

echo -e "${BLUE}[*]${NC} Testing connection to server via curl at: $use_ssl://127.0.0.1:$server_port"
output=`curl -s --retry-connrefused --retry 5 $use_ssl://127.0.0.1:$server_port --insecure`
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to hit specified Mythic endpoint."
  exit 1
else
  echo -e "${GREEN}[+]${NC} Successfully connected to endpoint"
  echo -e "${GREEN}[+]${NC} Mythic containers succssfully started!"
fi
echo -e "${BLUE}[*]${NC} use ./status_check.sh to check status of docker containers"
echo -e "${BLUE}[*]${NC} use ./display_output.sh [container name] to display the output of that container"
echo -e "${BLUE}[*]${NC}    ex: ./display_output.sh mythic_server (shows output of main mythic web server)"
echo -e "${BLUE}[*]${NC}    ex: ./display_output.sh apfell (shows output of apfell container)"
