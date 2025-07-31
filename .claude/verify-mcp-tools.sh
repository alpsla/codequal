#!/bin/bash

# MCP Tools Verification Script
# This script verifies that all MCP tools are properly installed and configured

echo "=== MCP Tools Verification ==="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check command existence
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $2 is NOT installed"
        return 1
    fi
}

# Check environment variable
check_env() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}✗${NC} $1 is NOT set"
        return 1
    else
        echo -e "${GREEN}✓${NC} $1 is set"
        return 0
    fi
}

# Check npm package
check_npm_package() {
    if npm list -g "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 npm package is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 npm package is NOT installed"
        return 1
    fi
}

# Check Python package
check_python_package() {
    if pip3 show "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 Python package is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 Python package is NOT installed"
        return 1
    fi
}

echo "1. Checking Prerequisites"
echo "------------------------"
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "python3" "Python 3"
check_command "pip3" "pip3"
check_command "uvx" "uvx (for Python MCP servers)"

echo ""
echo "2. Checking Environment Variables"
echo "---------------------------------"
check_env "REF_API_KEY"
check_env "SEMGREP_APP_TOKEN"
check_env "EXA_API_KEY"
check_env "TAVILY_API_KEY"

echo ""
echo "3. Checking MCP Server Installations"
echo "------------------------------------"

# REF
echo -e "${YELLOW}REF MCP Server:${NC}"
if npx @ref.tools/ref-mcp-server --version &> /dev/null; then
    echo -e "${GREEN}✓${NC} REF MCP server is accessible"
else
    echo -e "${RED}✗${NC} REF MCP server is NOT accessible"
    echo "  Install with: npm install -g @ref.tools/ref-mcp-server"
fi

# Semgrep
echo -e "${YELLOW}Semgrep:${NC}"
check_command "semgrep" "Semgrep CLI"
if uvx --help &> /dev/null && uvx semgrep-mcp --help &> /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Semgrep MCP server is accessible"
else
    echo -e "${RED}✗${NC} Semgrep MCP server is NOT accessible"
    echo "  Install with: pip3 install semgrep semgrep-mcp"
fi

# EXA
echo -e "${YELLOW}EXA MCP Server:${NC}"
if npx exa-mcp-server --version &> /dev/null; then
    echo -e "${GREEN}✓${NC} EXA MCP server is accessible"
else
    echo -e "${RED}✗${NC} EXA MCP server is NOT accessible"
    echo "  Install with: npm install -g exa-mcp-server"
fi

# Tavily
echo -e "${YELLOW}Tavily MCP Server:${NC}"
if TAVILY_API_KEY="${TAVILY_API_KEY:-test}" timeout 2s npx -y tavily-mcp@latest --list-tools &> /dev/null; then
    echo -e "${GREEN}✓${NC} Tavily MCP server is accessible"
else
    echo -e "${RED}✗${NC} Tavily MCP server is NOT accessible"
    echo "  Install with: npm install -g tavily-mcp"
fi

echo ""
echo "4. Checking Configuration Files"
echo "-------------------------------"

# Check if config files exist in .claude directory
if [ -f ".claude/claude_desktop_config.json" ]; then
    echo -e "${GREEN}✓${NC} Claude Desktop config exists in project"
else
    echo -e "${RED}✗${NC} Claude Desktop config NOT found in project"
fi

if [ -f ".claude/claude_code_config.json" ]; then
    echo -e "${GREEN}✓${NC} Code Claude config exists in project"
else
    echo -e "${RED}✗${NC} Code Claude config NOT found in project"
fi

# Check actual Claude app locations
CLAUDE_DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$CLAUDE_DESKTOP_CONFIG" ]; then
    echo -e "${GREEN}✓${NC} Claude Desktop config deployed"
    # Check if it contains our MCP servers
    if grep -q "ref\|semgrep\|exa" "$CLAUDE_DESKTOP_CONFIG"; then
        echo -e "${GREEN}  ✓${NC} MCP servers configured in Claude Desktop"
    else
        echo -e "${YELLOW}  !${NC} MCP servers not found in Claude Desktop config"
    fi
else
    echo -e "${YELLOW}!${NC} Claude Desktop config not deployed"
fi

echo ""
echo "5. Testing MCP Server Connections"
echo "---------------------------------"

# Test REF
if [ -n "$REF_API_KEY" ]; then
    echo -e "${YELLOW}Testing REF API...${NC}"
    if curl -s -H "Authorization: Bearer $REF_API_KEY" https://api.ref.tools/health &> /dev/null; then
        echo -e "${GREEN}✓${NC} REF API connection successful"
    else
        echo -e "${RED}✗${NC} REF API connection failed"
    fi
fi

# Test Semgrep
if [ -n "$SEMGREP_APP_TOKEN" ]; then
    echo -e "${YELLOW}Testing Semgrep API...${NC}"
    if semgrep --config=auto --test &> /dev/null; then
        echo -e "${GREEN}✓${NC} Semgrep connection successful"
    else
        echo -e "${YELLOW}!${NC} Semgrep test inconclusive"
    fi
fi

# Test EXA
if [ -n "$EXA_API_KEY" ]; then
    echo -e "${YELLOW}Testing EXA API...${NC}"
    if curl -s -H "X-API-Key: $EXA_API_KEY" "https://api.exa.ai/search?q=test&num_results=1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} EXA API connection successful"
    else
        echo -e "${RED}✗${NC} EXA API connection failed"
    fi
fi

echo ""
echo "=== Verification Summary ==="
echo ""
echo "If any checks failed, please:"
echo "1. Install missing dependencies"
echo "2. Set missing environment variables using ./setup-mcp-env.sh"
echo "3. Copy config files to Claude app directories"
echo "4. Restart Claude applications"