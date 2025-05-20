#!/bin/bash

# Comprehensive DeepWiki Provider Fix Script
# This script fixes provider configurations in DeepWiki to resolve common errors:
# 1. "All embeddings should be of the same size" for OpenAI and Google
# 2. "Configuration for provider not found" for Anthropic and DeepSeek

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== DeepWiki Provider Configuration Fix ======${NC}"

# Get the DeepWiki pod name
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -z "$POD" ]; then
  echo -e "${RED}Error: DeepWiki pod not found${NC}"
  echo -e "${YELLOW}Tip: Run ./fix-and-test-deepwiki.sh first to deploy DeepWiki${NC}"
  exit 1
fi

echo -e "${GREEN}DeepWiki pod found: $POD${NC}"

# Step 1: Check current provider configurations
echo -e "${BLUE}Step 1: Checking current provider configurations...${NC}"
kubectl exec -n codequal-dev $POD -- ls -la /root/.adalflow/providers/ 2>/dev/null || echo -e "${YELLOW}No provider directory found, will create it${NC}"

# Step 2: Recreate provider directory and reset embedding settings
echo -e "${BLUE}Step 2: Setting up provider directory and fixing embeddings issue...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "mkdir -p /root/.adalflow/providers /root/.adalflow/config"

# Create a global config to ensure all embedding models use the same dimensions
echo -e "${BLUE}Creating global embedding configuration...${NC}"
cat > embedding_config.yaml << EOF
# Global embedding configuration
default_embedding_model: openai/text-embedding-3-small
embedding_dimension: 1536
normalize_embeddings: true

# Use the same embedding model for all providers
openai:
  embedding_model: openai/text-embedding-3-small
anthropic:
  embedding_model: openai/text-embedding-3-small
google:
  embedding_model: openai/text-embedding-3-small
deepseek:
  embedding_model: openai/text-embedding-3-small
EOF

# Copy the embedding configuration to the pod
kubectl cp embedding_config.yaml codequal-dev/$POD:/root/.adalflow/config/embeddings.yaml
rm embedding_config.yaml

# Step 3: Create detailed provider configurations
echo -e "${BLUE}Step 3: Creating detailed provider configurations...${NC}"

# OpenAI configuration
echo -e "${BLUE}Creating OpenAI configuration...${NC}"
cat > openai_config.yaml << EOF
enabled: true
api_key: ${OPENAI_API_KEY}
api_base: https://api.openai.com/v1
api_version: 2023-05-15
embedding_model: text-embedding-3-small
embedding_dimension: 1536
models:
  - name: gpt-4o
    max_tokens: 8192
    supports_functions: true
    supports_vision: true
EOF

# Anthropic configuration
echo -e "${BLUE}Creating Anthropic configuration...${NC}"
cat > anthropic_config.yaml << EOF
enabled: true
api_key: ${ANTHROPIC_API_KEY}
api_base: https://api.anthropic.com
api_version: 2023-06-01
embedding_model: text-embedding-3-small
embedding_dimension: 1536
models:
  - name: claude-3-7-sonnet
    max_tokens: 16384
    supports_functions: true
    supports_vision: true
EOF

# Google configuration
echo -e "${BLUE}Creating Google configuration...${NC}"
cat > google_config.yaml << EOF
enabled: true
api_key: ${GOOGLE_API_KEY}
api_base: https://generativelanguage.googleapis.com/v1beta
embedding_model: text-embedding-3-small
embedding_dimension: 1536
models:
  - name: gemini-2.5-pro-preview-05-06
    max_tokens: 8192
    supports_functions: true
    supports_vision: true
EOF

# DeepSeek configuration
echo -e "${BLUE}Creating DeepSeek configuration...${NC}"
cat > deepseek_config.yaml << EOF
enabled: true
api_key: ${DEEPSEEK_API_KEY}
api_base: https://api.deepseek.com/v1
embedding_model: text-embedding-3-small
embedding_dimension: 1536
models:
  - name: deepseek-coder
    max_tokens: 8192
    supports_functions: false
    supports_vision: false
EOF

# Copy provider configurations to the pod
echo -e "${BLUE}Copying provider configurations to the pod...${NC}"
kubectl cp openai_config.yaml codequal-dev/$POD:/root/.adalflow/providers/openai.yaml
kubectl cp anthropic_config.yaml codequal-dev/$POD:/root/.adalflow/providers/anthropic.yaml
kubectl cp google_config.yaml codequal-dev/$POD:/root/.adalflow/providers/google.yaml
kubectl cp deepseek_config.yaml codequal-dev/$POD:/root/.adalflow/providers/deepseek.yaml

