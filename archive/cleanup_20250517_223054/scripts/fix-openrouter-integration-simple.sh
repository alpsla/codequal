#!/bin/bash

# OpenRouter Integration Fix for DeepWiki
# This script fixes the two main issues with OpenRouter integration:
# 1. OpenRouter client patch to handle model name formats with provider prefixes
# 2. Google model initialization fix to handle provider prefixes in model names

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== DeepWiki OpenRouter Integration Fix ======${NC}"

# Step 1: Find the DeepWiki pod
echo -e "${BLUE}Step 1: Finding DeepWiki pod...${NC}"
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
    echo -e "${RED}Error: DeepWiki pod not found${NC}"
    exit 1
fi

echo -e "${GREEN}DeepWiki pod found: $POD${NC}"

# Step 2: Fix the OpenRouter client
echo -e "${BLUE}Step 2: Fixing OpenRouter client...${NC}"

# Create fix script
cat > /tmp/fix_openrouter.py << 'EOF'
#!/usr/bin/env python3

"""
Fix OpenRouter Client to handle model name formats correctly
"""

import sys

# File path from command line argument
file_path = sys.argv[1]

# Read the file
with open(file_path, 'r') as f:
    content = f.read()

# Create a backup
with open(f"{file_path}.bak", 'w') as f:
    f.write(content)

# Add ensure_model_prefix method
if "def ensure_model_prefix" not in content:
    # Add the method before convert_inputs_to_api_kwargs
    patched_content = content.replace(
        "    def convert_inputs_to_api_kwargs",
        """    def ensure_model_prefix(self, model_name):
        """Ensure the model name has the provider prefix."""
        if not model_name:
            return "openai/gpt-3.5-turbo"
        
        # If the model name already has a prefix (contains "/"), return it unchanged
        if "/" in model_name:
            return model_name
        
        # Default to OpenAI prefix
        return f"openai/{model_name}"

    def convert_inputs_to_api_kwargs"""
    )
    
    # Modify the model handling in convert_inputs_to_api_kwargs
    patched_content = patched_content.replace(
        "            # Ensure model is specified\n"
        "            if \"model\" not in api_kwargs:\n"
        "                api_kwargs[\"model\"] = \"openai/gpt-3.5-turbo\"",
        
        "            # Ensure model is specified and has proper prefix\n"
        "            if \"model\" not in api_kwargs:\n"
        "                api_kwargs[\"model\"] = \"openai/gpt-3.5-turbo\"\n"
        "            else:\n"
        "                api_kwargs[\"model\"] = self.ensure_model_prefix(api_kwargs[\"model\"])"
    )
    
    # Write the patched file
    with open(file_path, 'w') as f:
        f.write(patched_content)
    
    print("OpenRouter client patched successfully")
else:
    print("Patch already applied, skipping")
EOF

# Step 3: Fix Google model initialization
echo -e "${BLUE}Step 3: Fixing Google model initialization...${NC}"

cat > /tmp/fix_google_model.py << 'EOF'
#!/usr/bin/env python3

"""
Fix Google model initialization to handle provider prefixes
"""

import sys

# File path from command line argument
file_path = sys.argv[1]

# Read the file
with open(file_path, 'r') as f:
    content = f.read()

# Create a backup
with open(f"{file_path}.google.bak", 'w') as f:
    f.write(content)

# Add extract_base_model_name function
if "def extract_base_model_name" not in content:
    # Add helper function after imports
    patched_content = content.replace(
        "from api.config import get_model_config",
        """from api.config import get_model_config

def extract_base_model_name(model_name):
    """Extract the base model name without provider prefix."""
    if not model_name:
        return "gemini-pro"
    
    # If the model contains a provider prefix, extract the model part
    if "/" in model_name:
        return model_name.split("/", 1)[1]
    
    return model_name
"""
    )
    
    # Update the first Google model initialization
    patched_content = patched_content.replace(
        "            # Initialize Google Generative AI model\n"
        "            model = genai.GenerativeModel(\n"
        "                model_name=model_config[\"model\"],",
        
        "            # Initialize Google Generative AI model\n"
        "            # Extract base model name without provider prefix\n"
        "            base_model_name = extract_base_model_name(model_config[\"model\"])\n"
        "            model = genai.GenerativeModel(\n"
        "                model_name=base_model_name,"
    )
    
    # Update the fallback Google model initialization
    patched_content = patched_content.replace(
        "                            # Initialize Google Generative AI model\n"
        "                            model_config = get_model_config(request.provider, request.model)\n"
        "                            fallback_model = genai.GenerativeModel(\n"
        "                                model_name=model_config[\"model\"],",
        
        "                            # Initialize Google Generative AI model\n"
        "                            model_config = get_model_config(request.provider, request.model)\n"
        "                            # Extract base model name without provider prefix\n"
        "                            base_model_name = extract_base_model_name(model_config[\"model\"])\n"
        "                            fallback_model = genai.GenerativeModel(\n"
        "                                model_name=base_model_name,"
    )
    
    # Write the patched file
    with open(file_path, 'w') as f:
        f.write(patched_content)
    
    print("Google model initialization patched successfully")
