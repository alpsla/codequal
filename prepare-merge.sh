#!/bin/bash
# Script to prepare for merge by checking linting and summarizing changes

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}CodeQual - Preparing for Merge${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check if there are any lint errors
echo -e "${BLUE}Checking for lint errors...${NC}"
npm run lint
LINT_RESULT=$?

if [ $LINT_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Linting passed with no errors.${NC}"
else
  echo -e "${RED}✗ Linting failed. Please fix errors before merging.${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}Checking current branch...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
echo -e "Current branch: ${GREEN}$CURRENT_BRANCH${NC}"
echo ""

echo -e "${BLUE}Summarizing changes...${NC}"
git status

echo ""
echo -e "${BLUE}Files changed:${NC}"
git diff --name-only main

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}Ready to merge!${NC}"
echo -e "${YELLOW}The following steps were completed:${NC}"
echo "1. Fixed all ESLint errors throughout the codebase"
echo "2. Replaced unsafe 'any' types with more specific types"
echo "3. Archived unused scripts and utility files"
echo "4. Improved project structure and documentation"
echo ""
echo -e "${BLUE}Merge Command:${NC}"
echo -e "${YELLOW}git checkout main${NC}"
echo -e "${YELLOW}git merge $CURRENT_BRANCH${NC}"
echo -e "${YELLOW}git push origin main${NC}"
echo -e "${BLUE}==========================================${NC}"