#!/bin/bash

# Script to diagnose and fix circular dependency issue

echo "Diagnosing circular dependency between @codequal/core and @codequal/database..."

# Step 1: Clean all build artifacts
echo "Step 1: Cleaning build artifacts..."
npm run clean 2>/dev/null || echo "No clean script, skipping..."
rm -rf packages/*/dist
rm -rf packages/*/node_modules
rm -rf node_modules

# Step 2: Fresh install
echo "Step 2: Fresh install..."
npm install

# Step 3: Check for circular dependencies
echo "Step 3: Checking for circular dependencies..."
npm ls 2>&1 | grep -A5 -B5 "circular" || echo "No circular dependencies found in npm ls"

# Step 4: Look for imports from core in database package
echo "Step 4: Checking for imports from @codequal/core in database package..."
grep -r "from '@codequal/core" packages/database/src/ || echo "No direct imports found"
grep -r "from \"@codequal/core" packages/database/src/ || echo "No direct imports found"
grep -r "require.*@codequal/core" packages/database/src/ || echo "No require imports found"

# Step 5: Look for imports from database in core package  
echo "Step 5: Checking for imports from @codequal/database in core package..."
grep -r "from '@codequal/database" packages/core/src/ || echo "No direct imports found"
grep -r "from \"@codequal/database" packages/core/src/ || echo "No direct imports found"
grep -r "require.*@codequal/database" packages/core/src/ || echo "No require imports found"

# Step 6: Check package.json dependencies
echo "Step 6: Checking package.json dependencies..."
echo "Core dependencies:"
cat packages/core/package.json | grep -A10 '"dependencies"' | grep "@codequal"
echo ""
echo "Database dependencies:"
cat packages/database/package.json | grep -A10 '"dependencies"' | grep "@codequal"

# Step 7: Try building
echo "Step 7: Attempting build..."
npm run build

echo "Diagnosis complete!"
