#!/bin/bash
# Run CodeQual LSP/SARIF + Telemetry Test on Oracle Cloud
#
# Usage:
#   ./run-codequal-test.sh
#
# Or from local machine:
#   ssh -i "keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128 'bash -s' < run-codequal-test.sh

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  CodeQual LSP/SARIF + Fix Validation Telemetry Test"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Navigate to project directory
cd ~/codequal/packages/agents || {
  echo "❌ Error: Could not find ~/codequal/packages/agents"
  exit 1
}

# Load environment variables
if [ -f .env ]; then
  echo "📋 Loading environment variables..."
  set -a
  source .env
  set +a
  echo "✅ Environment loaded"
else
  echo "⚠️  Warning: .env file not found"
fi

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Missing Supabase credentials"
  echo "   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

if [ -z "$REDIS_URL" ]; then
  echo "⚠️  Warning: REDIS_URL not set, using default"
  export REDIS_URL="redis://10.116.0.7:6379"
fi

echo ""
echo "🔧 Running test..."
echo ""

# Run the test
npx ts-node tests/integration/typescript/test-codequal-lsp-sarif-telemetry.ts 2>&1 | tee /tmp/codequal-test.log

# Check exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Test completed successfully"
  echo ""
  echo "📥 To download LSP file:"
  echo "   scp -i \"keys/oracle/ssh-key-2025-10-07.key\" opc@129.213.49.128:/tmp/v9-reports/codequal-test/codequal-lsp-actions.json ./"
  echo ""
  echo "📥 To download SARIF file:"
  echo "   scp -i \"keys/oracle/ssh-key-2025-10-07.key\" opc@129.213.49.128:/tmp/v9-reports/codequal-test/codequal-sarif-report.json ./"
  echo ""
  echo "📋 To view test log:"
  echo "   ssh -i \"keys/oracle/ssh-key-2025-10-07.key\" opc@129.213.49.128 'cat /tmp/codequal-test.log'"
else
  echo ""
  echo "❌ Test failed - check /tmp/codequal-test.log for details"
  exit 1
fi


