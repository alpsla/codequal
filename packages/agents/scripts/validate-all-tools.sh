#!/bin/bash

# Comprehensive Tool Coverage Validation Script
# Date: 2025-09-03
# Purpose: Validate ALL tool installations across all languages and roles

# Setup PATH for all tools
export PATH="$PATH:$HOME/go/bin:$HOME/.cargo/bin:$HOME/.composer/vendor/bin:$HOME/bin:$HOME/tools:/opt/homebrew/opt/llvm/bin"

echo "=================================================="
echo "     🎯 CODEQUAL COMPLETE TOOL VALIDATION"
echo "=================================================="
echo "Date: $(date)"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Category counters
declare -A CATEGORY_TOTAL
declare -A CATEGORY_FOUND

# Initialize counters
CATEGORY_TOTAL["Java"]=0
CATEGORY_FOUND["Java"]=0
CATEGORY_TOTAL["JavaScript"]=0
CATEGORY_FOUND["JavaScript"]=0
CATEGORY_TOTAL["Python"]=0
CATEGORY_FOUND["Python"]=0
CATEGORY_TOTAL["Go"]=0
CATEGORY_FOUND["Go"]=0
CATEGORY_TOTAL["Ruby"]=0
CATEGORY_FOUND["Ruby"]=0
CATEGORY_TOTAL["Rust"]=0
CATEGORY_FOUND["Rust"]=0
CATEGORY_TOTAL["PHP"]=0
CATEGORY_FOUND["PHP"]=0
CATEGORY_TOTAL["C++"]=0
CATEGORY_FOUND["C++"]=0
CATEGORY_TOTAL["Universal"]=0
CATEGORY_FOUND["Universal"]=0

