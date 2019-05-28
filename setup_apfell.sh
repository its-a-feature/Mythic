#!/bin/bash

# get the user configured db password from the app/__init__.py file
file="apfell-docker/app/__init__.py"
pass_regex="db_pass = '([a-z0-9A-Z_ ]*)'"
user_regex="db_user = '([a-z0-9A-Z_ ]*)'"
dbname_regex="db_name = '([a-z0-9A-Z_ ]*)'"
content=$(cat "$file")
if [[ " $content " =~ $pass_regex ]]
then
	db_pass="${BASH_REMATCH[1]}"
else
	db_pass="super_secret_apfell_user_password"
fi

if [[ " $content " =~ $user_regex ]]
then
	db_user="${BASH_REMATCH[1]}"
else
	db_user="apfell_user"
fi

if [[ " $content " =~ $dbname_regex ]]
then
	db_name="${BASH_REMATCH[1]}"
else
	db_name="apfell_db"
fi
# Create the postgres docker file from our apfell variables
echo "From postgres:9.4" > postgres-docker/Dockerfile
echo "COPY postgres.conf /etc/postgresql/postgresql.conf" >> postgres-docker/Dockerfile
echo "ENV config_file=/etc/postgresql/postgresql.conf" >> postgres-docker/Dockerfile
echo "ENV POSTGRES_USER '${db_user}'" >> postgres-docker/Dockerfile
echo "ENV POSTGRES_PASSWORD '${db_pass}'" >> postgres-docker/Dockerfile
echo "ENV POSTGRES_DB '${db_name}'" >> postgres-docker/Dockerfile

#generate a self-signed cert for us to use
mkdir ./apfell-docker/app/ssl > /dev/null 2>&1
openssl req -new -x509 -keyout ./apfell-docker/app/ssl/apfell-ssl.key -out ./apfell-docker/app/ssl/apfell-cert.pem -days 365 -nodes -subj "/C=US" >/dev/null 2>&1

./start_apfell.sh

