#!/bin/bash
# CI Validation Script for CodeQual

set -e

echo "🔍 Starting CI Validation..."
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
VALIDATION_PASSED=true

# Function to run a check
run_check() {
    local name=$1
    local command=$2
    echo -e "\n📋 Running: $name"
    if eval "$command"; then
        echo -e "${GREEN}✅ $name passed${NC}"
    else
        echo -e "${RED}❌ $name failed${NC}"
        VALIDATION_PASSED=false
    fi
}

# 1. Check Node version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "Node version: $NODE_VERSION"

# 2. Install dependencies (if needed)
echo -e "\n2️⃣  Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 3. Run build
run_check "Build" "npm run build"

# 4. Run linter
echo -e "\n4️⃣  Running linter..."
if npm run lint 2>&1 | grep -q "0 errors"; then
    echo -e "${GREEN}✅ Linting passed (warnings allowed)${NC}"
else
    echo -e "${RED}❌ Linting failed with errors${NC}"
    VALIDATION_PASSED=false
fi

# 5. Run tests
run_check "Tests" "npm test"

# 6. Check for security vulnerabilities
echo -e "\n6️⃣  Checking for security vulnerabilities..."
if npm audit --production --audit-level=high; then
    echo -e "${GREEN}✅ Security audit passed${NC}"
else
    echo -e "${YELLOW}⚠️  Security vulnerabilities found (non-blocking)${NC}"
fi

# 7. Check TypeScript strict mode compliance
echo -e "\n7️⃣  Checking TypeScript configuration..."
if grep -q '"strict": true' tsconfig.json; then
    echo -e "${GREEN}✅ TypeScript strict mode enabled${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript strict mode not enabled${NC}"
fi

# 8. Check for uncommitted changes
echo -e "\n8️⃣  Checking for uncommitted changes..."
if git diff --quiet && git diff --staged --quiet; then
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
else
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    git status --short
fi

# Final result
echo -e "\n================================"
if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ CI Validation PASSED!${NC}"
    echo "Ready for deployment 🚀"
    exit 0
else
    echo -e "${RED}❌ CI Validation FAILED!${NC}"
    echo "Please fix the issues above before proceeding."
    exit 1
fi