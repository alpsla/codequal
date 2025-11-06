#!/bin/bash
# Sync debug-enabled code to Oracle Cloud and run debug test
# This ensures Oracle uses the same code with DEBUG-PR# logging

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Sync Debug Code to Oracle Cloud and Run Test                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Upload debug-enabled source files
echo "📤 Step 1: Uploading debug-enabled source files..."
echo "   → v9-integrated-analyzer.ts"
scp -i "$KEY" src/two-branch/analyzers/v9-integrated-analyzer.ts "$HOST":~/codequal/packages/agents/src/two-branch/analyzers/ 2>&1 | grep -v "Warning"

echo "   → v9-report-compiler.ts"
scp -i "$KEY" src/two-branch/services/v9-report-compiler.ts "$HOST":~/codequal/packages/agents/src/two-branch/services/ 2>&1 | grep -v "Warning"

echo "   → v9-grouped-report-formatter.ts"
scp -i "$KEY" src/two-branch/analyzers/v9-grouped-report-formatter.ts "$HOST":~/codequal/packages/agents/src/two-branch/analyzers/ 2>&1 | grep -v "Warning"

echo "   → header-sections.ts"
scp -i "$KEY" src/two-branch/report/header-sections.ts "$HOST":~/codequal/packages/agents/src/two-branch/report/ 2>&1 | grep -v "Warning"

echo "   → test-debug-pr-number.ts"
scp -i "$KEY" test-debug-pr-number.ts "$HOST":~/codequal/packages/agents/ 2>&1 | grep -v "Warning"

echo "✅ All files uploaded"
echo ""

# Step 2: Verify files were uploaded
echo "🔍 Step 2: Verifying DEBUG-PR# logging is present..."
ssh -i "$KEY" "$HOST" 'grep -n "DEBUG-PR#" ~/codequal/packages/agents/src/two-branch/report/header-sections.ts | head -5'
if [ $? -eq 0 ]; then
    echo "✅ Debug logging confirmed in source files"
else
    echo "⚠️  Debug logging not found - upload may have failed"
fi
echo ""

# Step 3: Run the debug test
echo "🚀 Step 3: Running debug test with full logging..."
echo "   Test: Micronaut Core PR #200"
echo ""
ssh -i "$KEY" "$HOST" 'cd ~/codequal/packages/agents && npx ts-node test-debug-pr-number.ts 2>&1 | tee /tmp/debug-pr-full.log'
echo ""

# Step 4: Extract and display debug logs
echo "═══════════════════════════════════════════════════════════════"
echo "📊 Step 4: Extracting DEBUG-PR# logs from Oracle..."
echo "═══════════════════════════════════════════════════════════════"
ssh -i "$KEY" "$HOST" 'cat /tmp/debug-pr-full.log | grep "DEBUG-PR#"'
echo ""
echo "═══════════════════════════════════════════════════════════════"

# Step 5: Download the report
echo ""
echo "📥 Step 5: Downloading generated report..."
scp -i "$KEY" "$HOST":~/codequal/reports/debug-pr-number-micronaut-test.md /tmp/oracle-debug-report-synced.md 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Report downloaded to: /tmp/oracle-debug-report-synced.md"
    echo ""
    echo "📊 Checking PR number in report..."
    if grep -q "Pull Request.*#200" /tmp/oracle-debug-report-synced.md; then
        echo "   ✅ SUCCESS: PR #200 found in report!"
    else
        echo "   ❌ FAILURE: PR #200 not found in report"
        echo "   Report content:"
        grep "Pull Request" /tmp/oracle-debug-report-synced.md | head -1
    fi
else
    echo "⚠️  Could not download report"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ Sync and test complete!"
echo ""
echo "📄 Logs available:"
echo "   Oracle: /tmp/debug-pr-full.log"
echo "   Local:  /tmp/oracle-debug-report-synced.md"
echo ""
echo "🔍 To view full Oracle logs:"
echo "   ssh -i \"$KEY\" \"$HOST\" 'cat /tmp/debug-pr-full.log'"
echo "═══════════════════════════════════════════════════════════════"
