#!/bin/bash

echo "🚨 Emergency Jest Reinstall"
echo "========================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "1️⃣ Removing ALL Jest-related packages..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Remove all Jest packages
rm -rf node_modules/jest*
rm -rf node_modules/@jest
rm -rf node_modules/ts-jest
rm -rf node_modules/@types/jest
rm -rf node_modules/babel-jest
rm -rf node_modules/create-jest

echo "✅ Removed Jest packages"

echo ""
echo "2️⃣ Clearing npm cache..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm cache clean --force

echo ""
echo "3️⃣ Installing Jest with exact versions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Install exact versions
npm install --save-dev jest@29.7.0 --legacy-peer-deps
npm install --save-dev ts-jest@29.1.1 --legacy-peer-deps
npm install --save-dev @types/jest@29.5.0 --legacy-peer-deps

echo ""
echo "4️⃣ Verifying installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if build directory exists now
if [ -d "node_modules/jest-cli/build" ]; then
    echo -e "${GREEN}✅ jest-cli/build directory exists!${NC}"
    ls -la node_modules/jest-cli/build/ | head -5
else
    echo -e "${RED}❌ jest-cli/build still missing${NC}"
    
    echo ""
    echo "Trying alternative: Installing from GitHub directly..."
    npm install --save-dev https://github.com/facebook/jest/tarball/v29.7.0 --legacy-peer-deps
fi

echo ""
echo "5️⃣ Testing Jest..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try different ways to run Jest
echo "Method 1: npx jest --version"
npx jest --version 2>&1 || echo "Failed"

echo ""
echo "Method 2: node_modules/.bin/jest --version"
./node_modules/.bin/jest --version 2>&1 || echo "Failed"

echo ""
echo "Method 3: Direct node execution"
if [ -f "node_modules/jest/bin/jest.js" ]; then
    node node_modules/jest/bin/jest.js --version 2>&1 || echo "Failed"
fi

echo ""
echo "6️⃣ If all else fails, trying yarn..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if yarn is available
if command -v yarn &> /dev/null; then
    echo "Yarn is available, trying yarn install..."
    yarn install
    yarn jest --version
else
    echo "Yarn not available"
    echo ""
    echo "Last resort: Try using pnpm"
    echo "  npm install -g pnpm"
    echo "  pnpm install"
    echo "  pnpm jest --version"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "If Jest still doesn't work:"
echo "1. The node_modules might be corrupted beyond repair"
echo "2. Try cloning the project to a path without spaces"
echo "3. Use Docker or a clean environment"
