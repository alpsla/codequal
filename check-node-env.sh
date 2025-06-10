#!/bin/bash

echo "🔍 Node.js Environment Check"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "1️⃣ Node.js Versions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Current Node: $(node --version)"
echo "Current NPM: $(npm --version)"
echo "Which node: $(which node)"
echo "Which npm: $(which npm)"

echo ""
echo "2️⃣ Checking for multiple Node installations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check common Node locations
locations=(
    "/usr/local/bin/node"
    "/opt/homebrew/bin/node"
    "/opt/homebrew/Cellar/node/*/bin/node"
    "/opt/homebrew/Cellar/node@20/*/bin/node"
    "$HOME/.nvm/versions/node/*/bin/node"
)

for loc in "${locations[@]}"; do
    if [ -f "$loc" ] || ls $loc 2>/dev/null | head -1 > /dev/null; then
        for file in $loc; do
            if [ -f "$file" ]; then
                version=$($file --version 2>/dev/null || echo "unknown")
                echo "Found: $file (version $version)"
            fi
        done
    fi
done

echo ""
echo "3️⃣ Package Manager Configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "/Users/alpinro/Code Prjects/codequal"

if grep -q '"packageManager"' package.json; then
    echo "packageManager field:"
    grep '"packageManager"' package.json
    echo ""
    echo -e "${YELLOW}This locks the project to a specific npm version${NC}"
fi

echo ""
echo "4️⃣ Jest Compatibility Check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Jest 29.7.0 officially supports:"
echo "  - Node.js: ^14.15.0 || ^16.10.0 || >=18.0.0"
echo ""
echo "Your Node.js v23.11.0 is newer than officially tested versions."
echo "This might cause compatibility issues."

echo ""
echo "5️⃣ Recommendations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "1. Use Node.js v20 LTS (most stable):"
echo "   brew install node@20"
echo "   brew link --overwrite node@20"
echo ""
echo "2. Or use nvm to manage versions:"
echo "   nvm install 20"
echo "   nvm use 20"
echo ""
echo "3. Move project to path without spaces:"
echo "   ./move-project.sh"
echo ""
echo "4. Use alternative test runner that supports Node v23:"
echo "   npm install --save-dev vitest"
