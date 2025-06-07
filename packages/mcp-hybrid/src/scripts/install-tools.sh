#!/bin/bash

# MCP Hybrid Tools Installation Script
# Installs the 6 core MCP tools for CodeQual

set -e

echo "🚀 Installing MCP Hybrid Tools for CodeQual"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install a tool
install_tool() {
    local tool_name=$1
    local install_command=$2
    
    echo -e "\n${YELLOW}Installing ${tool_name}...${NC}"
    
    if eval "$install_command"; then
        echo -e "${GREEN}✓ ${tool_name} installed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to install ${tool_name}${NC}"
        return 1
    fi
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command_exists npx; then
    echo -e "${RED}Error: npx is not installed. Please update npm.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Install tools
echo -e "\n${YELLOW}Installing 6 core MCP tools...${NC}"

# 1. MCP-Scan (Security scanner)
install_tool "MCP-Scan" "npm install -g mcp-scan@latest"

# 2. ESLint MCP
install_tool "ESLint MCP" "npm install -g @eslint/mcp@latest"

# 3. Git MCP Server
if command_exists python3; then
    install_tool "Git MCP Server" "pip install mcp-server-git"
else
    echo -e "${YELLOW}Warning: Python 3 not found. Skipping Git MCP Server.${NC}"
fi

# 4. MCP Documentation Service
install_tool "MCP Documentation Service" "npm install -g mcp-docs-service@latest"

# Note: SonarQube and Semgrep MCP require more complex setup
echo -e "\n${YELLOW}Note: SonarQube and Semgrep MCP require additional setup:${NC}"
echo "- SonarQube: Set SONARQUBE_URL environment variable or run local instance"
echo "- Semgrep: Install via 'pip install semgrep' or 'brew install semgrep'"

# Create tools config directory
TOOLS_CONFIG_DIR="$HOME/.codequal/mcp-tools"
mkdir -p "$TOOLS_CONFIG_DIR"

# Create basic configuration
cat > "$TOOLS_CONFIG_DIR/config.json" << EOF
{
  "tools": {
    "mcp-scan": {
      "enabled": true,
      "version": "latest"
    },
    "eslint-mcp": {
      "enabled": true,
      "version": "latest"
    },
    "sonarqube": {
      "enabled": false,
      "url": "http://localhost:9000",
      "note": "Configure SONARQUBE_URL environment variable"
    },
    "semgrep-mcp": {
      "enabled": false,
      "note": "Install semgrep separately"
    },
    "git-mcp": {
      "enabled": true,
      "version": "latest"
    },
    "mcp-docs-service": {
      "enabled": true,
      "version": "latest"
    }
  }
}
EOF

echo -e "\n${GREEN}✓ Configuration created at: $TOOLS_CONFIG_DIR/config.json${NC}"

# Run security verification
echo -e "\n${YELLOW}Running security verification...${NC}"
if npx mcp-scan --version >/dev/null 2>&1; then
    echo -e "${GREEN}✓ MCP-Scan is working correctly${NC}"
    
    # Verify other tools with MCP-Scan
    echo "Verifying installed tools..."
    npx mcp-scan verify-tool eslint-mcp || true
    npx mcp-scan verify-tool git-mcp || true
    npx mcp-scan verify-tool mcp-docs-service || true
else
    echo -e "${RED}✗ MCP-Scan verification failed${NC}"
fi

echo -e "\n${GREEN}🎉 MCP Hybrid Tools installation complete!${NC}"
echo -e "\nNext steps:"
echo "1. Configure SonarQube if needed: export SONARQUBE_URL=your-url"
echo "2. Install Semgrep if needed: pip install semgrep"
echo "3. Run health check: npm run health-check"
echo "4. Start using tools in your PR analysis!"
