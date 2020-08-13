#!/bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'
if [ "$EUID" -ne 0 ]
  then echo -e "${RED}[-]${NC} Please run as root"
  exit
fi
server_port=`jq ".listen_port" "mythic-docker/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find server_port"
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
containsElement () {
  local e match="$1"
  shift
  for e; do [[ "$e" == "$match" ]] && return 0; done
  return 1
}
startContainer(){
  p="$1"
  realpath=$(realpath "$p")
    if [ $? -ne 0 ]
    then
      echo -e "${RED}[-]${NC} Failed to find 'realpath' command. Aborting"
      exit 1
    fi
    p=$(echo "${p/.\/C2_Profiles\//}")
    tag=$(echo "$p" | tr '[:upper:]' '[:lower:]')
    tag=$(echo "${tag/' '/}")
    tag=$(echo "${tag/'_'/}")
    if [ -d "$realpath" ]
    then
      # only try to do this if the specified directory actually exists
      echo -e "${BLUE}[*]${NC} Building $p's docker"
      docker build -f "$realpath/Dockerfile" --rm -t "$tag" "$realpath"
      if [ $? -ne 0 ]
      then
        echo -e "${RED}[-]${NC} Failed to build $p's container. Aborting"
        exit 1
      else
        echo -e "${GREEN}[+]${NC} Successfully built $p's container"
      fi
      docker container prune -f
      #docker volume prune -f
      output=`docker run --network host --hostname "$p" -d -v "$realpath:/Mythic/" --name "$tag" -e MYTHIC_ADDRESS="$use_ssl://127.0.0.1:$server_port/api/v1.4/agent_message" "$tag" 2>&1`
      if [ $? -ne 0 ]
      then
        echo -e "${BLUE}[*]${NC} C2 Profile, $p, is already running. Stopping it..."
        # if we got an error while trying to run the container, stop any current ones first and try again
        output=`docker stop "$tag" 2>/dev/null`
        #docker container prune -f
        output=`docker container rm $(docker container ps -aq --filter name="$tag") 2>/dev/null`
        #docker volume prune -f
        #output=`docker volume rm "mythic_${tag}" 2>/dev/null`
        echo -e "${BLUE}[*]${NC} Now trying to start it again..."
        docker run --network host --hostname "$p" -d -v "$realpath:/Mythic/" --name "$tag" -e MYTHIC_ADDRESS="$use_ssl://127.0.0.1:$server_port/api/v1.4/agent_message" "$tag"
        if [ $? -ne 0 ]
        then
          echo -e "${RED}[-]${NC} Failed to start $p's container. Aborting"
          exit 1
        else
          echo -e "${GREEN}[+]${NC} Successfully started $p's container"
        fi
      else
        echo -e "${GREEN}[+]${NC} Successfully started $p's container"
      fi
    fi
}
if [ $# -eq 0 ]
then
	# if no arguments supplied, try to build and start all payload types
	exclude=()
	include=()
else
  exclude=()
  include=()
while (( "$#" )); do
  case "$1" in
    -e|--exclude)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        exclude+=("$2")
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -*|--*=) # unsupported flags
      echo "Error: Unsupported flag $1" >&2
      exit 1
      ;;
    *) # preserve positional arguments
      include+=("$1")
      shift
      ;;
  esac
done
#echo "exclude:"
#echo "${exclude[*]}"
#echo "include:"
#echo "${include[*]}"
	# if any arguments supplied, add them to an exclusion list
	exclude=("${exclude[@]/#/.\/C2_Profiles\/}")
	include=("${include[@]/#/.\/C2_Profiles\/}")
fi
payloads=(./C2_Profiles/*)

# build out the standard image for building payload types
echo -e "${BLUE}[*]${NC} Pruning old images..."
docker image prune -f
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to prune old images. Aborting"
  exit 1
fi
# can use the next two lines to build a local "payload_type_base" image that's python3.6 and has the necessary files
#echo "Building golden payload_type_base image..."
# now loop through the profiles to build out their variations
echo -e "${BLUE}[*]${NC} Looping through payload types..."
for p in "${payloads[@]}"
do
  containsElement "${p}" "${exclude[@]}"
  #  0  is success,  the element is contained
  if [[ $? == 1 ]]
  then
    # payload type not excluded
    if [[ ${#include[@]} > 0 ]]
    then
      # it wasn't explicitly excluded, but we do have an inclusion list, so only start those
      containsElement  "${p}" "${include[@]}"
      if [[  $? == 0 ]]
      then
          startContainer "$p"
          continue
        fi
        echo -e "${BLUE}[*]${NC} skipping $p's container"
        continue
      fi
     startContainer "$p"
  else
    echo -e "${BLUE}[*]${NC} skipping $p's container"
  fi
done
