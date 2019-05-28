#!/bin/bash

if [ $# -eq 0 ]
then
	# if no arguments supplied, try to build and start all c2 profiles
	profiles=(./C2_Profiles/*)
else
	# if any arguments supplied, try to build and start only the specified c2 profiles
	profiles=( "$@" )
	profiles=("${profiles[@]/#/.\/C2_Profiles\/}")
fi

# build out the standard image for c2 profiles
echo "Pruning old images..."
docker image prune -f
# now loop through the profiles to build out their variations
for p in "${profiles[@]}"
do
	realpath=$(realpath "$p")
	p=$(echo "${p/.\/C2_Profiles\//}")
	tag=$(echo "$p" | tr '[:upper:]' '[:lower:]')
	tag=$(echo "${tag/' '/}")
	tag=$(echo "${tag/'_'/}")
	if [ -d "$realpath" ]
	then
		# only try to do this if the specified directory actually exists
		echo "Trying to stop $p's container..."
		if [ "$(docker ps -a | grep $tag )" ]
		then
			output=`docker stop "$tag" 2>/dev/null`
			if [ $? -ne 0 ]
			then
				echo "Failed to stop container $tag"
			fi
		fi
		echo "Deleting $p's container..."
		docker container rm $(docker ps -a -q --filter name="$tag")
	fi
done
