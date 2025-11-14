#!/bin/bash
# Run TypeScript Tests Only
# Filters test-v9-lite-e2e.ts to run only TypeScript scenarios

cd "$(dirname "$0")"

echo "🔷 Running TypeScript Tests Only"
echo "=================================="
echo ""
echo "Test Scenarios:"
echo "  1. CodeQual PR #50 (Next.js)"
echo "  2. React PR #28000"
echo "  3. Express PR #5400"
echo "  4. NestJS PR #12000"
echo ""
echo "Starting tests..."
echo ""

# Set environment variable to filter by language
FILTER_LANGUAGE=typescript npx ts-node tests/integration/test-v9-lite-e2e.ts
