#!/bin/bash
# Run PR number debug test on Oracle Cloud
# This will help identify if the issue is environment-specific

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Running PR Number Debug Test on Oracle Cloud                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# First, upload the debug test file
echo "📤 Step 1: Uploading debug test file to Oracle Cloud..."
scp -i "$KEY" test-debug-pr-number.ts "$HOST":~/codequal/packages/agents/
if [ $? -eq 0 ]; then
    echo "✅ Upload successful"
else
    echo "❌ Upload failed"
    exit 1
fi
echo ""

# Run the test on Oracle Cloud
echo "🚀 Step 2: Running debug test on Oracle Cloud..."
echo "   This will test with Micronaut Core PR #200"
echo ""
ssh -i "$KEY" "$HOST" 'cd ~/codequal/packages/agents && npx ts-node test-debug-pr-number.ts 2>&1 | tee /tmp/debug-pr-test.log'
echo ""

# Download the generated report
echo "📥 Step 3: Downloading generated report from Oracle Cloud..."
scp -i "$KEY" "$HOST":~/codequal/reports/debug-pr-number-micronaut-test.md /tmp/oracle-debug-report.md 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Report downloaded to: /tmp/oracle-debug-report.md"
    echo ""
    echo "📊 Checking PR number in report..."
    PR_NUMBER=$(grep -oP '\*\*Pull Request:\*\* #\K\d+' /tmp/oracle-debug-report.md | head -1)
    if [ -n "$PR_NUMBER" ]; then
        echo "   Found: PR #$PR_NUMBER"
        if [ "$PR_NUMBER" = "200" ]; then
            echo "   ✅ Correct PR number!"
        else
            echo "   ❌ Wrong PR number! Expected 200, got $PR_NUMBER"
        fi
    else
        echo "   ❌ Could not find PR number in report"
    fi
else
    echo "⚠️  Could not download report (may not exist yet)"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ Test complete!"
echo ""
echo "📄 Full logs available at:"
echo "   Oracle Cloud: /tmp/debug-pr-test.log"
echo "   Local report: /tmp/oracle-debug-report.md"
echo ""
echo "🔍 To view full Oracle logs, run:"
echo "   ssh -i \"$KEY\" \"$HOST\" 'cat /tmp/debug-pr-test.log'"
echo "═══════════════════════════════════════════════════════════════"
