#!/bin/bash

# Script to install dependencies for CodeQual project

echo "Installing dependencies for CodeQual project..."

# Install root dependencies
echo "🔹 Installing root dependencies..."
npm install

# Install package-specific dependencies
echo "🔹 Installing package-specific dependencies..."
cd packages/database
npm install @supabase/supabase-js

cd ../agents
npm install

cd ../core
npm install

cd ../testing
npm install

cd ../ui
npm install

# Return to root
cd ../..

echo "✅ Dependencies installed successfully!"
echo ""
echo "If you still encounter issues with '@supabase/supabase-js', try:"
echo "npm install -g @supabase/supabase-js"
echo ""
