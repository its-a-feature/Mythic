echo "Pruning old images..."
docker image prune -f
echo "Building golden python3.8 sanic image..."
docker build -f "python38_sanic_dockerfile" --rm -t "python38_sanic_c2profile" .