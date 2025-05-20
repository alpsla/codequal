#!/bin/bash
# Check disk space in DeepWiki pod

echo "=== Checking disk space in DeepWiki pod ==="
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- df -h

echo -e "\n=== Checking specific storage directories ==="
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- du -sh /root/.adalflow

echo -e "\n=== Checking largest files/directories ==="
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- du -h /root/.adalflow | sort -rh | head -n 10

echo -e "\n=== Checking PVC status ==="
kubectl get pvc -n codequal-dev deepwiki-data
