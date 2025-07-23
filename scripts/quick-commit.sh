#!/bin/bash

# Quick commit helper for CodeQual
# Usage: ./scripts/quick-commit.sh "feat(api): add rate limiting"

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if commit message provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a commit message${NC}"
    echo -e "${YELLOW}Usage: $0 \"type(scope): description\"${NC}"
    echo -e "\nTypes: feat, fix, docs, style, refactor, perf, test, chore"
    echo -e "Example: $0 \"feat(api): add rate limiting middleware\""
    exit 1
fi

COMMIT_MSG="$1"

# Validate commit message format
if ! [[ "$COMMIT_MSG" =~ ^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?: .+ ]]; then
    echo -e "${YELLOW}⚠️  Warning: Commit message doesn't follow conventional format${NC}"
    echo -e "Expected: type(scope): description"
    echo -e "Got: $COMMIT_MSG"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}🔍 Running quality checks...${NC}\n"

# Run quality verification
if ./scripts/verify-quality.sh; then
    echo -e "\n${BLUE}📝 Committing changes...${NC}"
    
    # Stage all changes
    git add .
    
    # Show what will be committed
    echo -e "${YELLOW}Files to be committed:${NC}"
    git status --short
    echo ""
    
    # Commit with message
    if git commit -m "$COMMIT_MSG"; then
        echo -e "\n${GREEN}✅ Successfully committed!${NC}"
        echo -e "Commit message: $COMMIT_MSG"
        
        # Show current branch
        BRANCH=$(git branch --show-current)
        echo -e "\n${BLUE}Current branch:${NC} $BRANCH"
        
        # Ask if want to push
        echo ""
        read -p "Push to origin/$BRANCH? (y/N) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if git push origin "$BRANCH"; then
                echo -e "${GREEN}✅ Pushed successfully!${NC}"
                
                # If not on main, suggest PR
                if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
                    echo -e "\n${BLUE}💡 Next step:${NC} Create a pull request"
                    echo -e "   https://github.com/your-repo/codequal/pull/new/$BRANCH"
                fi
            else
                echo -e "${RED}❌ Push failed${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${RED}❌ Commit failed${NC}"
        exit 1
    fi
else
    echo -e "\n${RED}❌ Quality checks failed. Please fix issues before committing.${NC}"
    exit 1
fi