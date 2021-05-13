#!/bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'
export COMPOSE_PROJECT_NAME=mythic
if [ "$EUID" -ne 0 ]
  then echo -e "${RED}[-]${NC} Please run as root"
  exit
fi
# stop the main c2 and postgres database services
echo -e "${BLUE}[*]${NC} Stopping main Mythic services"
docker-compose stop
echo -e "${BLUE}[*]${NC} Removing main Mythic containers"
output=`docker container rm $(docker container ps -aq --filter name="mythic_server") 2>/dev/null`
output=`docker container rm $(docker container ps -aq --filter name="mythic_rabbitmq") 2>/dev/null`
output=`docker container rm $(docker container ps -aq --filter name="mythic_postgres") 2>/dev/null`
output=`docker container rm $(docker container ps -aq --filter name="mythic_graphql") 2>/dev/null`
output=`docker container rm $(docker container ps -aq --filter name="mythic_nginx") 2>/dev/null`
output=`docker container rm $(docker container ps -aq --filter name="mythic_react") 2>/dev/null`
output=`docker container rm $(docker container ps -aq --filter name="mythic_redis") 2>/dev/null`
# stop the c2 profiles
./stop_c2_profiles.sh
# stop the payload type containers
./stop_payload_types.sh
# stop the documentation container
./stop_documentation.sh
