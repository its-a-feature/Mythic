echo "Pruning old images..."
docker image prune -f
echo "Building golden postgres image..."
docker build -f "mythic_postgres" --rm -t "mythic_postgres" .

docker image prune -f
echo "Building golden rabbitmq image..."
docker build -f "mythic_rabbitmq" --rm -t "mythic_rabbitmq" .

docker image prune -f
echo "Building golden server image..."
docker build -f "mythic_server" --rm -t "mythic_server" .