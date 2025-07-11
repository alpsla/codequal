#!/bin/bash
# CodeQual API Examples using cURL

API_BASE="http://localhost:3001"
EMAIL="rostislav.alpin@gmail.com"
PASSWORD="your-password-here"  # Update this!

echo "=== CodeQual API Examples with cURL ==="
echo ""

# Step 1: Authenticate
echo "🔐 Step 1: Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "$API_BASE/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

# Extract access token (requires jq)
if command -v jq &> /dev/null; then
  ACCESS_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.session.access_token')
  echo "✅ Got access token: ${ACCESS_TOKEN:0:20}..."
else
  echo "⚠️  Install jq for automatic token extraction"
  echo "Response: $AUTH_RESPONSE"
  echo ""
  echo "Manually copy the access_token from above and set it:"
  echo "ACCESS_TOKEN='your-token-here'"
  exit 1
fi

# Step 2: Perform a scan
echo ""
echo "🔍 Step 2: Scanning a PR..."
SCAN_RESPONSE=$(curl -s -X POST "$API_BASE/api/simple-scan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"repositoryUrl": "https://github.com/facebook/react/pull/27513"}')

echo "Scan response:"
echo $SCAN_RESPONSE | jq '.'

# Step 3: Check billing status
echo ""
echo "💳 Step 3: Checking billing status..."
BILLING_RESPONSE=$(curl -s -X GET "$API_BASE/api/billing/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Billing status:"
echo $BILLING_RESPONSE | jq '.subscription'

echo ""
echo "🎉 API test completed!"
echo ""
echo "📚 Quick Reference:"
echo "  - Auth endpoint: POST /auth/signin"
echo "  - Scan endpoint: POST /api/simple-scan"
echo "  - Billing endpoint: GET /api/billing/status"
echo "  - Always include: Authorization: Bearer <token>"