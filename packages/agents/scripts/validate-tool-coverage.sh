#!/bin/bash

# Tool Coverage Validation Script
# Date: 2025-09-03
# Purpose: Validate actual tool installation coverage

export PATH="$PATH:$HOME/go/bin:$HOME/.cargo/bin:$HOME/.composer/vendor/bin:$HOME/bin"

echo "=================================================="
echo "     CODEQUAL TOOL COVERAGE VALIDATION"
echo "=================================================="
echo "Date: $(date)"
echo "PATH: $PATH"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters for each category
SECURITY_TOTAL=0
SECURITY_FOUND=0
PERFORMANCE_TOTAL=0
PERFORMANCE_FOUND=0
ARCHITECTURE_TOTAL=0
ARCHITECTURE_FOUND=0
DEPENDENCY_TOTAL=0
DEPENDENCY_FOUND=0
QUALITY_TOTAL=0
QUALITY_FOUND=0

# Function to check tool
check_tool() {
    local tool=$1
    local category=$2
    
    case $category in
        "security")
            ((SECURITY_TOTAL++))
            ;;
        "performance")
            ((PERFORMANCE_TOTAL++))
            ;;
        "architecture")
            ((ARCHITECTURE_TOTAL++))
            ;;
        "dependency")
            ((DEPENDENCY_TOTAL++))
            ;;
        "quality")
            ((QUALITY_TOTAL++))
            ;;
    esac
    
    if command -v $tool >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $tool: $(command -v $tool)"
        case $category in
            "security")
                ((SECURITY_FOUND++))
                ;;
            "performance")
                ((PERFORMANCE_FOUND++))
                ;;
            "architecture")
                ((ARCHITECTURE_FOUND++))
                ;;
            "dependency")
                ((DEPENDENCY_FOUND++))
                ;;
            "quality")
                ((QUALITY_FOUND++))
                ;;
        esac
        return 0
    else
        echo -e "${RED}❌${NC} $tool: NOT FOUND"
        return 1
    fi
}

echo -e "${BLUE}=== 1. SECURITY TOOLS ===${NC}"
echo "------------------------"
check_tool "cargo-audit" "security"
check_tool "clippy" "security"
check_tool "cargo-geiger" "security"
check_tool "bandit" "security"
check_tool "safety" "security"
check_tool "semgrep" "security"
check_tool "gosec" "security"
check_tool "staticcheck" "security"
check_tool "spotbugs" "security"
check_tool "brakeman" "security"
check_tool "bundler-audit" "security"
check_tool "psalm" "security"
check_tool "phpstan" "security"
check_tool "cppcheck" "security"
check_tool "gitleaks" "security"
check_tool "trivy" "security"
echo ""

echo -e "${BLUE}=== 2. PERFORMANCE TOOLS ===${NC}"
echo "---------------------------"
check_tool "hyperfine" "performance"
check_tool "flamegraph" "performance"
check_tool "cargo-criterion" "performance"
check_tool "py-spy" "performance"
check_tool "memory_profiler" "performance"
check_tool "line_profiler" "performance"
check_tool "lighthouse" "performance"
check_tool "webpack-bundle-analyzer" "performance"
check_tool "pprof" "performance"
echo ""

echo -e "${BLUE}=== 3. ARCHITECTURE TOOLS ===${NC}"
echo "----------------------------"
check_tool "cargo-deps" "architecture"
check_tool "cargo-modules" "architecture"
check_tool "pydeps" "architecture"
check_tool "import-linter" "architecture"
check_tool "madge" "architecture"
check_tool "dependency-cruiser" "architecture"
check_tool "go-callvis" "architecture"
check_tool "goda" "architecture"
echo ""

echo -e "${BLUE}=== 4. DEPENDENCY TOOLS ===${NC}"
echo "--------------------------"
check_tool "cargo-audit" "dependency"
check_tool "cargo-deny" "dependency"
check_tool "cargo-outdated" "dependency"
check_tool "cargo-license" "dependency"
check_tool "safety" "dependency"
check_tool "pip-audit" "dependency"
check_tool "npm" "dependency"  # npm audit is built-in
check_tool "bundler-audit" "dependency"
check_tool "nancy" "dependency"
echo ""

