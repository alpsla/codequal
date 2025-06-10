#!/bin/bash

# DeepWiki OpenRouter Integration Script
# This script configures DeepWiki to use OpenRouter as a unified provider gateway
# Allowing dynamic model selection through the orchestrator

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== DeepWiki OpenRouter Configuration ======${NC}"

# Check if OPENROUTER_API_KEY is set
if [ -z "${OPENROUTER_API_KEY}" ]; then
  echo -e "${RED}Error: OPENROUTER_API_KEY environment variable is not set${NC}"
  echo -e "${YELLOW}Please set it with: export OPENROUTER_API_KEY='your-api-key'${NC}"
  exit 1
fi

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

# Step 2: Set up provider directory and embedding settings
echo -e "${BLUE}Step 2: Setting up provider directory and configuring embeddings...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "mkdir -p /root/.adalflow/providers /root/.adalflow/config"

# Create global embedding configuration for consistent dimensions
echo -e "${BLUE}Creating global embedding configuration...${NC}"
cat > embedding_config.yaml << EOF
# Global embedding configuration for OpenRouter integration
default_embedding_model: openai/text-embedding-3-small
embedding_dimension: 1536
normalize_embeddings: true

# Use the same embedding model across all operations
openrouter:
  embedding_model: openai/text-embedding-3-small
EOF

# Copy the embedding configuration to the pod
kubectl cp embedding_config.yaml codequal-dev/$POD:/root/.adalflow/config/embeddings.yaml
rm embedding_config.yaml

# Step 3: Create OpenRouter provider configuration
echo -e "${BLUE}Step 3: Creating OpenRouter provider configuration...${NC}"

cat > openrouter_config.yaml << EOF
enabled: true
api_key: ${OPENROUTER_API_KEY}
api_base: https://openrouter.ai/api/v1
embedding_model: openai/text-embedding-3-small
embedding_dimension: 1536

# Define all models that will be used via the orchestrator
# The orchestrator will specify models using the format: "provider/model-name"
models:
  - name: anthropic/claude-3-5-sonnet
    max_tokens: 16384
    supports_functions: true
    supports_vision: true
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
  - name: google/gemini-2.5-pro-preview-05-06
    max_tokens: 8192
    supports_functions: true
    supports_vision: true
  - name: deepseek/deepseek-coder
    max_tokens: 8192
    supports_functions: false
    supports_vision: false
EOF

# Copy OpenRouter configuration to the pod, making it the only enabled provider
echo -e "${BLUE}Copying OpenRouter configuration to the pod...${NC}"
kubectl cp openrouter_config.yaml codequal-dev/$POD:/root/.adalflow/providers/openrouter.yaml
rm openrouter_config.yaml

# Disable other provider configurations if they exist by renaming them
echo -e "${BLUE}Disabling other provider configurations...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "for f in /root/.adalflow/providers/*.yaml; do if [ \$(basename \$f) != 'openrouter.yaml' ]; then mv \$f \$f.disabled 2>/dev/null || true; fi; done"

# Step 4: Verify provider configuration
echo -e "${BLUE}Step 4: Verifying OpenRouter configuration...${NC}"
kubectl exec -n codequal-dev $POD -- ls -la /root/.adalflow/providers/
kubectl exec -n codequal-dev $POD -- ls -la /root/.adalflow/config/

# Step 5: Create and run database reset script to apply changes
echo -e "${BLUE}Step 5: Resetting DeepWiki database to apply new configuration...${NC}"
cat > reset_db.sh << EOF
#!/bin/bash
echo "Resetting DeepWiki database to apply OpenRouter configuration..."
rm -rf /root/.adalflow/data/* || true
rm -rf /root/.adalflow/embeddings/* || true
mkdir -p /root/.adalflow/data /root/.adalflow/embeddings
touch /root/.adalflow/data/.reset_marker
echo "Database reset complete. DeepWiki will reinitialize with OpenRouter configuration on next request."
EOF

kubectl cp reset_db.sh codequal-dev/$POD:/root/reset_db.sh
kubectl exec -n codequal-dev $POD -- chmod +x /root/reset_db.sh
kubectl exec -n codequal-dev $POD -- /root/reset_db.sh
rm reset_db.sh

# Step 6: Restart the DeepWiki pod to apply changes
echo -e "${BLUE}Step 6: Restarting DeepWiki pod to apply configuration...${NC}"
kubectl rollout restart deployment/deepwiki-fixed -n codequal-dev
echo -e "${YELLOW}Waiting for DeepWiki pod to restart...${NC}"
kubectl rollout status deployment/deepwiki-fixed -n codequal-dev --timeout=120s

# Get the new pod name
NEW_POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
echo -e "${GREEN}DeepWiki pod restarted: $NEW_POD${NC}"

# Step 7: Set up port forwarding
echo -e "${BLUE}Step 7: Setting up port forwarding...${NC}"
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
echo -e "${BLUE}Step 8: Waiting for DeepWiki to initialize...${NC}"
echo -e "${YELLOW}This may take a minute...${NC}"
sleep 30

# Step 9: Test connection to DeepWiki API
echo -e "${BLUE}Step 9: Testing connection to DeepWiki API...${NC}"
if curl -s http://localhost:8001/ --connect-timeout 10 > /dev/null; then
  echo -e "${GREEN}✅ DeepWiki API is accessible${NC}"
else
  echo -e "${RED}❌ Cannot connect to DeepWiki API${NC}"
  echo -e "${YELLOW}Recommendation: Check DeepWiki pod logs for errors:${NC}"
  echo -e "${YELLOW}kubectl logs -n codequal-dev $NEW_POD${NC}"
  exit 1
fi

# Step 10: Create a test script to validate OpenRouter configuration
echo -e "${BLUE}Step 10: Creating a test script to validate OpenRouter integration...${NC}"
cat > test_openrouter.js << EOF
/**
 * DeepWiki OpenRouter Integration Test
 * 
 * This script tests the OpenRouter configuration in DeepWiki
 * by making a simple API call with a specified model.
 */

