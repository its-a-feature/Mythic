#!/bin/bash

if [ $# -ne 0 ]
then
    containers=( "$@" )
    for p in "${containers[@]}"
    do
        docker logs "$p"
        read  -n 1 -p "Press key to move to next container or q to quit" character
        if [ "$character" == "q" ]
        then
            exit 0
        fi
    done
else
    echo "Clearing display_output.txt"
    echo -n "" > display_output.txt
    echo "Writing out apfell_rabbitmq to display_output.txt"
    output=`docker logs apfell_rabbitmq >> display_output.txt 2>/dev/null`
    echo "Writing out apfell_postgres to display_output.txt"
    output=`docker logs apfell_postgres >> display_output.txt 2>/dev/null`
    echo "Writing out apfell_apfell to display_output.txt"
    output=`docker logs apfell_apfell >> display_output.txt 2>/dev/null`
    profiles=(./C2_Profiles/*)
    for p in "${profiles[@]}"
    do
        realpath=$(realpath "$p")
        p=$(echo "${p/.\/C2_Profiles\//}")
        tag=$(echo "$p" | tr '[:upper:]' '[:lower:]')
            tag=$(echo "${tag/' '/}")
            tag=$(echo "${tag/'_'/}")
        if [ -d "$realpath" ]
        then
            echo "Writing out $tag to display_output.txt"
            output=`docker logs "$tag" >> display_output.txt 2>/dev/null`
        fi
    done
    profiles=(./Payload_Types/*)
    for p in "${profiles[@]}"
    do
        realpath=$(realpath "$p")
        p=$(echo "${p/.\/Payload_Types\//}")
        tag=$(echo "$p" | tr '[:upper:]' '[:lower:]')
            tag=$(echo "${tag/' '/}")
            tag=$(echo "${tag/'_'/}")
        if [ -d "$realpath" ]
        then
            echo "Writing out $tag to display_output.txt"
            output=`docker logs "$tag" >> display_output.txt 2>/dev/null`
        fi
    done
fi

