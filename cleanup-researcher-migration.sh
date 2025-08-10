#!/bin/bash

# Cleanup and Migration Script for Researcher Service
# Moves the new dynamic model selector to production

echo "🧹 Starting Researcher Service Cleanup and Migration"
echo "=" 
CODEQUAL_ROOT="/Users/alpinro/Code Prjects/codequal"
cd "$CODEQUAL_ROOT"

# 1. Create backup of old files
echo "📦 Creating backup of old files..."
mkdir -p packages/agents/src/researcher/_archive_2025_01
mkdir -p packages/agents/_old_tests_2025_01

# Archive outdated researcher files
echo "📁 Archiving outdated researcher files..."
mv packages/agents/src/researcher/model-freshness-validator.ts packages/agents/src/researcher/_archive_2025_01/ 2>/dev/null
mv packages/agents/src/researcher/dynamic-freshness-validator.ts packages/agents/src/researcher/_archive_2025_01/ 2>/dev/null
mv packages/agents/src/researcher/simple-freshness-validator.ts packages/agents/src/researcher/_archive_2025_01/ 2>/dev/null
mv packages/agents/src/researcher/enhanced-researcher-service-dynamic.ts packages/agents/src/researcher/_archive_2025_01/ 2>/dev/null
mv packages/agents/src/researcher/production-researcher-service-enhanced.ts packages/agents/src/researcher/_archive_2025_01/ 2>/dev/null
mv packages/agents/src/researcher/enhanced-model-selection-rules.ts packages/agents/src/researcher/_archive_2025_01/ 2>/dev/null
mv packages/agents/src/researcher/integrate-enhanced-selection.ts packages/agents/src/researcher/_archive_2025_01/ 2>/dev/null
mv packages/agents/src/researcher/demonstrate-correct-flow.ts packages/agents/src/researcher/_archive_2025_01/ 2>/dev/null

# Archive old test files
echo "📁 Archiving old test files..."
mv packages/agents/test-dynamic-researcher.ts packages/agents/_old_tests_2025_01/ 2>/dev/null
mv packages/agents/test-enhanced-researcher.ts packages/agents/_old_tests_2025_01/ 2>/dev/null
mv packages/agents/test-simple-freshness.ts packages/agents/_old_tests_2025_01/ 2>/dev/null
mv packages/agents/test-deepwiki-real-api.ts packages/agents/_old_tests_2025_01/ 2>/dev/null
mv packages/agents/test-deepwiki-configs.ts packages/agents/_old_tests_2025_01/ 2>/dev/null
mv packages/agents/test-truly-dynamic.ts packages/agents/_old_tests_2025_01/ 2>/dev/null

# 2. Move production files to standard location
echo "✨ Moving production files to standard locations..."

# Rename truly-dynamic-selector to production name
if [ -f "packages/agents/src/researcher/truly-dynamic-selector.ts" ]; then
  cp packages/agents/src/researcher/truly-dynamic-selector.ts packages/agents/src/standard/services/dynamic-model-selector.ts
  echo "✅ Copied truly-dynamic-selector to standard/services"
fi

# 3. Keep only essential test files
echo "🧪 Keeping essential test files..."
mkdir -p packages/agents/src/standard/tests/model-selection
mv packages/agents/test-deepwiki-5-configs.ts packages/agents/src/standard/tests/model-selection/ 2>/dev/null
mv packages/agents/test-final-differentiation.ts packages/agents/src/standard/tests/model-selection/ 2>/dev/null
mv packages/agents/test-scoring-differentiation.ts packages/agents/src/standard/tests/model-selection/ 2>/dev/null

# 4. Clean up root test files
echo "🗑️  Removing temporary test files..."
rm -f packages/agents/test-deepwiki-final.ts
rm -f packages/agents/test-fixed-report*.ts

echo "✅ Cleanup complete!"
echo ""
echo "📋 Summary:"
echo "  - Archived old files to: packages/agents/src/researcher/_archive_2025_01/"
echo "  - Moved production code to: packages/agents/src/standard/services/"
echo "  - Organized tests in: packages/agents/src/standard/tests/model-selection/"
echo ""
echo "🔄 Next steps:"
echo "  1. Update imports in dependent files"
echo "  2. Update scheduler to use new dynamic selector"
echo "  3. Update documentation"