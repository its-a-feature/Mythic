#!/bin/sh

cp /tmp/base_rabbitmq.conf /tmp/rabbitmq.conf
echo -n "default_user = " >> /tmp/rabbitmq.conf
echo "$RABBITMQ_USER" >> /tmp/rabbitmq.conf
echo -n "default_pass = " >> /tmp/rabbitmq.conf
echo "$RABBITMQ_PASSWORD" >> /tmp/rabbitmq.conf
echo -n "default_vhost = " >> /tmp/rabbitmq.conf
echo "$RABBITMQ_VHOST" >>/tmp/rabbitmq.conf
echo -n "listeners.tcp.default = " >> /tmp/rabbitmq.conf
echo "$RABBITMQ_PORT" >> /tmp/rabbitmq.conf
cp /tmp/rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
echo "[+] updated config, echoing it out"
cat /tmp/rabbitmq.conf
exit 0