# Cleanup temporary files
rm openai_config.yaml anthropic_config.yaml google_config.yaml deepseek_config.yaml

# Step 4: Verify provider configurations
echo -e "${BLUE}Step 4: Verifying provider configurations...${NC}"
kubectl exec -n codequal-dev $POD -- ls -la /root/.adalflow/providers/
kubectl exec -n codequal-dev $POD -- ls -la /root/.adalflow/config/

# Step 5: Create an initialization script inside the pod to reset the database
echo -e "${BLUE}Step 5: Creating database reset script...${NC}"
cat > reset_db.sh << EOF
#!/bin/bash
echo "Resetting DeepWiki database to apply new configurations..."
rm -rf /root/.adalflow/data/* || true
rm -rf /root/.adalflow/embeddings/* || true
mkdir -p /root/.adalflow/data /root/.adalflow/embeddings
touch /root/.adalflow/data/.reset_marker
echo "Database reset complete. DeepWiki will reinitialize with new configurations on next request."
EOF

kubectl cp reset_db.sh codequal-dev/$POD:/root/reset_db.sh
kubectl exec -n codequal-dev $POD -- chmod +x /root/reset_db.sh
kubectl exec -n codequal-dev $POD -- /root/reset_db.sh
rm reset_db.sh

# Step 6: Restart the DeepWiki pod to apply changes
echo -e "${BLUE}Step 6: Restarting DeepWiki pod to apply configurations...${NC}"
kubectl rollout restart deployment/deepwiki-fixed -n codequal-dev
echo -e "${YELLOW}Waiting for DeepWiki pod to restart...${NC}"
kubectl rollout status deployment/deepwiki-fixed -n codequal-dev --timeout=120s

# Get the new pod name
NEW_POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
echo -e "${GREEN}DeepWiki pod restarted: $NEW_POD${NC}"

# Step 7: Restart port forwarding
echo -e "${BLUE}Step 7: Restarting port forwarding...${NC}"
# Kill any existing port-forwarding process
pkill -f "kubectl port-forward.*8001:8001" || true

# Set up port forwarding in the background
kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 &
PF_PID=$!

# Wait for port forwarding to be ready
echo -e "${YELLOW}Waiting for port forwarding to be ready...${NC}"
sleep 5

# Verify port forwarding is working
if ! ps -p $PF_PID > /dev/null; then
  echo -e "${RED}Error: Port forwarding failed to start${NC}"
  exit 1
fi
echo -e "${GREEN}Port forwarding started (PID: $PF_PID)${NC}"

# Step 8: Wait for DeepWiki to initialize
echo -e "${BLUE}Step 8: Waiting for DeepWiki to be fully initialized...${NC}"
echo -e "${YELLOW}This may take a minute...${NC}"
sleep 30

# Step 9: Test connection
echo -e "${BLUE}Step 9: Testing connection to DeepWiki API...${NC}"
if curl -s http://localhost:8001/ --connect-timeout 10 > /dev/null; then
  echo -e "${GREEN}✅ DeepWiki API is accessible${NC}"
else
  echo -e "${RED}❌ Cannot connect to DeepWiki API${NC}"
  echo -e "${YELLOW}Recommendation: Check DeepWiki pod logs for errors:${NC}"
  echo -e "${YELLOW}kubectl logs -n codequal-dev $NEW_POD${NC}"
  exit 1
fi

# Step 10: Validate providers
echo -e "${BLUE}Step 10: Validating DeepWiki provider configurations...${NC}"
echo -e "${YELLOW}Running validate-connection.js to test all providers...${NC}"

cd "$(dirname "$0")" # Ensure we're in the right directory
node validate-connection.js

# Final message
echo -e "${GREEN}====== DeepWiki Provider Configuration Fix Complete ======${NC}"
echo -e "${GREEN}DeepWiki providers have been configured with consistent embedding dimensions${NC}"
echo -e "${GREEN}The database has been reset to apply the new configurations${NC}"
echo -e "${YELLOW}If you still encounter issues, check the pod logs:${NC}"
echo -e "${YELLOW}kubectl logs -n codequal-dev $NEW_POD${NC}"
echo -e "${BLUE}Now you can run the calibration with:${NC}"
echo -e "${BLUE}./calibration-modes.sh full${NC}"