#!/bin/bash

# Launch config script in background
# Note there is no RabbitMQ Docker image support for executing commands after server (PID 1) is running (something like "ADD schema.sql /docker-entrypoint-initdb.d" in MySql image), so we are using this trick
/config_rabbit.sh &

# Launch
/docker-entrypoint.sh rabbitmq-server
