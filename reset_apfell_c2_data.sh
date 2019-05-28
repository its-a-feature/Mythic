#! /bin/bash

# stop the services
docker-compose stop

# remove the container so we can remove the volume
docker container rm $(docker ps -a -q --filter ancestor=apfell_apfell)
docker volume rm apfell_apfell-c2-data
