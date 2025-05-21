#!/bin/bash

# Updated curl-based test for DeepWiki API
# This script uses only curl with no dependencies

echo "DeepWiki API Curl Test (Updated)"
echo "=============================="
echo ""

# Configuration
REPO="pallets/click"
PROVIDER="openai"
MODEL="gpt-4o"
API_URL="http://localhost:8001"
QUERY="What is the overall architecture of this repository?"
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/test-results"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
OUTPUT_FILE="$OUTPUT_DIR/curl-test-$TIMESTAMP.json"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Configuration:"
echo "- Repository: $REPO"
echo "- Provider: $PROVIDER"
echo "- Model: $MODEL"
echo "- Query: $QUERY"
echo "- API URL: $API_URL"
echo "- Output: $OUTPUT_FILE"
echo ""

# Check API availability and endpoints
echo "Checking API availability and endpoints..."
echo "Trying different API endpoints to find the correct one:"

# Check root endpoint
echo "Testing root endpoint..."
ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/")
echo "Root endpoint ($API_URL/) status: $ROOT_STATUS"

# Check health endpoint
echo "Testing health endpoint..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
echo "Health endpoint ($API_URL/health) status: $HEALTH_STATUS"

# Check API endpoint variations
echo "Testing chat completions endpoint..."
CHAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/chat/completions")
echo "Chat completions endpoint ($API_URL/chat/completions) status: $CHAT_STATUS"

echo "Testing alternative chat endpoint..."
ALT_CHAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/chat/completions")
echo "Alternative chat endpoint ($API_URL/api/chat/completions) status: $ALT_CHAT_STATUS"

echo "Testing API docs endpoint..."
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/docs")
echo "API docs endpoint ($API_URL/docs) status: $DOCS_STATUS"

echo "Testing OpenAPI schema endpoint..."
OPENAPI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/openapi.json")
echo "OpenAPI schema endpoint ($API_URL/openapi.json) status: $OPENAPI_STATUS"

echo ""
echo "Let's try version check to see available API details..."
VERSION_RESPONSE=$(curl -s "$API_URL/version" || echo "Failed to get version")
echo "Version response: $VERSION_RESPONSE"

echo ""
echo "Attempting to discover available endpoints..."
ENDPOINTS_RESPONSE=$(curl -s "$API_URL/" || echo "Failed to get endpoints")
echo "Endpoints response: $ENDPOINTS_RESPONSE"

# Determine which endpoint to use
if [ "$CHAT_STATUS" -eq 200 ]; then
    ENDPOINT="/chat/completions"
elif [ "$ALT_CHAT_STATUS" -eq 200 ]; then
    ENDPOINT="/api/chat/completions"
else
    # Default to the standard endpoint even if it returned an error
    ENDPOINT="/chat/completions"
    echo ""
    echo "Warning: Could not determine the correct endpoint. Using default: $ENDPOINT"
fi

echo ""
echo "Trying both endpoint formats to see which works..."

# Prepare JSON payload
PAYLOAD='{
  "repo_url": "https://github.com/'$REPO'",
  "messages": [
    {
      "role": "user",
      "content": "'$QUERY'"
    }
  ],
  "provider": "'$PROVIDER'",
  "model": "'$MODEL'"
}'

echo "Sending request to standard endpoint..."
echo "Command: curl -X POST \"$API_URL/chat/completions\" -H \"Content-Type: application/json\" -d '$PAYLOAD'"
echo ""

# Record start time
START_TIME=$(date +%s)

# Make the request to the standard endpoint
curl -X POST "$API_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -o "${OUTPUT_FILE%.json}_standard.json"

# Calculate time taken
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Standard endpoint request completed in $DURATION seconds"
echo "Response saved to ${OUTPUT_FILE%.json}_standard.json"

# Try alternative format (with /api/ prefix)
echo ""
echo "Sending request to alternative endpoint..."
echo "Command: curl -X POST \"$API_URL/api/chat/completions\" -H \"Content-Type: application/json\" -d '$PAYLOAD'"
echo ""

# Record start time
START_TIME=$(date +%s)

# Make the request to the alternative endpoint
curl -X POST "$API_URL/api/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -o "${OUTPUT_FILE%.json}_alternative.json"

# Calculate time taken
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Alternative endpoint request completed in $DURATION seconds"
echo "Response saved to ${OUTPUT_FILE%.json}_alternative.json"

# Try the /export/wiki endpoint too
echo ""
echo "Trying the /export/wiki endpoint..."

# Prepare wiki export payload
WIKI_PAYLOAD='{
  "owner": "'$(echo "$REPO" | cut -d'/' -f1)'",
  "repo": "'$(echo "$REPO" | cut -d'/' -f2)'",
  "repo_type": "github",
  "format": "json",
  "language": "en",
  "provider": "'$PROVIDER'",
  "model": "'$MODEL'"
}'

echo "Command: curl -X POST \"$API_URL/export/wiki\" -H \"Content-Type: application/json\" -d '$WIKI_PAYLOAD'"
echo ""

# Record start time
START_TIME=$(date +%s)

# Make the request to the wiki endpoint
curl -X POST "$API_URL/export/wiki" \
  -H "Content-Type: application/json" \
  -d "$WIKI_PAYLOAD" \
  -o "${OUTPUT_FILE%.json}_wiki.json"

# Calculate time taken
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Wiki endpoint request completed in $DURATION seconds"
echo "Response saved to ${OUTPUT_FILE%.json}_wiki.json"

echo ""
echo "Checking all response files..."

# Check each output file
for FILE in "${OUTPUT_FILE%.json}_standard.json" "${OUTPUT_FILE%.json}_alternative.json" "${OUTPUT_FILE%.json}_wiki.json"; do
    echo ""
    echo "Examining $FILE..."
    
    # Check if the output file was created and has content
    if [ -s "$FILE" ]; then
        # Check if it contains error messages
        if grep -q "\"error\":" "$FILE" || grep -q "\"detail\":" "$FILE"; then
            echo "Response contains an error:"
            cat "$FILE"
        else
            echo "Response appears valid. Preview:"
            echo "-----------------"
            # Extract the content field (simple grep approach) or show first few lines
            CONTENT=$(grep -o '"content": "[^"]*"' "$FILE" | head -1 | sed 's/"content": "\(.*\)"/\1/' || echo "")
            if [ -n "$CONTENT" ]; then
                echo "$CONTENT" | head -10
                echo "..."
            else
                # Just show the first 10 lines
                head -10 "$FILE"
                echo "..."
            fi
            echo "(See full response in $FILE)"
        fi
    else
        echo "No response received or file is empty"
    fi
done

echo ""
echo "Test completed. Please check the response files to see which endpoint worked."
