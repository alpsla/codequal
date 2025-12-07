#!/bin/bash
# Sync V9 test reports from Oracle cloud to local machine
# Uses rsync for efficient incremental syncing

set -e

export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

LOCAL_DIR="/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs"
REMOTE_DIR="/home/opc/codequal/packages/agents/tests/integration/test-outputs/"

echo "=========================================="
echo "Oracle Cloud Report Sync"
echo "=========================================="
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found at: $SSH_KEY"
  exit 1
fi

# Create local directory if it doesn't exist
mkdir -p "$LOCAL_DIR"

echo "🔗 Connecting to Oracle cloud..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 $ORACLE_USER@$ORACLE_IP 'echo "Connected"' > /dev/null 2>&1; then
  echo "❌ Cannot connect to Oracle cloud"
  exit 1
fi

echo "✅ Connected successfully"
echo ""

# Show remote reports
echo "📋 Available reports on Oracle cloud:"
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  "ls -lth $REMOTE_DIR*.md | head -10" | awk '{print "   "$9" ("$5")"}'
echo ""

# Count reports
REMOTE_COUNT=$(ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP "ls -1 $REMOTE_DIR*.md 2>/dev/null | wc -l" | tr -d ' ')
LOCAL_COUNT=$(ls -1 "$LOCAL_DIR"/*.md 2>/dev/null | wc -l || echo "0")

echo "📊 Report counts:"
echo "   Remote (Oracle): $REMOTE_COUNT reports"
echo "   Local (Mac):     $LOCAL_COUNT reports"
echo ""

# Sync with rsync
echo "🔄 Syncing reports..."
rsync -avz --progress \
  -e "ssh -i \"$SSH_KEY\"" \
  $ORACLE_USER@$ORACLE_IP:$REMOTE_DIR \
  "$LOCAL_DIR/"

if [ $? -eq 0 ]; then
  # Count again after sync
  NEW_LOCAL_COUNT=$(ls -1 "$LOCAL_DIR"/*.md 2>/dev/null | wc -l || echo "0")
  DOWNLOADED=$((NEW_LOCAL_COUNT - LOCAL_COUNT))

  echo ""
  echo "✅ Sync complete!"
  echo ""
  echo "📥 Downloaded $DOWNLOADED new/updated reports"
  echo "📁 Total local reports: $NEW_LOCAL_COUNT"
  echo ""
  echo "📂 Local directory:"
  echo "   $LOCAL_DIR"
  echo ""

  # Show most recent local reports
  echo "📋 Most recent local reports:"
  ls -lth "$LOCAL_DIR"/*.md | head -5 | awk '{print "   "$9" ("$5", "$6" "$7")"}'
  echo ""
else
  echo "❌ Sync failed"
  exit 1
fi

echo "=========================================="
echo "✅ Sync complete!"
echo "=========================================="
