#!/bin/bash
if [ "$EUID" -ne 0 ]
  then echo "[-] Please run as root"
  exit
fi

echo "Core mythic services:  mythic_server, mythic_postgres, mythic_rabbitmq, mythic_documentation, mythic_react, mythic_redis, mythic_graphql, mythic_nginx"
docker ps -a --filter name=mythic_server --filter name=mythic_postgres --filter name=mythic_rabbitmq --filter name=mythic_documentation --filter name=mythic_graphql --filter name=mythic_nginx --filter name=mythic_react --filter name=mythic_redis
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
	if [ -d "$realpath" ]
	then
		filter_string=$(echo "$filter_string --filter name=^/$tag\$")
	fi
done
docker ps -a $filter_string