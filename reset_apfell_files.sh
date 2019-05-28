#! /bin/bash

# stop our services
docker-compose stop
# remove the apfell service files by their volume names
docker container rm $(docker ps -a -q --filter ancestor=apfell_apfell)
docker volume rm apfell_apfell-file-data
docker volume rm apfell_apfell-payload-data