# Function to check tool
check_tool() {
    local tool=$1
    local language=$2
    local description=$3
    
    ((CATEGORY_TOTAL[$language]++))
    
    # Special handling for Java tools in ~/tools
    if [[ "$language" == "Java" ]]; then
        case $tool in
            pmd)
                if [ -d "$HOME/tools/pmd-bin-7.7.0" ]; then
                    echo -e "${GREEN}✅${NC} $tool: $HOME/tools/pmd-bin-7.7.0 - $description"
                    ((CATEGORY_FOUND[$language]++))
                    return 0
                fi
                ;;
            checkstyle)
                if [ -f "$HOME/tools/checkstyle.jar" ]; then
                    echo -e "${GREEN}✅${NC} $tool: $HOME/tools/checkstyle.jar - $description"
                    ((CATEGORY_FOUND[$language]++))
                    return 0
                fi
                ;;
            owasp-dc)
                if [ -d "$HOME/tools/dependency-check" ]; then
                    echo -e "${GREEN}✅${NC} $tool: $HOME/tools/dependency-check - $description"
                    ((CATEGORY_FOUND[$language]++))
                    return 0
                fi
                ;;
            google-java-format)
                if [ -f "$HOME/tools/google-java-format.jar" ]; then
                    echo -e "${GREEN}✅${NC} $tool: $HOME/tools/google-java-format.jar - $description"
                    ((CATEGORY_FOUND[$language]++))
                    return 0
                fi
                ;;
            error-prone)
                if [ -f "$HOME/tools/error_prone_core.jar" ]; then
                    echo -e "${GREEN}✅${NC} $tool: $HOME/tools/error_prone_core.jar - $description"
                    ((CATEGORY_FOUND[$language]++))
                    return 0
                fi
                ;;
            jacoco)
                if [ -d "$HOME/tools/jacoco" ]; then
                    echo -e "${GREEN}✅${NC} $tool: $HOME/tools/jacoco - $description"
                    ((CATEGORY_FOUND[$language]++))
                    return 0
                fi
                ;;
            findsecbugs)
                if [ -f "$HOME/tools/findsecbugs-plugin.jar" ]; then
                    echo -e "${GREEN}✅${NC} $tool: $HOME/tools/findsecbugs-plugin.jar - $description"
                    ((CATEGORY_FOUND[$language]++))
                    return 0
                fi
                ;;
            nullaway)
                if [ -f "$HOME/tools/nullaway.jar" ]; then
                    echo -e "${GREEN}✅${NC} $tool: $HOME/tools/nullaway.jar - $description"
                    ((CATEGORY_FOUND[$language]++))
                    return 0
                fi
                ;;
        esac
    fi
    
    # Check normal PATH tools
    if command -v $tool >/dev/null 2>&1; then
        local location=$(command -v $tool)
        echo -e "${GREEN}✅${NC} $tool: $location - $description"
        ((CATEGORY_FOUND[$language]++))
        return 0
    else
        echo -e "${RED}❌${NC} $tool: NOT FOUND - $description"
        return 1
    fi
}

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 JAVA TOOLS (Enterprise Critical)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "spotbugs" "Java" "Security analysis"
check_tool "pmd" "Java" "Code analysis"
check_tool "checkstyle" "Java" "Code standards"
check_tool "owasp-dc" "Java" "Dependency check"
check_tool "google-java-format" "Java" "Code formatting"
check_tool "error-prone" "Java" "Bug detection"
check_tool "jacoco" "Java" "Code coverage"
check_tool "findsecbugs" "Java" "Security plugin"
check_tool "nullaway" "Java" "Null pointer analysis"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 JAVASCRIPT/TYPESCRIPT TOOLS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "eslint" "JavaScript" "Linting"
check_tool "prettier" "JavaScript" "Formatting"
check_tool "jshint" "JavaScript" "Code quality"
check_tool "jscpd" "JavaScript" "Copy-paste detection"
check_tool "madge" "JavaScript" "Dependency graph"
check_tool "dependency-cruiser" "JavaScript" "Architecture check"
check_tool "lighthouse" "JavaScript" "Performance"
check_tool "webpack-bundle-analyzer" "JavaScript" "Bundle analysis"
check_tool "npm-check-updates" "JavaScript" "Dependency updates"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 PYTHON TOOLS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "bandit" "Python" "Security"
check_tool "safety" "Python" "Dependency check"
check_tool "pylint" "Python" "Code quality"
check_tool "mypy" "Python" "Type checking"
check_tool "black" "Python" "Formatting"
check_tool "flake8" "Python" "Style guide"
check_tool "isort" "Python" "Import sorting"
check_tool "autopep8" "Python" "Auto-formatting"
check_tool "vulture" "Python" "Dead code"
check_tool "prospector" "Python" "Meta-linter"
check_tool "radon" "Python" "Complexity"
check_tool "xenon" "Python" "Monitoring"
check_tool "py-spy" "Python" "Profiling"
check_tool "pydeps" "Python" "Dependencies"
check_tool "import-linter" "Python" "Import rules"
check_tool "pip-audit" "Python" "Package audit"
check_tool "cpplint" "Python" "C++ linting (Python tool)"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 GO TOOLS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "gosec" "Go" "Security"
check_tool "staticcheck" "Go" "Static analysis"
check_tool "golangci-lint" "Go" "Meta-linter"
check_tool "errcheck" "Go" "Error checking"
check_tool "golint" "Go" "Style guide"
check_tool "gocritic" "Go" "Code review"
check_tool "gofumpt" "Go" "Formatting"
check_tool "gofmt" "Go" "Official formatter"
check_tool "pprof" "Go" "Profiling"
check_tool "go-callvis" "Go" "Call graph"
check_tool "goda" "Go" "Dependency analysis"
check_tool "nancy" "Go" "Vulnerability scan"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 RUST TOOLS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "cargo-audit" "Rust" "Security audit"
check_tool "cargo-geiger" "Rust" "Unsafe code"
check_tool "cargo-deny" "Rust" "Supply chain"
check_tool "cargo-outdated" "Rust" "Outdated deps"
check_tool "cargo-license" "Rust" "License check"
check_tool "cargo-edit" "Rust" "Cargo helpers"
check_tool "cargo-watch" "Rust" "File watcher"
check_tool "cargo-make" "Rust" "Task runner"
check_tool "cargo-expand" "Rust" "Macro expansion"
check_tool "cargo-deps" "Rust" "Dependency graph"
check_tool "cargo-modules" "Rust" "Module structure"
check_tool "cargo-criterion" "Rust" "Benchmarking"
check_tool "cargo-nextest" "Rust" "Test runner"
check_tool "rustfmt" "Rust" "Formatting"
check_tool "clippy" "Rust" "Linting (use: cargo clippy)"
check_tool "hyperfine" "Rust" "Benchmarking CLI"
check_tool "flamegraph" "Rust" "Performance profiling"
check_tool "sccache" "Rust" "Compilation cache"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 RUBY TOOLS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "brakeman" "Ruby" "Security"
check_tool "bundler-audit" "Ruby" "Dependency audit"
check_tool "rubocop" "Ruby" "Style guide"
check_tool "reek" "Ruby" "Code smells"
check_tool "flog" "Ruby" "Complexity"
check_tool "flay" "Ruby" "Duplication"
check_tool "ruby-lint" "Ruby" "Linting"
check_tool "fasterer" "Ruby" "Performance"
check_tool "debride" "Ruby" "Dead code"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 PHP TOOLS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "psalm" "PHP" "Static analysis"
check_tool "phpstan" "PHP" "Type checking"
check_tool "phpcs" "PHP" "Code standards"
check_tool "phpmd" "PHP" "Mess detection"
check_tool "phploc" "PHP" "Lines of code"
check_tool "phpcpd" "PHP" "Copy-paste detection"
check_tool "phpmetrics" "PHP" "Code metrics"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 C++ TOOLS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "cppcheck" "C++" "Static analysis"
check_tool "clang-tidy" "C++" "Linting"
check_tool "clang-format" "C++" "Formatting"
check_tool "cpplint" "C++" "Style guide"
check_tool "doxygen" "C++" "Documentation"
check_tool "iwyu" "C++" "Include analysis"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔹 UNIVERSAL/CROSS-LANGUAGE TOOLS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
check_tool "semgrep" "Universal" "SAST"
check_tool "trivy" "Universal" "Container security"
check_tool "gitleaks" "Universal" "Secret scanning"
check_tool "sonar-scanner" "Universal" "Code quality"
echo ""