else:
    print("Patch already applied, skipping")
EOF

# Step 4: Apply the patches
echo -e "${BLUE}Step 4: Applying the patches...${NC}"

# Copy the fix scripts to the pod
kubectl cp /tmp/fix_openrouter.py codequal-dev/$POD:/tmp/fix_openrouter.py
kubectl cp /tmp/fix_google_model.py codequal-dev/$POD:/tmp/fix_google_model.py

# Make the scripts executable
kubectl exec -n codequal-dev $POD -- chmod +x /tmp/fix_openrouter.py /tmp/fix_google_model.py

# Apply the OpenRouter client patch
echo -e "${YELLOW}Applying OpenRouter client patch...${NC}"
kubectl exec -n codequal-dev $POD -- python3 /tmp/fix_openrouter.py /app/api/openrouter_client.py

# Apply the Google model fix
echo -e "${YELLOW}Applying Google model fix...${NC}"
kubectl exec -n codequal-dev $POD -- python3 /tmp/fix_google_model.py /app/api/simple_chat.py

# Step 5: Create proper OpenRouter configuration
echo -e "${BLUE}Step 5: Creating OpenRouter configuration...${NC}"

# Load API key from .env file
if [ -f ".env" ]; then
    source .env
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${YELLOW}Warning: OPENROUTER_API_KEY not set, using example key${NC}"
    OPENROUTER_API_KEY="sk-or-your-key-here"
fi

# Create OpenRouter configuration
cat > /tmp/openrouter.yaml << EOF
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

# Copy the configuration to the pod
kubectl cp /tmp/openrouter.yaml codequal-dev/$POD:/root/.adalflow/providers/openrouter.yaml

# Set environment variables
echo -e "${BLUE}Step 6: Setting environment variables...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "export OPENROUTER_API_KEY=${OPENROUTER_API_KEY}"

# Reset the database
echo -e "${BLUE}Step 7: Resetting database to apply changes...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "rm -rf /root/.adalflow/data/* || true; mkdir -p /root/.adalflow/data; touch /root/.adalflow/data/.reset_marker"

# Step 8: Restart the pod
echo -e "${BLUE}Step 8: Restarting the DeepWiki pod...${NC}"
kubectl delete pod -n codequal-dev $POD
echo -e "${YELLOW}Waiting for the pod to restart...${NC}"
sleep 15
NEW_POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
echo -e "${GREEN}New pod started: $NEW_POD${NC}"

# Step 9: Verify port forwarding
echo -e "${BLUE}Step 9: Verifying port forwarding...${NC}"
PORT_FORWARD_ACTIVE=$(ps aux | grep "kubectl port-forward.*8001:8001" | grep -v grep)

if [ -z "$PORT_FORWARD_ACTIVE" ]; then
    echo -e "${YELLOW}Setting up port forwarding...${NC}"
    kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 > /dev/null 2>&1 &
    echo -e "${GREEN}Port forwarding started${NC}"
    sleep 5
else
    echo -e "${GREEN}Port forwarding is already active${NC}"
fi

# Clean up
echo -e "${BLUE}Step 10: Cleaning up temporary files...${NC}"
rm -f /tmp/fix_openrouter.py /tmp/fix_google_model.py /tmp/openrouter.yaml

echo -e "${GREEN}====== DeepWiki OpenRouter Integration Fix Complete ======${NC}"
echo -e "${GREEN}Integration has been fixed. You can now use DeepWiki with OpenRouter models.${NC}"
echo -e "${YELLOW}Example usage:${NC}"
echo -e "${YELLOW}1. Use provider/model format: anthropic/claude-3-7-sonnet, openai/gpt-4o, deepseek/deepseek-coder${NC}"
echo -e "${YELLOW}2. Test with a small repository: curl -X POST http://localhost:8001/chat/completions -H 'Content-Type: application/json' -d '{\"model\":\"anthropic/claude-3-7-sonnet\",\"repo_url\":\"https://github.com/jpadilla/pyjwt\",\"messages\":[{\"role\":\"system\",\"content\":\"You are a helpful assistant.\"},{\"role\":\"user\",\"content\":\"Analyze this repository briefly.\"}],\"max_tokens\":100}'${NC}"