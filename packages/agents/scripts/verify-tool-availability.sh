#!/bin/bash

# ================================================
# Tool Availability Verification Script
# Checks which tools are installed and available
# ================================================

echo "🔍 Tool Availability Check"
echo "================================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
check_tool() {
    local tool=$1
    local category=$2
    
    if command -v $tool &> /dev/null; then
        echo -e "${GREEN}✓${NC} $tool ($category)"
        return 0
    else
        echo -e "${RED}✗${NC} $tool ($category)"
        return 1
    fi
}

# Counter for statistics
total=0
installed=0

# ================================================
# JAVASCRIPT/TYPESCRIPT TOOLS
# ================================================
echo "📦 JavaScript/TypeScript Tools:"
echo "--------------------------------"
tools=(
    "eslint:Quality"
    "jshint:Quality"
    "tsc:TypeCheck"
    "npm:Dependencies"
    "madge:Architecture"
    "dependency-cruiser:Architecture"
    "jscpd:Duplicates"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# PYTHON TOOLS
# ================================================
echo ""
echo "🐍 Python Tools:"
echo "--------------------------------"
tools=(
    "bandit:Security"
    "pylint:Quality"
    "flake8:Quality"
    "mypy:TypeCheck"
    "safety:Dependencies"
    "pip-audit:Dependencies"
    "py-spy:Performance"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# JAVA TOOLS
# ================================================
echo ""
echo "☕ Java Tools:"
echo "--------------------------------"
tools=(
    "java:Runtime"
    "javac:Compiler"
    "mvn:Build"
    "gradle:Build"
    "spotbugs:Security/Quality"
    "pmd:Quality"
    "checkstyle:Quality"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# GO TOOLS
# ================================================
echo ""
echo "🐹 Go Tools:"
echo "--------------------------------"
tools=(
    "go:Runtime"
    "gosec:Security"
    "staticcheck:Quality"
    "golangci-lint:Quality"
    "pprof:Performance"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# RUBY TOOLS
# ================================================
echo ""
echo "💎 Ruby Tools:"
echo "--------------------------------"
tools=(
    "ruby:Runtime"
    "brakeman:Security"
    "rubocop:Quality"
    "bundler:Dependencies"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# PHP TOOLS
# ================================================
echo ""
echo "🐘 PHP Tools:"
echo "--------------------------------"
tools=(
    "php:Runtime"
    "composer:Dependencies"
    "psalm:TypeCheck"
    "phpstan:Quality"
    "phpcs:Quality"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# .NET/C# TOOLS
# ================================================
echo ""
echo "🔷 .NET/C# Tools:"
echo "--------------------------------"
tools=(
    "dotnet:Runtime"
    "security-scan:Security"
    "dotnet-format:Quality"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# RUST TOOLS
# ================================================
echo ""
echo "🦀 Rust Tools:"
echo "--------------------------------"
tools=(
    "cargo:Build"
    "rustc:Compiler"
    "cargo-audit:Security"
    "cargo-clippy:Quality"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# KOTLIN TOOLS
# ================================================
echo ""
echo "🟣 Kotlin Tools:"
echo "--------------------------------"
tools=(
    "kotlinc:Compiler"
    "detekt:Quality"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# C/C++ TOOLS
# ================================================
echo ""
echo "⚙️ C/C++ Tools:"
echo "--------------------------------"
tools=(
    "gcc:Compiler"
    "clang:Compiler"
    "cppcheck:Quality"
    "valgrind:Memory"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# UNIVERSAL TOOLS
# ================================================
echo ""
echo "🌍 Universal Tools:"
echo "--------------------------------"
tools=(
    "semgrep:Security"
    "jscpd:Duplicates"
    "cloc:Metrics"
    "sonar-scanner:Quality"
)

for tool_info in "${tools[@]}"; do
    IFS=':' read -r tool category <<< "$tool_info"
    check_tool "$tool" "$category"
    ((total++))
    if [ $? -eq 0 ]; then ((installed++)); fi
done

# ================================================
# STATISTICS
# ================================================
echo ""
echo "================================================"
echo "📊 Summary Statistics:"
echo "================================================"

percentage=$((installed * 100 / total))

echo "Total tools checked: $total"
echo "Tools installed: $installed"
echo "Tools missing: $((total - installed))"
echo "Coverage: ${percentage}%"

if [ $percentage -ge 80 ]; then
    echo -e "${GREEN}✅ Excellent tool coverage!${NC}"
elif [ $percentage -ge 60 ]; then
    echo -e "${YELLOW}⚠️ Good coverage, but some tools missing${NC}"
else
    echo -e "${RED}❌ Many tools missing, run install script${NC}"
fi

echo ""
echo "💡 To install missing tools, run:"
echo "   ./install-all-language-tools.sh"