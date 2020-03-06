#! /bin/bash

# stop our services
docker-compose stop
# remove the postgres service
docker container rm apfell_postgres
if [ -d "./postgres-docker/database" ]; then
  rm -rf "./postgres-docker/database/";
  echo "Removed ./postgres-docker/database files"
fi
if [ ! -d "./postgres-docker/database" ]; then
    mkdir "./postgres-docker/database"
fi
