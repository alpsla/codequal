#!/bin/bash
# Download the generated report from Oracle

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "📥 Downloading V9 Report from Oracle..."
echo ""

# Download the report
scp -i "$KEY" "$HOST:/tmp/v9-reports/v9-grouped-report-1760369279988.md" "./v9-report-latest.md"

echo ""
echo "✅ Report downloaded to: ./v9-report-latest.md"
echo ""
echo "📊 Report size:"
ls -lh "./v9-report-latest.md"






