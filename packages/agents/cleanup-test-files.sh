#!/bin/bash

echo "🧹 Cleaning up test files and preserving production versions..."
echo "================================================"

# List of test files to REMOVE (old versions, debug files, etc.)
TEST_FILES_TO_REMOVE=(
  "test-debug.ts"
  "test-breaking-debug.ts"
  "test-report-debug.ts"
  "test-runner.ts"
  "test-all-report-sections.ts"
  "generate-fixed-report-simple.ts"
  "simulate-dev-cycle.ts"
  "simulate-real-data-report.ts"
  "test-enhanced-report.ts"  # Will be replaced with production version
  "generate-html-report.ts"  # Will be integrated into production test
)

# List of files to PRESERVE
FILES_TO_PRESERVE=(
  "src/standard/comparison/report-generator-v7-fixed.ts"  # Final report generator
  "src/standard/comparison/report-fixes.ts"  # Helper functions with educational insights
  "simulate-dev-cycle-with-reports.ts"  # Keep for dev-cycle-orchestrator
  "test-zero-mocks-real-deepwiki.ts"  # Keep as reference for real API usage
)

# Create backup directory
BACKUP_DIR="test-files-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Creating backup in $BACKUP_DIR"

# Backup files before removing
for file in "${TEST_FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    echo "  📦 Backing up $file"
    cp "$file" "$BACKUP_DIR/"
  fi
done

# Remove test files
echo -e "\n🗑️  Removing test files..."
for file in "${TEST_FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    echo "  ❌ Removing $file"
    rm "$file"
  fi
done

# Clean up test outputs directory (keep only latest)
echo -e "\n📂 Cleaning test-outputs directory..."
if [ -d "test-outputs" ]; then
  # Keep only the 5 most recent files
  cd test-outputs
  ls -t | tail -n +6 | xargs -r rm
  cd ..
  echo "  ✅ Kept only 5 most recent test outputs"
fi

# Clean up markdown confirmation files
echo -e "\n📄 Cleaning up confirmation files..."
rm -f REPORT-FIXES-CONFIRMATION.md
rm -f FINAL-REPORT-ZERO-MOCKS.md
echo "  ✅ Removed temporary confirmation files"

echo -e "\n✅ Cleanup complete!"
echo "================================================"
echo "Preserved files:"
for file in "${FILES_TO_PRESERVE[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  fi
done

echo -e "\n📝 Next step: Run create-production-test.ts to set up the final test"