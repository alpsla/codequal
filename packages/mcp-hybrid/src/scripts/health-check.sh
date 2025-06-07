#!/bin/bash

# Health Check Script
# Checks if all MCP tools are healthy and ready to use

set -e

echo "🏥 MCP Tools Health Check"
echo "========================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check tool health
check_tool() {
    local tool_name=$1
    local check_command=$2
    
    echo -e "\n${BLUE}Checking ${tool_name}...${NC}"
    
    if eval "$check_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ ${tool_name} is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ ${tool_name} is not available or unhealthy${NC}"
        return 1
    fi
}

# Track results
TOTAL=0
HEALTHY=0

# Check each tool
echo -e "${YELLOW}Checking core MCP tools...${NC}"

# 1. MCP-Scan
((TOTAL++))
if check_tool "MCP-Scan" "npx mcp-scan --version"; then
    ((HEALTHY++))
fi

# 2. ESLint MCP
((TOTAL++))
if check_tool "ESLint MCP" "npx @eslint/mcp --version"; then
    ((HEALTHY++))
fi

# 3. Git MCP Server
((TOTAL++))
if command -v uvx >/dev/null 2>&1; then
    if check_tool "Git MCP Server" "uvx mcp-server-git --help"; then
        ((HEALTHY++))
    fi
else
    echo -e "${YELLOW}⚠ Git MCP Server: uvx not found (install with pip)${NC}"
fi

# 4. MCP Documentation Service
((TOTAL++))
if check_tool "MCP Docs Service" "npx mcp-docs-service --version"; then
    ((HEALTHY++))
fi

# 5. SonarQube (check environment)
((TOTAL++))
echo -e "\n${BLUE}Checking SonarQube...${NC}"
if [ -n "$SONARQUBE_URL" ]; then
    echo -e "${GREEN}✓ SonarQube URL configured: $SONARQUBE_URL${NC}"
    ((HEALTHY++))
else
    echo -e "${YELLOW}⚠ SonarQube: SONARQUBE_URL not set${NC}"
fi

# 6. Semgrep
((TOTAL++))
if check_tool "Semgrep" "semgrep --version"; then
    ((HEALTHY++))
fi

# Check Node.js version
echo -e "\n${BLUE}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v)
echo -e "Node.js version: ${GREEN}${NODE_VERSION}${NC}"

# Check npm version
NPM_VERSION=$(npm -v)
echo -e "npm version: ${GREEN}${NPM_VERSION}${NC}"

# Summary
echo -e "\n${YELLOW}Health Check Summary${NC}"
echo "===================="
echo -e "Total tools: ${TOTAL}"
echo -e "Healthy: ${GREEN}${HEALTHY}${NC}"
echo -e "Issues: ${RED}$((TOTAL - HEALTHY))${NC}"

# Provide recommendations
if [ $HEALTHY -lt $TOTAL ]; then
    echo -e "\n${YELLOW}Recommendations:${NC}"
    
    if ! command -v uvx >/dev/null 2>&1; then
        echo "- Install uvx for Git MCP: pip install uv"
    fi
    
    if [ -z "$SONARQUBE_URL" ]; then
        echo "- Set SONARQUBE_URL environment variable"
    fi
    
    if ! command -v semgrep >/dev/null 2>&1; then
        echo "- Install Semgrep: pip install semgrep"
    fi
fi

# Exit code based on health
if [ $HEALTHY -eq $TOTAL ]; then
    echo -e "\n${GREEN}✅ All tools are healthy!${NC}"
    exit 0
elif [ $HEALTHY -ge 4 ]; then
    echo -e "\n${YELLOW}⚠️  Most tools are healthy. Some optional tools need attention.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Critical tools are unhealthy. Please run install script.${NC}"
    exit 1
fi
