#!/bin/bash
# Make this script executable with: chmod +x lint-check.sh

# Set up colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

echo -e "${BLUE}===================================${RESET}"
echo -e "${BLUE}     RUNNING ESLINT CHECK         ${RESET}"
echo -e "${BLUE}===================================${RESET}"

# Run ESLint in fix mode
echo -e "${YELLOW}Running ESLint on src directory...${RESET}"
npx eslint --fix ./src

if [ $? -eq 0 ]; then
  echo -e "${GREEN}No ESLint errors found in source files!${RESET}"
else
  echo -e "${RED}ESLint errors found in source files!${RESET}"
fi

echo -e "${YELLOW}Running ESLint on test files...${RESET}"
npx eslint --fix ./tests

if [ $? -eq 0 ]; then
  echo -e "${GREEN}No ESLint errors found in test files!${RESET}"
else
  echo -e "${RED}ESLint errors found in test files!${RESET}"
fi

echo -e "${BLUE}===================================${RESET}"
echo -e "${GREEN}     ESLINT CHECK COMPLETED      ${RESET}"
echo -e "${BLUE}===================================${RESET}"
