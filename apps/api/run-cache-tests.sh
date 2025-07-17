#!/bin/bash

echo "=== Running DeepWiki Cache Tests ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build the project first
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Please fix build errors first.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"
echo ""

# Run direct cache test
echo "Running direct cache test..."
npx ts-node test-cache-direct.ts

echo ""
echo "================================"
echo ""

# Run full flow test
echo "Running full flow test with cache..."
npx ts-node test-full-flow-with-cache.ts

echo ""
echo -e "${GREEN}All tests completed!${NC}"