#!/bin/bash

# Very Simple OpenRouter Test
# This is a minimal script to test OpenRouter API with explicit key entry

OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/minimal-test-results"
API_URL="http://localhost:8001"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Prompt for OpenRouter API key
echo "Enter OpenRouter API key for testing:"
read -s OPENROUTER_API_KEY

if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "No key provided. Exiting."
  exit 1
fi

echo "Using provided key: ${OPENROUTER_API_KEY:0:4}...${OPENROUTER_API_KEY: -4}"

# Test variables
REPO="pallets/flask"
REPO_URL="https://github.com/$REPO"
OUTPUT_FILE="$OUTPUT_DIR/minimal-openrouter-test-$TIMESTAMP.json"

echo "Testing OpenRouter with Claude on repository: $REPO"
echo "API URL: $API_URL"
echo "Output will be saved to: $OUTPUT_FILE"

# Create request data in a file - escaping quotes
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" << EOL
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "What is the architecture of this repository?"
    }
  ],
  "provider": "openrouter",
  "model": "anthropic/claude-3.7-sonnet"
}
EOL

# Debugging step - show request data
echo "Request data:"
cat "$TEMP_FILE"
echo ""

# Make the API call with verbose output
echo "Making API call to DeepWiki..."
curl -v -X POST "$API_URL/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d @"$TEMP_FILE" > "$OUTPUT_FILE" 2>"$OUTPUT_DIR/curl-debug-$TIMESTAMP.log"

CURL_STATUS=$?
if [ $CURL_STATUS -ne 0 ]; then
  echo "Curl command failed with status $CURL_STATUS"
  echo "Check log file for details: $OUTPUT_DIR/curl-debug-$TIMESTAMP.log"
fi

# Check response
echo "Checking response..."
SIZE=$(wc -c < "$OUTPUT_FILE" | xargs)
echo "Response size: $SIZE bytes"

if [ "$SIZE" -lt 200 ]; then
  echo "WARNING: Response is too small, likely an error."
  echo "Response content:"
  cat "$OUTPUT_FILE"
  echo ""
  echo "Debug log:"
  cat "$OUTPUT_DIR/curl-debug-$TIMESTAMP.log"
else
  echo "Response looks good! First 200 characters:"
  head -c 200 "$OUTPUT_FILE"
  echo "..."
fi

echo ""
echo "Test completed. If successful, you can now run the multi-model test with:"
echo "bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/simple-multi-test.sh"
