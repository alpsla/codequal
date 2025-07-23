#!/bin/bash

# Quality verification script for CodeQual
# Run this before committing or pushing code

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Running CodeQual Quality Checks...${NC}\n"

# Track if any checks fail
FAILED=0

# 1. Check for uncommitted changes
echo -e "${YELLOW}📋 Checking git status...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    git status -s
    echo ""
fi

# 2. TypeScript Check
echo -e "${BLUE}📘 Checking TypeScript...${NC}"
if npm run typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}\n"
else
    echo -e "${RED}❌ TypeScript errors found!${NC}"
    npm run typecheck
    FAILED=1
    echo ""
fi

# 3. Linting
echo -e "${BLUE}🧹 Running ESLint...${NC}"
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Linting passed${NC}\n"
else
    echo -e "${RED}❌ Linting errors found!${NC}"
    echo -e "${YELLOW}💡 Tip: Run 'npm run lint:fix' to auto-fix issues${NC}"
    npm run lint
    FAILED=1
    echo ""
fi

# 4. Tests
echo -e "${BLUE}🧪 Running Tests...${NC}"
if npm test -- --passWithNoTests > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Tests passed${NC}\n"
else
    echo -e "${RED}❌ Tests failed!${NC}"
    npm test -- --passWithNoTests
    FAILED=1
    echo ""
fi

# 5. Build
echo -e "${BLUE}🔨 Building packages...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}\n"
else
    echo -e "${RED}❌ Build failed!${NC}"
    npm run build
    FAILED=1
    echo ""
fi

# 6. Security Checks
echo -e "${BLUE}🔒 Security Checks...${NC}"

# Check for console.logs
CONSOLE_LOGS=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" apps/ packages/ 2>/dev/null | grep -v "test" | grep -v "spec" | wc -l)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Found $CONSOLE_LOGS console.log statements${NC}"
    echo -e "${YELLOW}   Run: grep -r \"console.log\" --include=\"*.ts\" --include=\"*.tsx\" apps/ packages/${NC}"
fi

# Check for potential secrets
SECRETS=$(grep -r "sk-\|api_key.*=\|secret.*=" --include="*.ts" --include="*.js" --include="*.env*" . 2>/dev/null | grep -v "node_modules" | grep -v ".env.example" | wc -l)
if [ "$SECRETS" -gt 0 ]; then
    echo -e "${RED}🚨 Warning: Found potential exposed secrets!${NC}"
    echo -e "${YELLOW}   Review sensitive data before committing${NC}"
    FAILED=1
fi

# Check for large files
LARGE_FILES=$(find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" -not -path "./build/*" 2>/dev/null | wc -l)
if [ "$LARGE_FILES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Found $LARGE_FILES large files (>1MB)${NC}"
    find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" -not -path "./build/*" -exec ls -lh {} \; 2>/dev/null
fi

echo ""

# 7. Bundle Size (if web app exists)
if [ -d "apps/web" ]; then
    echo -e "${BLUE}📦 Checking bundle size...${NC}"
    # This is informational only
    if command -v du &> /dev/null; then
        if [ -d "apps/web/.next" ]; then
            SIZE=$(du -sh apps/web/.next 2>/dev/null | cut -f1)
            echo -e "   Next.js build size: $SIZE"
        fi
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}📊 Summary${NC}"
echo -e "=========="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All quality checks passed!${NC}"
    echo -e "\n${GREEN}Ready to commit and push! 🚀${NC}"
    
    # Show next steps
    echo -e "\n${BLUE}Next steps:${NC}"
    echo -e "1. git add ."
    echo -e "2. git commit -m \"type(scope): description\""
    echo -e "3. git push origin $(git branch --show-current)"
    
    exit 0
else
    echo -e "${RED}❌ Quality checks failed!${NC}"
    echo -e "\n${YELLOW}Please fix the issues above before committing.${NC}"
    
    # Show helpful commands
    echo -e "\n${BLUE}Helpful commands:${NC}"
    echo -e "- npm run lint:fix      # Auto-fix lint issues"
    echo -e "- npm run typecheck     # See TypeScript errors"
    echo -e "- npm test              # Run tests"
    echo -e "- npm run build         # Build all packages"
    
    exit 1
fi