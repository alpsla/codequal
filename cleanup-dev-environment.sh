#!/usr/bin/env bash
set -euo pipefail

# CodeQual Development Environment Cleanup Script
# Kills stale test processes and cleans temporary files

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  CodeQual Development Environment Cleanup                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Function to print status
print_status() {
  echo "✓ $1"
}

print_warning() {
  echo "⚠ $1"
}

# 1. Kill stale test processes
echo "🧹 Step 1: Killing stale test processes..."
KILLED_COUNT=0

# Find and kill npx ts-node test processes
PIDS=$(ps aux | grep -E "npx ts-node test-v9|npx ts-node test-v8" | grep -v grep | awk '{print $2}' || true)

if [ -n "$PIDS" ]; then
  for PID in $PIDS; do
    kill -9 "$PID" 2>/dev/null && KILLED_COUNT=$((KILLED_COUNT + 1)) || true
  done
  print_status "Killed $KILLED_COUNT stale test processes"
else
  print_status "No stale test processes found"
fi

# 2. Clean temporary test files
echo ""
echo "🗑️  Step 2: Cleaning temporary test files..."

# Clean test markers
if [ -f /tmp/test-complete-marker ]; then
  rm -f /tmp/test-complete-marker
  print_status "Removed test-complete-marker"
fi

# Clean test logs
LOGS_REMOVED=0
for LOG in /tmp/v9-test*.log /tmp/v9-*.log /tmp/test-output.log /tmp/single-test-output.log /tmp/manifest-test-output.log /tmp/manifest-verification-test.log /tmp/v9-multi-framework-test.log; do
  if [ -f "$LOG" ]; then
    rm -f "$LOG"
    LOGS_REMOVED=$((LOGS_REMOVED + 1))
  fi
done

if [ $LOGS_REMOVED -gt 0 ]; then
  print_status "Removed $LOGS_REMOVED temporary log files"
else
  print_status "No temporary log files to remove"
fi

# 3. Clean old test outputs (optional - keep last 10 of each type)
echo ""
echo "📊 Step 3: Cleaning old test outputs..."
TEST_OUTPUTS_DIR="/Users/alpinro/Code Prjects/codequal/packages/agents/test-outputs"

if [ -d "$TEST_OUTPUTS_DIR" ]; then
  # Count total files
  TOTAL_FILES=$(cd "$TEST_OUTPUTS_DIR" && ls -1 v9-lite-*.md v9-lite-*.json 2>/dev/null | wc -l | tr -d ' ')

  if [ "$TOTAL_FILES" -gt 20 ]; then
    print_warning "Found $TOTAL_FILES test output files"

    # Keep only the last 10 markdown reports (delete oldest)
    cd "$TEST_OUTPUTS_DIR"
    MD_COUNT=$(ls -1t v9-lite-*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$MD_COUNT" -gt 10 ]; then
      ls -1t v9-lite-*.md | tail -n +11 | xargs rm -f 2>/dev/null || true
    fi

    # Keep only the last 10 JSON reports (delete oldest)
    JSON_COUNT=$(ls -1t v9-lite-*.json 2>/dev/null | wc -l | tr -d ' ')
    if [ "$JSON_COUNT" -gt 10 ]; then
      ls -1t v9-lite-*.json | tail -n +11 | xargs rm -f 2>/dev/null || true
    fi

    cd - > /dev/null
    REMAINING_FILES=$(cd "$TEST_OUTPUTS_DIR" && ls -1 v9-lite-*.md v9-lite-*.json 2>/dev/null | wc -l | tr -d ' ')
    REMOVED=$((TOTAL_FILES - REMAINING_FILES))

    print_status "Removed $REMOVED old test outputs (kept last 10 of each type)"
  else
    print_status "Only $TOTAL_FILES test outputs found (keeping all)"
  fi
else
  print_warning "Test outputs directory not found"
fi

# 4. Clean cache directories (optional)
echo ""
echo "💾 Step 4: Cleaning cache directories..."
CACHE_CLEANED=0

for CACHE_DIR in ".mypy_cache" ".ruff_cache" ".turbo/cache" ".serena/cache"; do
  if [ -d "/Users/alpinro/Code Prjects/codequal/$CACHE_DIR" ]; then
    rm -rf "/Users/alpinro/Code Prjects/codequal/$CACHE_DIR"
    CACHE_CLEANED=$((CACHE_CLEANED + 1))
  fi
done

if [ $CACHE_CLEANED -gt 0 ]; then
  print_status "Cleaned $CACHE_CLEANED cache directories"
else
  print_status "No cache directories to clean"
fi

# 5. Clean .DS_Store files
echo ""
echo "🍎 Step 5: Removing .DS_Store files..."
DS_STORE_COUNT=$(find "/Users/alpinro/Code Prjects/codequal" -name ".DS_Store" 2>/dev/null | wc -l | tr -d ' ')

if [ "$DS_STORE_COUNT" -gt 0 ]; then
  find "/Users/alpinro/Code Prjects/codequal" -name ".DS_Store" -delete 2>/dev/null || true
  print_status "Removed $DS_STORE_COUNT .DS_Store files"
else
  print_status "No .DS_Store files found"
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Cleanup Complete!                                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  • Processes killed: $KILLED_COUNT"
echo "  • Logs removed: $LOGS_REMOVED"
echo "  • Cache dirs cleaned: $CACHE_CLEANED"
echo "  • .DS_Store files removed: $DS_STORE_COUNT"
echo ""
echo "🎯 Your development environment is now clean!"
echo ""
