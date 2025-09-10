#!/bin/bash

# Cleanup script for obsolete files in agents package
# Created: 2025-09-10

echo "🧹 Starting cleanup of obsolete files..."

# Create archive directory
ARCHIVE_DIR="_archive/2025-09-10-obsolete-root-files"
mkdir -p "$ARCHIVE_DIR"

# Move debug and raw output files
echo "📦 Archiving debug and raw output files..."
mv debug-*.txt deepwiki-*.txt manual-*.txt raw-*.txt run1-output.txt *-raw-response.txt *-output.txt "$ARCHIVE_DIR/" 2>/dev/null

# Move old analysis scripts
echo "📦 Archiving old analysis scripts..."
mv analyze-rust-pr-*.ts analyze-veritone-pr.ts veritone-complete.ts "$ARCHIVE_DIR/" 2>/dev/null
mv generate-dashboard-data.ts generate-markdown-report.ts generate-real-pr-report.ts "$ARCHIVE_DIR/" 2>/dev/null
mv generate-v8-*.ts generate-v8-*.js "$ARCHIVE_DIR/" 2>/dev/null

# Move model research scripts (important ones already moved to src/two-branch/scripts)
echo "📦 Archiving old model research scripts..."
mv check-all-role-configurations.ts check-latest-fast-models.ts check-model-selections.js "$ARCHIVE_DIR/" 2>/dev/null
mv check-supabase-configs.ts create-proper-configs.ts create-tables-and-research.ts "$ARCHIVE_DIR/" 2>/dev/null
mv insert-with-correct-schema.ts populate-model-configurations.ts "$ARCHIVE_DIR/" 2>/dev/null
# NOTE: trigger-model-research.ts and research-latest-2025-models.ts moved to src/two-branch/scripts/

# Move debug scripts
echo "📦 Archiving debug scripts..."
mv debug-issues.js debug-pr-branch-parsing.ts clear-all-redis-cache.ts "$ARCHIVE_DIR/" 2>/dev/null
mv review-metrics.ts show-monitoring-status.ts "$ARCHIVE_DIR/" 2>/dev/null

# Move other obsolete scripts
echo "📦 Archiving other obsolete scripts..."
mv direct-openrouter-cost-test.ts open-reports.js session-wrapper-final.ts analyze-registry.js "$ARCHIVE_DIR/" 2>/dev/null

# Remove strange files
echo "🗑️  Removing invalid files..."
rm -f "s+{s+...s+})" "s+{s+...s+},s+retryCounts+*s+100)" 2>/dev/null

# Move patch file
mv add-location-finder.patch "$ARCHIVE_DIR/" 2>/dev/null

echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "- Archived files moved to: $ARCHIVE_DIR"
echo "- Kept: Configuration files, Docker configs, build scripts"
echo "- Moved to src/two-branch/scripts/: trigger-model-research.ts, research-latest-2025-models.ts"
echo "- Moved to src/two-branch/tests/: test-v9-comprehensive.ts"
echo ""
echo "💡 Next steps:"
echo "1. Review archived files in $ARCHIVE_DIR"
echo "2. Delete archive after confirming nothing important was removed"
echo "3. Run 'npm run build' to ensure everything still works"