#!/bin/bash

# Manual DeepWiki cleanup script
# This can be run anytime to clean up repositories

NAMESPACE="${1:-codequal-dev}"

echo "Running manual DeepWiki cleanup in namespace: $NAMESPACE"

# Get DeepWiki pod
POD=$(kubectl get pods -n $NAMESPACE -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
    echo "❌ No DeepWiki pod found in namespace $NAMESPACE"
    exit 1
fi

echo "Found DeepWiki pod: $POD"

# Check current disk usage
echo ""
echo "Current disk usage:"
kubectl exec -n $NAMESPACE $POD -- df -h /root/.adalflow/repos

# Count repositories
REPO_COUNT=$(kubectl exec -n $NAMESPACE $POD -- find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
echo ""
echo "Current repository count: $REPO_COUNT"

# Get disk usage percentage
USAGE=$(kubectl exec -n $NAMESPACE $POD -- df -h /root/.adalflow/repos | awk 'NR==2 {print $5}' | sed 's/%//')
echo "Disk usage: $USAGE%"

# Skip if usage is low
if [ "$USAGE" -lt 40 ]; then
    echo ""
    echo "✅ Disk usage is healthy at $USAGE%. No cleanup needed."
    exit 0
fi

# Show recently accessed repositories
echo ""
echo "Recently accessed repositories (will be preserved if possible):"
kubectl exec -n $NAMESPACE $POD -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -printf '%A@ %p\n' 2>/dev/null | sort -n | tail -5 | awk '{print \$2}' | xargs -I {} basename {}"

# Determine cleanup strategy based on access time instead of modification time
if [ "$USAGE" -gt 90 ]; then
    echo ""
    echo "⚠️ CRITICAL: Disk usage above 90%. Removing repositories not accessed in 30 minutes..."
    kubectl exec -n $NAMESPACE $POD -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -amin +30 -exec rm -rf {} \;"
elif [ "$USAGE" -gt 70 ]; then
    echo ""
    echo "⚠️ WARNING: Disk usage above 70%. Removing repositories not accessed in 2 hours..."
    kubectl exec -n $NAMESPACE $POD -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -amin +120 -exec rm -rf {} \;"
elif [ "$USAGE" -gt 50 ]; then
    echo ""
    echo "ℹ️ INFO: Removing repositories not accessed in 6 hours..."
    kubectl exec -n $NAMESPACE $POD -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -amin +360 -exec rm -rf {} \;"
else
    echo ""
    echo "ℹ️ INFO: Removing repositories not accessed in 24 hours..."
    kubectl exec -n $NAMESPACE $POD -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -amin +1440 -exec rm -rf {} \;"
fi

# Also clean up old embeddings
echo ""
echo "Cleaning up old embeddings..."
kubectl exec -n $NAMESPACE $POD -- bash -c "find /root/.adalflow/embeddings -type f -mtime +7 -delete 2>/dev/null || true"

# Show final disk usage
echo ""
echo "Final disk usage:"
kubectl exec -n $NAMESPACE $POD -- df -h /root/.adalflow/repos

# Count remaining repositories
FINAL_COUNT=$(kubectl exec -n $NAMESPACE $POD -- find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
echo ""
echo "Remaining repository count: $FINAL_COUNT"
echo "Removed $((REPO_COUNT - FINAL_COUNT)) repositories"

echo ""
echo "✅ Cleanup complete!"