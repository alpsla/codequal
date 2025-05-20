#!/bin/bash

# Direct API Test
# This script directly tests the DeepWiki API without any wrapper

echo "DeepWiki Direct API Test"
echo "======================="
echo ""

# Default values
API_URL="http://localhost:8001"
REPO="pallets/flask"
REPO_URL="https://github.com/$REPO"
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/direct-api-test-results"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Ask which API key to use
echo "Which API key would you like to use?"
echo "1. OpenAI"
echo "2. Google/Gemini"
echo "3. Anthropic"
echo "4. OpenRouter"
echo "5. Enter manually"
read -p "Enter choice (1-5): " KEY_CHOICE

API_KEY=""
PROVIDER=""
MODEL=""

case $KEY_CHOICE in
  1)
    API_KEY="$OPENAI_API_KEY"
    PROVIDER="openai"
    MODEL="gpt-4o"
    ;;
  2)
    API_KEY="${GOOGLE_API_KEY:-$GEMINI_API_KEY}"
    PROVIDER="google"
    MODEL="gemini-2.5-pro-preview-05-06"
    ;;
  3)
    API_KEY="$ANTHROPIC_API_KEY"
    PROVIDER="anthropic"
    MODEL="claude-3-7-sonnet"
    ;;
  4)
    API_KEY="$OPENROUTER_API_KEY"
    PROVIDER="openrouter"
    MODEL="anthropic/claude-3.7-sonnet"
    ;;
  5)
    read -p "Enter provider (openai, google, anthropic, openrouter): " PROVIDER
    read -p "Enter model: " MODEL
    read -s -p "Enter API key: " API_KEY
    echo ""
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

if [ -z "$API_KEY" ]; then
  echo "No API key provided. Exiting."
  exit 1
fi

echo "Using provider: $PROVIDER"
echo "Using model: $MODEL"
echo "API key: ${API_KEY:0:4}...${API_KEY: -4}"
echo ""

# Create test query
QUERY="What is the overall architecture of this repository?"
OUTPUT_FILE="$OUTPUT_DIR/${PROVIDER}-${MODEL//\//-}-$TIMESTAMP.json"
LOG_FILE="$OUTPUT_DIR/${PROVIDER}-${MODEL//\//-}-$TIMESTAMP.log"

# Create request body
REQUEST='{
  "repo_url": "'"$REPO_URL"'",
  "messages": [
    {
      "role": "user",
      "content": "'"$QUERY"'"
    }
  ],
  "provider": "'"$PROVIDER"'",
  "model": "'"$MODEL"'"
}'

# Print request details
echo "API URL: $API_URL/chat/completions/stream"
echo "Repository: $REPO_URL"
echo "Query: $QUERY"
echo "Output file: $OUTPUT_FILE"
echo "Log file: $LOG_FILE"
echo ""

echo "Request body:"
echo "$REQUEST" | jq . 2>/dev/null || echo "$REQUEST"
echo ""

# Ask to proceed
read -p "Proceed with API call? (y/n): " PROCEED

if [ "$PROCEED" != "y" ]; then
  echo "Aborted by user"
  exit 0
fi

# Make API call with detailed debugging
echo "Making API call with verbose output..."
echo "API call log:" > "$LOG_FILE"
echo "URL: $API_URL/chat/completions/stream" >> "$LOG_FILE"
echo "Provider: $PROVIDER" >> "$LOG_FILE"
echo "Model: $MODEL" >> "$LOG_FILE"
echo "Request body:" >> "$LOG_FILE"
echo "$REQUEST" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
echo "Response headers and status:" >> "$LOG_FILE"

curl -v -X POST "$API_URL/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$REQUEST" \
  -o "$OUTPUT_FILE" 2>>"$LOG_FILE"

CURL_STATUS=$?
echo "Curl exit status: $CURL_STATUS" >> "$LOG_FILE"

if [ $CURL_STATUS -ne 0 ]; then
  echo "ERROR: Curl command failed with status $CURL_STATUS"
  echo "Check log file for details: $LOG_FILE"
  exit 1
fi

# Check response
echo ""
echo "API call completed"
SIZE=$(wc -c < "$OUTPUT_FILE" | xargs)
echo "Response size: $SIZE bytes"

if [ "$SIZE" -lt 200 ]; then
  echo "WARNING: Response size is small, likely an error."
  
  # Try to parse response as JSON for better readability
  if jq . "$OUTPUT_FILE" 2>/dev/null; then
    echo "Response is valid JSON"
  else
    echo "Raw response:"
    cat "$OUTPUT_FILE"
  fi
  
  echo ""
  echo "Error details from log file:"
  grep -A 20 "< HTTP" "$LOG_FILE" | head -n 20
else
  echo "Response appears successful!"
  echo "First 200 characters:"
  head -c 200 "$OUTPUT_FILE"
  echo "..."
fi

echo ""
echo "Common issues and solutions:"
echo "---------------------------"
echo "1. Connection refused: DeepWiki server is not running"
echo "   → Start the server with appropriate command"
echo ""
echo "2. Authentication error: API key format or header issues"
echo "   → Check if API key format is correct and properly sent in the Authorization header"
echo ""
echo "3. Invalid request: Missing required parameters"
echo "   → Verify that all required parameters are included and formatted correctly"
echo ""
echo "4. Server error: Internal server error or timeout"
echo "   → Check server logs and increase timeout settings if needed"
echo ""
echo "Test complete. Check the log file for detailed information: $LOG_FILE"
