#!/bin/bash

# DeepWiki API Server Check
# This script checks if the DeepWiki API server is running and accessible

echo "DeepWiki API Server Check"
echo "========================="
echo ""

# Default API URL
API_URL="http://localhost:8001"

# Allow custom API URL
if [ -n "$1" ]; then
  API_URL="$1"
  echo "Using custom API URL: $API_URL"
else
  echo "Using default API URL: $API_URL"
  echo "(You can specify a different URL as parameter: bash $0 http://your-api-url)"
fi

echo ""
echo "Checking server status..."

# First, check if the server is reachable
echo "1. Testing basic connectivity..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$API_URL" || {
  echo "ERROR: Could not connect to $API_URL"
  echo "Make sure the DeepWiki server is running and accessible."
  exit 1
}

# Check the health endpoint if it exists
echo ""
echo "2. Testing health endpoint..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null)
if [ "$HEALTH_STATUS" = "200" ]; then
  echo "Health endpoint responded: OK (200)"
else
  echo "Health endpoint check: $HEALTH_STATUS (Not available or error)"
  echo "This is not fatal, just informational."
fi

# Try to get the server info
echo ""
echo "3. Checking server info..."
SERVER_INFO=$(curl -s "$API_URL/" 2>/dev/null)
if [ -n "$SERVER_INFO" ]; then
  echo "Server info response:"
  echo "$SERVER_INFO" | head -n 10
  if [[ $SERVER_INFO == *"DeepWiki"* ]] || [[ $SERVER_INFO == *"OpenAPI"* ]]; then
    echo "✓ Received expected response from server"
  else
    echo "⚠️ Response doesn't contain expected DeepWiki indicators"
  fi
else
  echo "No response from server info endpoint"
fi

# Try to make a simple request to the chat completions endpoint
echo ""
echo "4. Testing chat completions endpoint (without API key)..."
CHAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}' 2>/dev/null)

if [ "$CHAT_STATUS" = "401" ] || [ "$CHAT_STATUS" = "403" ]; then
  echo "Chat endpoint responded: $CHAT_STATUS (Authentication required - this is expected)"
  echo "✓ Authentication is required, which is correct"
elif [ "$CHAT_STATUS" = "400" ]; then
  echo "Chat endpoint responded: 400 (Bad Request - this might be expected if repository URL is required)"
  echo "✓ Endpoint exists but validation failed, which may be normal"
elif [ "$CHAT_STATUS" = "200" ]; then
  echo "Chat endpoint responded: 200 (OK - no authentication required?)"
  echo "⚠️ WARNING: Server doesn't seem to require authentication"
else
  echo "Chat endpoint responded: $CHAT_STATUS (Unexpected status)"
  echo "⚠️ WARNING: Unexpected response from chat endpoint"
fi

# Provide more information about how to check the server
echo ""
echo "Additional server diagnostic information:"
echo "----------------------------------------"
echo "1. Check if the DeepWiki server process is running:"
echo "   ps aux | grep deepwiki"
echo ""
echo "2. Check server logs (if available):"
echo "   tail -f /path/to/deepwiki/logs"
echo ""
echo "3. Check the server configuration to verify API URL and port:"
echo "   cat /path/to/deepwiki/config.yaml"
echo ""
echo "4. If the server is not running, start it with:"
echo "   cd /path/to/deepwiki && python -m deepwiki.server"
echo ""
echo "5. Consider API key configuration:"
echo "   Check if the server requires specific API key format in headers"
echo ""
echo "6. Test with a direct curl command to the server:"
echo '   curl -v -X POST "http://localhost:8001/chat/completions/stream" \\'
echo '     -H "Content-Type: application/json" \\'
echo '     -H "Authorization: Bearer YOUR_API_KEY" \\'
echo '     -d '\''{"repo_url": "https://github.com/pallets/flask", "messages": [{"role": "user", "content": "What is this repo?"}]}'\'
echo ""
echo "Server check completed."
