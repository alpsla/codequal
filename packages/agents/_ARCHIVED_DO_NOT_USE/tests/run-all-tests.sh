#!/bin/bash
# Make this script executable with: chmod +x run-all-tests.sh

# Set up colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

echo -e "${BLUE}===================================${RESET}"
echo -e "${BLUE}     RUNNING ALL AGENT TESTS       ${RESET}"
echo -e "${BLUE}===================================${RESET}"

# Build the packages
echo -e "${YELLOW}Building packages...${RESET}"
cd ../../
npm run build
cd packages/agents

# Run the ESLint check
echo -e "${YELLOW}Running ESLint check...${RESET}"
./tests/lint-check.sh

# Run Jest tests with proper config
echo -e "${YELLOW}Running Jest tests...${RESET}"
npx jest --config=jest.config.js

if [ $? -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${RESET}"
else
  echo -e "${RED}Some tests failed!${RESET}"
  exit 1
fi

echo -e "${YELLOW}Checking for available integration tests...${RESET}"

# Check for API keys for integration tests
INTEGRATION_TESTS=false

if [ -n "$ANTHROPIC_API_KEY" ] && [ -n "$OPENAI_API_KEY" ]; then
  echo -e "${GREEN}Claude and OpenAI API keys found. Can run integration tests.${RESET}"
  INTEGRATION_TESTS=true
fi

if [ -n "$DEEPSEEK_API_KEY" ] && [ -n "$GEMINI_API_KEY" ]; then
  echo -e "${GREEN}DeepSeek and Gemini API keys found. Can run integration tests.${RESET}"
  INTEGRATION_TESTS=true
fi

if [ "$INTEGRATION_TESTS" = true ]; then
  echo -e "${YELLOW}Running integration tests...${RESET}"
  
  if [ -n "$ANTHROPIC_API_KEY" ] && [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${BLUE}Running Claude and OpenAI integration tests...${RESET}"
    npx ts-node tests/manual-integration-test.ts
  fi
  
  if [ -n "$DEEPSEEK_API_KEY" ] && [ -n "$GEMINI_API_KEY" ]; then
    echo -e "${BLUE}Running DeepSeek and Gemini integration tests...${RESET}"
    ./tests/run-deepseek-gemini-tests.sh
  fi
  
  echo -e "${GREEN}Integration tests completed!${RESET}"
else
  echo -e "${YELLOW}No API keys found for integration tests. Skipping.${RESET}"
  echo -e "${YELLOW}Set ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, and GEMINI_API_KEY to run integration tests.${RESET}"
fi

echo -e "${BLUE}===================================${RESET}"
echo -e "${GREEN}     ALL TESTS COMPLETED          ${RESET}"
echo -e "${BLUE}===================================${RESET}"