# Calculate totals and percentages
GRAND_TOTAL=0
GRAND_FOUND=0

echo -e "${MAGENTA}=================================================="
echo "📊 COVERAGE SUMMARY BY LANGUAGE"
echo "==================================================${NC}"
printf "%-15s %10s %10s %10s\n" "Language" "Found" "Total" "Coverage"
printf "%-15s %10s %10s %10s\n" "--------" "-----" "-----" "--------"

for lang in "Java" "JavaScript" "Python" "Go" "Rust" "Ruby" "PHP" "C++" "Universal"; do
    total=${CATEGORY_TOTAL[$lang]}
    found=${CATEGORY_FOUND[$lang]}
    if [ $total -gt 0 ]; then
        pct=$((found * 100 / total))
        
        # Color code based on coverage
        if [ $pct -ge 90 ]; then
            color=$GREEN
        elif [ $pct -ge 70 ]; then
            color=$YELLOW
        else
            color=$RED
        fi
        
        printf "${color}%-15s %10d %10d %9d%%${NC}\n" "$lang" $found $total $pct
        
        GRAND_TOTAL=$((GRAND_TOTAL + total))
        GRAND_FOUND=$((GRAND_FOUND + found))
    fi
done

echo "--------------------------------------------------"
OVERALL_PCT=$((GRAND_FOUND * 100 / GRAND_TOTAL))
if [ $OVERALL_PCT -ge 90 ]; then
    color=$GREEN
elif [ $OVERALL_PCT -ge 80 ]; then
    color=$YELLOW
else
    color=$RED
fi
printf "${color}%-15s %10d %10d %9d%%${NC}\n" "TOTAL" $GRAND_FOUND $GRAND_TOTAL $OVERALL_PCT
echo ""

# Status message
echo -e "${MAGENTA}=================================================="
echo "📈 ANALYSIS"
echo "==================================================${NC}"

if [ $OVERALL_PCT -ge 90 ]; then
    echo -e "${GREEN}🎉 EXCELLENT: ${OVERALL_PCT}% tool coverage achieved!${NC}"
    echo "Production ready with comprehensive tool coverage."
elif [ $OVERALL_PCT -ge 80 ]; then
    echo -e "${GREEN}✅ GOOD: ${OVERALL_PCT}% tool coverage achieved!${NC}"
    echo "Sufficient for production with minor gaps."
elif [ $OVERALL_PCT -ge 70 ]; then
    echo -e "${YELLOW}⚠️  ACCEPTABLE: ${OVERALL_PCT}% tool coverage${NC}"
    echo "Usable but needs improvement for enterprise readiness."
else
    echo -e "${RED}❌ NEEDS WORK: Only ${OVERALL_PCT}% tool coverage${NC}"
    echo "Significant gaps remain for production use."
fi

echo ""
echo -e "${CYAN}Key Achievements:${NC}"
[ ${CATEGORY_FOUND["Java"]} -ge 8 ] && echo "  ✅ Java tools significantly improved"
[ ${CATEGORY_FOUND["Python"]} -ge 15 ] && echo "  ✅ Python has comprehensive coverage"
[ ${CATEGORY_FOUND["JavaScript"]} -ge 7 ] && echo "  ✅ JavaScript toolchain complete"
[ ${CATEGORY_FOUND["Go"]} -ge 10 ] && echo "  ✅ Go tools fully installed"
[ ${CATEGORY_FOUND["Rust"]} -ge 15 ] && echo "  ✅ Rust ecosystem complete"
[ ${CATEGORY_FOUND["Ruby"]} -ge 8 ] && echo "  ✅ Ruby tools comprehensive"
[ ${CATEGORY_FOUND["PHP"]} -ge 6 ] && echo "  ✅ PHP analysis ready"

echo ""
echo -e "${YELLOW}Remaining Gaps:${NC}"
[ ${CATEGORY_FOUND["Java"]} -lt 8 ] && echo "  ⚠️ Java needs more tools for enterprise"
[ ${CATEGORY_FOUND["C++"]} -lt 5 ] && echo "  ⚠️ C++ tools incomplete"

echo ""
echo "Report generated: $(date)"
echo "Script location: $0"