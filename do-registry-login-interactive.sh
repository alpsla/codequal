#!/bin/bash

# Interactive DigitalOcean Registry Login
# This script guides you through the login process

SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
USER="opc"

echo "================================================"
echo "  DigitalOcean Container Registry Login"
echo "================================================"
echo ""
echo "For DigitalOcean Container Registry, you have two login options:"
echo ""
echo "Option 1: Using your API Token (Recommended)"
echo "────────────────────────────────────────────"
echo "Username: <your-api-token>"
echo "Password: <same-api-token>"
echo ""
echo "Option 2: Using your email and API Token"
echo "────────────────────────────────────────────"
echo "Username: <your-email>"
echo "Password: <your-api-token>"
echo ""
echo "If you don't have an API token:"
echo "1. Go to https://cloud.digitalocean.com/account/api/tokens"
echo "2. Click 'Generate New Token'"
echo "3. Give it a name (e.g., 'docker-registry')"
echo "4. Enable 'Read' access for Container Registry"
echo "5. Copy the token (you won't see it again!)"
echo ""
echo "Press Enter to continue to login..."
read

echo ""
echo "Connecting to Oracle instance for Docker login..."
echo "When prompted:"
echo "  - For Username: Enter your API token (starts with dop_v1_...)"
echo "  - For Password: Enter the same API token again"
echo ""

# Connect with terminal allocation for interactive input
ssh -t -i "$SSH_KEY" "$USER@$INSTANCE_IP" "docker login registry.digitalocean.com"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Login successful! Now pulling images..."
    echo ""
    
    # Automatically start pulling images
    echo "Starting image pull process..."
    ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "/mnt/workspace/pull-images.sh"
else
    echo ""
    echo "❌ Login failed. Common issues:"
    echo "  - Wrong token format (should start with dop_v1_)"
    echo "  - Token doesn't have registry read access"
    echo "  - Network connectivity issues"
    echo ""
    echo "Please check your token and try again."
fi