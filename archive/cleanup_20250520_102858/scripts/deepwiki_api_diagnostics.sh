#!/bin/bash
# DeepWiki API Diagnostic Script
# This script captures detailed HTTP request/response information

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Test parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_api_diagnostics"
REPO_URL="https://github.com/expressjs/express"
MODEL="anthropic/claude-3-opus"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Diagnostics will be saved to: $OUTPUT_DIR"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required tools
if ! command_exists curl; then
  echo "ERROR: curl is required but not installed"
  exit 1
fi

# Create simplified request JSON
REQUEST_FILE="$OUTPUT_DIR/diagnostic_request.json"

# Create very simple JSON to minimize formatting issues
cat > "$REQUEST_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "Give a brief summary of this repository."
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL"
}
EOF

echo "Created request file: $REQUEST_FILE"

# Set up port forwarding
echo "Setting up port forwarding..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Send request with detailed diagnostics
CURL_OUTPUT="$OUTPUT_DIR/curl_output.log"
CURL_HEADERS="$OUTPUT_DIR/request_headers.txt"
CURL_DATA="$OUTPUT_DIR/request_data.txt"
RESPONSE_HEADERS="$OUTPUT_DIR/response_headers.txt"
RESPONSE_BODY="$OUTPUT_DIR/response_body.json"

echo "Sending diagnostic request to DeepWiki API..."
curl -v -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: DeepWikiDiagnostics/1.0" \
  -D "$RESPONSE_HEADERS" \
  -o "$RESPONSE_BODY" \
  --trace-ascii "$CURL_OUTPUT" \
  -d @"$REQUEST_FILE"

RESULT=$?

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

# Extract the actual request from the trace output
grep -n "> " "$CURL_OUTPUT" | grep -v "Host:" | grep -v "User-Agent:" > "$CURL_HEADERS"
grep -n "=> Send data" -A 50 "$CURL_OUTPUT" > "$CURL_DATA"

# Check result
if [ $RESULT -ne 0 ]; then
  echo "ERROR: Request failed with code $RESULT"
  exit 1
fi

# Analyze response
RESPONSE_SIZE=$(stat -f%z "$RESPONSE_BODY")
echo "Response received (size: $RESPONSE_SIZE bytes)"

# Check response type
CONTENT_TYPE=$(grep -i "Content-Type:" "$RESPONSE_HEADERS" | head -n 1)
echo "Response content type: $CONTENT_TYPE"

# Save a summary of the diagnostics
SUMMARY_FILE="$OUTPUT_DIR/diagnostics_summary.txt"

cat > "$SUMMARY_FILE" << EOF
# DeepWiki API Diagnostics Summary
Generated on: $(date)

## Request Details
- Target URL: http://localhost:$PORT/chat/completions/stream
- Method: POST
- Content-Type: application/json
- Model: $MODEL
- Repository: $REPO_URL

## Response Details
- Response Size: $RESPONSE_SIZE bytes
- HTTP Status: $(grep "HTTP/" "$RESPONSE_HEADERS" | head -n 1)
- Content-Type: $CONTENT_TYPE

## Diagnostics Files
- Full cURL trace: $CURL_OUTPUT
- Request headers: $CURL_HEADERS
- Request data: $CURL_DATA
- Response headers: $RESPONSE_HEADERS
- Response body: $RESPONSE_BODY

## Next Steps
1. Check response_body.json to see if a valid response was received
2. Examine curl_output.log for detailed HTTP transaction info
3. Look at response_headers.txt to check for error codes or unusual headers
EOF

echo "Diagnostics complete. Summary saved to $SUMMARY_FILE"

# Try to detect if response is valid JSON
if grep -q "^{" "$RESPONSE_BODY" && grep -q "}$" "$RESPONSE_BODY"; then
  echo "Response appears to be valid JSON"
  
  # Try to extract content from JSON - very basic approach
  if grep -q "\"content\":" "$RESPONSE_BODY"; then
    echo "Response contains content field"
  elif grep -q "\"choices\":" "$RESPONSE_BODY"; then
    echo "Response contains choices field"
  elif grep -q "\"detail\":" "$RESPONSE_BODY"; then
    echo "Response contains error details"
    grep -A 10 "\"detail\":" "$RESPONSE_BODY"
  fi
else
  echo "Response does not appear to be valid JSON format"
fi

# Recommendations
echo ""
echo "Recommended next steps:"
echo "1. Check $RESPONSE_BODY for the actual API response"
echo "2. Examine $CURL_OUTPUT for the complete HTTP interaction"
echo "3. If there are JSON formatting errors, check for special characters"
echo "   in the request or response that might need escaping"
echo "4. Try a different model or simpler prompt if errors persist"
