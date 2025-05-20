#!/bin/bash

# Repository Analysis Script using DeepWiki with OpenAI GPT-4o
# This script analyzes a GitHub repository using DeepWiki with OpenAI's GPT-4o

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default repository
DEFAULT_REPO="https://github.com/jpadilla/pyjwt"

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    if [ -f ".env" ]; then
        source .env
    fi

    if [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${RED}Error: OPENAI_API_KEY environment variable is not set${NC}"
        echo -e "${YELLOW}Set it with: export OPENAI_API_KEY=your-api-key${NC}"
        echo -e "${YELLOW}Or add it to a .env file in this directory${NC}"
        exit 1
    fi
fi

# Get the repository URL from command line or use default
REPO_URL=${1:-$DEFAULT_REPO}

echo -e "${BLUE}====== DeepWiki Repository Analysis with OpenAI GPT-4o ======${NC}"
echo -e "${BLUE}Repository: ${REPO_URL}${NC}"

# Make sure the OpenAI API key is set in the pod
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
if [ -z "$POD" ]; then
    echo -e "${RED}Error: DeepWiki pod not found${NC}"
    exit 1
fi

echo -e "${BLUE}Setting OpenAI API key in DeepWiki pod...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "echo 'export OPENAI_API_KEY=$OPENAI_API_KEY' >> /root/.bashrc && source /root/.bashrc"

# Run the analysis
echo -e "${BLUE}Starting analysis with DeepWiki + OpenAI GPT-4o...${NC}"
OPENAI_API_KEY=$OPENAI_API_KEY node test-deepwiki-openai-fixed.js "$REPO_URL"

echo -e "${GREEN}====== Analysis Complete ======${NC}"
echo -e "${YELLOW}Check the reports directory for the generated report${NC}"