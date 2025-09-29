#!/bin/bash
# Quick connection script for Oracle instance

SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
USER="opc"

# Check if key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "Error: SSH key not found at $SSH_KEY"
    echo "Please ensure keys are in keys/oracle/ directory"
    exit 1
fi

# Ensure correct permissions
chmod 600 "$SSH_KEY"

echo "Connecting to Oracle A1.Flex instance..."
echo "IP: $INSTANCE_IP"
echo "User: $USER"
echo ""

ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP"