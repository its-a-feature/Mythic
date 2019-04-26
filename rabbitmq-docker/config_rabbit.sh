#!/bin/bash

# This script needs to be executed just once
if [ -f /$0.completed ] ; then
  echo "$0 `date` /$0.completed found, skipping run"
  exit 0
fi

# Wait for RabbitMQ startup
for (( ; ; )) ; do
  sleep 2
  rabbitmqctl -q node_health_check > /dev/null 2>&1
  if [ $? -eq 0 ] ; then
    echo "$0 `date` rabbitmq is now running"
    break
  else
    echo "$0 `date` waiting for rabbitmq startup"
  fi
done

# Execute RabbitMQ config commands here

# Create user
rabbitmqctl add_user apfell_user apfell_password
rabbitmqctl add_vhost apfell_vhost
rabbitmqctl set_user_tags apfell_user administrator
rabbitmqctl set_permissions -p apfell_vhost apfell_user ".*" ".*" ".*"
echo "$0 `date` user apfell_user created"

# Create queue
#rabbitmqadmin declare queue name=QUEUE durable=true
#echo "$0 `date` queues created"

# Create mark so script is not ran again
touch /$0.completed
