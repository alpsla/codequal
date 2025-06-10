#!/bin/bash

echo "🚀 Quick Fix and Test"
echo "==================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Make scripts executable
chmod +x fix-axios-targeted.sh patch-axios.sh

# Try the patch approach first (quickest)
echo "1️⃣ Applying axios patch..."
./patch-axios.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# If patch worked, run all Phase 3 tests
if [ $? -eq 0 ]; then
    echo "2️⃣ Patch successful! Running all Phase 3 tests..."
    echo ""
    
    # Make the skip-build script executable
    chmod +x integration-tests/scripts/test-phase3-skip-build.sh
    
    # Run all tests
    ./integration-tests/scripts/test-phase3-skip-build.sh
else
    echo "❌ Patch failed. Trying targeted fix..."
    ./fix-axios-targeted.sh
fi
