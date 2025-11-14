#!/bin/bash
# Download report from Oracle Cloud test directory
# Source: /tmp/test-repo-1763140462119 on Oracle Cloud
# Destination: Current directory

SSH_KEY="${SSH_KEY:-/Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key}"
ORACLE_IP="${ORACLE_IP:-129.213.49.128}"
TEST_DIR="/tmp/test-repo-1763140462119"

echo "📥 Downloading report from Oracle Cloud"
echo "Source: opc@${ORACLE_IP}:${TEST_DIR}"
echo ""

# First, check what files are in the directory
echo "📋 Files in test directory:"
ssh -i "${SSH_KEY}" opc@${ORACLE_IP} "ls -lah ${TEST_DIR}/*.md 2>/dev/null || echo 'No .md files found'"
echo ""

# Create local download directory
LOCAL_DIR="./downloaded-reports/test-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${LOCAL_DIR}"

echo "💾 Downloading to: ${LOCAL_DIR}"

# Download all markdown reports
scp -i "${SSH_KEY}" "opc@${ORACLE_IP}:${TEST_DIR}/*.md" "${LOCAL_DIR}/" 2>/dev/null || {
    echo "❌ No .md files found, trying to download entire directory..."
    scp -i "${SSH_KEY}" -r "opc@${ORACLE_IP}:${TEST_DIR}" "${LOCAL_DIR}/" 2>/dev/null || {
        echo "❌ Failed to download. Checking if directory exists..."
        ssh -i "${SSH_KEY}" opc@${ORACLE_IP} "ls -la ${TEST_DIR}" || echo "Directory does not exist on Oracle Cloud"
        exit 1
    }
}

echo ""
echo "✅ Download complete!"
echo "📁 Files downloaded to: ${LOCAL_DIR}"
ls -lah "${LOCAL_DIR}"
