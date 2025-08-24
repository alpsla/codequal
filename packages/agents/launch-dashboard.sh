#!/bin/bash

# Launch Dashboard Script
# Starts the real-time monitoring dashboard for CodeQual

echo "🚀 Starting CodeQual Performance Dashboard..."
echo "==========================================="

# Check if .env exists
if [ ! -f "../../.env" ]; then
    echo "⚠️  Warning: .env file not found. Supabase metrics may not be available."
    echo "   Dashboard will use local metrics only."
fi

# Load environment variables
if [ -f "../../.env" ]; then
    source ../../.env
fi

# Build TypeScript if needed
echo "📦 Building dashboard server..."
npx tsc src/standard/monitoring/dashboard/dashboard-server.ts --outDir dist/standard/monitoring/dashboard --skipLibCheck

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix TypeScript errors and try again."
    exit 1
fi

# Start the dashboard server
echo "🌐 Launching dashboard server on port ${DASHBOARD_PORT:-3333}..."
node dist/standard/monitoring/dashboard/dashboard-server.js

# Alternative: Use ts-node for development
# npx ts-node src/standard/monitoring/dashboard/dashboard-server.ts