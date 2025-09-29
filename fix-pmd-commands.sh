#!/bin/bash

# Fix PMD commands across the codebase
# Changes "pmd check" to "pmd pmd" for PMD 6.x compatibility

echo "Fixing PMD commands across the codebase..."
echo "=========================================="
echo ""

# Files to update
FILES=(
  "packages/agents/src/two-branch/analyzers/v9-all-tools-config.ts"
  "packages/agents/src/two-branch/analyzers/v9-java-analyzer.ts"
  "packages/agents/src/two-branch/services/tool-executor-service.ts"
  "packages/agents/src/two-branch/services/tool-executor-service-proper.ts"
  "packages/agents/src/two-branch/tools/tool-connection-manager.ts"
  "packages/agents/src/two-branch/parsers/java-tool-parser.ts"
  "packages/agents/src/two-branch/utils/local-repository-manager.ts"
  "packages/agents/src/two-branch/utils/kubernetes-repository-manager.ts"
)

echo "Files to update:"
for file in "${FILES[@]}"; do
  echo "  - $file"
done
echo ""

# Create backup
echo "Creating backup..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "$file.bak.pmd"
  fi
done
echo "✅ Backups created with .bak.pmd extension"
echo ""

# Update files
echo "Updating PMD commands..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Replace "pmd check" with "pmd pmd"
    sed -i '' 's/pmd check/pmd pmd/g' "$file"

    # Remove unsupported flags for PMD 6.x
    sed -i '' 's/--no-progress//g' "$file"
    sed -i '' 's/--no-cache//g' "$file"
    sed -i '' 's/--threads [0-9]*//g' "$file"

    echo "✅ Updated $file"
  else
    echo "⚠️ File not found: $file"
  fi
done
echo ""

# Show changes
echo "Changes made:"
echo "-------------"
for file in "${FILES[@]}"; do
  if [ -f "$file" ] && [ -f "$file.bak.pmd" ]; then
    DIFF=$(diff -u "$file.bak.pmd" "$file" | grep -E "^[\+\-].*pmd" | head -5)
    if [ ! -z "$DIFF" ]; then
      echo "In $file:"
      echo "$DIFF"
      echo ""
    fi
  fi
done

echo "✅ PMD commands fixed across all files"
echo ""
echo "To verify changes:"
echo "  grep -r 'pmd check' packages/agents/src/two-branch/"
echo ""
echo "To revert changes:"
echo "  for f in ${FILES[@]}; do mv \$f.bak.pmd \$f; done"