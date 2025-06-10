#!/bin/bash

# Script to initialize and fix provider configurations for DeepWiki
set -e

echo "=========================================="
echo "DeepWiki Provider Configuration Fix"
echo "=========================================="

# Get the DeepWiki pod name
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
  echo "Error: DeepWiki pod not found"
  exit 1
fi

echo "DeepWiki pod: $POD"

# Create the providers directory first
echo "Creating providers directory in the pod..."
kubectl exec -n codequal-dev $POD -- mkdir -p /root/.adalflow/providers

# Create provider configurations for OpenAI, Anthropic, Google, and DeepSeek
echo "Creating provider configurations..."

# OpenAI configuration
OPENAI_CONFIG=$(cat <<EOF
enabled: true
api_key: ${OPENAI_API_KEY}
EOF
)

# Anthropic configuration
ANTHROPIC_CONFIG=$(cat <<EOF
enabled: true
api_key: ${ANTHROPIC_API_KEY}
EOF
)

# Google configuration
GOOGLE_CONFIG=$(cat <<EOF
enabled: true
api_key: ${GOOGLE_API_KEY}
EOF
)

# DeepSeek configuration
DEEPSEEK_CONFIG=$(cat <<EOF
enabled: true
api_key: ${DEEPSEEK_API_KEY}
EOF
)

# Create temporary files
echo "$OPENAI_CONFIG" > openai.yaml
echo "$ANTHROPIC_CONFIG" > anthropic.yaml
echo "$DEEPSEEK_CONFIG" > deepseek.yaml
echo "$GOOGLE_CONFIG" > google.yaml

# Copy the configuration files to the pod
echo "Copying provider configurations to the pod..."
kubectl cp openai.yaml codequal-dev/$POD:/root/.adalflow/providers/openai.yaml
kubectl cp anthropic.yaml codequal-dev/$POD:/root/.adalflow/providers/anthropic.yaml
kubectl cp deepseek.yaml codequal-dev/$POD:/root/.adalflow/providers/deepseek.yaml
kubectl cp google.yaml codequal-dev/$POD:/root/.adalflow/providers/google.yaml

# Clean up temporary files
rm openai.yaml anthropic.yaml deepseek.yaml google.yaml

echo "Provider configurations copied to pod"

# Verify that the configurations are in place
echo "Verifying provider configurations..."
kubectl exec -n codequal-dev $POD -- ls -la /root/.adalflow/providers/

echo "Done! Configurations have been updated."
echo "To test the configurations, run:"
echo "node enhanced-provider-test.js"