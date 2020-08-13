#! /bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'
if [ "$EUID" -ne 0 ]
  then -e "${RED}[-]${NC} Please run as root"
  exit
fi
echo -e "${BLUE}[*]${NC} Stopping Mythic"
# stop our services
./stop_mythic.sh
# remove the postgres service
output=`docker container rm mythic_postgres 2>/dev/null`
if [ -d "./postgres-docker/database" ]; then
  rm -rf "./postgres-docker/database/";
  echo -e "${GREEN}[+]${NC} Removed ./postgres-docker/database files"
fi
if [ ! -d "./postgres-docker/database" ]; then
    mkdir "./postgres-docker/database"
fi
echo -e "${GREEN}[+]${NC} Successfully removed the postgres database"
echo -e "${BLUE}[*]${NC} Start Mythic again with ./start_mythic.sh"
