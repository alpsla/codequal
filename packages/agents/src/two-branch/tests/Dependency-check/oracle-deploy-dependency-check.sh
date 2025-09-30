#!/bin/bash
# Deploy Dependency-Check tests to Oracle Cloud
# Run from local machine

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"
SERVER="opc@129.213.49.128"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "Deploying Dependency-Check Tests"
echo "========================================"
echo ""

echo "[1/3] Transferring test scripts to Oracle..."
scp -i "$KEY" \
  "$SCRIPT_DIR/test-dependency-check-complete.sh" \
  "$SCRIPT_DIR/test-dependency-check-quick.sh" \
  "$SERVER:/tmp/"

echo ""
echo "[2/3] Setting execute permissions..."
ssh -i "$KEY" $SERVER "chmod +x /tmp/test-dependency-check-*.sh"

echo ""
echo "[3/3] Deployment complete!"
echo ""
echo "========================================"
echo "Ready to Run"
echo "========================================"
echo ""
echo "Option 1: Complete Test (first time, ~15 minutes)"
echo "  ssh -i \"$KEY\" $SERVER \"/tmp/test-dependency-check-complete.sh\""
echo ""
echo "Option 2: Quick Test (after database downloaded, ~30-60s)"
echo "  ssh -i \"$KEY\" $SERVER \"/tmp/test-dependency-check-quick.sh\""
echo ""
echo "Option 3: Interactive Session"
echo "  ssh -i \"$KEY\" $SERVER"
echo "  cd /tmp && ./test-dependency-check-complete.sh"
echo ""
echo "✓ DEPLOYMENT COMPLETE"
echo "========================================"
