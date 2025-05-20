#!/bin/bash

# Simple curl-based test for DeepWiki API
# This script uses only curl with no dependencies

echo "DeepWiki API Curl Test"
echo "===================="
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

# Check if API is accessible
echo "Checking API accessibility..."
if curl -s -o /dev/null -w "%{http_code}" "$API_URL/health"; then
    echo "DeepWiki API is accessible"
    echo ""
else
    echo "Cannot access DeepWiki API at $API_URL"
    echo "Please ensure port forwarding is set up with:"
    echo "kubectl port-forward -n codequal-dev \$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') 8001:8001"
    echo ""
    exit 1
fi

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

echo "Sending request to API..."
echo "Command: curl -X POST \"$API_URL/chat/completions\" -H \"Content-Type: application/json\" -d '$PAYLOAD'"
echo ""

# Record start time
START_TIME=$(date +%s)

# Make the request
curl -X POST "$API_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -o "$OUTPUT_FILE"

# Calculate time taken
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Request completed in $DURATION seconds"
echo "Response saved to $OUTPUT_FILE"
echo ""

# Check if the output file was created and has content
if [ -s "$OUTPUT_FILE" ]; then
    echo "Response preview:"
    echo "-----------------"
    # Extract the content field (simple grep approach)
    CONTENT=$(grep -o '"content": "[^"]*"' "$OUTPUT_FILE" | head -1 | sed 's/"content": "\(.*\)"/\1/')
    if [ -n "$CONTENT" ]; then
        echo "$CONTENT" | head -10
        echo "..."
        echo "(See full response in $OUTPUT_FILE)"
    else
        echo "Could not extract content from response. Raw response preview:"
        head -20 "$OUTPUT_FILE"
        echo "..."
    fi
else
    echo "No response received or file is empty"
fi

echo ""
echo "Test completed."
