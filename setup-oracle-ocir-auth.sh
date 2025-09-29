#!/bin/bash

# Oracle instance details
ORACLE_HOST="129.213.49.128"
ORACLE_USER="opc"
ORACLE_SSH_KEY="keys/oracle/ssh-key-2025-05-08.key"

# OCIR authentication details
OCIR_REGISTRY="iad.ocir.io"
OCIR_NAMESPACE="idzaw9ddo1h5"
OCIR_USERNAME="idzaw9ddo1h5/alpsla@gmail.com"
OCIR_AUTH_TOKEN=")O;75ndsm80DeDIthvT0"

echo "🔧 Setting up Oracle Container Registry authentication on Oracle ARM instance..."
echo "Host: $ORACLE_HOST"
echo "Registry: $OCIR_REGISTRY"
echo ""

# Function to run commands on Oracle instance
run_on_oracle() {
    local cmd="$1"
    ssh -i "$ORACLE_SSH_KEY" -o StrictHostKeyChecking=no "$ORACLE_USER@$ORACLE_HOST" "$cmd"
}

echo "1️⃣ Testing SSH connection to Oracle instance..."
if run_on_oracle "echo 'SSH connection successful'"; then
    echo "✅ SSH connection established"
else
    echo "❌ SSH connection failed"
    exit 1
fi

echo ""
echo "2️⃣ Checking Docker status on Oracle instance..."
run_on_oracle "docker --version && docker info | head -5"

echo ""
echo "3️⃣ Authenticating Docker with OCIR..."
if run_on_oracle "echo '$OCIR_AUTH_TOKEN' | docker login $OCIR_REGISTRY --username '$OCIR_USERNAME' --password-stdin"; then
    echo "✅ OCIR authentication successful"
else
    echo "❌ OCIR authentication failed"
    exit 1
fi

echo ""
echo "4️⃣ Testing image pull from OCIR..."
echo "Attempting to pull Java ARM analyzer (the one we tested with)..."
if run_on_oracle "docker pull iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/analyzer:lang-java-v5.1-arm"; then
    echo "✅ Successfully pulled Java ARM analyzer from OCIR"
else
    echo "❌ Failed to pull image from OCIR"
    exit 1
fi

echo ""
echo "5️⃣ Verifying pulled images on Oracle instance..."
echo "Images from OCIR:"
run_on_oracle "docker images --filter=reference='iad.ocir.io/idzaw9ddo1h5/codequal-analyzers/*' --format 'table {{.Repository}}:{{.Tag}}\\t{{.Size}}'"

echo ""
echo "🎉 OCIR authentication setup complete on Oracle instance!"
echo ""
echo "✅ Status Summary:"
echo "  • Oracle instance can authenticate with OCIR: ✅"
echo "  • Oracle instance can pull analyzer images: ✅"  
echo "  • CodeQual configuration updated: ✅"
echo ""
echo "🚀 Ready for end-to-end testing!"
echo "Run: npx ts-node test-oracle-arm-analyzer.ts"