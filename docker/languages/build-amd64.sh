#!/bin/bash
# Build all language-specific Docker images for AMD64 architecture

REGISTRY="registry.digitalocean.com/codequal"

echo "Building 10 language-specific Docker images for AMD64..."

# Build images with explicit platform specification
docker buildx build --platform linux/amd64 -f Dockerfile.python -t ${REGISTRY}/analyzer:lang-python-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.javascript -t ${REGISTRY}/analyzer:lang-javascript-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.java -t ${REGISTRY}/analyzer:lang-java-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.go -t ${REGISTRY}/analyzer:lang-go-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.rust -t ${REGISTRY}/analyzer:lang-rust-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.ruby -t ${REGISTRY}/analyzer:lang-ruby-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.php -t ${REGISTRY}/analyzer:lang-php-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.cpp -t ${REGISTRY}/analyzer:lang-cpp-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.csharp -t ${REGISTRY}/analyzer:lang-csharp-v2 --push .
docker buildx build --platform linux/amd64 -f Dockerfile.perl -t ${REGISTRY}/analyzer:lang-perl-v2 --push .

echo "All AMD64 images built and pushed!"