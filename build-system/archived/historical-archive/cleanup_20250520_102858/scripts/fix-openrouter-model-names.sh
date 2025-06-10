#!/bin/bash

# Fix for OpenRouter model name format issues in DeepWiki
# This script updates the DeepWiki configuration to properly handle DeepSeek Coder models

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== DeepWiki OpenRouter Model Fix ======${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}Error: kubectl is not installed or not in the PATH${NC}"
  exit 1
fi

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo -e "${RED}Error: OPENROUTER_API_KEY environment variable is not set${NC}"
  echo -e "${YELLOW}Please set it with: export OPENROUTER_API_KEY='your-api-key'${NC}"
  exit 1
fi

# Step 1: Get the DeepWiki pod name
echo -e "${BLUE}Step 1: Finding DeepWiki pod...${NC}"
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -z "$POD" ]; then
  echo -e "${RED}Error: DeepWiki pod not found${NC}"
  exit 1
fi

echo -e "${GREEN}DeepWiki pod found: $POD${NC}"

# Step 2: Check available disk space
echo -e "${BLUE}Step 2: Checking available disk space...${NC}"
kubectl exec -n codequal-dev $POD -- df -h /root/.adalflow

# Step 3: Clean up old repositories to free space
echo -e "${BLUE}Step 3: Cleaning up old repositories to free space...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} \;"
kubectl exec -n codequal-dev $POD -- bash -c "rm -rf /root/.adalflow/embeddings/*"
kubectl exec -n codequal-dev $POD -- bash -c "mkdir -p /root/.adalflow/repos /root/.adalflow/embeddings"

echo -e "${GREEN}Cleanup complete. Checking new disk space...${NC}"
kubectl exec -n codequal-dev $POD -- df -h /root/.adalflow

# Step 4: Create the updated OpenRouter configuration
echo -e "${BLUE}Step 4: Creating updated OpenRouter configuration...${NC}"

cat > openrouter_config.yaml << EOF
enabled: true
api_key: ${OPENROUTER_API_KEY}
api_base: https://openrouter.ai/api/v1
embedding_model: text-embedding-ada-002
embedding_dimension: 1536

# Define models with correct naming format
models:
  - name: deepseek/deepseek-coder
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
  - name: deepseek/deepseek-coder-v2
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
  - name: anthropic/claude-3-7-sonnet
    max_tokens: 16384
    supports_functions: true
    supports_vision: true
  - name: anthropic/claude-3-opus
    max_tokens: 32768
    supports_functions: true
    supports_vision: true
  - name: openai/gpt-4o
    max_tokens: 8192
    supports_functions: true
    supports_vision: true
EOF

# Step 5: Copy the configuration to the pod
echo -e "${BLUE}Step 5: Copying updated configuration to the pod...${NC}"
kubectl cp openrouter_config.yaml codequal-dev/$POD:/root/.adalflow/providers/openrouter.yaml
rm openrouter_config.yaml

# Step 6: Create a global embedding configuration
echo -e "${BLUE}Step 6: Creating global embedding configuration...${NC}"
cat > embedding_config.yaml << EOF
# Global embedding configuration
default_embedding_model: text-embedding-ada-002
embedding_dimension: 1536
normalize_embeddings: true

# Use the same embedding model across all operations
openrouter:
  embedding_model: text-embedding-ada-002
EOF

# Copy the embedding configuration to the pod
kubectl cp embedding_config.yaml codequal-dev/$POD:/root/.adalflow/config/embeddings.yaml
rm embedding_config.yaml

