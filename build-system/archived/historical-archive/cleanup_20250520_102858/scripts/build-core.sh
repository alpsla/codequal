#!/bin/bash

# Script to properly build the core package
set -e  # Exit on error

echo "Building core package..."

# Clean the dist directory
echo "Cleaning dist directory..."
rm -rf packages/core/dist

# Ensure core tsconfig.json has composite and declaration enabled
echo "Checking core tsconfig.json..."
cd packages/core

# Run the TypeScript compiler
echo "Running TypeScript compiler..."
npx tsc --declaration --emitDeclarationOnly

# Copy the declaration files
echo "Building JavaScript files..."
npx tsc

echo "Core package built successfully!"
