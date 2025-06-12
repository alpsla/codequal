#!/bin/bash

echo "Cleaning and rebuilding MCP Hybrid package..."
cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

# Clean
echo "Cleaning..."
rm -rf dist/
rm -rf node_modules/.cache/

# Rebuild
echo "Building..."
npm run build

echo "Done!"
