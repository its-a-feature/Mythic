#!/bin/bash
if [ "$EUID" -ne 0 ]
  then echo "[-] Please run as root"
  exit
fi

echo "Core mythic services:  mythic_server, mythic_postgres, mythic_rabbitmq, documentation"
docker ps -a --filter name=mythic_server --filter name=mythic_postgres --filter name=mythic_rabbitmq --filter name=documentation
echo ""
echo "C2_Profile endpoints"
profiles=(./C2_Profiles/*)
filter_string=""
for p in "${profiles[@]}"
do
	realpath=$(realpath "$p")
	p=$(echo "${p/.\/C2_Profiles\//}")
	tag=$(echo "$p" | tr '[:upper:]' '[:lower:]')
        tag=$(echo "${tag/' '/}")
        tag=$(echo "${tag/'_'/}")
	if [ -d "$realpath" ]
	then
		filter_string=$(echo "$filter_string --filter name=^/$tag\$")
	fi
done
docker ps -a $filter_string
echo ""
echo "Payload Type Endpoints"
profiles=(./Payload_Types/*)
filter_string=""
for p in "${profiles[@]}"
do
	realpath=$(realpath "$p")
	p=$(echo "${p/.\/Payload_Types\//}")
	tag=$(echo "$p" | tr '[:upper:]' '[:lower:]')
        tag=$(echo "${tag/' '/}")
        tag=$(echo "${tag/'_'/}")
	if [ -d "$realpath" ]
	then
		filter_string=$(echo "$filter_string --filter name=^/$tag\$")
	fi
done
docker ps -a $filter_string