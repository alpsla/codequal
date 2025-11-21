#!/bin/bash

# Run database diagnostic on Oracle Cloud
# This script uploads and executes the diagnostic script on the remote server

set -e

# Configuration
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"
SSH_KEY="/Users/alpinro/CodePrjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
REMOTE_DIR="/home/opc/codequal"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Oracle Cloud Database Diagnostic Runner                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Upload diagnostic script
echo "📤 Uploading diagnostic script..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  packages/agents/scripts/testing/oracle/oracle-diagnose-db.sh \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/" 2>&1 | grep -v "Permanently added" || true

echo "✅ Upload complete"
echo ""

# Run diagnostic script
echo "🔍 Running diagnostic on Oracle Cloud..."
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" \
  "cd ${REMOTE_DIR} && chmod +x oracle-diagnose-db.sh && ./oracle-diagnose-db.sh"

echo ""
echo "✅ Diagnostic complete"
