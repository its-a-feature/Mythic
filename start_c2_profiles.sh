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
echo "Building golden c2_profile_base image..."
docker build -f "./C2_Profiles/Dockerfile" --rm -t "c2_profile_base" "./C2_Profiles"
# now loop through the profiles to build out their variations
echo "Looping through c2 profiles..."
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
		echo "Building $p's docker"
		docker build -f "$realpath/Dockerfile" --rm -t "$tag" "$realpath"
		#docker container prune -f
		#docker volume prune -f
		output=`docker run --network host --hostname "$p" -d -v "$realpath:/Apfell/" --name "$tag" "$tag" 2>&1`
		if [ $? -ne 0 ] 
		then
			echo "C2 Profile, $p, is already running. Stopping it..."
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
