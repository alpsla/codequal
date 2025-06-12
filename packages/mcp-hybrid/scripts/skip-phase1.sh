#!/bin/bash

# Move problematic files temporarily to fix build
echo "🔧 Moving problematic Phase 1 files temporarily..."

cd "$(dirname "$0")/.." || exit 1

# Create a temporary directory for problematic files
mkdir -p src/adapters/direct/.skip

# Move Phase 1 files that have old interfaces
FILES_TO_SKIP=(
  "madge-direct.ts"
  "license-checker-direct.ts"
  "npm-audit-direct.ts"
  "jscpd-direct.ts"
  "dependency-cruiser-enhanced.ts"
  "role-specific-cruisers.ts"
  "shared-cache.ts"
)

for file in "${FILES_TO_SKIP[@]}"; do
  if [ -f "src/adapters/direct/$file" ]; then
    mv "src/adapters/direct/$file" "src/adapters/direct/.skip/$file"
    echo "Moved: $file"
  fi
done

echo "✅ Problematic files moved to .skip directory"
echo ""
echo "Now try building: npm run build"
