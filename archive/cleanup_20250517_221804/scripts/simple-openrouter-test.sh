#!/bin/bash

# Simple OpenRouter Test for Claude Access
# This script tests using OpenRouter to access Claude models

echo "DeepWiki OpenRouter Simple Test"
echo "=============================="
echo ""

# Configuration
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/openrouter-test-results"
API_URL="http://localhost:8001"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
TEST_REPO="pallets/click"
REPO_URL="https://github.com/pallets/click"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Prompt for OpenRouter API key if not provided
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "OpenRouter API key not found in environment."
  echo -n "Please enter your OpenRouter API key: "
  read -s OPENROUTER_API_KEY
  echo ""
  
  if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "No API key provided. Exiting."
    exit 1
  fi
fi

echo "OpenRouter API key provided." 
echo "This will test Claude access via OpenRouter."
echo ""

# Function to run a test
run_test() {
  local provider="openrouter"
  local model="anthropic/claude-3.7-sonnet"
  local query="What is the overall architecture of this repository? Please explain the main components, their relationships, and how they work together."
  local output_file="$OUTPUT_DIR/${provider}-${model//\\//-}-$TIMESTAMP.json"
  
  echo ""
  echo "Testing $provider/$model"
  echo "Query: $query"
  echo "Output: $output_file"
  echo ""
  
  # Create a temporary file for the request body
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOL
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "$query"
    }
  ],
  "provider": "$provider",
  "model": "$model"
}
EOL
  
  # Use stream endpoint for chat completions with the API key
  curl -s -X POST "$API_URL/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -d @"$TEMP_FILE" > "$output_file"
  
  # Remove temporary file
  rm "$TEMP_FILE"
  
  # Check the size of the output file
  SIZE=$(wc -c < "$output_file" | xargs)
  
  if [ "$SIZE" -lt 200 ]; then
    echo "WARNING: The response is very small ($SIZE bytes)."
    echo "This might indicate an error. Check the output file:"
    cat "$output_file"
    echo ""
    echo "Please ensure the API key is correct and the API server is running at $API_URL"
  else
    echo "Received response of $SIZE bytes. Test appears successful!"
  fi
}

# Run the test
run_test

echo ""
echo "Test completed!"
echo "Output file: $OUTPUT_DIR/openrouter-anthropic-claude-3.7-sonnet-$TIMESTAMP.json"
echo ""
echo "If the test was successful, you can proceed with the full test:"
echo "bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/run-full-tests.sh"