const axios = require('axios');

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
const TEST_MODEL = 'anthropic/claude-3-5-sonnet'; // Change this to test different models

async function testOpenRouterIntegration() {
  console.log('Testing DeepWiki OpenRouter Integration');
  console.log('=======================================');
  console.log(\`Using DeepWiki API at: \${DEEPWIKI_URL}\`);
  console.log(\`Testing with model: \${TEST_MODEL}\`);

  try {
    // Test basic API connectivity
    const apiInfoResponse = await axios.get(DEEPWIKI_URL);
    console.log('✅ DeepWiki API is accessible');
    
    // Test OpenRouter integration with a simple chat completion request
    const completionResponse = await axios.post(\`\${DEEPWIKI_URL}/chat/completions\`, {
      model: TEST_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello and confirm which model you are using.' }
      ],
      max_tokens: 100
    });

    console.log('✅ Successfully received response from DeepWiki via OpenRouter');
    console.log('Response:');
    console.log(\`Status: \${completionResponse.status}\`);
    
    if (completionResponse.data && completionResponse.data.choices && 
        completionResponse.data.choices[0] && completionResponse.data.choices[0].message) {
      console.log('Message: ' + completionResponse.data.choices[0].message.content);
    } else {
      console.log('Response structure: ', JSON.stringify(completionResponse.data, null, 2));
    }
    
    console.log('✅ OpenRouter integration test completed successfully');
    
  } catch (error) {
    console.error('❌ Error while testing OpenRouter integration:');
    if (error.response) {
      console.error(\`Status: \${error.response.status}\`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    
    console.log('Recommendation: Check if the OPENROUTER_API_KEY is valid and has access to the requested model');
    console.log('Also verify the DeepWiki pod logs for more information:');
    console.log(\`kubectl logs -n codequal-dev \${process.env.NEW_POD || 'the-deepwiki-pod'}\`);
  }
}

// Run the test
testOpenRouterIntegration();
EOF

echo -e "${BLUE}Running OpenRouter integration test...${NC}"
node test_openrouter.js

# Cleanup
rm test_openrouter.js

# Final message
echo -e "${GREEN}====== DeepWiki OpenRouter Configuration Complete ======${NC}"
echo -e "${GREEN}DeepWiki is now configured to use OpenRouter as the unified provider gateway${NC}"
echo -e "${GREEN}The orchestrator can now specify models using the format: 'provider/model-name'${NC}"
echo -e "${GREEN}Example models: anthropic/claude-3-5-sonnet, openai/gpt-4o, google/gemini-2.5-pro-preview-05-06${NC}"

echo -e "${BLUE}Usage instructions:${NC}"
echo -e "${YELLOW}1. The DeepWiki API is accessible at: http://localhost:8001${NC}"
echo -e "${YELLOW}2. To make requests, specify the model in the format 'provider/model-name'${NC}"
echo -e "${YELLOW}3. Example API call:${NC}"
echo -e "${YELLOW}   curl -X POST http://localhost:8001/chat/completions \\${NC}"
echo -e "${YELLOW}     -H 'Content-Type: application/json' \\${NC}"
echo -e "${YELLOW}     -d '{\"model\":\"anthropic/claude-3-5-sonnet\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'${NC}"

echo -e "${BLUE}If you encounter any issues, check the pod logs:${NC}"
echo -e "${YELLOW}kubectl logs -n codequal-dev $NEW_POD${NC}"