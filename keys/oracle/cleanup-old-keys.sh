#!/bin/bash
#
# SSH Key Cleanup Script for Oracle Cloud
# Removes deprecated SSH keys from Oracle instance and archives them locally
#

set -e

CURRENT_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"
ARCHIVE_DIR="/Users/alpinro/Code Prjects/codequal/keys/oracle/.archive"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Oracle Cloud SSH Key Cleanup                                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify current key works
echo "Step 1: Verifying current key works..."
if ssh -i "$CURRENT_KEY" "${ORACLE_USER}@${ORACLE_IP}" "echo 'Current key verified'" > /dev/null 2>&1; then
    echo "  ✅ Current key (ssh-key-2025-10-07.key) works"
else
    echo "  ❌ Current key doesn't work! Aborting cleanup."
    exit 1
fi
echo ""

# Step 2: Show current keys on instance
echo "Step 2: Current authorized keys on Oracle instance:"
ssh -i "$CURRENT_KEY" "${ORACLE_USER}@${ORACLE_IP}" "cat ~/.ssh/authorized_keys" | \
  awk '{print "  " substr($0, 1, 80) "..."}'
echo ""

# Step 3: Remove old key from instance
echo "Step 3: Removing old key (ssh-key-2025-05-08) from Oracle instance..."
ssh -i "$CURRENT_KEY" "${ORACLE_USER}@${ORACLE_IP}" << 'EOF'
  # Backup current authorized_keys
  cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup

  # Remove old key (keep only the 2025-10-07 key)
  grep "codequal-oracle-20251007" ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.new

  # Replace authorized_keys
  mv ~/.ssh/authorized_keys.new ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys

  echo "✅ Old key removed from Oracle instance"
  echo "Remaining keys:"
  wc -l < ~/.ssh/authorized_keys | xargs echo "  Keys remaining:"
EOF

echo ""

# Step 4: Archive old keys locally
echo "Step 4: Archiving old keys locally..."
mkdir -p "$ARCHIVE_DIR"

# Archive old key from Desktop if it exists
if [ -f "/Users/alpinro/Desktop/Private key/ssh-key-2025-05-08.key" ]; then
  echo "  Moving ssh-key-2025-05-08.key* to archive..."
  mv "/Users/alpinro/Desktop/Private key/ssh-key-2025-05-08.key" "$ARCHIVE_DIR/" 2>/dev/null || true
  mv "/Users/alpinro/Desktop/Public Key/ssh-key-2025-05-08.key.pub" "$ARCHIVE_DIR/" 2>/dev/null || true
  echo "  ✅ Old keys archived"
else
  echo "  ℹ️  Old keys already removed from Desktop"
fi

echo ""

# Step 5: Verify cleanup
echo "Step 5: Verification..."
echo "  Current key on Oracle:"
ssh -i "$CURRENT_KEY" "${ORACLE_USER}@${ORACLE_IP}" "cat ~/.ssh/authorized_keys | head -1 | cut -c1-80"
echo "  ✅ Cleanup complete!"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Cleanup Summary                                             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo "  Active key: ssh-key-2025-10-07.key"
echo "  Old keys archived in: $ARCHIVE_DIR"
echo "  Oracle instance: Only current key remains"
echo ""
