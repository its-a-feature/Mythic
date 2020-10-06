echo "Pruning old images..."
docker image prune -f
echo "Building golden csharp image..."
docker build -f "csharp_dockerfile" --rm -t "csharp_payload" .

docker image prune -f
echo "Building golden python3.8 image..."
docker build -f "python38_dockerfile" --rm -t "python38_payload" .

docker image prune -f
echo "Building golden xgo image..."
docker build -f "xgolang_dockerfile" --rm -t "xgolang_payload" .

docker image prune -f
echo "Building golden leviathan image..."
docker build -f "leviathan_dockerfile" --rm -t "leviathan_payload" .