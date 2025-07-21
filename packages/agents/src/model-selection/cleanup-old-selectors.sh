#!/bin/bash

# Cleanup script for old model selector implementations
# This script removes deprecated model selectors and test files

echo "🧹 Cleaning up old model selector implementations..."
echo "=================================================="

# Files to be removed (deprecated implementations)
OLD_FILES=(
  # Old model selectors (keeping for now as they're marked deprecated)
  # "../deepwiki/deepwiki-model-selector.ts"
  # "../researcher/final/researcher-model-selector.ts"
  
  # Test implementations
  "../researcher/test-unified-researcher.ts"
  "../researcher/test-unified-researcher-service.ts"
  "../researcher/unified-researcher-service.ts"
  
  # Mock and test files
  "../../tests/model-selection/unified-model-selector.test.ts"
)

# Remove old test files
echo "Removing test implementations..."
for file in "${OLD_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ❌ Removing: $file"
    rm "$file"
  fi
done

# Update imports in existing files
echo -e "\n📝 Files that need import updates:"
echo "=================================="

# Find files still importing old selectors
echo -e "\nFiles importing old DeepWikiModelSelector:"
grep -r "from.*deepwiki-model-selector" .. --include="*.ts" --exclude-dir=node_modules | grep -v "unified-model-selector"

echo -e "\nFiles importing old ResearcherModelSelector:"
grep -r "from.*researcher-model-selector" .. --include="*.ts" --exclude-dir=node_modules | grep -v "unified-model-selector"

echo -e "\n✅ Cleanup complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Update any remaining imports to use unified-model-selector"
echo "2. Run 'npm run build' to ensure everything compiles"
echo "3. Run production research to update all configurations"