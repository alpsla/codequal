#!/bin/bash

echo "🔍 CodeQual Pre-Push Checklist"
echo "=============================="
echo ""

cd /Users/alpinro/Code\ Prjects/codequal

# 1. Check git status
echo "1️⃣ Git Status Check:"
echo "-------------------"
MODIFIED_COUNT=$(git status --porcelain | grep -c "^ M")
NEW_COUNT=$(git ls-files --others --exclude-standard | wc -l)
echo "- Modified files: $MODIFIED_COUNT"
echo "- New files: $NEW_COUNT"

# 2. List our new researcher files
echo ""
echo "2️⃣ New Researcher Implementation Files:"
echo "--------------------------------------"
if [ -d "packages/agents/src/researcher/final" ]; then
    echo "✅ Found researcher/final directory:"
    ls -la packages/agents/src/researcher/final/
else
    echo "❌ Researcher final directory not found"
fi

# 3. Check if we need to build
echo ""
echo "3️⃣ Build Status:"
echo "---------------"
if [ -d "packages/agents/dist" ]; then
    echo "✅ Agents package has dist folder"
else
    echo "⚠️  Agents package needs building"
fi

# 4. Show modified documentation files
echo ""
echo "4️⃣ Modified Documentation:"
echo "-------------------------"
git diff --name-only | grep -E "\.(md|MD)$" || echo "No markdown files modified"

# 5. Show cleanup scripts
echo ""
echo "5️⃣ Cleanup Scripts:"
echo "------------------"
ls -la scripts/cleanup*.sh 2>/dev/null || echo "No cleanup scripts found"
ls -la scripts/run-cleanup.sh 2>/dev/null || echo ""

echo ""
echo "📋 Recommended Actions:"
echo "======================"
echo "1. Run cleanup script to remove exploratory files (optional)"
echo "2. Build and test the project"
echo "3. Review and stage changes"
echo "4. Commit with descriptive message"
echo "5. Push to origin"
echo ""
echo "Commands:"
echo "  ./scripts/run-cleanup.sh          # Remove exploratory files"
echo "  npm run build                     # Build all packages"
echo "  npm test                          # Run all tests"
echo "  git add -A                        # Stage all changes"
echo "  git commit -m 'message'           # Commit"
echo "  git push origin main              # Push to origin"
