#!/bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'
if [ "$EUID" -ne 0 ]
  then echo -e "${RED}[-]${NC} Please run as root"
  exit
fi
if [ $# -eq 1 ]
then
  documentation_port=$1
else
  documentation_port=`jq ".documentation_container_port" "mythic-docker/config.json"`
  if [[ $? -ne 0  ]]
  then
    echo -e "${RED}[-]${NC} Failed to find start_documentation_container"
    exit 1
  fi
fi
output=`docker stop "documentation" 2>/dev/null`
ss -tulpn | grep -i ":$documentation_port"
if [ $? -eq 0 ]
then
  echo -e "${RED}[-]${NC} Mythic documentation port $documentation_port is already in use"
  exit 1
fi
echo -e "${BLUE}[*]${NC} Building the documentation docker container"
docker build -f "documentation-docker/Dockerfile" --rm -t "mythic_documentation" "documentation-docker"
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to build the documentation container. Aborting"
  exit 1
else
  echo -e "${GREEN}[+]${NC} Successfully built the documentation container"
fi
output=`docker container rm documentation`
docker container prune --filter label=name=documentation -f
realpath=$(realpath "documentation-docker")
output=`docker run -d -v "$realpath:/src" --name "documentation" -p $documentation_port:1313  "mythic_documentation" server`