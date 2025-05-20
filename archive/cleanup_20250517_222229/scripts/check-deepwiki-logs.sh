#!/bin/bash

# Get the DeepWiki pod name
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
  echo "Error: DeepWiki pod not found"
  exit 1
fi

echo "========================================"
echo "DeepWiki Pod Logs: $POD"
echo "========================================"

# Get the logs, with options for tail or since time
if [ "$1" == "-f" ]; then
  echo "Streaming logs (Ctrl+C to exit)..."
  kubectl logs -f -n codequal-dev "$POD"
elif [ "$1" == "-t" ]; then
  LINES=${2:-100}
  echo "Last $LINES lines of logs:"
  kubectl logs -n codequal-dev "$POD" --tail="$LINES"
elif [ "$1" == "-s" ]; then
  SINCE=${2:-"10m"}
  echo "Logs from the last $SINCE:"
  kubectl logs -n codequal-dev "$POD" --since="$SINCE"
else
  # Default: show the most recent logs
  echo "Most recent logs (last 100 lines):"
  kubectl logs -n codequal-dev "$POD" --tail=100
fi

# Get pod description to check configuration
if [ "$1" == "-d" ]; then
  echo ""
  echo "========================================"
  echo "DeepWiki Pod Description"
  echo "========================================"
  kubectl describe pod -n codequal-dev "$POD"
fi

echo ""
echo "Usage:"
echo "./check-deepwiki-logs.sh          # Show last 100 lines"
echo "./check-deepwiki-logs.sh -f       # Stream logs in real-time"
echo "./check-deepwiki-logs.sh -t 200   # Show last 200 lines"
echo "./check-deepwiki-logs.sh -s 5m    # Show logs from last 5 minutes"
echo "./check-deepwiki-logs.sh -d       # Show pod description"