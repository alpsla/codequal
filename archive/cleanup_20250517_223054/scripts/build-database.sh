#!/bin/bash

# Script to build the core and database packages
set -e  # Exit on error

echo "Building core and database packages..."

# Build core package
echo "Building core package..."
cd packages/core
npm run build
cd ../..

# Build database package
echo "Building database package..."
cd packages/database
npm run build
cd ../..

echo "Core and database packages built successfully!"
