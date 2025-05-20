#!/bin/bash

# Script to build packages in the correct order
set -e  # Exit on error

echo "Building packages in sequential order..."

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

# Build agents package
echo "Building agents package..."
cd packages/agents
npm run build
cd ../..

# Build CLI package
echo "Building CLI package..."
cd packages/cli
npm run build
cd ../..

# Build remaining packages (these have dummy build scripts)
echo "Building UI package..."
cd packages/ui
npm run build
cd ../..

echo "Building testing package..."
cd packages/testing
npm run build
cd ../..

echo "Building API app..."
cd apps/api
npm run build
cd ../..

echo "Building web app..."
cd apps/web
npm run build
cd ../..

echo "All packages built successfully!"
