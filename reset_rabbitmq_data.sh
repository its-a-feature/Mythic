#! /bin/bash

# stop the services
docker-compose stop

# remove the container so we can remove the volume
docker container rm apfell_rabbitmq
if [ -d "./rabbitmq-docker/storage" ]; then
  rm -rf "./rabbitmq-docker/storage/"
  echo "Removed ./rabbitmq-docker/storage files"
fi
if [ ! -d "./rabbitmq-docker/storage" ]; then
  mkdir "./rabbitmq-docker/storage"
fi
