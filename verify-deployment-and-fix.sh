#!/bin/bash
# Verification and Deployment Script for TypeScript Fixes
# Run this on Oracle Cloud to diagnose and fix deployment issues

echo "=================================================="
echo "CodeQual Fix Deployment Verification"
echo "=================================================="
echo ""

# Step 1: Check current branch
echo "Step 1: Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "claude/fix-typescript-test-issues-016Q2HdfW7RnCwvagzPYS81L" ]; then
    echo "❌ ERROR: Wrong branch! Expected: claude/fix-typescript-test-issues-016Q2HdfW7RnCwvagzPYS81L"
    echo ""
    echo "Fix: Run the following commands:"
    echo "  git fetch origin"
    echo "  git checkout claude/fix-typescript-test-issues-016Q2HdfW7RnCwvagzPYS81L"
    echo "  git pull origin claude/fix-typescript-test-issues-016Q2HdfW7RnCwvagzPYS81L"
    exit 1
else
    echo "✅ Correct branch"
fi
echo ""

# Step 2: Check for uncommitted changes
echo "Step 2: Checking for uncommitted changes..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  WARNING: Uncommitted changes detected"
    git status --short
    echo ""
    echo "Consider stashing: git stash push -m 'temp-before-test'"
else
    echo "✅ Working tree clean"
fi
echo ""

# Step 3: Verify commits are present
echo "Step 3: Verifying fix commits..."
echo "Recent commits:"
git log --oneline -5
echo ""

COMMIT_1=$(git log --oneline | grep "fix(typescript): Fix auto-fix count calculation")
COMMIT_2=$(git log --oneline | grep "feat(autofix): Restore full auto-fix reporting")
COMMIT_3=$(git log --oneline | grep "docs(session): Add comprehensive November 14")

if [ -z "$COMMIT_1" ]; then
    echo "❌ ERROR: Missing commit 'fix(typescript): Fix auto-fix count calculation'"
    exit 1
else
    echo "✅ Found: $COMMIT_1"
fi

if [ -z "$COMMIT_2" ]; then
    echo "❌ ERROR: Missing commit 'feat(autofix): Restore full auto-fix reporting'"
    exit 1
else
    echo "✅ Found: $COMMIT_2"
fi

if [ -z "$COMMIT_3" ]; then
    echo "❌ ERROR: Missing commit 'docs(session): Add comprehensive November 14'"
    exit 1
else
    echo "✅ Found: $COMMIT_3"
fi
echo ""

# Step 4: Verify fix #1 - Auto-fix calculation
echo "Step 4: Verifying Fix #1 (Auto-fix calculation)..."
cd packages/agents
if grep -q "Auto-Fix Coverage (All Issues)" src/two-branch/report/business-impact.ts; then
    echo "✅ Fix #1 PRESENT: Auto-fix calculation shows both blocking and total"
    echo "   Location: src/two-branch/report/business-impact.ts"
else
    echo "❌ ERROR: Fix #1 MISSING!"
    echo "   Expected: 'Auto-Fix Coverage (All Issues)' in business-impact.ts"
    exit 1
fi
echo ""

# Step 5: Verify fix #2 - Google Search
echo "Step 5: Verifying Fix #2 (Google Search)..."
GOOGLE_COUNT=$(grep -c "Google Search" src/two-branch/report/educational-resources.ts)
YOUTUBE_COUNT=$(grep -c "youtube.com/results" src/two-branch/report/educational-resources.ts)

echo "   Google Search references: $GOOGLE_COUNT"
echo "   YouTube references: $YOUTUBE_COUNT"

if [ "$GOOGLE_COUNT" -ge 2 ] && [ "$YOUTUBE_COUNT" -eq 0 ]; then
    echo "✅ Fix #2 PRESENT: Educational resources use Google Search"
    echo "   Location: src/two-branch/report/educational-resources.ts:238,285"
else
    echo "❌ ERROR: Fix #2 MISSING or INCOMPLETE!"
    echo "   Expected: 2+ Google Search, 0 YouTube"
    echo "   Actual: $GOOGLE_COUNT Google, $YOUTUBE_COUNT YouTube"
    exit 1
fi
echo ""

# Step 6: Summary
echo "=================================================="
echo "✅ ALL FIXES VERIFIED IN SOURCE CODE"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Run test: cd packages/agents && npx ts-node tests/integration/test-v9-lite-e2e.ts"
echo "2. Check generated report for:"
echo "   - Auto-fix shows BOTH 'Blocking' and 'All Issues' rows"
echo "   - Educational resources use 'Google Search' not 'YouTube'"
echo ""
echo "If test still shows old behavior, check:"
echo "   - Test is actually running (not cached)"
echo "   - No other branch/directory is being used"
echo "   - Redis cache is cleared: redis-cli FLUSHALL"
