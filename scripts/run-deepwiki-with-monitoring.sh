#!/bin/bash

echo "🚀 DeepWiki Analysis with Real-time Monitoring"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API endpoint
API_URL="http://localhost:3001"
MONITORING_URL="$API_URL/api/monitoring/public/deepwiki/metrics"

# Function to get current metrics
get_metrics() {
    curl -s "$MONITORING_URL" 2>/dev/null | jq -r '
        "Disk: \(.disk.percent)% used (\(.disk.usedGB)GB/\(.disk.totalGB)GB) | Repos: \(.activeRepositories)"
    ' 2>/dev/null || echo "Unable to fetch metrics"
}

# Function to format timestamp
timestamp() {
    date '+%H:%M:%S'
}

# Start monitoring in background
echo "📊 Starting real-time monitoring..."
echo ""
echo "Time     | Disk Usage                              | Status"
echo "---------|----------------------------------------|------------------"

# Monitor in background and save PID
(
    while true; do
        METRICS=$(get_metrics)
        TIME=$(timestamp)
        
        # Extract disk percentage for color coding
        DISK_PERCENT=$(curl -s "$MONITORING_URL" 2>/dev/null | jq -r '.disk.percent' 2>/dev/null || echo "0")
        
        # Color code based on usage
        if [ "$DISK_PERCENT" -lt 50 ]; then
            COLOR=$GREEN
            STATUS="✅ Healthy"
        elif [ "$DISK_PERCENT" -lt 80 ]; then
            COLOR=$YELLOW
            STATUS="⚠️  Warning"
        else
            COLOR=$RED
            STATUS="🚨 Critical"
        fi
        
        printf "%s | %-38s | %b%s%b\n" "$TIME" "$METRICS" "$COLOR" "$STATUS" "$NC"
        sleep 5
    done
) &
MONITOR_PID=$!

# Wait a bit for monitoring to start
sleep 2

echo ""
echo "🔍 Triggering DeepWiki Analysis..."
echo "Repository: https://github.com/sindresorhus/is"
echo ""

# Trigger analysis
RESPONSE=$(curl -s -X POST "$API_URL/api/deepwiki/analyze" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-token" \
    -d '{
        "repositoryUrl": "https://github.com/sindresorhus/is",
        "branch": "main"
    }' 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to trigger analysis${NC}"
    kill $MONITOR_PID 2>/dev/null
    exit 1
fi

ANALYSIS_ID=$(echo "$RESPONSE" | jq -r '.analysisId' 2>/dev/null)

if [ -z "$ANALYSIS_ID" ] || [ "$ANALYSIS_ID" = "null" ]; then
    echo -e "${RED}❌ Failed to get analysis ID${NC}"
    echo "Response: $RESPONSE"
    kill $MONITOR_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ Analysis started: $ANALYSIS_ID${NC}"
echo ""
echo "⏳ Monitoring analysis progress..."
echo "   Watch for disk usage changes as repository is cloned and analyzed"
echo ""

# Wait for analysis to complete
COMPLETED=false
MAX_WAIT=300 # 5 minutes max
WAITED=0

while [ "$COMPLETED" = "false" ] && [ $WAITED -lt $MAX_WAIT ]; do
    sleep 10
    WAITED=$((WAITED + 10))
    
    # Check status (if endpoint exists)
    STATUS=$(curl -s "$API_URL/api/deepwiki/status/$ANALYSIS_ID" 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")
    
    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
        COMPLETED=true
    fi
done

# Stop monitoring
kill $MONITOR_PID 2>/dev/null

echo ""
echo "📈 Analysis Complete!"
echo ""

# Get final metrics
echo "Final Metrics:"
FINAL_METRICS=$(get_metrics)
echo "  $FINAL_METRICS"

# Show peak usage (would need to track this properly)
echo ""
echo "📊 Summary:"
echo "  - Analysis ID: $ANALYSIS_ID"
echo "  - Duration: ${WAITED}s"
echo "  - Model Selection: Dynamic (from Vector DB)"
echo ""

# Try to get report summary
echo "📄 Report Summary:"
curl -s "$API_URL/api/deepwiki/report/$ANALYSIS_ID" 2>/dev/null | jq -r '
    if .report then
        .report | split("\n") | .[0:10] | join("\n")
    else
        "Report not available"
    end
' 2>/dev/null || echo "Unable to fetch report"

echo ""
echo "✅ Complete! Check the full report at: $API_URL/api/deepwiki/report/$ANALYSIS_ID"