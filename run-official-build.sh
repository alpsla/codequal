#!/bin/bash

echo "🏗️  Running CodeQual Build"
echo "=========================="
echo ""

cd /Users/alpinro/Code\ Prjects/codequal

# Check if the build script exists
if [ ! -f "scripts/build-packages.sh" ]; then
    echo "❌ Build script not found!"
    exit 1
fi

# Make it executable
chmod +x scripts/build-packages.sh

# Run the official build script
echo "Running official build script..."
echo ""
./scripts/build-packages.sh

# Check the result
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "Now you can run the tests:"
    echo "  ./integration-tests/scripts/test-phase3-core-flow.sh"
else
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "Try the alternative build approach:"
    echo "  chmod +x integration-tests/scripts/fix-build-order.sh"
    echo "  ./integration-tests/scripts/fix-build-order.sh"
fi
