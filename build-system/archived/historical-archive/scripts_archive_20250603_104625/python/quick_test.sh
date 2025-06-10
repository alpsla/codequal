#!/bin/bash
# Quick test script for CodeQual
# Tests the DeepWiki OpenRouter integration with a minimal request

BASE_DIR="/Users/alpinro/Code Prjects/codequal"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/reports/quick_test_$(date +%Y%m%d_%H%M%S)"
REPO_URL="${1:-https://github.com/expressjs/express}"
MODEL="${2:-openai/gpt-3.5-turbo}"  # Using a fast model for quick testing

mkdir -p "$OUTPUT_DIR"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

# Create a simple request
REQUEST_FILE="$OUTPUT_DIR/test_request.json"
cat > "$REQUEST_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "Briefly describe what this repository does and its main features."
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.2
}
EOF

# Set up port forwarding
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Send the request
RESPONSE_FILE="$OUTPUT_DIR/test_response.txt"
curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -o "$RESPONSE_FILE" \
  -d @"$REQUEST_FILE"

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

# Check results
if [ -f "$RESPONSE_FILE" ] && [ -s "$RESPONSE_FILE" ]; then
  echo "Test successful! Response saved to $RESPONSE_FILE"
  echo ""
  echo "Response preview:"
  cat "$RESPONSE_FILE"
else
  echo "Test failed. No response received."
  exit 1
fi
