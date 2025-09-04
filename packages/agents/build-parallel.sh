#!/bin/bash

# Build language containers in parallel
cd "/Users/alpinro/Code Prjects/codequal/packages/agents"

echo "🚀 Building language containers in parallel..."
echo ""

# Function to build a container
build_lang() {
    local LANG=$1
    local DOCKERFILE=$2
    echo "Building $LANG..."
    docker buildx build \
        --platform linux/amd64 \
        -t "registry.digitalocean.com/codequal/analyzer:lang-${LANG}-amd64" \
        -f "$DOCKERFILE" \
        --push \
        . > "/tmp/build-${LANG}.log" 2>&1 &
    echo "  $LANG build started (PID: $!)"
}

# Start builds
build_lang "javascript" "docker/Dockerfile.javascript-quick"
build_lang "java" "docker/Dockerfile.java-quick"
build_lang "go" "docker/Dockerfile.go-quick"
build_lang "rust" "docker/Dockerfile.rust-quick"
build_lang "ruby" "docker/Dockerfile.ruby-quick"
build_lang "php" "docker/Dockerfile.php-quick"
build_lang "cpp" "docker/Dockerfile.cpp-quick"

echo ""
echo "⏳ Waiting for builds to complete..."
echo "   Check logs in /tmp/build-*.log"
echo ""

# Wait for all background jobs
wait

echo "✅ All builds completed!"
echo ""
echo "Checking build results:"
for lang in javascript java go rust ruby php cpp; do
    if grep -q "DONE" "/tmp/build-${lang}.log" 2>/dev/null; then
        echo "  ✅ $lang: SUCCESS"
    else
        echo "  ❌ $lang: FAILED (check /tmp/build-${lang}.log)"
    fi
done