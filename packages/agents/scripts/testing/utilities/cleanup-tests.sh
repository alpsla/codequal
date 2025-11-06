#!/bin/bash
# Test Cleanup Script - Remove Outdated Test Files
# Keep only: test-v9-e2e-complete.ts + infrastructure/config tests

cd "/Users/alpinro/Code Prjects/codequal/packages/agents"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Test Cleanup - Removing Outdated Test Files                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Files to KEEP (will NOT be deleted)
KEEP_FILES=(
  "test-v9-e2e-complete.ts"           # THE production test (confirmed working)
  "test-supabase-connection.ts"       # Infrastructure
  "test-supabase-models.ts"           # Infrastructure
  "test-supabase-quick.ts"            # Infrastructure
  "test-supabase-skills.ts"           # Infrastructure
  "test-model-diversity.ts"           # Configuration
  "test-model-diversity-fix.ts"       # Configuration
  "test-role-specific-models.ts"      # Configuration
  "test-config-on-demand.ts"          # Configuration
  "test-emergency-fallback-config.ts" # Configuration
)

# Files to DELETE (outdated/duplicate/superseded)
DELETE_FILES=(
  # V9 variants (superseded by test-v9-e2e-complete.ts)
  "test-v9-micronaut-e2e.ts"
  "test-v9-micronaut-fixed.ts"
  "test-v9-micronaut-simple.ts"
  "test-v9-e2e-streamlined.ts"
  "test-v9-real-e2e.ts"
  "test-v9-hybrid-e2e.ts"
  "test-v9-report-simple.ts"
  "test-v9-working.ts"
  "test-v9-limited.ts"
  "test-v9-e2e-iteration3-phase1.ts"
  "test-v9-sequential-kafka.ts"
  "test-v9-e2e-with-timeout.ts"
  
  # Bug-specific tests (bugs are now fixed)
  "test-bug-106-code-snippets.ts"
  "test-bug-107-link-validation.ts"
  "test-bug-108-ai-improvements.ts"
  "test-bug-109-safe-values.ts"
  "test-bug-110-model-tracking.ts"
  "test-bug-119-all-9-roles.ts"
  "test-bug-119-model-diversity.ts"
  
  # PMD-specific tests (PMD works, no need for separate tests)
  "test-pmd-configurations.ts"
  "test-pmd-emacs.ts"
  "test-pmd-formats.ts"
  "test-pmd-simple.ts"
  "test-fixed-pmd.ts"
  
  # Old tool tests (superseded by v9-e2e-complete)
  "test-all-java-tools-v5.ts"
  "test-final-java-tools.ts"
  "test-dependency-check-fix.ts"
  "test-spotbugs-parser.ts"
  
  # Experimental/duplicate tests
  "test-hybrid-simple.ts"
  "test-hybrid-performance.ts"
  "test-improved-agents.ts"
  "test-with-issues.ts"
  "test-vulnerable-repo.ts"
  "test-vulnerable-repo-full-report.ts"
  "test-multi-framework-all-tools.ts"
  
  # Old analysis tests
  "test-analysis-modes.ts"
  "test-batching-simulation.ts"
  "test-performance-comparison.ts"
  
  # Old scoring tests
  "test-app-vs-dev-scoring.ts"
  "test-app-score-migration.ts"
  
  # Specific/one-off tests
  "test-check-security-model.ts"
  "test-security-model.ts"
  "test-openrouter-key.ts"
  "test-specific-key.ts"
  "test-gemini-fallback.ts"
  "test-config-fix.ts"
  "test-generate-final-report.ts"
  "test-phase3-complete-integration.ts"
  "test-severity-quick.ts"
  "test-multi-repo-severity-validation.ts"
)

echo "📋 Files to KEEP (${#KEEP_FILES[@]}):"
for file in "${KEEP_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ⚠️  $file (not found)"
  fi
done
echo ""

echo "🗑️  Files to DELETE (${#DELETE_FILES[@]}):"
DELETED_COUNT=0
MISSING_COUNT=0
for file in "${DELETE_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  🔴 $file"
    DELETED_COUNT=$((DELETED_COUNT + 1))
  else
    echo "  ⚪ $file (already deleted)"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Summary                                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Files to keep: ${#KEEP_FILES[@]}"
echo "🔴 Files to delete: $DELETED_COUNT"
echo "⚪ Already deleted: $MISSING_COUNT"
echo ""
echo "Total files that will remain: ${#KEEP_FILES[@]}"
echo ""
echo "Press ENTER to proceed with deletion, or Ctrl+C to cancel..."
read

echo ""
echo "🗑️  Deleting files..."
for file in "${DELETE_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✅ Deleted: $file"
  fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Cleanup Complete!                                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Final Status:"
echo "  ✅ Kept: ${#KEEP_FILES[@]} files"
echo "  🗑️  Deleted: $DELETED_COUNT files"
echo ""
echo "📁 Remaining test files:"
ls -1 test-*.ts 2>/dev/null | wc -l | xargs echo "  Total:"
echo ""
ls -1 test-*.ts 2>/dev/null | head -20

