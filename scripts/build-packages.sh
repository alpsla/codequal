#!/bin/bash

# Script to build packages in the correct order

# Set error handling
set -e

echo "Building packages in order..."

# Build the core package first
echo "Building core package..."
cd packages/core
npm run build
cd ../..

# Build dependent packages
echo "Building database package..."
cd packages/database
npm run build
cd ../..

echo "Building agents package..."
cd packages/agents
npm run build
cd ../..

echo "Building cli package..."
cd packages/cli
npm run build
cd ../..

# Build remaining packages with dummy scripts
echo "Building testing package..."
cd packages/testing
npm run build
cd ../..

echo "Building ui package..."
cd packages/ui
npm run build
cd ../..

# Build apps
echo "Building api app..."
cd apps/api
npm run build
cd ../..

echo "Building web app..."
cd apps/web
npm run build
cd ../..

echo "All packages built successfully!"
