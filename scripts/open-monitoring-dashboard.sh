#!/bin/bash

echo "🌐 Opening DeepWiki Monitoring Dashboard..."
echo ""
echo "Dashboard URL: http://localhost:3001/deepwiki-dashboard.html"
echo ""
echo "Steps to monitor:"
echo "1. Open the dashboard in your browser"
echo "2. Watch the disk usage gauge and graphs"
echo "3. Observe these stages:"
echo "   - Initial state (low disk usage)"
echo "   - DeepWiki clones repo (disk usage increases)"
echo "   - MCP/Agent analysis (disk usage stable)"
echo "   - Cleanup (disk usage decreases)"
echo ""
echo "Press Ctrl+C to exit"

# Try to open in default browser
if command -v open &> /dev/null; then
    open "http://localhost:3001/deepwiki-dashboard.html"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3001/deepwiki-dashboard.html"
else
    echo "Please manually open: http://localhost:3001/deepwiki-dashboard.html"
fi

# Keep script running
while true; do
    sleep 60
done