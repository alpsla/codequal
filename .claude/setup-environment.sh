#!/bin/bash
# CodeQual Environment Setup Script
# This script sets up environment variables and paths for Claude Code agents

# Detect project root (assumes script is in .claude/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CODEQUAL_ROOT="$(dirname "$SCRIPT_DIR")"

# Color output for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CodeQual Environment Setup${NC}"
echo -e "${BLUE}================================${NC}\n"

# Display paths
echo -e "${GREEN}✓ Project Root:${NC} $CODEQUAL_ROOT"
echo -e "${GREEN}✓ Agents Dir:${NC} $CODEQUAL_ROOT/packages/agents"
echo -e "${GREEN}✓ Config Dir:${NC} $CODEQUAL_ROOT/.claude\n"

# Check if we're in the correct directory
if [ ! -f "$CODEQUAL_ROOT/package.json" ]; then
    echo -e "${RED}✗ Error: Not in CodeQual project root!${NC}"
    echo -e "${YELLOW}  Expected package.json at: $CODEQUAL_ROOT/package.json${NC}"
    exit 1
fi

# Check key directories exist
echo -e "${BLUE}Checking project structure...${NC}"
REQUIRED_DIRS=(
    "packages/agents"
    "packages/agents/src"
    ".claude/agents"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$CODEQUAL_ROOT/$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir"
    else
        echo -e "${RED}✗${NC} $dir ${YELLOW}(missing)${NC}"
    fi
done

echo ""

# Check services
echo -e "${BLUE}Checking services...${NC}"

# Check Redis
if redis-cli ping &>/dev/null; then
    echo -e "${GREEN}✓ Redis:${NC} Running"
else
    echo -e "${YELLOW}⚠ Redis:${NC} Not running (optional)"
    echo -e "  ${YELLOW}Start with:${NC} redis-server --daemonize yes"
fi

# Check if build exists
if [ -d "$CODEQUAL_ROOT/packages/agents/dist" ]; then
    echo -e "${GREEN}✓ Build:${NC} exists"
else
    echo -e "${YELLOW}⚠ Build:${NC} Not found"
    echo -e "  ${YELLOW}Build with:${NC} cd packages/agents && npm run build"
fi

# Check Node modules
if [ -d "$CODEQUAL_ROOT/packages/agents/node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies:${NC} Installed"
else
    echo -e "${YELLOW}⚠ Dependencies:${NC} Not installed"
    echo -e "  ${YELLOW}Install with:${NC} cd packages/agents && npm install"
fi

echo ""

# Export useful aliases
echo -e "${BLUE}Setting up aliases...${NC}"
alias cdagents="cd $CODEQUAL_ROOT/packages/agents"
alias cdroot="cd $CODEQUAL_ROOT"
echo -e "${GREEN}✓${NC} cdagents - Navigate to packages/agents"
echo -e "${GREEN}✓${NC} cdroot - Navigate to project root"

echo ""

# Quick commands
echo -e "${BLUE}Quick Commands:${NC}"
echo -e "  ${GREEN}cd packages/agents${NC}      - Go to agents directory"
echo -e "  ${GREEN}npm run build${NC}           - Build the project"
echo -e "  ${GREEN}npm test${NC}                - Run tests"
echo -e "  ${GREEN}git status${NC}              - Check git status"

echo ""

# Environment export instructions
echo -e "${BLUE}To use in your shell:${NC}"
echo -e "  ${GREEN}source .claude/setup-environment.sh${NC}"
echo ""
echo -e "Or add to your ~/.bashrc or ~/.zshrc:"
echo -e "  ${GREEN}export CODEQUAL_ROOT=\"$CODEQUAL_ROOT\"${NC}"

echo ""
echo -e "${GREEN}✓ Environment setup complete!${NC}"
