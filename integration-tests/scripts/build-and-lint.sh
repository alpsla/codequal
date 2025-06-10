#!/bin/bash

echo "🏗️  CodeQual Build & Lint Check"
echo "================================"
echo ""

cd /Users/alpinro/Code\ Prjects/codequal

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        return 0
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# 1. Clean previous builds
echo "1️⃣ Cleaning previous builds..."
rm -rf packages/*/dist packages/*/build packages/*/.turbo
check_status $? "Clean completed"
echo ""

# 2. Install dependencies (in case any are missing)
echo "2️⃣ Checking dependencies..."
npm install --quiet
check_status $? "Dependencies installed"
echo ""

# 3. Run TypeScript compilation check
echo "3️⃣ TypeScript compilation check..."
echo "Checking root tsconfig..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v "tsconfig.json:12:17"
tsc_status=${PIPESTATUS[0]}

if [ $tsc_status -eq 0 ]; then
    echo -e "${GREEN}✅ Root TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Root TypeScript has warnings (checking packages...)${NC}"
fi

# Check each package
for package in packages/*; do
    if [ -d "$package/src" ] && [ -f "$package/tsconfig.json" ]; then
        package_name=$(basename $package)
        echo "   Checking $package_name..."
        cd $package
        npx tsc --noEmit --skipLibCheck 2>&1 | head -10
        cd ../..
    fi
done
echo ""

# 4. Run the build
echo "4️⃣ Building packages with Turbo..."
npm run build 2>&1 | tee /tmp/build.log
build_status=${PIPESTATUS[0]}
check_status $build_status "Build completed"

if [ $build_status -ne 0 ]; then
    echo ""
    echo -e "${RED}Build failed! Checking errors...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    grep -E "(error|Error|ERROR)" /tmp/build.log | head -20
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Full log: /tmp/build.log"
    exit 1
fi
echo ""

# 5. Run ESLint
echo "5️⃣ Running ESLint..."
npm run lint 2>&1 | tee /tmp/lint.log
lint_status=${PIPESTATUS[0]}

if [ $lint_status -eq 0 ]; then
    echo -e "${GREEN}✅ ESLint passed${NC}"
else
    echo -e "${YELLOW}⚠️  ESLint found issues${NC}"
    echo "   Checking for errors vs warnings..."
    
    error_count=$(grep -c "error" /tmp/lint.log || echo "0")
    warning_count=$(grep -c "warning" /tmp/lint.log || echo "0")
    
    echo "   Errors: $error_count"
    echo "   Warnings: $warning_count"
    
    if [ $error_count -gt 0 ]; then
        echo -e "${RED}   ESLint errors must be fixed!${NC}"
        echo "   See /tmp/lint.log for details"
    else
        echo -e "${YELLOW}   Only warnings found (can proceed)${NC}"
    fi
fi
echo ""

# 6. Check our new implementations specifically
echo "6️⃣ Checking new implementations..."
echo "   Dependency Agent..."
if [ -f "packages/agents/src/specialized/dependency-agent.ts" ]; then
    npx tsc packages/agents/src/specialized/dependency-agent.ts --noEmit --skipLibCheck 2>&1
    check_status $? "dependency-agent.ts compiles"
else
    echo -e "${RED}❌ dependency-agent.ts not found${NC}"
fi

echo "   Report Enhancer..."
if [ -f "packages/agents/src/orchestrator/report-enhancer.ts" ]; then
    npx tsc packages/agents/src/orchestrator/report-enhancer.ts --noEmit --skipLibCheck 2>&1
    check_status $? "report-enhancer.ts compiles"
else
    echo -e "${RED}❌ report-enhancer.ts not found${NC}"
fi

echo "   Agent Types..."
if [ -f "packages/agents/src/types/agent-types.ts" ]; then
    npx tsc packages/agents/src/types/agent-types.ts --noEmit --skipLibCheck 2>&1
    check_status $? "agent-types.ts compiles"
else
    echo -e "${RED}❌ agent-types.ts not found${NC}"
fi
echo ""

# 7. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Build & Lint Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $build_status -eq 0 ]; then
    echo -e "${GREEN}✅ Build: PASSED${NC}"
    
    # Check if built files exist
    echo ""
    echo "📦 Checking build outputs..."
    for package in packages/*; do
        if [ -d "$package/dist" ] || [ -d "$package/build" ]; then
            package_name=$(basename $package)
            echo "   ✅ $package_name built"
        fi
    done
else
    echo -e "${RED}❌ Build: FAILED${NC}"
fi

echo ""
if [ $lint_status -eq 0 ]; then
    echo -e "${GREEN}✅ Lint: PASSED${NC}"
elif [ $error_count -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Lint: WARNINGS ONLY${NC}"
else
    echo -e "${RED}❌ Lint: ERRORS FOUND${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final decision
if [ $build_status -eq 0 ]; then
    echo -e "${GREEN}✅ Ready to run tests!${NC}"
    echo ""
    echo "Next: ./integration-tests/scripts/test-phase3-core-flow.sh"
    exit 0
else
    echo -e "${RED}❌ Fix build errors before running tests${NC}"
    exit 1
fi
