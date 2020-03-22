# stop the main c2 and postgres database services
docker-compose stop
output=`docker container rm $(docker container ps -aq --filter name="apfell_apfell") 2>/dev/null`
output=`docker container rm $(docker container ps -aq --filter name="apfell_rabbitmq") 2>/dev/null`
output=`docker container rm $(docker container ps -aq --filter name="apfell_postgres") 2>/dev/null`
# stop the c2 profiles
./stop_c2_profiles.sh
# stop the payload type containers
./stop_payload_types.sh
