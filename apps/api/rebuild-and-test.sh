#!/bin/bash

echo "🔄 Rebuilding API with latest changes..."
cd "/Users/alpinro/Code Prjects/codequal/apps/api"

# Kill existing server
echo "📍 Stopping existing server..."
pkill -f "node.*dist/index.js" || true
sleep 2

# Clean and rebuild
echo "🧹 Cleaning old build..."
rm -rf dist/

echo "📦 Building TypeScript..."
npm run build

echo "✅ Build complete!"
echo ""
echo "Now start the server with:"
echo "  npm run dev"
echo ""
echo "Then test at:"
echo "  http://localhost:3001/test-report-generation.html"