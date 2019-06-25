#!/bin/bash

if [ $# -eq 0 ]
then
	# if no arguments supplied, try to build and start all payload types
	payloads=(./Payload_Types/*)
else
	# if any arguments supplied, try to build and start only the specified payload types
	payloads=( "$@" )
	payloads=("${payloads[@]/#/.\/Payload_Types\/}")
fi

# build out the standard image for building payload types
echo "Pruning old images..."
docker image prune -f
echo "Building golden payload_type_base image..."
docker build -f "./Payload_Types/Dockerfile" --rm -t "payload_type_base" "./Payload_Types"
# now loop through the profiles to build out their variations
echo "Looping through payload types..."
for p in "${payloads[@]}"
do
	realpath=$(realpath "$p")
	p=$(echo "${p/.\/Payload_Types\//}")
	tag=$(echo "$p" | tr '[:upper:]' '[:lower:]')
	tag=$(echo "${tag/' '/}")
	tag=$(echo "${tag/'_'/}")
	if [ -d "$realpath" ]
	then
		# only try to do this if the specified directory actually exists
		echo "Building $p's docker"
		docker build -f "$realpath/Dockerfile" --rm -t "$tag" "$realpath"
		#docker container prune -f
		#docker volume prune -f
		output=`docker run --network host --hostname "$p" -d -v "$realpath:/Apfell/" --name "$tag" "$tag" 2>&1`
		if [ $? -ne 0 ] 
		then
			echo "Payload Type, $p, is already running. Stopping it..."
			# if we got an error while trying to run the container, stop any current ones first and try again
			output=`docker stop "$tag" 2>/dev/null`
			#docker container prune -f
			output=`docker container rm $(docker container ps -aq --filter name="$tag") 2>/dev/null`
			#docker volume prune -f
			#output=`docker volume rm "apfell_${tag}" 2>/dev/null`
			echo "Now trying to start it again..."
			docker run --network host --hostname "$p" -d -v "$realpath:/Apfell/" --name "$tag" "$tag"	
		fi
	fi
done
