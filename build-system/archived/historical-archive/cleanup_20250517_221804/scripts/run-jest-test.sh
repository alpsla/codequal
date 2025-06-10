#!/bin/bash
# Make this script executable with: chmod +x run-jest-test.sh

# Set up colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Specify the test file to run
TEST_FILE="$1"

if [ -z "$TEST_FILE" ]; then
  echo -e "${RED}Please specify a test file to run${RESET}"
  echo -e "Usage: $0 <test-file-path>"
  exit 1
fi

echo -e "${YELLOW}Running test: ${TEST_FILE}${RESET}"

# Run the jest test with verbose output
npx jest "$TEST_FILE" --verbose

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Test passed successfully!${RESET}"
else
  echo -e "${RED}Test failed. Please check the errors above.${RESET}"
fi
