echo "Pruning old images..."
docker image prune -f
echo "Building golden python3.8 sanic image..."
docker build -f "python38_sanic_dockerfile" --rm -t "python38_sanic_c2profile" .
echo "Building golden python3.8 translator image..."
docker build -f "python38_translator_dockerfile" --rm -t "python38_translator_container" .