#!/bin/bash
#
# Tier 2 Native Fixer Tools Availability Check
# Session 104: Verify all tools are installed
#

echo "=========================================="
echo "Tier 2 Tool Availability Check"
echo "$(date)"
echo "=========================================="
echo ""

PASS=0
FAIL=0

check_tool() {
    local name=$1
    local cmd=$2
    if command -v "$cmd" &> /dev/null; then
        echo "  [PASS] $name"
        ((PASS++))
        return 0
    else
        echo "  [FAIL] $name - not found"
        ((FAIL++))
        return 1
    fi
}

check_jar() {
    local name=$1
    local path=$2
    if [[ -f "$path" ]]; then
        echo "  [PASS] $name (JAR)"
        ((PASS++))
        return 0
    else
        echo "  [FAIL] $name - JAR not found at $path"
        ((FAIL++))
        return 1
    fi
}

check_llvm_tool() {
    local name=$1
    local tool=$2
    if [[ -f "/opt/homebrew/opt/llvm/bin/$tool" ]]; then
        echo "  [PASS] $name (LLVM)"
        ((PASS++))
        return 0
    elif command -v "$tool" &> /dev/null; then
        echo "  [PASS] $name"
        ((PASS++))
        return 0
    else
        echo "  [FAIL] $name - not found"
        ((FAIL++))
        return 1
    fi
}

echo "=== Python Tools ==="
check_tool "ruff" "ruff"
check_tool "black" "black"
check_tool "isort" "isort"
check_tool "autoflake" "autoflake"
check_tool "pyupgrade" "pyupgrade"
echo ""

echo "=== Go Tools ==="
check_tool "gofmt" "gofmt"
# Check GOPATH for goimports
if [[ -f "$(go env GOPATH 2>/dev/null)/bin/goimports" ]]; then
    echo "  [PASS] goimports (GOPATH)"
    ((PASS++))
else
    check_tool "goimports" "goimports"
fi
check_tool "golangci-lint" "golangci-lint"
echo ""

echo "=== Java Tools ==="
check_tool "google-java-format" "google-java-format"
check_jar "sorald" "$HOME/tools/sorald.jar"
echo ""

echo "=== C/C++ Tools ==="
check_tool "clang-format" "clang-format"
check_llvm_tool "clang-tidy" "clang-tidy"
echo ""

echo "=== C# Tools ==="
check_tool "dotnet" "dotnet"
echo ""

echo "=== TypeScript/JavaScript Tools ==="
# These are typically installed per-project
if command -v npx &> /dev/null && npx eslint --version &> /dev/null 2>&1; then
    echo "  [PASS] eslint (via npx)"
    ((PASS++))
else
    echo "  [INFO] eslint - install per-project"
fi
if command -v npx &> /dev/null && npx prettier --version &> /dev/null 2>&1; then
    echo "  [PASS] prettier (via npx)"
    ((PASS++))
else
    echo "  [INFO] prettier - install per-project"
fi
echo ""

echo "=========================================="
echo "Summary: $PASS passed, $FAIL failed"
echo "=========================================="

if [[ $FAIL -gt 0 ]]; then
    echo ""
    echo "To install missing tools, run:"
    echo "  ./scripts/install-tier2-tools.sh --all"
    exit 1
fi
