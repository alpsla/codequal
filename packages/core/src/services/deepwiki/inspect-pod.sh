#!/bin/bash

# Create a test HTTP request to the DeepWiki pod to check available endpoints
kubectl exec -n codequal-dev deepwiki-fixed-5b95f566b8-wh4h4 -- curl -s http://localhost:8000/ | head -n 20

# Check if any WebSocket endpoints are available
echo "Checking for WebSocket routes:"
kubectl exec -n codequal-dev deepwiki-fixed-5b95f566b8-wh4h4 -- grep -r "WebSocket" /app || echo "No WebSocket references found"

# Check running processes to see what port the app is listening on
echo "Checking listening ports:"
kubectl exec -n codequal-dev deepwiki-fixed-5b95f566b8-wh4h4 -- netstat -tuln || echo "netstat not available"

# Check if app is exposing routes on port 8000
echo "Checking available routes:"
kubectl exec -n codequal-dev deepwiki-fixed-5b95f566b8-wh4h4 -- curl -s http://localhost:8000/api/routes || echo "No routes endpoint"
