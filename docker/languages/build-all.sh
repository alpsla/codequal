#!/bin/bash
# Build all language-specific Docker images

echo "Building 10 language-specific Docker images..."

docker build -f Dockerfile.python -t codequal/python:latest .
docker build -f Dockerfile.javascript -t codequal/javascript:latest .
docker build -f Dockerfile.java -t codequal/java:latest .
docker build -f Dockerfile.go -t codequal/go:latest .
docker build -f Dockerfile.rust -t codequal/rust:latest .
docker build -f Dockerfile.ruby -t codequal/ruby:latest .
docker build -f Dockerfile.php -t codequal/php:latest .
docker build -f Dockerfile.cpp -t codequal/cpp:latest .
docker build -f Dockerfile.csharp -t codequal/csharp:latest .
docker build -f Dockerfile.perl -t codequal/perl:latest .

echo "All images built!"
docker images | grep codequal
