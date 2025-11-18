#!/bin/bash
# Build and push GATI Docker images to Docker Hub

set -e  # Exit on error

# Configuration
DOCKER_USERNAME="${DOCKER_USERNAME:-yourusername}"  # Change this!
VERSION="${1:-latest}"

echo "========================================="
echo "Building GATI Docker Images"
echo "Username: $DOCKER_USERNAME"
echo "Version: $VERSION"
echo "========================================="

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    echo "Not logged in to Docker Hub. Running 'docker login'..."
    docker login
fi

echo ""
echo "1/3 Building backend..."
docker build -t $DOCKER_USERNAME/gati-backend:$VERSION \
             -t $DOCKER_USERNAME/gati-backend:latest \
             ./backend

echo ""
echo "2/3 Building dashboard..."
docker build -t $DOCKER_USERNAME/gati-dashboard:$VERSION \
             -t $DOCKER_USERNAME/gati-dashboard:latest \
             ./dashboard

echo ""
echo "3/3 Building mcp-server..."
docker build -t $DOCKER_USERNAME/gati-mcp-server:$VERSION \
             -t $DOCKER_USERNAME/gati-mcp-server:latest \
             ./mcp-server

echo ""
echo "========================================="
echo "Pushing images to Docker Hub..."
echo "========================================="

docker push $DOCKER_USERNAME/gati-backend:$VERSION
docker push $DOCKER_USERNAME/gati-backend:latest

docker push $DOCKER_USERNAME/gati-dashboard:$VERSION
docker push $DOCKER_USERNAME/gati-dashboard:latest

docker push $DOCKER_USERNAME/gati-mcp-server:$VERSION
docker push $DOCKER_USERNAME/gati-mcp-server:latest

echo ""
echo "========================================="
echo "✅ All images built and pushed!"
echo "========================================="
echo ""
echo "Images pushed:"
echo "  - $DOCKER_USERNAME/gati-backend:$VERSION"
echo "  - $DOCKER_USERNAME/gati-backend:latest"
echo "  - $DOCKER_USERNAME/gati-dashboard:$VERSION"
echo "  - $DOCKER_USERNAME/gati-dashboard:latest"
echo "  - $DOCKER_USERNAME/gati-mcp-server:$VERSION"
echo "  - $DOCKER_USERNAME/gati-mcp-server:latest"
echo ""
echo "Next steps:"
echo "  1. Update sdk/gati/docker-compose.yml to use $DOCKER_USERNAME/gati-*"
echo "  2. Rebuild Python package: python -m build"
echo "  3. Publish to PyPI: twine upload dist/*"
echo ""
