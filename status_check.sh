#!/bin/bash
echo "Core apfell services:  apfell_apfell, apfell_postgres, apfell_rabbitmq"
docker ps -a --filter name=apfell_apfell --filter name=apfell_postgres --filter name=apfell_rabbitmq
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
		filter_string=$(echo "$filter_string --filter name=$tag")
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
		filter_string=$(echo "$filter_string --filter name=$tag")
	fi
done
docker ps -a $filter_string