#!/bin/bash

# DeepWiki Temp Storage Management Script
# Handles monitoring, scaling, and cleanup of temporary storage

set -e

NAMESPACE="${DEEPWIKI_NAMESPACE:-codequal-dev}"
PVC_NAME="deepwiki-temp"
POD_LABEL="app=deepwiki"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to get current metrics
get_metrics() {
    echo -e "${GREEN}📊 DeepWiki Temp Storage Metrics${NC}"
    echo "================================"
    
    # Get PVC info
    PVC_SIZE=$(kubectl get pvc $PVC_NAME -n $NAMESPACE -o jsonpath='{.spec.resources.requests.storage}' 2>/dev/null || echo "N/A")
    echo "PVC Size: $PVC_SIZE"
    
    # Get pod name
    POD=$(kubectl get pods -n $NAMESPACE -l $POD_LABEL -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$POD" ]; then
        echo -e "${RED}❌ No DeepWiki pod found${NC}"
        return 1
    fi
    
    # Get disk usage
    echo -e "\n${YELLOW}Disk Usage:${NC}"
    kubectl exec -n $NAMESPACE $POD -- df -h /tmp 2>/dev/null || echo "Failed to get disk usage"
    
    # Count temp directories
    echo -e "\n${YELLOW}Temp Directories:${NC}"
    ANALYSIS_COUNT=$(kubectl exec -n $NAMESPACE $POD -- find /tmp -name "analysis-*" -type d 2>/dev/null | wc -l || echo 0)
    PR_COUNT=$(kubectl exec -n $NAMESPACE $POD -- find /tmp -name "pr-analysis-*" -type d 2>/dev/null | wc -l || echo 0)
    
    echo "Repository analyses: $ANALYSIS_COUNT"
    echo "PR analyses: $PR_COUNT"
    echo "Total: $((ANALYSIS_COUNT + PR_COUNT))"
    
    # Check for old directories
    echo -e "\n${YELLOW}Old Directories (>1 hour):${NC}"
    OLD_COUNT=$(kubectl exec -n $NAMESPACE $POD -- find /tmp -name "*analysis-*" -type d -mmin +60 2>/dev/null | wc -l || echo 0)
    echo "Found: $OLD_COUNT"
}

# Function to cleanup orphaned directories
cleanup_orphaned() {
    echo -e "${GREEN}🧹 Cleaning up orphaned directories${NC}"
    
    POD=$(kubectl get pods -n $NAMESPACE -l $POD_LABEL -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD" ]; then
        echo -e "${RED}❌ No DeepWiki pod found${NC}"
        return 1
    fi
    
    # Find and remove old directories
    echo "Finding directories older than 1 hour..."
    OLD_DIRS=$(kubectl exec -n $NAMESPACE $POD -- find /tmp -name "*analysis-*" -type d -mmin +60 2>/dev/null || true)
    
    if [ -z "$OLD_DIRS" ]; then
        echo "No old directories found"
        return 0
    fi
    
    echo "Found directories to clean:"
    echo "$OLD_DIRS"
    
    read -p "Proceed with cleanup? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl exec -n $NAMESPACE $POD -- find /tmp -name "*analysis-*" -type d -mmin +60 -exec rm -rf {} + 2>/dev/null || true
        echo -e "${GREEN}✅ Cleanup completed${NC}"
    else
        echo "Cleanup cancelled"
    fi
}

# Function to scale PVC
scale_pvc() {
    local NEW_SIZE=$1
    
    if [ -z "$NEW_SIZE" ]; then
        echo -e "${RED}❌ Please specify new size (e.g., 20Gi)${NC}"
        return 1
    fi
    
    echo -e "${GREEN}📈 Scaling PVC to $NEW_SIZE${NC}"
    
    # Get current size
    CURRENT_SIZE=$(kubectl get pvc $PVC_NAME -n $NAMESPACE -o jsonpath='{.spec.resources.requests.storage}')
    echo "Current size: $CURRENT_SIZE"
    
    # Patch PVC
    kubectl patch pvc $PVC_NAME -n $NAMESPACE -p '{"spec":{"resources":{"requests":{"storage":"'$NEW_SIZE'"}}}}'
    
    echo -e "${YELLOW}⚠️  Note: PVC expansion may take a few minutes${NC}"
    echo "You may need to restart the pod for changes to take effect"
    
    # Wait and check
    sleep 5
    NEW_ACTUAL=$(kubectl get pvc $PVC_NAME -n $NAMESPACE -o jsonpath='{.spec.resources.requests.storage}')
    echo -e "${GREEN}✅ PVC size updated to: $NEW_ACTUAL${NC}"
}

# Function to monitor in real-time
monitor_realtime() {
    echo -e "${GREEN}📊 Real-time Monitoring (Press Ctrl+C to exit)${NC}"
    
    while true; do
        clear
        echo "DeepWiki Temp Storage Monitor - $(date)"
        echo "========================================"
        
        POD=$(kubectl get pods -n $NAMESPACE -l $POD_LABEL -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
        
        if [ -n "$POD" ]; then
            # Disk usage
            kubectl exec -n $NAMESPACE $POD -- df -h /tmp | grep -E "Filesystem|/tmp" || true
            
            # Active analyses
            echo -e "\nActive Analyses:"
            ACTIVE=$(kubectl exec -n $NAMESPACE $POD -- ls -la /tmp | grep -E "analysis-|pr-analysis-" | wc -l || echo 0)
            echo "Count: $ACTIVE"
            
            # Top 5 largest directories
            echo -e "\nLargest Directories:"
            kubectl exec -n $NAMESPACE $POD -- du -sh /tmp/*analysis-* 2>/dev/null | sort -rh | head -5 || echo "No analysis directories found"
        else
            echo -e "${RED}Pod not found${NC}"
        fi
        
        sleep 10
    done
}

# Function to show usage
usage() {
    echo "DeepWiki Temp Storage Manager"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  metrics       Show current storage metrics"
    echo "  cleanup       Clean up orphaned directories"
    echo "  scale SIZE    Scale PVC to specified size (e.g., 20Gi)"
    echo "  monitor       Monitor storage in real-time"
    echo "  help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DEEPWIKI_NAMESPACE    Kubernetes namespace (default: codequal-dev)"
}

# Main script logic
case "${1:-metrics}" in
    metrics)
        get_metrics
        ;;
    cleanup)
        cleanup_orphaned
        ;;
    scale)
        scale_pvc "$2"
        ;;
    monitor)
        monitor_realtime
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        usage
        exit 1
        ;;
esac