#!/bin/bash
# Oracle BUG #91 Verification Test
# Runs Quarkus PR #100 analysis and verifies issue categorization

set -e

echo "🧪 BUG #91 Verification Test - Oracle Cloud"
echo "=========================================="
echo ""
echo "Expected:"
echo "  - Total issues: ~982 (829 NEW + 153 EXISTING)"
echo "  - NEW: ~680-700 (only truly new issues)"
echo "  - EXISTING_MODIFIED: ~40-60 (existing in modified files)"
echo "  - EXISTING_REST: ~90-110 (existing in unchanged files)"
echo ""
echo "Running Quarkus PR #100 analysis..."
echo ""

cd ~/codequal/packages/agents

# Run the full Oracle test
timeout 600 npx ts-node src/two-branch/tests/integration/test-oracle-quarkus-pr100.ts 2>&1 | tee /tmp/bug91-verification.log

# Extract categorization results
echo ""
echo "📊 Issue Categorization Results:"
echo "================================"
grep -A 10 "Issue Status Distribution" /tmp/bug91-verification.log || echo "Status distribution not found"

echo ""
echo "🔍 Checking for BUG #91 fix markers..."
grep "BUG #91" /tmp/bug91-verification.log || echo "No BUG #91 debug logs found"

echo ""
echo "✅ Test complete - check results above"