# Step 7: Reset the database
echo -e "${BLUE}Step 7: Resetting DeepWiki database to apply new configuration...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "rm -rf /root/.adalflow/data/* || true"
kubectl exec -n codequal-dev $POD -- bash -c "mkdir -p /root/.adalflow/data"
kubectl exec -n codequal-dev $POD -- bash -c "touch /root/.adalflow/data/.reset_marker"
echo -e "${GREEN}Database reset complete.${NC}"

# Step 8: Restart the pod
echo -e "${BLUE}Step 8: Restarting DeepWiki pod to apply changes...${NC}"
kubectl rollout restart deployment/deepwiki-fixed -n codequal-dev
echo -e "${YELLOW}Waiting for DeepWiki pod to restart...${NC}"
kubectl rollout status deployment/deepwiki-fixed -n codequal-dev --timeout=120s

# Get the new pod name
NEW_POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
echo -e "${GREEN}DeepWiki pod restarted: $NEW_POD${NC}"

# Step 9: Restart port forwarding
echo -e "${BLUE}Step 9: Restarting port forwarding...${NC}"
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

# Step 10: Test connection
echo -e "${BLUE}Step 10: Testing connection to DeepWiki API...${NC}"
if curl -s http://localhost:8001/ --connect-timeout 10 > /dev/null; then
  echo -e "${GREEN}✅ DeepWiki API is accessible${NC}"
else
  echo -e "${RED}❌ Cannot connect to DeepWiki API${NC}"
  echo -e "${YELLOW}Recommendation: Check DeepWiki pod logs for errors:${NC}"
  echo -e "${YELLOW}kubectl logs -n codequal-dev $NEW_POD${NC}"
  exit 1
fi

# Step 11: Create direct test script
echo -e "${BLUE}Step 11: Creating direct test script for OpenRouter...${NC}"

cat > test_openrouter_direct.js << EOF
/**
 * Direct test script for OpenRouter
 * Tests connections to different model formats to determine the correct one
 */

const axios = require('axios');

// Load API key from environment
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY environment variable is not set');
  process.exit(1);
}

// Models to test
const models = [
  'deepseek/deepseek-coder',
  'deepseek/deepseek-coder-v2',
  'deepseek-ai/deepseek-coder',
  'anthropic/claude-3-5-sonnet' // Known working model as a baseline
];

async function testModel(model) {
  console.log(\`Testing model: \${model}...\`);
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello and identify which AI model you are.' }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${OPENROUTER_API_KEY}\`,
          'HTTP-Referer': 'https://github.com/your-username/your-repo',
          'X-Title': 'Model Format Test'
        }
      }
    );
    
    console.log(\`✅ Success with model: \${model}\`);
    console.log(\`Response: \${response.data.choices[0].message.content.trim()}\`);
    console.log('---');
    return true;
  } catch (error) {
    console.error(\`❌ Error with model \${model}:\`);
    
    if (error.response) {
      console.error(\`Status: \${error.response.status}\`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(\`Error: \${error.message}\`);
    }
    
    console.log('---');
    return false;
  }
}

async function main() {
  console.log('OpenRouter Direct Model Format Test');
  console.log('==================================');
  
  const results = {};
  
  for (const model of models) {
    results[model] = await testModel(model);
  }
  
  console.log('\nTest Results Summary:');
  console.log('=====================');
  
  for (const [model, success] of Object.entries(results)) {
    console.log(\`\${success ? '✅' : '❌'} \${model}\`);
  }
  
  const workingModels = Object.entries(results)
    .filter(([_, success]) => success)
    .map(([model, _]) => model);
  
  if (workingModels.length > 0) {
    console.log(\`\nWorking model(s): \${workingModels.join(', ')}\`);
    console.log('Use these model names in your configuration.');
  } else {
    console.log('\nNo models were successful. Please check your API key and try again.');
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
EOF

chmod +x test_openrouter_direct.js
echo -e "${GREEN}Direct test script created: test_openrouter_direct.js${NC}"

# Final message
echo -e "${GREEN}====== DeepWiki OpenRouter Model Fix Complete ======${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${YELLOW}1. Run the direct test script to verify working model formats:${NC}"
echo -e "${YELLOW}   OPENROUTER_API_KEY='your-api-key' node test_openrouter_direct.js${NC}"
echo -e "${YELLOW}2. Run the DeepSeek Coder test script:${NC}"
echo -e "${YELLOW}   OPENROUTER_API_KEY='your-api-key' node test-deepseek-coder-fixed.js${NC}"
echo -e "${BLUE}If you encounter any issues, check the pod logs:${NC}"
echo -e "${YELLOW}kubectl logs -n codequal-dev $NEW_POD${NC}"