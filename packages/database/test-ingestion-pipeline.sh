#!/bin/bash

# Vector Database Ingestion Pipeline Test Runner
# This script tests the complete ingestion pipeline with real DeepWiki reports

echo "🚀 Starting Vector Database Ingestion Pipeline Tests"
echo "=================================================="

# Set working directory to the database package
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Working directory: $(pwd)"

# Check if .env file exists in root
if [ ! -f "../../.env" ]; then
    echo "⚠️  Warning: .env file not found in project root"
    echo "Please ensure your .env file is at: /Users/alpinro/Code Prjects/codequal/.env"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the test
echo ""
echo "🧪 Running ingestion pipeline tests with real DeepWiki reports..."
echo ""

npx ts-node src/services/ingestion/__tests__/test-real-deepwiki-reports.ts

echo ""
echo "✅ Test completed!"
