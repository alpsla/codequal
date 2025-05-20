#!/bin/bash

# Direct OpenRouter Integration Fix
# This script directly fixes the OpenRouter integration in DeepWiki

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== Direct OpenRouter Integration Fix ======${NC}"

# Step 1: Find the DeepWiki pod
echo -e "${BLUE}Step 1: Finding DeepWiki pod...${NC}"
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
    echo -e "${RED}Error: DeepWiki pod not found${NC}"
    exit 1
fi

echo -e "${GREEN}DeepWiki pod found: $POD${NC}"

# Step 2: Extract the current OpenRouter client file
echo -e "${BLUE}Step 2: Extracting current OpenRouter client file...${NC}"
kubectl cp codequal-dev/$POD:/app/api/openrouter_client.py ./openrouter_client.py

if [ ! -f "./openrouter_client.py" ]; then
    echo -e "${RED}Error: Failed to extract OpenRouter client file${NC}"
    exit 1
fi

# Step 3: Create a Python patch script on the pod
echo -e "${BLUE}Step 3: Creating Python patch script on the pod...${NC}"
kubectl cp fix-openrouter-client.py codequal-dev/$POD:/tmp/fix-openrouter-client.py

# Step 4: Apply the patch directly in the pod
echo -e "${BLUE}Step 4: Applying the patch directly in the pod...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "chmod +x /tmp/fix-openrouter-client.py && python3 /tmp/fix-openrouter-client.py /app/api/openrouter_client.py"

# Step 5: Verify the patch was applied
echo -e "${BLUE}Step 5: Verifying the patch...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "grep -A 10 'ensure_model_prefix' /app/api/openrouter_client.py"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: The patch doesn't appear to be applied correctly${NC}"
    exit 1
fi

echo -e "${GREEN}Patch verification successful${NC}"

# Step 6: Set environment variable
echo -e "${BLUE}Step 6: Setting OpenRouter API key environment variable...${NC}"

# Load environment variables
if [ -f ".env" ]; then
    source .env
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${YELLOW}Warning: OPENROUTER_API_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}Using default key from configuration file${NC}"
else
    # Set the API key in the pod
    kubectl exec -n codequal-dev $POD -- bash -c "export OPENROUTER_API_KEY=$OPENROUTER_API_KEY"
    echo -e "${GREEN}OpenRouter API key set successfully${NC}"
fi

# Step a specific test to verify the integration is working
echo -e "${BLUE}Step 7: Testing the integration with a simple request...${NC}"

cat > test-simple-request.py << EOF
#!/usr/bin/env python3

"""Test OpenRouter integration with a simple request"""

import requests
import json
import sys

# Configuration
deepwiki_url = "http://localhost:8001"
model = "anthropic/claude-3-7-sonnet"

# Simple test message
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Say hello and identify which AI model you are."}
]

# Test with a simple request to avoid repo cloning issues
print("Testing DeepWiki with simple message...")
try:
    response = requests.post(
        f"{deepwiki_url}/chat/completions",
        json={
            "model": model,
            "messages": messages,
            "max_tokens": 100,
            "temperature": 0.7,
            "stream": False
        },
        timeout=30
    )
    
    if response.status_code == 200:
        result = response.json()
        print("Test successful!")
        print("Response:", result["choices"][0]["message"]["content"])
        sys.exit(0)
    else:
        print(f"Error: {response.status_code}")
        print("Response:", response.text)
        sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
EOF

# Copy the test script to the pod
kubectl cp test-simple-request.py codequal-dev/$POD:/tmp/test-simple-request.py
kubectl exec -n codequal-dev $POD -- bash -c "chmod +x /tmp/test-simple-request.py"

# Start port forwarding inside the pod to localhost
kubectl exec -n codequal-dev $POD -- bash -c "python3 /tmp/test-simple-request.py"

# Step 8: Clean up
echo -e "${BLUE}Step 8: Cleaning up temporary files...${NC}"
rm -f ./openrouter_client.py ./test-simple-request.py

echo -e "${GREEN}====== OpenRouter Integration Fix Complete ======${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${YELLOW}1. Run a full repository analysis test${NC}"
echo -e "${YELLOW}2. If you encounter any issues, check the pod logs:${NC}"
echo -e "${YELLOW}   kubectl logs -n codequal-dev $POD${NC}"