#!/bin/bash

# Monitor DeepWiki pod disk usage in real-time

echo "🔍 Monitoring DeepWiki Pod Disk Usage"
echo "======================================"
echo "Pod: deepwiki in namespace codequal-dev"
echo "Volume: /root/.adalflow"
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

while true; do
  # Get disk usage
  DISK_INFO=$(kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow 2>/dev/null | tail -1)
  
  if [ $? -eq 0 ]; then
    # Parse disk info
    TOTAL=$(echo $DISK_INFO | awk '{print $2}')
    USED=$(echo $DISK_INFO | awk '{print $3}')
    AVAIL=$(echo $DISK_INFO | awk '{print $4}')
    PERCENT=$(echo $DISK_INFO | awk '{print $5}' | sed 's/%//')
    
    # Clear previous line
    echo -ne "\r\033[K"
    
    # Determine color based on usage
    if [ $PERCENT -ge 85 ]; then
      COLOR=$RED
      STATUS="CRITICAL"
    elif [ $PERCENT -ge 70 ]; then
      COLOR=$YELLOW
      STATUS="WARNING"
    else
      COLOR=$GREEN
      STATUS="HEALTHY"
    fi
    
    # Display status
    echo -ne "📊 Disk Usage: ${COLOR}${USED}/${TOTAL} (${PERCENT}%)${NC} | Available: ${AVAIL} | Status: ${COLOR}${STATUS}${NC} | $(date '+%H:%M:%S')"
  else
    echo -ne "\r\033[K❌ Failed to connect to pod | $(date '+%H:%M:%S')"
  fi
  
  # Wait 5 seconds before next check
  sleep 5
done