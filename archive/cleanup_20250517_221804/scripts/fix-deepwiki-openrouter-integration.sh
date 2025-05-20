#!/bin/bash

# DeepWiki OpenRouter Integration Fix
# This script implements the fixes recommended in the research document
# to properly integrate DeepWiki with OpenRouter in Kubernetes

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== DeepWiki OpenRouter Integration Fix ======${NC}"

# Check if OpenRouter API key is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    if [ -f ".env" ]; then
        source .env
    fi

    if [ -z "$OPENROUTER_API_KEY" ]; then
        echo -e "${RED}Error: OPENROUTER_API_KEY environment variable is not set${NC}"
        echo -e "${YELLOW}Set it with: export OPENROUTER_API_KEY=your-api-key${NC}"
        echo -e "${YELLOW}Or add it to a .env file in this directory${NC}"
        exit 1
    fi
fi

# Step 1: Find the DeepWiki pod
echo -e "${BLUE}Step 1: Finding DeepWiki pod...${NC}"
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
    echo -e "${RED}Error: DeepWiki pod not found${NC}"
    exit 1
fi

echo -e "${GREEN}DeepWiki pod found: $POD${NC}"

# Step 2: Create directories for configuration if they don't exist
echo -e "${BLUE}Step 2: Creating configuration directories...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "mkdir -p /app/config /root/.adalflow/config /root/.adalflow/providers"

# Step 3: Create openrouter.yaml configuration
echo -e "${BLUE}Step 3: Creating OpenRouter configuration...${NC}"
cat > openrouter.yaml << EOF
enabled: true
api_key: ${OPENROUTER_API_KEY}
api_base: https://openrouter.ai/api/v1
embedding_model: text-embedding-ada-002
embedding_dimension: 1536

# Define models with correct naming format
models:
  - name: openai/gpt-4o
    max_tokens: 8192
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
  - name: deepseek/deepseek-coder
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
EOF

# Step 4: Create generator.json configuration
echo -e "${BLUE}Step 4: Creating generator configuration...${NC}"
cat > generator.json << EOF
{
  "providers": {
    "openrouter": {
      "default_model": "openai/gpt-4o",
      "available_models": [
        "openai/gpt-4o",
        "anthropic/claude-3-7-sonnet",
        "anthropic/claude-3-opus",
        "deepseek/deepseek-coder"
      ],
      "parameters": {
        "temperature": 0.7,
        "top_p": 1.0
      }
    },
    "openai": {
      "default_model": "gpt-4o",
      "available_models": ["gpt-4o", "gpt-4o-mini"]
    }
  },
  "default_provider": "openrouter"
}
EOF

# Step 5: Create embeddings.yaml configuration
echo -e "${BLUE}Step 5: Creating embeddings configuration...${NC}"
cat > embeddings.yaml << EOF
# Global embedding configuration
default_embedding_model: text-embedding-ada-002
embedding_dimension: 1536
normalize_embeddings: true

# Use the same embedding model across all operations
openrouter:
  embedding_model: text-embedding-ada-002
EOF

# Step 6: Copy configurations to the pod
echo -e "${BLUE}Step 6: Copying configurations to the pod...${NC}"
kubectl cp openrouter.yaml codequal-dev/$POD:/root/.adalflow/providers/openrouter.yaml
kubectl cp generator.json codequal-dev/$POD:/app/config/generator.json
kubectl cp embeddings.yaml codequal-dev/$POD:/root/.adalflow/config/embeddings.yaml

# Step 7: Create the OpenRouterProvider patch
echo -e "${BLUE}Step 7: Creating OpenRouterProvider patch...${NC}"
cat > openrouter_provider_patch.js << EOF
/**
 * Patch for DeepWiki's OpenRouter integration
 * This patch ensures that models are properly prefixed for OpenRouter
 */

// Find and patch the formatRequest method in OpenRouterClient
const fs = require('fs');
const path = require('path');

// Path to the OpenRouter client file
const openRouterClientPath = '/app/api/openrouter_client.py';

// Check if the file exists
if (!fs.existsSync(openRouterClientPath)) {
  console.error('OpenRouter client file not found:', openRouterClientPath);
  process.exit(1);
}

// Read the file
const content = fs.readFileSync(openRouterClientPath, 'utf8');

// Create a backup
fs.writeFileSync(openRouterClientPath + '.bak', content);

// Create the patched version
const patchedContent = content.replace(
  'convert_inputs_to_api_kwargs(',
  'ensure_model_prefix(self, model_name):\n' +
  '        """Ensure the model name has the provider prefix."""\n' +
  '        if not model_name:\n' +
  '            return "openai/gpt-3.5-turbo"\n' +
  '        \n' +
  '        # If the model name already has a prefix (contains "/"), return it unchanged\n' +
  '        if "/" in model_name:\n' +
  '            return model_name\n' +
  '        \n' +
  '        # Default to OpenAI prefix\n' +
  '        return f"openai/{model_name}"\n' +
  '    \n' +
  '    def convert_inputs_to_api_kwargs('
);

// Apply the model patch
const finalContent = patchedContent.replace(
  '            # Ensure model is specified\n' +
  '            if "model" not in api_kwargs:\n' +
  '                api_kwargs["model"] = "openai/gpt-3.5-turbo"',
  '            # Ensure model is specified and has proper prefix\n' +
  '            if "model" not in api_kwargs:\n' +
  '                api_kwargs["model"] = "openai/gpt-3.5-turbo"\n' +
  '            else:\n' +
  '                api_kwargs["model"] = self.ensure_model_prefix(api_kwargs["model"])'
);

// Write the patched file
fs.writeFileSync('/tmp/openrouter_client.py', finalContent);
EOF

# Step 8: Copy and apply the patch
echo -e "${BLUE}Step 8: Applying the OpenRouterProvider patch...${NC}"
kubectl cp /tmp/openrouter_client.py codequal-dev/$POD:/app/api/openrouter_client.py

# Step 9: Set environment variables properly
echo -e "${BLUE}Step 9: Setting environment variables...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "echo 'export OPENROUTER_API_KEY=${OPENROUTER_API_KEY}' >> /root/.bashrc"
kubectl exec -n codequal-dev $POD -- bash -c "echo 'export OPENROUTER_API_KEY=${OPENROUTER_API_KEY}' >> /etc/environment"

# Add it directly to the current environment
kubectl exec -n codequal-dev $POD -- bash -c "export OPENROUTER_API_KEY=${OPENROUTER_API_KEY}"

# Step 10: Reset the database to apply new configuration
echo -e "${BLUE}Step 10: Resetting database to apply new configuration...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "rm -rf /root/.adalflow/data/* || true"
kubectl exec -n codequal-dev $POD -- bash -c "mkdir -p /root/.adalflow/data"
kubectl exec -n codequal-dev $POD -- bash -c "touch /root/.adalflow/data/.reset_marker"

# Step 11: Restart the DeepWiki service
echo -e "${BLUE}Step 11: Restarting DeepWiki service...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "if command -v pm2 &> /dev/null; then pm2 restart all; fi"

# Step 12: Clean up temporary files
echo -e "${BLUE}Step 12: Cleaning up temporary files...${NC}"
rm -f openrouter.yaml generator.json embeddings.yaml openrouter_provider_patch.js

echo -e "${GREEN}====== DeepWiki OpenRouter Integration Fix Complete ======${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${YELLOW}1. Test the integration with: node test-openrouter-direct.js${NC}"
echo -e "${YELLOW}2. If you encounter any issues, check the pod logs:${NC}"
echo -e "${YELLOW}   kubectl logs -n codequal-dev $POD${NC}"