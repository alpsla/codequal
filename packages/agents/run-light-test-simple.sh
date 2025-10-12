#!/bin/bash
# Simplified Light Multi-Repository Testing Script
# Purpose: Quick validation across Java repositories

echo "🧪 Starting Light Multi-Repository Testing..."
echo "=========================================="

# Test spring-petclinic first
REPO_URL="https://github.com/spring-projects/spring-petclinic"
REPO_DIR="/tmp/spring-petclinic-repo"

echo "Testing: spring-petclinic"
echo "URL: $REPO_URL"

# Clone
echo "Cloning repository..."
rm -rf "$REPO_DIR"
git clone --depth=10 --no-single-branch "$REPO_URL" "$REPO_DIR"

# Count files
FILE_COUNT=$(find "$REPO_DIR" -name "*.java" -type f | wc -l)
echo "Java files found: $FILE_COUNT"

# Setup branch
cd "$REPO_DIR"
git checkout -B main origin/main

# Link for test
ln -sf "$REPO_DIR" /tmp/kafka-repo

# Run test
cd ~/codequal/packages/agents
echo "Running analysis..."
npx ts-node src/two-branch/tests/__tests__/test-java-all-modes.ts

echo "✅ Test complete!"

