#!/bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'
if [ "$EUID" -ne 0 ]
  then echo -e "${RED}[-]${NC} Please run as root"
  exit
fi
echo -e "${BLUE}[*]${NC} Stopping documentation container"
output=`docker stop "mythic_documentation" 2>/dev/null`
output=`docker ps -aqf name=mythic_documentation`
if [[ $output ]]
then
  output=`docker container rm ${output}`
  output=`docker container prune --filter label=name=mythic_documentation -f`
fi

echo -e "${GREEN}[+]${NC} Successfully stopped the documentation container"