#! /bin/bash

# stop our services
docker-compose stop
# remove the postgres service
docker container rm $(docker ps -a -q --filter ancestor=apfell_postgres)
docker volume rm apfell_postgres-data-volume
