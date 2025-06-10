#!/bin/bash

# Switch DeepWiki to use the 30GB disk
# This script deploys a new DeepWiki instance with the 30GB PVC

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== Switching DeepWiki to 30GB Disk ======${NC}"

# Apply the new configuration
echo -e "${BLUE}Step 1: Applying new DeepWiki deployment with 30GB disk...${NC}"
kubectl apply -f update-deepwiki-to-30gb.yaml

# Wait for the deployment to be ready
echo -e "${BLUE}Step 2: Waiting for deployment to be ready...${NC}"
kubectl rollout status deployment/deepwiki-fixed-30gb -n codequal-dev --timeout=180s

# Check the status
echo -e "${BLUE}Step 3: Checking deployment status...${NC}"
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed-30gb -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
  echo -e "${RED}Error: No pod found for the new deployment${NC}"
  exit 1
fi

echo -e "${GREEN}New DeepWiki pod with 30GB disk is running: $POD${NC}"

# Check disk space
echo -e "${BLUE}Step 4: Checking available disk space on the new pod...${NC}"
kubectl exec -n codequal-dev $POD -- df -h /root/.adalflow

# Create directory structure if needed
echo -e "${BLUE}Step 5: Ensuring required directory structure exists...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "mkdir -p /root/.adalflow/{repos,embeddings,data,config,providers}"

# Set up port forwarding
echo -e "${BLUE}Step 6: Setting up port forwarding...${NC}"
# Kill any existing port forwarding
pkill -f "kubectl port-forward.*8001:8001" || true

# Start new port forwarding
kubectl port-forward -n codequal-dev svc/deepwiki-fixed-30gb 8001:8001 &
PF_PID=$!

# Wait for port forwarding to be established
echo -e "${YELLOW}Waiting for port forwarding to be ready...${NC}"
sleep 5

# Test connection
echo -e "${BLUE}Step 7: Testing connection to DeepWiki...${NC}"
if curl -s http://localhost:8001/ --connect-timeout 10 > /dev/null; then
  echo -e "${GREEN}✅ DeepWiki API is accessible${NC}"
else
  echo -e "${RED}❌ Cannot connect to DeepWiki API${NC}"
  echo -e "${YELLOW}Check pod logs: kubectl logs -n codequal-dev $POD${NC}"
fi

# Final instructions
echo -e "${GREEN}====== DeepWiki now using 30GB disk ======${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${YELLOW}1. Run the OpenRouter configuration script:${NC}"
echo -e "${YELLOW}   export OPENROUTER_API_KEY=sk-or-v1-your-key && ./fix-openrouter-model-names.sh${NC}"
echo -e "${YELLOW}2. Run the DeepSeek Coder test:${NC}"
echo -e "${YELLOW}   node test-deepseek-coder-fixed.js${NC}"
echo -e "${BLUE}Note: The service name has changed to deepwiki-fixed-30gb.${NC}"
echo -e "${BLUE}Update references in your scripts if needed.${NC}"