#!/bin/bash
# Test GitHub Access from DeepWiki pod

echo "Testing GitHub API access..."
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/asyncfuncai/deepwiki-open

echo "Testing GitHub raw content access..."
kubectl exec -n codequal-dev deepwiki-5b45c9fbdf-9h4ng -- curl -s -o /dev/null -w "%{http_code}" https://raw.githubusercontent.com/asyncfuncai/deepwiki-open/main/README.md
