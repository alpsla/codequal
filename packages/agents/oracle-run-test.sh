#!/bin/bash
# Simple script to run E2E test on Oracle
# Avoids complex SSH quoting issues

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "Starting E2E test on Oracle..."
ssh -i "$KEY" "$HOST" 'cd ~/codequal/packages/agents && npx ts-node test-v9-e2e-complete.ts 2>&1 | tee /tmp/v9-test-output.log'
echo ""
echo "Test completed. Check /tmp/v9-test-output.log on Oracle for full output."



