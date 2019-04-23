# stop the main c2 and postgres database services
docker-compose stop
# stop the c2 profiles
./stop_c2_profiles.sh
# stop the payload type containers
./stop_payload_types.sh
