#!/bin/bash
# Show the generated report

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "📄 V9 Report Contents:"
echo "===================="
echo ""

ssh -i "$KEY" "$HOST" 'cat /tmp/v9-reports/v9-grouped-report-1760369279988.md'



