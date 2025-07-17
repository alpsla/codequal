#!/bin/bash

echo "=== Running Comprehensive PR Analysis Test ==="
echo ""
echo "Starting monitoring in background..."
echo "Check /tmp/data-flow-monitor.log for colored output"
echo ""

# Start monitoring in background
./monitor-data-flow.sh > /tmp/data-flow-monitor.log 2>&1 &
MONITOR_PID=$!

echo "Monitor started with PID: $MONITOR_PID"
echo ""

# Give monitor time to start
sleep 2

# Run the actual test
echo "Sending PR analysis request..."
echo ""

curl -X POST http://localhost:3001/api/github-pr-analysis \
  -H "Authorization: Bearer $1" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/facebook/react",
    "prNumber": 28000
  }' \
  -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  -o /tmp/pr-analysis-response.json

echo ""
echo "=== Test Complete ==="
echo ""
echo "Response saved to: /tmp/pr-analysis-response.json"
echo "Monitor log saved to: /tmp/data-flow-monitor.log"
echo ""
echo "To view monitoring output:"
echo "cat /tmp/data-flow-monitor.log"
echo ""
echo "Stopping monitor..."
kill $MONITOR_PID 2>/dev/null

# Show summary
if [ -f /tmp/pr-analysis-response.json ]; then
    echo ""
    echo "=== Response Summary ==="
    if command -v jq &> /dev/null; then
        jq '{
            analysisId: .analysisId,
            status: .status,
            repository: .repository.name,
            pr: .pr.number,
            summary: .summary
        }' /tmp/pr-analysis-response.json 2>/dev/null || echo "Could not parse response"
    else
        echo "First 100 chars of response:"
        head -c 100 /tmp/pr-analysis-response.json
        echo "..."
    fi
fi