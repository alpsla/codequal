#!/bin/bash

# Clean up old scripts and prepare the new one
chmod +x cleanup-old-scripts.sh
chmod +x the-educational-fix.sh

echo "🧹 Cleaning up old scripts..."
./cleanup-old-scripts.sh

echo ""
echo "✅ Ready to use the new fix script!"
echo ""
echo "Run this command to fix all Educational Agent tests:"
echo "  ./the-educational-fix.sh"
echo ""
echo "This single script will:"
echo "  • Fix ToolResultData structure (add repositoryId at top level)"
echo "  • Fix mock implementations to avoid 'as any' issues"
echo "  • Fix orchestrator tests (avoid accessing private properties)"
echo "  • Fix all TypeScript type errors"
