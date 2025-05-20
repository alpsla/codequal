#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Print current directory for debugging
echo "Running in directory: $(pwd)"

# Define the path to the root .env.local file
ROOT_ENV_FILE="../../.env.local"

# Check if root .env.local exists
if [ ! -f "$ROOT_ENV_FILE" ]; then
  echo "❌ Root .env.local file not found at $ROOT_ENV_FILE"
  echo "Please make sure your API keys are set in the root .env.local file"
  exit 1
fi

echo "✅ Found root .env.local file"

# Check if dotenv is installed
if ! npm list dotenv | grep -q dotenv; then
  echo "Installing dotenv..."
  npm install --save-dev dotenv
fi

# Check if @types/node is installed
if ! npm list @types/node | grep -q @types/node; then
  echo "Installing @types/node..."
  npm install --save-dev @types/node
fi

# Run the simple test script
echo ""
echo "Running simple agent test..."
LOCAL_ENV_PATH="$ROOT_ENV_FILE" node tests/simple-test.js

TEST_RESULT=$?
if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ Simple test passed!"
else
  echo "❌ Simple test failed. See errors above."
  exit 1
fi

echo ""
echo "All tests completed successfully!"
