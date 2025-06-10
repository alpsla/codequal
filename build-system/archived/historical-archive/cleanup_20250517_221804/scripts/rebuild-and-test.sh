#!/bin/bash

# Navigate to the project root
cd "$(dirname "$0")"

# Print current directory for debugging
echo "Running in directory: $(pwd)"

# Define the path to the .env.local file
ENV_FILE=".env.local"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env.local file not found"
  echo "Please make sure your API keys are set in the .env.local file"
  exit 1
fi

echo "✅ Found .env.local file"

# Build the core package first (since agents depends on it)
echo ""
echo "Building core package..."
cd packages/core
npm run build

CORE_BUILD_RESULT=$?
if [ $CORE_BUILD_RESULT -eq 0 ]; then
  echo "✅ Core package build successful!"
else
  echo "❌ Core package build failed. See errors above."
  exit 1
fi

# Build the agents package
echo ""
echo "Building agents package..."
cd ../agents
npm run build

AGENTS_BUILD_RESULT=$?
if [ $AGENTS_BUILD_RESULT -eq 0 ]; then
  echo "✅ Agents package build successful!"
else
  echo "❌ Agents package build failed. See errors above."
  exit 1
fi

# Run the simple test first
echo ""
echo "Running simple agent test..."
chmod +x run-simple-test.sh
./run-simple-test.sh

SIMPLE_TEST_RESULT=$?
if [ $SIMPLE_TEST_RESULT -eq 0 ]; then
  echo "✅ Simple agent test passed!"
else
  echo "❌ Simple agent test failed. See errors above."
  exit 1
fi

# Run the real test
echo ""
echo "Running real agent test..."
chmod +x run-real-test.sh
./run-real-test.sh

REAL_TEST_RESULT=$?
if [ $REAL_TEST_RESULT -eq 0 ]; then
  echo "✅ Real agent test passed!"
else
  echo "❌ Real agent test failed. See errors above."
  exit 1
fi

echo ""
echo "All tests completed successfully!"
