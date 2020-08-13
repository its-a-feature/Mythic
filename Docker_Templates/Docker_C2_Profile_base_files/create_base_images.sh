echo "Pruning old images..."
docker image prune -f
echo "Building golden python3.6 image..."
docker build -f "python36_dockerfile" --rm -t "python36_c2profile" .