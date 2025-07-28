#!/bin/bash

echo "📊 DeepWiki Disk Usage Monitor"
echo "============================="
echo ""
echo "Monitoring disk usage every 5 seconds..."
echo "Watch for these phases:"
echo "1. Initial state (low usage)"
echo "2. Repository clone (usage increases)"
echo "3. Analysis phase (usage stable)"
echo "4. Cleanup (usage decreases)"
echo ""
echo "Time        | Used  | Percent | Repos | Note"
echo "------------|-------|---------|-------|------------------"

while true; do
    # Get disk usage
    DISK_INFO=$(kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow 2>/dev/null | tail -1)
    USED=$(echo $DISK_INFO | awk '{print $3}')
    PERCENT=$(echo $DISK_INFO | awk '{print $5}')
    
    # Get repository count
    REPO_COUNT=$(kubectl exec -n codequal-dev deployment/deepwiki -- find /root/.adalflow/repos -maxdepth 1 -type d 2>/dev/null | wc -l)
    REPO_COUNT=$((REPO_COUNT - 1))
    
    # Get current time
    TIME=$(date +"%H:%M:%S")
    
    # Determine phase based on usage
    NOTE=""
    PERCENT_NUM=$(echo $PERCENT | sed 's/%//')
    if [ $REPO_COUNT -eq 0 ]; then
        NOTE="No repos"
    elif [ $REPO_COUNT -eq 1 ]; then
        NOTE="Repo cloned"
    elif [ $PERCENT_NUM -lt 10 ]; then
        NOTE="Cleaned up"
    else
        NOTE="Analysis active"
    fi
    
    # Print status
    printf "%-12s| %-6s| %-8s| %-6s| %s\n" "$TIME" "$USED" "$PERCENT" "$REPO_COUNT" "$NOTE"
    
    sleep 5
done