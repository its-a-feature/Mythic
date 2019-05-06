if ! which docker > /dev/null; then
    echo "Sorry, docker needs to be installed."
    exit 1
elif ! which docker-compose > /dev/null; then
    echo "Sorry, docker-compose needs to be installed"
    exit 1
fi
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
