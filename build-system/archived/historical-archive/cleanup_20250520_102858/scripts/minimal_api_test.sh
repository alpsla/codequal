#!/bin/bash
# Minimal validation test with maximum compatibility
# This script uses the absolute simplest approach to call the DeepWiki API

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Test parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_minimal_test"
REPO_URL="https://github.com/expressjs/express"
MODEL="anthropic/claude-3-opus"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Output directory: $OUTPUT_DIR"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Create simplified request JSON
REQUEST_FILE="$OUTPUT_DIR/minimal_request.json"

# Create extremely simplified JSON - minimal prompt, proper escaping
cat > "$REQUEST_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this repository and give a one paragraph summary."
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL"
}
EOF

echo "Created request file with minimal JSON"

# Set up port forwarding
echo "Setting up port forwarding..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Send request and save raw response
RAW_RESPONSE="$OUTPUT_DIR/raw_response.json"

echo "Sending minimal request to DeepWiki API..."
curl -v -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -o "$RAW_RESPONSE" \
  -d @"$REQUEST_FILE" 2> "$OUTPUT_DIR/curl_debug.log"

RESULT=$?

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

# Check result
if [ $RESULT -ne 0 ]; then
  echo "ERROR: Request failed with code $RESULT"
  if [ -f "$OUTPUT_DIR/curl_debug.log" ]; then
    echo "Debug log content:"
    cat "$OUTPUT_DIR/curl_debug.log"
  fi
  exit 1
fi

# Output details
if [ -f "$RAW_RESPONSE" ]; then
  echo "Response received. Content:"
  cat "$RAW_RESPONSE"
  echo ""
  echo "Size: $(stat -f%z "$RAW_RESPONSE") bytes"
else
  echo "No response file created"
  exit 1
fi

# Try to manually check if it's JSON
if grep -q "^{" "$RAW_RESPONSE"; then
  echo "Response appears to be JSON format"
else
  echo "Response does not appear to be JSON format"
fi

echo "Test complete. Check $OUTPUT_DIR for results."
