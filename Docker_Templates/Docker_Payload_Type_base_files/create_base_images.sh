echo "Pruning old images..."
docker image prune -f
echo "Building golden csharp image..."
docker build -f "csharp_dockerfile" --rm -t "csharp_payload" .

docker image prune -f
echo "Building golden python3.6 image..."
docker build -f "python36_dockerfile" --rm -t "python36_payload" .

docker image prune -f
echo "Building golden xgo image..."
docker build -f "xgolang_dockerfile" --rm -t "xgolang_payload" .