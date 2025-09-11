#!/bin/bash

# Cleanup DeepWiki References Script
# Purpose: Remove all deprecated DeepWiki service references from the codebase
# Date: 2025-09-10

echo "🧹 Starting DeepWiki reference cleanup..."
echo "========================================="

# Count initial references
INITIAL_COUNT=$(grep -r "DeepWiki\|deepwiki\|DEEPWIKI" --include="*.ts" --include="*.js" --include="*.md" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . 2>/dev/null | wc -l)
echo "📊 Found $INITIAL_COUNT references to clean up"

# Replace USE_DEEPWIKI_MOCK with USE_MOCK_ANALYZER in all files
echo ""
echo "1️⃣ Replacing USE_DEEPWIKI_MOCK with USE_MOCK_ANALYZER..."
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/_archive/*" \
  -exec grep -l "USE_DEEPWIKI_MOCK" {} \; 2>/dev/null | while read file; do
    echo "   Updating: $file"
    sed -i.bak 's/USE_DEEPWIKI_MOCK/USE_MOCK_ANALYZER/g' "$file"
    rm "${file}.bak" 2>/dev/null
done

# Replace DeepWiki Service references with Code Analyzer
echo ""
echo "2️⃣ Replacing DeepWiki Service with Code Analyzer..."
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/_archive/*" \
  -exec grep -l "DeepWiki Service\|DeepWiki service" {} \; 2>/dev/null | while read file; do
    echo "   Updating: $file"
    sed -i.bak 's/DeepWiki Service/Code Analyzer/g' "$file"
    sed -i.bak 's/DeepWiki service/Code analyzer/g' "$file"
    sed -i.bak 's/deepwiki service/code analyzer/g' "$file"
    rm "${file}.bak" 2>/dev/null
done

# Remove DeepWiki pod references
echo ""
echo "3️⃣ Removing DeepWiki pod and Kubernetes references..."
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/_archive/*" \
  -exec grep -l "DeepWiki.*pod\|deepwiki.*pod\|kubectl.*deepwiki" {} \; 2>/dev/null | while read file; do
    echo "   Cleaning: $file"
    # Comment out or remove kubectl commands for DeepWiki
    sed -i.bak '/kubectl.*deepwiki/d' "$file"
    sed -i.bak '/DeepWiki.*pod/d' "$file"
    rm "${file}.bak" 2>/dev/null
done

# Update test commands
echo ""
echo "4️⃣ Updating test commands..."
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -exec grep -l "test-real-deepwiki\|test-deepwiki" {} \; 2>/dev/null | while read file; do
    echo "   Updating: $file"
    sed -i.bak 's/test-real-deepwiki/test-real-analysis/g' "$file"
    sed -i.bak 's/test-deepwiki/test-analysis/g' "$file"
    rm "${file}.bak" 2>/dev/null
done

# Remove DeepWiki from .env.example and config files
echo ""
echo "5️⃣ Cleaning configuration files..."
for config_file in .env.example .env.sample .mcp.json package.json; do
  if [ -f "$config_file" ]; then
    if grep -q "DEEPWIKI\|deepwiki" "$config_file"; then
      echo "   Cleaning: $config_file"
      sed -i.bak '/DEEPWIKI/d' "$config_file" 2>/dev/null
      sed -i.bak '/deepwiki/d' "$config_file" 2>/dev/null
      rm "${config_file}.bak" 2>/dev/null
    fi
  fi
done

# Create migration notes
echo ""
echo "6️⃣ Creating migration documentation..."
cat > DEEPWIKI_MIGRATION_NOTES.md << 'EOF'
# DeepWiki Service Migration Notes

## Date: 2025-09-10

### Summary
The DeepWiki service has been deprecated and removed from the CodeQual project.

### Changes Made
1. **Environment Variables**
   - `USE_DEEPWIKI_MOCK` → `USE_MOCK_ANALYZER`
   - Removed all DeepWiki-related environment variables

2. **Service References**
   - "DeepWiki Service" → "Code Analyzer"
   - Removed all Kubernetes pod references
   - Updated all test commands

3. **Test Commands**
   - `test-real-deepwiki.ts` → `test-real-analysis.ts`
   - Removed DeepWiki mock flags from commands

4. **Configuration**
   - Removed DeepWiki entries from .mcp.json
   - Updated session starter scripts
   - Cleaned up documentation

### Migration Steps for Developers
1. Update any local `.env` files to remove DeepWiki variables
2. Use `USE_MOCK_ANALYZER=true` instead of `USE_DEEPWIKI_MOCK=true`
3. No longer need to check for DeepWiki pod status
4. Code analysis now handled locally or via cloud services

### Affected Components
- Session starter scripts
- Test runners
- Analyzer modules
- Documentation

### Notes
- All core functionality preserved
- Performance may be improved without external service dependency
- Simpler development setup without Kubernetes requirement
EOF

# Count remaining references
echo ""
FINAL_COUNT=$(grep -r "DeepWiki\|deepwiki\|DEEPWIKI" --include="*.ts" --include="*.js" --include="*.md" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=_archive . 2>/dev/null | wc -l)
echo "========================================="
echo "✅ Cleanup complete!"
echo "📊 Remaining references: $FINAL_COUNT (from $INITIAL_COUNT)"
echo ""

if [ $FINAL_COUNT -gt 0 ]; then
  echo "⚠️  Some references may remain in:"
  echo "   - Archive folders"
  echo "   - Git history/logs"
  echo "   - Binary files"
  echo ""
  echo "To see remaining references:"
  echo "grep -r 'DeepWiki\\|deepwiki' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=_archive ."
fi

echo "📝 Migration notes saved to: DEEPWIKI_MIGRATION_NOTES.md"