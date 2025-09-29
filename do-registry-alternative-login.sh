#!/bin/bash

# Alternative DigitalOcean Registry Login Methods
# Sometimes the standard docker login doesn't work properly with DO

SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
USER="opc"

echo "================================================"
echo "  Alternative DigitalOcean Registry Login Methods"
echo "================================================"
echo ""
echo "The standard Docker login sometimes fails with DigitalOcean."
echo "Let's try alternative approaches..."
echo ""

echo "Method 1: Using doctl to get registry credentials"
echo "────────────────────────────────────────────────"
echo ""
echo "First, check if you have doctl installed locally:"
which doctl > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ doctl is installed"
    echo ""
    echo "Run these commands locally:"
    echo "1. doctl auth init  (enter your API token)"
    echo "2. doctl registry login"
    echo "3. This will configure Docker to use DO registry"
    echo ""
    echo "Then copy the auth to Oracle instance:"
    echo "scp -i $SSH_KEY ~/.docker/config.json $USER@$INSTANCE_IP:~/.docker/"
    echo ""
else
    echo "❌ doctl not installed"
    echo ""
    echo "To install doctl:"
    echo "brew install doctl  (on macOS)"
    echo ""
fi

echo "Method 2: Manual Docker config creation"
echo "────────────────────────────────────────────────"
echo ""
echo "Please enter your DigitalOcean API token:"
echo -n "Token: "
read -s DO_TOKEN
echo ""
echo ""

# Create a base64 encoded auth string
# Format: token:token (using token as both username and password)
AUTH_STRING=$(echo -n "${DO_TOKEN}:${DO_TOKEN}" | base64)

echo "Creating Docker config with encoded credentials..."

# Create the config.json content
cat > /tmp/docker-config.json << EOF
{
  "auths": {
    "registry.digitalocean.com": {
      "auth": "${AUTH_STRING}"
    }
  }
}
EOF

echo "Copying Docker config to Oracle instance..."
scp -i "$SSH_KEY" /tmp/docker-config.json "$USER@$INSTANCE_IP:/tmp/docker-config.json"

ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" << 'REMOTE_SCRIPT'
# Backup existing config if it exists
if [ -f ~/.docker/config.json ]; then
    cp ~/.docker/config.json ~/.docker/config.json.backup
    echo "✅ Backed up existing Docker config"
fi

# Create docker config directory if it doesn't exist
mkdir -p ~/.docker

# Move the new config
mv /tmp/docker-config.json ~/.docker/config.json
chmod 600 ~/.docker/config.json

echo "✅ Docker config installed"
echo ""
echo "Testing registry access..."

# Try to pull a small image
docker pull registry.digitalocean.com/codequal/analyzer:lang-ruby-v4.3 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Registry access is working!"
    echo ""
    echo "Now pulling all analyzer images..."
    /mnt/workspace/pull-images.sh
else
    echo ""
    echo "❌ Still can't access registry."
    echo ""
    echo "Trying with email-based auth..."
fi
REMOTE_SCRIPT

if [ $? -ne 0 ]; then
    echo ""
    echo "Method 3: Using email and token combination"
    echo "────────────────────────────────────────────────"
    echo "Please enter your DigitalOcean account email:"
    read DO_EMAIL
    
    # Create auth with email:token format
    AUTH_STRING_EMAIL=$(echo -n "${DO_EMAIL}:${DO_TOKEN}" | base64)
    
    cat > /tmp/docker-config-email.json << EOF
{
  "auths": {
    "registry.digitalocean.com": {
      "auth": "${AUTH_STRING_EMAIL}"
    }
  }
}
EOF
    
    echo "Trying with email-based authentication..."
    scp -i "$SSH_KEY" /tmp/docker-config-email.json "$USER@$INSTANCE_IP:/tmp/docker-config-email.json"
    
    ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" << 'REMOTE_EMAIL'
mv /tmp/docker-config-email.json ~/.docker/config.json
chmod 600 ~/.docker/config.json

docker pull registry.digitalocean.com/codequal/analyzer:lang-ruby-v4.3 2>&1

if [ $? -eq 0 ]; then
    echo "✅ SUCCESS with email method!"
    /mnt/workspace/pull-images.sh
else
    echo "❌ All methods failed."
    echo ""
    echo "Please double-check:"
    echo "1. Your token has 'Container Registry: Read' permission"
    echo "2. The registry name is correct: 'codequal'"
    echo "3. The images exist in your registry"
    echo ""
    echo "You can verify in the DigitalOcean console:"
    echo "https://cloud.digitalocean.com/registry/codequal"
fi
REMOTE_EMAIL
fi

# Clean up temp files
rm -f /tmp/docker-config.json /tmp/docker-config-email.json