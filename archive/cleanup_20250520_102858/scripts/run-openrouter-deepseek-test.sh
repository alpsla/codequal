#!/bin/bash

# Run OpenRouter DeepSeek Coder Test
# This script sets up the OpenRouter configuration in DeepWiki and runs the DeepSeek Coder test

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if .env file exists, and if not, copy the example
if [ ! -f "${SCRIPT_DIR}/.env" ]; then
  if [ -f "${SCRIPT_DIR}/.env.example" ]; then
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"
    cp "${SCRIPT_DIR}/.env.example" "${SCRIPT_DIR}/.env"
    echo -e "${YELLOW}Please edit ${SCRIPT_DIR}/.env and add your OpenRouter API key${NC}"
    exit 1
  else
    echo -e "${RED}No .env file or template found. Please create a .env file with your OpenRouter API key.${NC}"
    echo "OPENROUTER_API_KEY=your-api-key-here"
    exit 1
  fi
fi

# Source the .env file to load environment variables
source "${SCRIPT_DIR}/.env"

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo -e "${RED}Error: OPENROUTER_API_KEY is not set in .env file${NC}"
  echo -e "${YELLOW}Please edit ${SCRIPT_DIR}/.env and add your OpenRouter API key${NC}"
  exit 1
fi

echo -e "${BLUE}====== Running OpenRouter DeepSeek Coder Test ======${NC}"

# Step 1: Configure OpenRouter in DeepWiki
echo -e "${BLUE}Step 1: Configuring OpenRouter in DeepWiki...${NC}"
"${SCRIPT_DIR}/fix-openrouter-model-names.sh"

# Step 2: Run the DeepSeek Coder test
echo -e "${BLUE}Step 2: Running DeepSeek Coder test...${NC}"
OPENROUTER_API_KEY="$OPENROUTER_API_KEY" node "${SCRIPT_DIR}/test-deepseek-coder-fixed.js"

echo -e "${GREEN}====== Test Completed ======${NC}"
echo -e "${YELLOW}Check the reports directory for test results: ${SCRIPT_DIR}/reports/${NC}"