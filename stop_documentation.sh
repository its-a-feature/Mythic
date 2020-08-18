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
docker stop "documentation" 2>/dev/null
docker container prune --filter label=name=documentation -f
echo -e "${GREEN}[+]${NC} Successfully stopped the documentation container"