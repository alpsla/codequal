#!/bin/bash

# Script to clean and rebuild packages
set -e  # Exit on error

echo "Cleaning and rebuilding packages..."

# Clean core package
echo "Cleaning core package..."
rm -rf packages/core/dist

# Clean database package
echo "Cleaning database package..."
rm -rf packages/database/dist

# Clean agents package
echo "Cleaning agents package..."
rm -rf packages/agents/dist

# Clean CLI package
echo "Cleaning CLI package..."
rm -rf packages/cli/dist

# Clean testing package
echo "Cleaning testing package..."
rm -rf packages/testing/dist

# Clean UI package
echo "Cleaning UI package..."
rm -rf packages/ui/dist

# Run the build script
echo "Running full build..."
bash scripts/build-packages.sh

echo "All packages cleaned and rebuilt successfully!"
