#!/bin/bash

# DigitalOcean Registry Login with Token
# This method uses the token as password via stdin, which is more reliable

SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
USER="opc"

echo "================================================"
echo "  DigitalOcean Registry Authentication"
echo "================================================"
echo ""

# Prompt for the token
echo "Please enter your DigitalOcean API token"
echo "(It should start with 'dop_v1_'...)"
echo -n "Token: "
read -s DO_TOKEN
echo ""
echo ""

if [[ ! "$DO_TOKEN" =~ ^dop_v1_ ]]; then
    echo "⚠️  Warning: Token doesn't start with 'dop_v1_'"
    echo "   This might not be a valid DigitalOcean API token."
    echo ""
    echo "Do you want to continue anyway? (y/n)"
    read -n 1 CONTINUE
    echo ""
    if [[ "$CONTINUE" != "y" ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo "Attempting login to DigitalOcean Container Registry..."
echo ""

# Method 1: Token as both username and password using stdin
echo "Method 1: Using token as username and password..."
ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "echo '$DO_TOKEN' | docker login registry.digitalocean.com -u '$DO_TOKEN' --password-stdin 2>&1"

if [ $? -eq 0 ]; then
    echo "✅ Login successful!"
    
    # Test by pulling an image
    echo ""
    echo "Testing registry access by pulling a small image..."
    ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "docker pull registry.digitalocean.com/codequal/analyzer:lang-ruby-v4.3"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Successfully pulled test image! Registry access confirmed."
        echo ""
        echo "Now pulling all analyzer images..."
        ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "/mnt/workspace/pull-images.sh"
    else
        echo ""
        echo "⚠️  Login seemed successful but couldn't pull images."
        echo "   The token might not have registry read permissions."
    fi
else
    echo ""
    echo "Method 1 failed. Trying alternative method..."
    echo ""
    
    # Method 2: Try with email as username
    echo "Please enter your DigitalOcean account email:"
    read DO_EMAIL
    
    echo "Method 2: Using email as username and token as password..."
    ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "echo '$DO_TOKEN' | docker login registry.digitalocean.com -u '$DO_EMAIL' --password-stdin 2>&1"
    
    if [ $? -eq 0 ]; then
        echo "✅ Login successful with email method!"
        
        # Test pull
        echo "Testing registry access..."
        ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "docker pull registry.digitalocean.com/codequal/analyzer:lang-ruby-v4.3"
        
        if [ $? -eq 0 ]; then
            echo "✅ Registry access confirmed!"
            ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "/mnt/workspace/pull-images.sh"
        fi
    else
        echo ""
        echo "❌ Both login methods failed."
        echo ""
        echo "Please verify:"
        echo "1. Your API token has 'Read' access to Container Registry"
        echo "2. The token was copied correctly (no extra spaces)"
        echo "3. You're using a personal access token, not an app token"
        echo ""
        echo "To create a proper token:"
        echo "1. Go to: https://cloud.digitalocean.com/account/api/tokens"
        echo "2. Click 'Generate New Token'"
        echo "3. Name it (e.g., 'docker-registry-read')"
        echo "4. Under 'Scopes', ensure 'Read' is checked for Container Registry"
        echo "5. Click 'Generate Token' and copy it immediately"
        echo ""
        echo "You can also try logging in manually:"
        echo "ssh -i $SSH_KEY $USER@$INSTANCE_IP"
        echo "docker login registry.digitalocean.com"
    fi
fi