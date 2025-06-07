#!/bin/bash

# Security Verification Script
# Verifies all MCP tools are secure before use

set -e

echo "🔒 MCP Tools Security Verification"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Tools to verify
TOOLS=(
    "mcp-scan"
    "eslint-mcp"
    "git-mcp"
    "mcp-docs-service"
)

# Function to verify a tool
verify_tool() {
    local tool=$1
    echo -e "\n${YELLOW}Verifying ${tool}...${NC}"
    
    # First check if MCP-Scan is available
    if ! command -v npx >/dev/null 2>&1; then
        echo -e "${RED}✗ npx not found${NC}"
        return 1
    fi
    
    # Run MCP-Scan verification
    if npx mcp-scan verify-tool "$tool" 2>/dev/null; then
        echo -e "${GREEN}✓ ${tool} is verified safe${NC}"
        return 0
    else
        echo -e "${RED}✗ ${tool} failed verification or not installed${NC}"
        return 1
    fi
}

# Check if MCP-Scan itself is available
echo "Checking MCP-Scan availability..."
if ! npx mcp-scan --version >/dev/null 2>&1; then
    echo -e "${RED}Error: MCP-Scan is not installed. Run 'npm run install-tools' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ MCP-Scan is available${NC}"

# Verify each tool
VERIFIED=0
FAILED=0

for tool in "${TOOLS[@]}"; do
    if verify_tool "$tool"; then
        ((VERIFIED++))
    else
        ((FAILED++))
    fi
done

# Summary
echo -e "\n${YELLOW}Security Verification Summary${NC}"
echo "=============================="
echo -e "Verified: ${GREEN}${VERIFIED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tools passed security verification!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tools failed verification. Please review and fix issues.${NC}"
    exit 1
fi
