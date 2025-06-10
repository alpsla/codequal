#!/bin/bash
# Environment Check - Validate development environment setup
# Usage: ./env-check.sh

set -e

echo "🔍 Checking development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "✅ $1: ${GREEN}$(command -v "$1")${NC}"
        if [ "$1" = "node" ]; then
            echo "   Version: $(node --version)"
        elif [ "$1" = "npm" ]; then
            echo "   Version: $(npm --version)"
        elif [ "$1" = "git" ]; then
            echo "   Version: $(git --version)"
        fi
    else
        echo -e "❌ $1: ${RED}Not found${NC}"
        return 1
    fi
}

# Check Node.js
echo "📦 Checking Node.js..."
check_command "node"

# Check npm
echo "📦 Checking npm..."
check_command "npm"

# Check Git
echo "🔧 Checking Git..."
check_command "git"

# Check TypeScript
echo "📝 Checking TypeScript..."
if npm list -g typescript &> /dev/null; then
    echo -e "✅ TypeScript: ${GREEN}Installed globally${NC}"
else
    echo -e "⚠️ TypeScript: ${YELLOW}Not installed globally (may use local version)${NC}"
fi

# Check Docker (optional)
echo "🐳 Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "✅ Docker: ${GREEN}$(command -v docker)${NC}"
    echo "   Version: $(docker --version)"
else
    echo -e "⚠️ Docker: ${YELLOW}Not found (optional for development)${NC}"
fi

# Check environment files
echo "📋 Checking environment files..."
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "✅ .env: ${GREEN}Found${NC}"
else
    echo -e "⚠️ .env: ${YELLOW}Not found${NC}"
fi

if [ -f "$PROJECT_ROOT/.env.test" ]; then
    echo -e "✅ .env.test: ${GREEN}Found${NC}"
else
    echo -e "⚠️ .env.test: ${YELLOW}Not found${NC}"
fi

# Check key directories
echo "📁 Checking project structure..."
for dir in "packages" "apps" "integration-tests" "scripts" "docs"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        echo -e "✅ $dir/: ${GREEN}Found${NC}"
    else
        echo -e "❌ $dir/: ${RED}Missing${NC}"
    fi
done

# Check package.json
echo "📦 Checking package.json..."
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "✅ package.json: ${GREEN}Found${NC}"
    echo "   Project name: $(cat "$PROJECT_ROOT/package.json" | grep '"name"' | head -1 | cut -d'"' -f4)"
else
    echo -e "❌ package.json: ${RED}Missing${NC}"
fi

echo ""
echo "🏁 Environment check completed!"