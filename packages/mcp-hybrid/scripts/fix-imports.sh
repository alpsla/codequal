#!/bin/bash

# Fix all import errors in direct adapters
echo "🔧 Fixing import errors in direct adapters..."

cd "$(dirname "$0")/.." || exit 1

# Fix the base class import in all files
echo "Updating base class imports..."

# List of files to fix
FILES=(
  "src/adapters/direct/npm-outdated-direct.ts"
  "src/adapters/direct/bundlephobia-direct.ts"
  "src/adapters/direct/sonarjs-direct.ts"
  "src/adapters/direct/license-checker-direct.ts"
  "src/adapters/direct/npm-audit-direct.ts"
  "src/adapters/direct/jscpd-direct.ts"
  "src/adapters/direct/madge-direct.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Replace BaseDirectAdapter with DirectToolAdapter
    sed -i '' 's/BaseDirectAdapter/DirectToolAdapter/g' "$file"
    # Fix the import statement
    sed -i '' "s/import { BaseDirectAdapter } from '.\/base-adapter';/import { DirectToolAdapter } from '.\/base-adapter';/g" "$file"
  fi
done

echo "✅ Import fixes complete!"
echo ""
echo "Now run: npm run build"
