#!/bin/bash

# Initialize DeepWiki Provider Configurations
# This script:
# 1. Creates provider configuration files directly in the pod
# 2. Restarts the pod to apply new configurations

set -e

# Get the pod name
POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo "No deepwiki-fixed pod found. Checking for regular deepwiki pod..."
  POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')
fi

if [ -z "$POD_NAME" ]; then
  echo "No DeepWiki pod found!"
  exit 1
fi

echo "Initializing provider configurations for pod: $POD_NAME"

# Create config directory if it doesn't exist
kubectl exec -n codequal-dev $POD_NAME -- mkdir -p /root/.adalflow/configs

# Create OpenAI configuration
echo "Creating OpenAI configuration..."
kubectl exec -n codequal-dev $POD_NAME -- bash -c "cat > /root/.adalflow/configs/openai.yaml << 'EOF'
provider: openai
api_key: \${OPENAI_API_KEY}
enabled: true
models:
  - model: gpt-4o
    context_length: 128000
    supported: true
EOF"

# Create Anthropic configuration
echo "Creating Anthropic configuration..."
kubectl exec -n codequal-dev $POD_NAME -- bash -c "cat > /root/.adalflow/configs/anthropic.yaml << 'EOF'
provider: anthropic
api_key: \${ANTHROPIC_API_KEY}
enabled: true
models:
  - model: claude-3-7-sonnet
    context_length: 200000
    supported: true
EOF"

# Create Google configuration
echo "Creating Google configuration..."
kubectl exec -n codequal-dev $POD_NAME -- bash -c "cat > /root/.adalflow/configs/google.yaml << 'EOF'
provider: google
api_key: \${GOOGLE_API_KEY}
enabled: true
models:
  - model: gemini-2.5-pro-preview-05-06
    context_length: 128000
    supported: true
EOF"

# Create DeepSeek configuration
echo "Creating DeepSeek configuration..."
kubectl exec -n codequal-dev $POD_NAME -- bash -c "cat > /root/.adalflow/configs/deepseek.yaml << 'EOF'
provider: deepseek
api_key: \${DEEPSEEK_API_KEY}
enabled: true
models:
  - model: deepseek-coder
    context_length: 32000
    supported: true
EOF"

echo "Creating main provider configuration file..."
kubectl exec -n codequal-dev $POD_NAME -- bash -c "cat > /root/.adalflow/configs/providers.yaml << 'EOF'
providers:
  - name: openai
    config_file: configs/openai.yaml
  - name: anthropic
    config_file: configs/anthropic.yaml
  - name: google
    config_file: configs/google.yaml
  - name: deepseek
    config_file: configs/deepseek.yaml
EOF"

echo "Verifying configurations..."
kubectl exec -n codequal-dev $POD_NAME -- ls -la /root/.adalflow/configs/

echo "Restarting the DeepWiki pod to apply new configurations..."
kubectl delete pod -n codequal-dev $POD_NAME

echo "Waiting for the pod to be ready again..."
sleep 5
NEW_POD_NAME=""
for i in {1..20}; do
  if [ -n "$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)" ]; then
    NEW_POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
    break
  elif [ -n "$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)" ]; then
    NEW_POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')
    break
  fi
  echo "Waiting for pod to be created... ($i/20)"
  sleep 3
done

if [ -z "$NEW_POD_NAME" ]; then
  echo "Failed to find new pod!"
  exit 1
fi

echo "New pod name: $NEW_POD_NAME"
kubectl wait --for=condition=ready pod -n codequal-dev $NEW_POD_NAME --timeout=120s

echo "Provider configurations initialized!"
echo "To check the status, run:"
echo "./check-deepwiki-config.sh"