#!/bin/bash
# Validation script for DeepWiki OpenRouter integration

NAMESPACE="${1:-codequal-dev}"
POD_SELECTOR="${2:-deepwiki-fixed}"
PORT="${3:-8001}"

echo "=== DeepWiki OpenRouter Integration Validation ==="
echo "Namespace: $NAMESPACE"
echo "Pod Selector: $POD_SELECTOR"
echo "Port: $PORT"
echo ""

# Get pod name
POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app="$POD_SELECTOR" -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo "❌ Error: No pod found with selector app=$POD_SELECTOR in namespace $NAMESPACE"
  exit 1
fi

echo "✅ Pod found: $POD_NAME"

# Check if pod is running
POD_STATUS=$(kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.status.phase}')

if [ "$POD_STATUS" != "Running" ]; then
  echo "❌ Error: Pod $POD_NAME is not running (current status: $POD_STATUS)"
  exit 1
fi

echo "✅ Pod status: $POD_STATUS"

# Test basic connectivity
echo -n "Testing basic connectivity... "
if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- echo "Connected" > /dev/null; then
  echo "✅ Success"
else
  echo "❌ Failed"
  exit 1
fi

# Verify OpenRouter API key is set
echo -n "Checking OpenRouter API key... "
API_KEY_SET=$(kubectl exec -n "$NAMESPACE" "$POD_NAME" -- bash -c 'if [ -n "$OPENROUTER_API_KEY" ]; then echo "yes"; else echo "no"; fi')

if [ "$API_KEY_SET" == "yes" ]; then
  echo "✅ API key is set"
else
  echo "❌ API key is not set"
  exit 1
fi

# Test OpenRouter connectivity
echo "Testing OpenRouter API connectivity..."
MODELS_RESPONSE=$(kubectl exec -n "$NAMESPACE" "$POD_NAME" -- curl -s "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer \$OPENROUTER_API_KEY" \
  -H "X-OpenRouter-API-Key: \$OPENROUTER_API_KEY")

if echo "$MODELS_RESPONSE" | grep -q "id"; then
  echo "✅ OpenRouter API connection successful"
  
  # Extract and display available models
  echo "Available models:"
  echo "$MODELS_RESPONSE" | grep -o '"id": "[^"]*"' | cut -d'"' -f4 | while read -r model; do
    echo "  - $model"
  done
else
  echo "❌ OpenRouter API connection failed:"
  echo "$MODELS_RESPONSE"
  exit 1
fi

# Test simple completion
echo "Testing simple completion with OpenRouter..."
COMPLETION_RESPONSE=$(kubectl exec -n "$NAMESPACE" "$POD_NAME" -- curl -s "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer \$OPENROUTER_API_KEY" \
  -H "X-OpenRouter-API-Key: \$OPENROUTER_API_KEY" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Say hello in one word"
      }
    ],
    "stream": false,
    "provider": "openrouter",
    "model": "anthropic/claude-3-haiku"
  }')

if [ -z "$COMPLETION_RESPONSE" ] || echo "$COMPLETION_RESPONSE" | grep -q "error"; then
  echo "❌ Simple completion failed:"
  echo "$COMPLETION_RESPONSE"
  exit 1
else
  echo "✅ Simple completion successful!"
  echo "Response: $COMPLETION_RESPONSE"
fi

echo ""
echo "=== All validation checks passed! ==="
echo "DeepWiki OpenRouter integration is working correctly."
echo "You can now run the simplified analysis script:"
echo "./simple_analysis.sh REPO_URL PRIMARY_MODEL [FALLBACK_MODELS]"
