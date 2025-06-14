#!/bin/bash

# Quick fix for DeepWiki Tools deployment
set -e

echo "=== Quick Fix for DeepWiki Tools ==="
echo "This will rebuild and redeploy with all tools properly installed"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Make scripts executable
chmod +x build-fixed.sh deploy-fixed.sh

# Step 1: Build the fixed image
echo "Step 1: Building fixed Docker image..."
./build-fixed.sh

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Build failed. Please check the errors above."
    exit 1
fi

echo ""
echo "Build successful! The image has been created with:"
echo "- All npm tools properly installed"
echo "- jq installed for JSON parsing"
echo "- tool-executor.js copied to /tools/"
echo ""

# Step 2: Deploy to Kubernetes
echo "Step 2: Ready to deploy to Kubernetes"
echo "This will update the existing DeepWiki deployment"
echo ""
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./deploy-fixed.sh
else
    echo "Deployment cancelled."
    echo "To deploy later, run: ./deploy-fixed.sh"
fi
