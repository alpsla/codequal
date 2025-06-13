#!/bin/bash

# DeepWiki Tool Integration Testing Script
# This script runs the phased testing for tool integration

echo "🚀 DeepWiki Tool Integration Testing"
echo "===================================="
echo ""
echo "This will test the tool integration in 3 phases:"
echo "  Phase 1: Local tool testing with real repositories"
echo "  Phase 2: Docker container testing"
echo "  Phase 3: Integration testing with Vector DB"
echo ""

# Save the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Change to the project root
cd "$SCRIPT_DIR/../../../../../.."

# Check if TypeScript is compiled
if [ ! -f "$SCRIPT_DIR/../../../../../../core/dist/services/deepwiki-tools/tests/phased-testing.js" ]; then
    echo "⚠️  TypeScript not compiled. Running build..."
    # Build database package first
    npm run build --workspace=@codequal/database
    # Then build core package
    npm run build --workspace=@codequal/core
fi

# Change back to the script directory
cd "$SCRIPT_DIR"

# Set environment variables if .env exists
if [ -f "../../../../../.env" ]; then
    echo "📋 Loading environment variables from .env"
    export $(cat ../../../../../.env | grep -v '^#' | xargs)
fi

# Find the compiled JavaScript file
COMPILED_FILE="$SCRIPT_DIR/../../../../../../core/dist/services/deepwiki-tools/tests/phased-testing.js"

# Check for command line arguments
if [ "$1" == "--phase1" ]; then
    echo "Running Phase 1 only..."
    node "$COMPILED_FILE" --phase1
elif [ "$1" == "--phase2" ]; then
    echo "Running Phase 2 only..."
    node "$COMPILED_FILE" --phase2
elif [ "$1" == "--phase3" ]; then
    echo "Running Phase 3 only..."
    node "$COMPILED_FILE" --phase3
elif [ "$1" == "--all" ]; then
    echo "Running all phases..."
    node "$COMPILED_FILE" --all
else
    # Interactive mode
    node "$COMPILED_FILE"
fi

echo ""
echo "✅ Testing script completed"
