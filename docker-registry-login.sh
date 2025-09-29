#!/bin/bash

# Docker Registry Login Helper for Oracle Instance
# This script helps you login to the DigitalOcean Container Registry

SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
USER="opc"

echo "================================================"
echo "  DigitalOcean Registry Login for Oracle Instance"
echo "================================================"
echo ""

# Check if DO_REGISTRY_TOKEN is set
if [ -n "$DO_REGISTRY_TOKEN" ]; then
    echo "✅ Found DO_REGISTRY_TOKEN environment variable"
    echo ""
    echo "Attempting automatic login on Oracle instance..."
    
    # Login on remote instance using the token
    ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "echo '$DO_REGISTRY_TOKEN' | docker login registry.digitalocean.com --username '$DO_REGISTRY_TOKEN' --password-stdin"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully logged in to registry!"
    else
        echo "❌ Login failed. Please check your token."
    fi
else
    echo "ℹ️  DO_REGISTRY_TOKEN not found in environment."
    echo ""
    echo "To login to the DigitalOcean Container Registry, you need:"
    echo "1. A DigitalOcean API token with registry read access"
    echo "2. Your DigitalOcean account email (optional)"
    echo ""
    echo "You can login in two ways:"
    echo ""
    echo "Option 1: Using API Token as both username and password"
    echo "─────────────────────────────────────────────────────"
    echo "ssh -i $SSH_KEY $USER@$INSTANCE_IP"
    echo "docker login registry.digitalocean.com"
    echo "Username: <your-api-token>"
    echo "Password: <same-api-token>"
    echo ""
    echo "Option 2: Export token and run this script"
    echo "─────────────────────────────────────────────"
    echo "export DO_REGISTRY_TOKEN='your-api-token-here'"
    echo "./docker-registry-login.sh"
    echo ""
    echo "To create a new API token:"
    echo "1. Go to https://cloud.digitalocean.com/account/api/tokens"
    echo "2. Generate a new token with 'Read' access to Container Registry"
    echo "3. Copy the token (it won't be shown again)"
    echo ""
fi

echo ""
echo "📋 After successful login, you can pull images:"
echo "─────────────────────────────────────────────"
echo "ssh -i $SSH_KEY $USER@$INSTANCE_IP '/mnt/workspace/pull-images.sh'"
echo ""