#!/bin/bash

echo "=== Monitoring Local Clone Flow ==="
echo "Watching for DeepWiki clone activities..."
echo ""

# Monitor API logs for key events
tail -f api-server.log | grep -E "(DeepWiki|Cloning|local clone|Extracted|Cached|branch:|MCP Tools|getCachedRepositoryFiles)" &
TAIL_PID=$!

# Cleanup on exit
trap "kill $TAIL_PID 2>/dev/null" EXIT

# Keep script running
while true; do
  sleep 1
done