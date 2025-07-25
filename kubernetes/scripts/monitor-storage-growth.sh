#!/bin/bash

# DeepWiki Storage Growth Monitor
# Tracks storage usage over time and predicts when expansion is needed

NAMESPACE="${1:-codequal-dev}"
LOG_FILE="deepwiki-storage-growth.log"

echo "Monitoring DeepWiki storage growth in namespace: $NAMESPACE"
echo "Press Ctrl+C to stop"
echo ""

# Function to get storage metrics
get_metrics() {
    POD=$(kubectl get pods -n $NAMESPACE -l app=deepwiki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$POD" ]; then
        echo "No DeepWiki pod found"
        return 1
    fi
    
    # Get disk usage
    DISK_INFO=$(kubectl exec -n $NAMESPACE $POD -- df -BG /root/.adalflow/repos 2>/dev/null | awk 'NR==2')
    if [ -z "$DISK_INFO" ]; then
        return 1
    fi
    
    TOTAL=$(echo $DISK_INFO | awk '{print $2}' | sed 's/G//')
    USED=$(echo $DISK_INFO | awk '{print $3}' | sed 's/G//')
    AVAILABLE=$(echo $DISK_INFO | awk '{print $4}' | sed 's/G//')
    PERCENT=$(echo $DISK_INFO | awk '{print $5}' | sed 's/%//')
    
    # Count repositories
    REPO_COUNT=$(kubectl exec -n $NAMESPACE $POD -- find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
    
    # Get PVC size
    PVC_SIZE=$(kubectl get pvc deepwiki-data-expandable -n $NAMESPACE -o jsonpath='{.status.capacity.storage}' 2>/dev/null | sed 's/Gi//')
    if [ -z "$PVC_SIZE" ]; then
        PVC_SIZE=$TOTAL
    fi
    
    # Calculate average repo size if repos exist
    if [ "$REPO_COUNT" -gt 0 ]; then
        AVG_REPO_SIZE_MB=$(echo "scale=2; ($USED * 1024) / $REPO_COUNT" | bc)
    else
        AVG_REPO_SIZE_MB=0
    fi
    
    echo "$USED|$TOTAL|$PERCENT|$REPO_COUNT|$AVG_REPO_SIZE_MB|$PVC_SIZE"
}

# Function to calculate growth rate
calculate_growth() {
    if [ ! -f "$LOG_FILE" ]; then
        echo "0|0"
        return
    fi
    
    # Get data from 1 hour ago
    ONE_HOUR_AGO=$(date -d '1 hour ago' '+%Y-%m-%d %H:')
    HOUR_DATA=$(grep "^$ONE_HOUR_AGO" "$LOG_FILE" | tail -1)
    
    if [ -n "$HOUR_DATA" ]; then
        OLD_USED=$(echo "$HOUR_DATA" | awk -F'|' '{print $2}')
        CURRENT_USED=$1
        HOURLY_GROWTH=$(echo "scale=2; $CURRENT_USED - $OLD_USED" | bc)
        DAILY_GROWTH=$(echo "scale=2; $HOURLY_GROWTH * 24" | bc)
        echo "$HOURLY_GROWTH|$DAILY_GROWTH"
    else
        echo "0|0"
    fi
}

# Function to predict when storage will be full
predict_full() {
    AVAILABLE=$1
    DAILY_GROWTH=$2
    
    if (( $(echo "$DAILY_GROWTH <= 0" | bc -l) )); then
        echo "∞"
    else
        DAYS=$(echo "scale=1; $AVAILABLE / $DAILY_GROWTH" | bc)
        echo "$DAYS days"
    fi
}

# Function to display metrics
display_metrics() {
    clear
    echo "═══════════════════════════════════════════════════════════════════"
    echo "          DeepWiki Storage Monitor - $NAMESPACE"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    
    METRICS=$(get_metrics)
    if [ $? -ne 0 ]; then
        echo "Error: Unable to retrieve metrics"
        return
    fi
    
    USED=$(echo "$METRICS" | cut -d'|' -f1)
    TOTAL=$(echo "$METRICS" | cut -d'|' -f2)
    PERCENT=$(echo "$METRICS" | cut -d'|' -f3)
    REPO_COUNT=$(echo "$METRICS" | cut -d'|' -f4)
    AVG_REPO_SIZE_MB=$(echo "$METRICS" | cut -d'|' -f5)
    PVC_SIZE=$(echo "$METRICS" | cut -d'|' -f6)
    AVAILABLE=$(echo "$TOTAL - $USED" | bc)
    
    # Calculate growth
    GROWTH=$(calculate_growth $USED)
    HOURLY_GROWTH=$(echo "$GROWTH" | cut -d'|' -f1)
    DAILY_GROWTH=$(echo "$GROWTH" | cut -d'|' -f2)
    
    # Predict when full
    DAYS_UNTIL_FULL=$(predict_full $AVAILABLE $DAILY_GROWTH)
    
    # Display metrics
    echo "📊 Current Storage Usage:"
    echo "   Used:        ${USED}GB / ${TOTAL}GB (${PERCENT}%)"
    echo "   Available:   ${AVAILABLE}GB"
    echo "   PVC Size:    ${PVC_SIZE}GB"
    echo ""
    
    echo "📁 Repository Statistics:"
    echo "   Count:       ${REPO_COUNT} repositories"
    echo "   Avg Size:    ${AVG_REPO_SIZE_MB}MB per repository"
    echo ""
    
    echo "📈 Growth Analysis:"
    echo "   Hourly:      ${HOURLY_GROWTH}GB/hour"
    echo "   Daily:       ${DAILY_GROWTH}GB/day"
    echo "   Full in:     ${DAYS_UNTIL_FULL}"
    echo ""
    
    # Show status indicator
    if [ "$PERCENT" -ge 90 ]; then
        echo "🚨 STATUS: CRITICAL - Immediate action required!"
        echo "   Recommendation: Run emergency cleanup or expand storage NOW"
    elif [ "$PERCENT" -ge 80 ]; then
        echo "⚠️  STATUS: WARNING - Storage expansion needed"
        echo "   Recommendation: Expand PVC by 20-50GB"
    elif [ "$PERCENT" -ge 70 ]; then
        echo "⚠️  STATUS: CAUTION - Monitor closely"
        echo "   Recommendation: Plan for expansion soon"
    else
        echo "✅ STATUS: HEALTHY"
        echo "   Recommendation: Continue monitoring"
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    
    # Log to file
    echo "$(date '+%Y-%m-%d %H:%M:%S')|$USED|$TOTAL|$PERCENT|$REPO_COUNT|$AVG_REPO_SIZE_MB|$HOURLY_GROWTH|$DAILY_GROWTH" >> "$LOG_FILE"
}

# Main monitoring loop
while true; do
    display_metrics
    echo ""
    echo "Next update in 60 seconds... (Press Ctrl+C to stop)"
    sleep 60
done