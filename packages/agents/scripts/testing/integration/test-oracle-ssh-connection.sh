#!/bin/bash
#
# Test Oracle Cloud SSH Connection with New Key
#

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Oracle Cloud SSH Connection Test                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"

echo "Configuration:"
echo "  SSH Key: $SSH_KEY"
echo "  Oracle IP: $ORACLE_IP"
echo "  User: $ORACLE_USER"
echo ""

# Test 1: Check if SSH port is open
echo "Test 1: Checking if SSH port is reachable..."
if nc -zv -w 5 $ORACLE_IP 22 2>&1 | grep -q "succeeded"; then
  echo "  ✅ SSH port 22 is open"
else
  echo "  ❌ SSH port 22 is not reachable"
  echo "  Check if Oracle instance is running"
  exit 1
fi
echo ""

# Test 2: Check SSH key permissions
echo "Test 2: Checking SSH key permissions..."
PERMS=$(stat -f "%OLp" "$SSH_KEY" 2>/dev/null || stat -c "%a" "$SSH_KEY" 2>/dev/null)
if [ "$PERMS" = "600" ]; then
  echo "  ✅ SSH key permissions are correct (600)"
else
  echo "  ⚠️  SSH key permissions are $PERMS (should be 600)"
  echo "  Fixing permissions..."
  chmod 600 "$SSH_KEY"
  echo "  ✅ Permissions fixed"
fi
echo ""

# Test 3: Attempt SSH connection
echo "Test 3: Attempting SSH connection..."
if ssh -o ConnectTimeout=10 \
       -o StrictHostKeyChecking=no \
       -o BatchMode=yes \
       -i "$SSH_KEY" \
       "${ORACLE_USER}@${ORACLE_IP}" \
       "echo 'Connection successful!'" 2>/dev/null; then
  echo "  ✅ SSH connection successful!"
  echo ""

  # Test 4: Check environment
  echo "Test 4: Checking Oracle environment..."
  ssh -i "$SSH_KEY" "${ORACLE_USER}@${ORACLE_IP}" << 'EOF'
    echo "  Node version: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
    echo "  PostgreSQL: $(psql --version 2>/dev/null || echo 'Not installed')"
    echo "  Redis: $(redis-cli --version 2>/dev/null || echo 'Not installed')"
    echo "  Disk space: $(df -h /home | tail -1 | awk '{print $4}' | xargs echo 'available')"
EOF
  echo ""

  echo "════════════════════════════════════════════════════════════════"
  echo "✅ All tests passed! Oracle Cloud is ready"
  echo "════════════════════════════════════════════════════════════════"
  echo ""
  echo "Next step: Run V9 E2E test"
  echo "  ./oracle-run-v9-e2e-complete.sh"
  echo ""

else
  echo "  ❌ SSH connection failed"
  echo ""
  echo "Possible issues:"
  echo "  1. Public key not yet added to Oracle Cloud"
  echo "  2. Oracle instance needs to be restarted after adding key"
  echo "  3. Wrong username (should be 'opc')"
  echo "  4. Security group blocking SSH"
  echo ""
  echo "To add public key to Oracle Cloud:"
  echo "  1. Login to Oracle Cloud Console"
  echo "  2. Go to Compute → Instances"
  echo "  3. Click on your instance (IP: $ORACLE_IP)"
  echo "  4. Add SSH key from: /tmp/oracle-ssh-public-key.txt"
  echo ""
  echo "Public key file: /tmp/oracle-ssh-public-key.txt"
  echo "Detailed instructions: /tmp/ORACLE_SSH_KEY_SETUP.md"
  echo ""

  # Show verbose connection attempt for debugging
  echo "Verbose connection attempt:"
  ssh -vvv -o ConnectTimeout=10 \
          -i "$SSH_KEY" \
          "${ORACLE_USER}@${ORACLE_IP}" \
          "echo 'test'" 2>&1 | grep -E "(Offering|Authenticated|Permission)" | head -10

  exit 1
fi
