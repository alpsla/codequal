#!/bin/bash

echo "📦 Moving CodeQual to a Better Location"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SOURCE="/Users/alpinro/Code Prjects/codequal"
TARGET="/Users/alpinro/codequal"

echo "This will help move your project from:"
echo "  ${SOURCE}"
echo "To:"
echo "  ${TARGET}"
echo ""
echo "This should fix issues caused by spaces in the path."
echo ""
echo -e "${YELLOW}Press Ctrl+C to cancel, or Enter to continue...${NC}"
read

echo ""
echo "1️⃣ Checking target location..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "$TARGET" ]; then
    echo -e "${RED}❌ Target directory already exists!${NC}"
    echo "   Please remove it first or choose a different location"
    exit 1
fi

echo "✅ Target location is available"

echo ""
echo "2️⃣ Creating target directory..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p "$TARGET"
echo "✅ Created $TARGET"

echo ""
echo "3️⃣ Copying project files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Copy everything except node_modules
echo "Copying source files..."
rsync -av --progress \
  --exclude 'node_modules' \
  --exclude '.turbo' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude '*.log' \
  "$SOURCE/" "$TARGET/"

echo ""
echo "4️⃣ Setting up new location..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$TARGET"

# Update any absolute paths in scripts
echo "Updating paths in scripts..."
find . -name "*.sh" -type f -exec sed -i '' "s|/Users/alpinro/Code Prjects/codequal|/Users/alpinro/codequal|g" {} \; 2>/dev/null || true

echo ""
echo "5️⃣ Installing dependencies in new location..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm install

echo ""
echo "6️⃣ Testing in new location..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test Jest
echo "Testing Jest..."
npx jest --version

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Jest works in new location!${NC}"
else
    echo -e "${YELLOW}⚠️  Jest still has issues${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Migration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your project is now at: $TARGET"
echo ""
echo "Next steps:"
echo "1. cd $TARGET"
echo "2. npm run build"
echo "3. npm test"
echo ""
echo "The original project is still at:"
echo "  $SOURCE"
echo ""
echo "Once you verify everything works, you can remove the old location."
