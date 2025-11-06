#!/bin/bash
# Diagnose Supabase connection issue on Oracle

KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
HOST="opc@129.213.49.128"

echo "🔍 Supabase Connection Diagnostic"
echo "================================"
echo ""

echo "📤 Step 1: Uploading diagnostic script..."
scp -i "$KEY" test-supabase-connection.ts "$HOST:~/codequal/packages/agents/"

echo ""
echo "🚀 Step 2: Running diagnostic on Oracle..."
echo ""

ssh -i "$KEY" "$HOST" 'bash -s' << 'ENDSSH'
cd ~/codequal/packages/agents

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "Environment loaded. Running diagnostic..."
echo ""

# Run diagnostic
npx ts-node test-supabase-connection.ts
ENDSSH

echo ""
echo "================================"
echo "✅ Diagnostic complete!"






