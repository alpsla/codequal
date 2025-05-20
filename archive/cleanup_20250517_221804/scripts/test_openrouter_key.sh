#!/bin/bash
# Script to test OpenRouter API key in DeepWiki

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_api_key_test"
REPO_URL="https://github.com/expressjs/express"
MODEL="anthropic/claude-3-opus"  # Try a standard model

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

# Check environment variables in the pod
echo "Checking environment variables in the pod..."
ENV_OUTPUT="$OUTPUT_DIR/pod_environment.txt"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- env | sort > "$ENV_OUTPUT"

if grep -q "OPENROUTER_API_KEY" "$ENV_OUTPUT"; then
  echo "✓ OPENROUTER_API_KEY is set in the pod environment"
  # Mask the key for security
  API_KEY=$(grep "OPENROUTER_API_KEY" "$ENV_OUTPUT" | sed 's/OPENROUTER_API_KEY=//')
  MASKED_KEY="${API_KEY:0:4}...${API_KEY: -4}"
  echo "  Key: $MASKED_KEY"
else
  echo "✗ OPENROUTER_API_KEY is NOT set in the pod environment"
fi

# Create a very simple request to test
TEST_REQUEST="$OUTPUT_DIR/test_request.json"

cat > "$TEST_REQUEST" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "What is this repository?"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL"
}
EOF

# Set up port forwarding
echo "Setting up port forwarding..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Send the test request
echo "Sending test request to verify API key..."
TEST_RESPONSE="$OUTPUT_DIR/test_response.json"
CURL_DEBUG="$OUTPUT_DIR/curl_debug.log"

curl -v -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -o "$TEST_RESPONSE" \
  -d @"$TEST_REQUEST" 2> "$CURL_DEBUG"

RESULT=$?

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

# Check the result
if [ $RESULT -ne 0 ]; then
  echo "✗ Test request failed with code $RESULT"
  echo "Debug log:"
  cat "$CURL_DEBUG"
  exit 1
fi

# Check for API key errors in the response
if grep -q "ERROR\|OPENROUTER_API_KEY" "$TEST_RESPONSE"; then
  echo "✗ Test response contains API key error:"
  grep -A 5 -B 5 "ERROR\|OPENROUTER_API_KEY" "$TEST_RESPONSE"
  
  echo ""
  echo "Recommendation:"
  echo "1. Set your OpenRouter API key using the provided script:"
  echo "   ./set_openrouter_key.sh your_api_key_here"
  echo ""
  echo "2. Make sure your API key is valid by checking at https://openrouter.ai/keys"
  echo ""
  echo "3. If you don't have an OpenRouter account, you can create one at https://openrouter.ai"
  
  exit 1
else
  # Check if it's a valid response
  if grep -q "express\|Express\|nodejs\|Node.js" "$TEST_RESPONSE"; then
    echo "✓ Test successful! The API key is working correctly."
    echo ""
    echo "Response excerpt:"
    head -n 5 "$TEST_RESPONSE"
    echo "..."
    
    echo ""
    echo "You can now proceed with the simplified scoring script:"
    echo "./simplified_scoring.sh"
  else
    echo "? Test response does not contain expected content."
    echo "Response content:"
    cat "$TEST_RESPONSE"
    
    echo ""
    echo "Please check if the response is valid and includes a description of Express.js"
  fi
fi

echo ""
echo "Full details are available in $OUTPUT_DIR"
