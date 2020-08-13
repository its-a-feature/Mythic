#! /bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'
if [ "$EUID" -ne 0 ]
  then echo -e "${RED}[-]${NC} Please run as root"
  exit
fi

# stop the services
echo -e "${BLUE}[*]${NC} Stopping Mythic"
./stop_mythic.sh

# remove the container so we can remove the volume
docker container rm mythic_rabbitmq
if [ -d "./rabbitmq-docker/storage" ]; then
  rm -rf "./rabbitmq-docker/storage/"
  echo -e "${GREEN}[+]${NC} Removed ./rabbitmq-docker/storage files"
fi
if [ ! -d "./rabbitmq-docker/storage" ]; then
  mkdir "./rabbitmq-docker/storage"
fi

echo -e "${GREEN}[+]${NC} Successfully removed rabbitmq information"
echo -e "${BLUE}[*]${NC} Start Mythic again with ./start_mythic.sh"