echo -e "${BLUE}=== 5. CODE QUALITY TOOLS ===${NC}"
echo "----------------------------"
check_tool "rustfmt" "quality"
check_tool "clippy" "quality"
check_tool "pylint" "quality"
check_tool "black" "quality"
check_tool "mypy" "quality"
check_tool "eslint" "quality"
check_tool "golangci-lint" "quality"
check_tool "gofmt" "quality"
check_tool "rubocop" "quality"
check_tool "phpcs" "quality"
echo ""

# Calculate percentages
SECURITY_PCT=$((SECURITY_FOUND * 100 / SECURITY_TOTAL))
PERFORMANCE_PCT=$((PERFORMANCE_FOUND * 100 / PERFORMANCE_TOTAL))
ARCHITECTURE_PCT=$((ARCHITECTURE_FOUND * 100 / ARCHITECTURE_TOTAL))
DEPENDENCY_PCT=$((DEPENDENCY_FOUND * 100 / DEPENDENCY_TOTAL))
QUALITY_PCT=$((QUALITY_FOUND * 100 / QUALITY_TOTAL))

TOTAL_TOOLS=$((SECURITY_TOTAL + PERFORMANCE_TOTAL + ARCHITECTURE_TOTAL + DEPENDENCY_TOTAL + QUALITY_TOTAL))
TOTAL_FOUND=$((SECURITY_FOUND + PERFORMANCE_FOUND + ARCHITECTURE_FOUND + DEPENDENCY_FOUND + QUALITY_FOUND))
OVERALL_PCT=$((TOTAL_FOUND * 100 / TOTAL_TOOLS))

echo "=================================================="
echo -e "${BLUE}📊 COVERAGE SUMMARY BY ROLE${NC}"
echo "=================================================="
printf "%-20s %10s %10s %10s\n" "Role" "Found" "Total" "Coverage"
printf "%-20s %10s %10s %10s\n" "----" "-----" "-----" "--------"
printf "%-20s %10d %10d %10d%%\n" "Security" $SECURITY_FOUND $SECURITY_TOTAL $SECURITY_PCT
printf "%-20s %10d %10d %10d%%\n" "Performance" $PERFORMANCE_FOUND $PERFORMANCE_TOTAL $PERFORMANCE_PCT
printf "%-20s %10d %10d %10d%%\n" "Architecture" $ARCHITECTURE_FOUND $ARCHITECTURE_TOTAL $ARCHITECTURE_PCT
printf "%-20s %10d %10d %10d%%\n" "Dependency" $DEPENDENCY_FOUND $DEPENDENCY_TOTAL $DEPENDENCY_PCT
printf "%-20s %10d %10d %10d%%\n" "Code Quality" $QUALITY_FOUND $QUALITY_TOTAL $QUALITY_PCT
echo "--------------------------------------------------"
printf "%-20s %10d %10d %10d%%\n" "TOTAL" $TOTAL_FOUND $TOTAL_TOOLS $OVERALL_PCT
echo ""

# Determine status
if [ $OVERALL_PCT -ge 80 ]; then
    echo -e "${GREEN}✅ EXCELLENT: $OVERALL_PCT% tool coverage achieved!${NC}"
elif [ $OVERALL_PCT -ge 60 ]; then
    echo -e "${YELLOW}⚠️  GOOD: $OVERALL_PCT% tool coverage - some gaps remain${NC}"
else
    echo -e "${RED}❌ NEEDS WORK: Only $OVERALL_PCT% tool coverage${NC}"
fi

echo ""
echo "=================================================="
echo "📝 MISSING TOOLS SUMMARY"
echo "=================================================="

# Check specific important missing tools
echo "Critical gaps to address:"
command -v pmd >/dev/null 2>&1 || echo "  - PMD (Java code analysis)"
command -v checkstyle >/dev/null 2>&1 || echo "  - Checkstyle (Java style checking)"
command -v clang-tidy >/dev/null 2>&1 || echo "  - clang-tidy (C++ static analysis)"
command -v prettier >/dev/null 2>&1 || echo "  - Prettier (JavaScript formatting)"

echo ""
echo "Run this script periodically to track coverage improvements."
echo "Target: 85% overall coverage for production readiness."