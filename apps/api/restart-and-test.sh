#!/bin/bash

echo "🔄 Restarting API server and testing report generation..."
echo ""

# Kill any existing API server
echo "📍 Stopping existing API server..."
pkill -f "node.*dist/index.js" || true
sleep 2

# Build the TypeScript code
echo "📦 Building TypeScript code..."
cd "/Users/alpinro/Code Prjects/codequal/apps/api"
npm run build

# Start the server in background
echo "🚀 Starting API server..."
npm run dev > /tmp/api-server-test.log 2>&1 &
API_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

# Check if server is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Server failed to start. Check logs at /tmp/api-server-test.log"
    tail -20 /tmp/api-server-test.log
    exit 1
fi

echo "✅ Server is running!"
echo ""

# Test 1: Analyze a small PR
echo "🧪 Test 1: Analyzing a small PR (Facebook React #28000)..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3001/v1/analyze-pr \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_key" \
  -d '{
    "repository_url": "https://github.com/facebook/react",
    "pr_number": 28000
  }')

REPORT_ID=$(echo $RESPONSE | grep -o '"report_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$REPORT_ID" ]; then
    echo "❌ Failed to get report ID from analysis"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "📊 Analysis complete! Report ID: $REPORT_ID"
echo ""

# Wait a moment for report to be stored
sleep 2

# Test 2: Get HTML report
echo "🧪 Test 2: Fetching HTML report..."
echo ""

HTML_URL="http://localhost:3001/v1/analysis/$REPORT_ID/report?format=html&api_key=test_key"
echo "📄 HTML Report URL: $HTML_URL"
echo ""

# Save HTML report
curl -s "$HTML_URL" > /tmp/test-report.html

# Check if report contains expected elements
if grep -q "PR Decision:" /tmp/test-report.html && \
   grep -q "Current PR Issues" /tmp/test-report.html && \
   grep -q "Repository Issues" /tmp/test-report.html; then
    echo "✅ HTML report generated successfully with all expected sections!"
    echo ""
    echo "Key elements found:"
    echo "  ✓ PR approval decision section"
    echo "  ✓ Current PR issues section"
    echo "  ✓ Repository issues section"
else
    echo "❌ HTML report missing expected sections"
    echo "Check the report at /tmp/test-report.html"
fi

# Test 3: Check if enhanced template is used
if grep -q "enhanced-template" /tmp/api-server-test.log || grep -q "decision-container" /tmp/test-report.html; then
    echo "  ✓ Enhanced template is being used"
else
    echo "  ⚠️  Enhanced template might not be loaded"
fi

# Test 4: Check if repository-wide analysis is happening
if grep -q "analyzeFullRepository" /tmp/api-server-test.log || grep -q "repository-wide" /tmp/api-server-test.log; then
    echo "  ✓ Repository-wide analysis context provided to agents"
else
    echo "  ⚠️  Repository-wide analysis might not be active"
fi

echo ""
echo "📝 Report saved to: /tmp/test-report.html"
echo "📋 Server logs at: /tmp/api-server-test.log"
echo ""
echo "🌐 Open the report in your browser:"
echo "   open /tmp/test-report.html"
echo ""
echo "🔍 Or view it directly at:"
echo "   $HTML_URL"
echo ""
echo "Server PID: $API_PID (use 'kill $API_PID' to stop)"