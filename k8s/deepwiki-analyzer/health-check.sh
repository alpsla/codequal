#!/bin/bash
# Health check script for DeepWiki analyzer

# Check if DeepWiki process is running
if pgrep -f "deepwiki" > /dev/null; then
    echo "DeepWiki process is running"
else
    echo "DeepWiki process is not running"
    exit 1
fi

# Check if temp directory is accessible
if [ -w "/tmp/analyses" ]; then
    echo "Temp directory is writable"
else
    echo "Temp directory is not writable"
    exit 1
fi

# Check disk space
USAGE=$(df -h /tmp | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $USAGE -gt 90 ]; then
    echo "Disk usage critical: ${USAGE}%"
    exit 1
fi

echo "Health check passed"
exit 0