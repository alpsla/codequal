#!/bin/bash
# Clean up old data in DeepWiki pod

echo "=== Cleaning up DeepWiki data ==="
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- find /root/.adalflow -type f -name "*.tmp" -delete
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- find /root/.adalflow -type f -name "*.log" -mtime +7 -delete

echo -e "\n=== Checking disk space after cleanup ==="
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- df -h
