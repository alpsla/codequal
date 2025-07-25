#!/bin/bash

# Script to clean up old DeepWiki code and keep only the simplified version

echo "🧹 Cleaning up old DeepWiki implementation..."
echo "This will remove the complex storage-based solution and keep only the simplified temp-based version."
echo ""

# Define files to remove (old complex solution)
OLD_FILES=(
  # Old services with repository storage
  "apps/api/src/services/deepwiki-manager.ts"
  "apps/api/src/services/deepwiki-manager.js"
  "apps/api/src/services/deepwiki-manager.d.ts"
  "apps/api/src/services/deepwiki-manager-real.ts"
  "apps/api/src/services/enhanced-deepwiki-manager.ts"
  "apps/api/src/services/deepwiki-storage-monitor.ts"
  "apps/api/src/services/deepwiki-storage-optimizer.ts"
  
  # Old routes
  "apps/api/src/routes/deepwiki-storage.ts"
  
  # Archive services we won't use
  "apps/api/src/services/supabase-archive-service.ts"
  
  # Old test files
  "apps/api/src/__tests__/services/deepwiki-manager.test.ts"
  "apps/api/src/__tests__/services/deepwiki-distribution.test.ts"
  
  # Storage monitoring services we created but won't use
  "apps/api/src/services/digitalocean-storage-monitor.ts"
  "apps/api/src/services/supabase-storage-monitor.ts"
  "apps/api/src/routes/database-storage.ts"
  "apps/api/src/routes/supabase-storage.ts"
  
  # Documentation for old approach
  "docs/deepwiki-storage-contraction-plan.md"
  "docs/supabase-storage-migration-strategy.md"
  
  # Scripts for old approach
  "kubernetes/scripts/analyze-storage-costs.sh"
  "scripts/monitor-digitalocean-storage.ts"
  "scripts/monitor-supabase-storage.ts"
  "scripts/cleanup-database-storage.ts"
)

# Files to keep (new simplified solution)
echo "✅ Keeping these files (simplified solution):"
echo "  - apps/api/src/services/deepwiki-manager-simplified.ts"
echo "  - apps/api/src/services/deepwiki-temp-manager.ts"
echo "  - apps/api/src/routes/deepwiki-temp-storage.ts"
echo "  - kubernetes/deepwiki-autoscaling.yaml"
echo "  - scripts/manage-deepwiki-temp-storage.sh"
echo "  - docs/deepwiki-simplification-guide.md"
echo "  - docs/deepwiki-pr-analysis-flow.md"
echo ""

# Backup directory
BACKUP_DIR="backup/old-deepwiki-code-$(date +%Y%m%d-%H%M%S)"

echo "📦 Creating backup at: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup and remove old files
for file in "${OLD_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  Backing up: $file"
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file"
    rm "$file"
  fi
done

echo ""
echo "🔍 Checking for type definitions that need updating..."

# Update imports in files that might reference old code
FILES_TO_CHECK=(
  "apps/api/src/routes/analysis.ts"
  "apps/api/src/routes/repository.ts"
  "apps/api/src/routes/index.ts"
  "apps/api/src/index.ts"
)

for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    if grep -q "deepwiki-manager" "$file" | grep -v "simplified"; then
      echo "  ⚠️  $file may need import updates"
    fi
  fi
done

echo ""
echo "📝 Next steps:"
echo "1. Update any imports from 'deepwiki-manager' to 'deepwiki-manager-simplified'"
echo "2. Remove references to removed routes in apps/api/src/index.ts"
echo "3. Run 'npm run build' to ensure everything compiles"
echo "4. Test the simplified DeepWiki functionality"
echo ""
echo "✅ Cleanup complete! Old files backed up to: $BACKUP_DIR"