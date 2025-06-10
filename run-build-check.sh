#!/bin/bash

# Make build script executable
chmod +x integration-tests/scripts/build-and-lint.sh

echo "✅ Build script ready!"
echo ""
echo "Running build and lint check..."
echo ""

./integration-tests/scripts/build-and-lint.sh
