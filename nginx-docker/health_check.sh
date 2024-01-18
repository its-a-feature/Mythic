#!/bin/sh

if [ "$NGINX_USE_SSL" = "ssl" ]
then
  curl -k https://127.0.0.1:"${NGINX_PORT:-7443}"/new/login
else
  curl -k http://127.0.0.1:"${NGINX_PORT:-7443}"/new/login
fi
