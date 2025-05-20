#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Print current directory for debugging
echo "Running in directory: $(pwd)"

# Define the path to the root .env.local file
ROOT_ENV_FILE="./.env.local"

# Check if root .env.local exists
if [ ! -f "$ROOT_ENV_FILE" ]; then
  echo "❌ Root .env.local file not found at $ROOT_ENV_FILE"
  echo "Please make sure your API keys are set in the root .env.local file"
  exit 1
fi

echo "✅ Found root .env.local file"

# Run the fixed real agent test
echo ""
echo "Running real agent test..."
LOCAL_ENV_PATH="$ROOT_ENV_FILE" node packages/agents/tests/real-agent-test-fixed.js

TEST_RESULT=$?
if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ Real agent test passed!"
else
  echo "❌ Real agent test failed. See errors above."
  exit 1
fi

echo ""
echo "All tests completed successfully!"
