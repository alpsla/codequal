#!/bin/bash

# Repository Analysis Script
# Analyzes a GitHub repository using OpenAI GPT-4o API directly

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

echo -e "${BLUE}====== Repository Analysis ======${NC}"
echo -e "${BLUE}Repository: ${REPO_URL}${NC}"

# Run the analysis
echo -e "${BLUE}Starting analysis...${NC}"
node test-openai-direct.js "$REPO_URL"

echo -e "${GREEN}====== Analysis Complete ======${NC}"
echo -e "${YELLOW}Check the reports directory for the generated report${NC}"