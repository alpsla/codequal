#!/bin/bash

# MCP Tools Installation Script
# This script installs all required MCP tools and their dependencies

echo "=== MCP Tools Installation Script ==="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}This script is designed for macOS. Please adjust for your OS.${NC}"
    exit 1
fi

echo "This script will install:"
echo "- REF MCP Server (npm package)"
echo "- Semgrep and Semgrep MCP (Python packages)"
echo "- EXA MCP Server (npm package)"
echo "- uvx (for running Python MCP servers)"
echo ""
read -p "Continue with installation? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

# Install Node.js packages
echo ""
echo -e "${YELLOW}Installing Node.js MCP packages...${NC}"
echo "Installing @ref.tools/ref-mcp-server..."
npm install -g @ref.tools/ref-mcp-server

echo "Installing exa-mcp-server..."
npm install -g exa-mcp-server

# Install Python packages
echo ""
echo -e "${YELLOW}Installing Python packages...${NC}"

# Ensure pip3 is up to date
echo "Updating pip..."
pip3 install --upgrade pip

# Install uvx if not present
if ! command -v uvx &> /dev/null; then
    echo "Installing uvx..."
    pip3 install uvx
fi

# Install Semgrep
echo "Installing Semgrep..."
pip3 install semgrep

# Install Semgrep MCP
echo "Installing Semgrep MCP server..."
pip3 install semgrep-mcp

echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Set up your API keys by running: ./.claude/setup-mcp-env.sh"
echo "2. Verify installation by running: ./.claude/verify-mcp-tools.sh"
echo "3. Copy the configuration files to Claude app directories:"
echo ""
echo "   For Claude Desktop:"
echo "   cp .claude/claude_desktop_config.json ~/Library/Application\\ Support/Claude/"
echo ""
echo "   For Code Claude:"
echo "   cp .claude/claude_code_config.json ~/.vscode/extensions/codeclaudeapp.claude-code-*/"
echo ""
echo "4. Restart Claude Desktop and/or VS Code to load the new MCP servers"