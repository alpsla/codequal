#!/bin/bash

echo "🚨 Complete NPM and Jest Reset"
echo "============================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "⚠️  This will reset node_modules and reinstall everything"
echo "Press Ctrl+C to cancel, or wait 3 seconds to continue..."
sleep 3

echo ""
echo "1️⃣ Backing up important files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup .env if it exists
if [ -f ".env" ]; then
    cp .env .env.backup
    echo "✅ Backed up .env to .env.backup"
fi

echo ""
echo "2️⃣ Removing node_modules and lock files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Remove all node_modules
find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null
echo "✅ Removed all node_modules directories"

# Remove lock files
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml
echo "✅ Removed lock files"

echo ""
echo "3️⃣ Clearing npm cache..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm cache clean --force
echo "✅ Cleared npm cache"

echo ""
echo "4️⃣ Installing dependencies fresh..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Install with specific npm settings
npm install --legacy-peer-deps

echo ""
echo "5️⃣ Verifying installations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check key packages
packages=("jest" "ts-jest" "@types/jest" "typescript" "axios" "@supabase/supabase-js")

all_good=true
for pkg in "${packages[@]}"; do
    if npm list "$pkg" &>/dev/null; then
        echo -e "${GREEN}✅ $pkg installed${NC}"
    else
        echo -e "${RED}❌ $pkg missing${NC}"
        all_good=false
    fi
done

echo ""
echo "6️⃣ Testing Jest..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test Jest
npx jest --version

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Jest is working${NC}"
    
    # Create and run a simple test
    cat > test-jest.test.js << 'EOF'
describe('Jest Test', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });
});
EOF
    
    npx jest test-jest.test.js --no-coverage
    rm -f test-jest.test.js
else
    echo -e "${RED}❌ Jest still not working${NC}"
fi

echo ""
echo "7️⃣ Rebuilding packages..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to rebuild
npm run build || echo "Build had some issues, but continuing..."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$all_good" = true ]; then
    echo -e "${GREEN}✅ All packages installed successfully${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Reapply the axios patch: ./patch-axios.sh"
    echo "2. Run Phase 3 tests: ./integration-tests/scripts/test-phase3-skip-build.sh"
else
    echo -e "${YELLOW}⚠️  Some packages had issues${NC}"
    echo ""
    echo "Try:"
    echo "1. Check your Node.js version: node --version"
    echo "2. Use a different npm registry: npm config set registry https://registry.npmjs.org/"
    echo "3. Install packages individually"
fi
