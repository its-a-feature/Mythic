# make sure things are stopped first
docker-compose stop
# stand up the docker services and build if needed, started them detached
if ! which realpath > /dev/null; then
  apt-get install -y realpath
fi
docker-compose up --build -d
# stand up c2 profiles
./start_c2_profiles.sh
# stand up payload types
./start_payload_types.sh
