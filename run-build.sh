#!/bin/bash

echo "🔧 Running CodeQual Build Process"
echo "================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Make scripts executable
chmod +x scripts/build-packages.sh
chmod +x scripts/utils/build-core-forced.js 2>/dev/null || true

# Run the project's build script
echo "Running project build script..."
bash scripts/build-packages.sh

echo ""
echo "Build process complete!"
echo ""
echo "To run Phase 3 tests:"
echo "  ./integration-tests/scripts/test-phase3-core-flow.sh"
