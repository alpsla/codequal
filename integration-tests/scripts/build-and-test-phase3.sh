#!/bin/bash

echo "🔨 Building packages before running Phase 3 tests..."
echo "=================================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Build all packages
echo "Building all packages..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "Now running Phase 3 tests..."
    echo ""
    
    # Run Phase 3 tests
    cd integration-tests
    npm test tests/phase3-agents/
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
