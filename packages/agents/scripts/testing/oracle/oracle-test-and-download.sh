#!/bin/bash
# Oracle Cloud V9 Test Runner with Auto-Download
# Runs V9 test on Oracle cloud and automatically downloads the generated report

set -e

export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

echo "=========================================="
echo "Oracle Cloud V9 Test Runner"
echo "=========================================="
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found at: $SSH_KEY"
  exit 1
fi

# Check SSH key permissions
PERMS=$(stat -f "%A" "$SSH_KEY" 2>/dev/null || stat -c "%a" "$SSH_KEY" 2>/dev/null)
if [ "$PERMS" != "600" ]; then
  echo "⚠️  Fixing SSH key permissions..."
  chmod 600 "$SSH_KEY"
fi

# Test connection
echo "🔗 Testing connection to Oracle cloud..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 $ORACLE_USER@$ORACLE_IP 'echo "Connected"' > /dev/null 2>&1; then
  echo "❌ Cannot connect to Oracle cloud"
  exit 1
fi
echo "✅ Connected to Oracle cloud"
echo ""

# Run the test
echo "🚀 Starting V9 test on Oracle cloud..."
echo "   This may take 2-5 minutes depending on repository size..."
echo ""

ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && npx ts-node tests/integration/test-v9-lite-e2e.ts'

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "⚠️  Test exited with code $TEST_EXIT_CODE"
  echo ""
fi

# Download the latest report
echo ""
echo "=========================================="
echo "📥 Downloading latest report..."
echo "=========================================="

LATEST_REPORT=$(ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -1')

if [ -z "$LATEST_REPORT" ]; then
  echo "❌ No reports found on Oracle cloud"
  exit 1
fi

REPORT_NAME=$(basename "$LATEST_REPORT")
LOCAL_DIR="/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs"

# Create local directory if it doesn't exist
mkdir -p "$LOCAL_DIR"

# Download the report
scp -i "$SSH_KEY" \
  "$ORACLE_USER@$ORACLE_IP:$LATEST_REPORT" \
  "$LOCAL_DIR/"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Report downloaded successfully!"
  echo ""
  echo "📄 Report location:"
  echo "   $LOCAL_DIR/$REPORT_NAME"
  echo ""
  echo "📊 Quick view:"
  echo "   open \"$LOCAL_DIR/$REPORT_NAME\""
  echo ""

  # Show report summary
  echo "=========================================="
  echo "📋 Report Summary"
  echo "=========================================="
  grep -E "^## Quality Decision$|^\*\*Result:\*\*|^## 📊 Executive Summary$|^❌|^✅|^\*\*Total Issues\*\*:|Tool \| Issues Found" "$LOCAL_DIR/$REPORT_NAME" | head -20
  echo ""
else
  echo "❌ Failed to download report"
  exit 1
fi

echo "=========================================="
echo "✅ Test and download complete!"
echo "=========================================="
