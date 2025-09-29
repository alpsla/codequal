#!/bin/bash
# Build analyzers directly on Oracle instance and push to OCIR
# This eliminates the need for DigitalOcean registry entirely

set -e

# Configuration
ORACLE_USER="opc"
SSH_KEY="../../keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"

# Oracle Container Registry configuration
OCIR_REGION="iad"  # Change to your region (iad, phx, etc.)
OCIR_NAMESPACE="idvysoan2pwh"  # Your tenancy namespace
OCIR_REGISTRY="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}/codequal"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Oracle Cloud Native ARM Analyzer Build${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Oracle Instance: $INSTANCE_IP"
echo "  OCIR Registry: $OCIR_REGISTRY"
echo "  Region: $OCIR_REGION"
echo "  Namespace: $OCIR_NAMESPACE"
echo ""

# Why we should have done this from the start:
echo -e "${GREEN}Benefits of OCIR-only approach:${NC}"
echo "  ✅ Single cloud provider (Oracle) for compute AND storage"
echo "  ✅ Lower egress costs (same region transfer)"
echo "  ✅ Better performance (no cross-cloud latency)"
echo "  ✅ Simplified billing (one invoice)"
echo "  ✅ Native ARM64 support"
echo "  ✅ 500GB free storage in OCIR"
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

# Setup OCIR on Oracle instance (one-time setup)
setup_ocir() {
    echo -e "${BLUE}Setting up OCIR authentication...${NC}"

    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << EOF
# Check if already configured
if docker system info 2>&1 | grep -q "ocir.io"; then
    echo "✅ OCIR already configured"
else
    echo "Setting up OCIR for first time..."

    # These should be set as environment variables or config file
    read -p "Enter your OCI username (e.g., your.email@example.com): " OCI_USER
    read -sp "Enter your OCI auth token (NOT password): " OCI_AUTH_TOKEN
    echo

    # Login to OCIR
    echo \$OCI_AUTH_TOKEN | docker login ${OCIR_REGION}.ocir.io \\
        --username "${OCIR_NAMESPACE}/\$OCI_USER" \\
        --password-stdin

    if [ \$? -eq 0 ]; then
        echo "✅ Successfully configured OCIR"
    else
        echo "❌ Failed to configure OCIR"
        exit 1
    fi
fi
EOF
}

# Build analyzer directly to OCIR
build_to_ocir() {
    local LANG=$1
    local VERSION=$2

    echo -e "${BLUE}Building $LANG analyzer directly to OCIR...${NC}"

    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << EOF
set -e
cd /mnt/workspace

# The image tag for OCIR
OCIR_IMAGE="${OCIR_REGISTRY}/analyzer:lang-$LANG-$VERSION-arm"

echo "Building $LANG analyzer for OCIR..."

# Use the existing Dockerfile (already on the instance)
# or create a new one based on the language

# Build directly with OCIR tag
docker build -f Dockerfile.$LANG -t \$OCIR_IMAGE .

if [ \$? -eq 0 ]; then
    echo "✅ Built $LANG analyzer"

    # Push directly to OCIR
    echo "Pushing to Oracle Container Registry..."
    docker push \$OCIR_IMAGE

    if [ \$? -eq 0 ]; then
        echo "✅ Pushed $LANG analyzer to OCIR"

        # Verify
        docker pull \$OCIR_IMAGE > /dev/null 2>&1
        if [ \$? -eq 0 ]; then
            echo "✅ Verified $LANG analyzer in OCIR"
        fi
    else
        echo "❌ Failed to push to OCIR"
        exit 1
    fi
else
    echo "❌ Failed to build $LANG analyzer"
    exit 1
fi
EOF
}

# Main menu
echo -e "${YELLOW}What would you like to do?${NC}"
echo "  1) Setup OCIR authentication (first time only)"
echo "  2) Migrate existing images from DO to OCIR"
echo "  3) Build new analyzer directly to OCIR"
echo "  4) Update codebase to use OCIR"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        setup_ocir
        ;;
    2)
        echo "Run migrate-to-ocir.sh to migrate existing images"
        ;;
    3)
        echo -e "${YELLOW}Which analyzer to build?${NC}"
        echo "  1) Java (v5.1)"
        echo "  2) Python (v4.3)"
        echo "  3) JavaScript (v4.2)"
        echo "  4) TypeScript (v4.2)"
        echo "  5) Go (v3.8)"
        echo "  6) Ruby (v3.5)"
        echo "  7) PHP (v3.4)"
        echo "  8) C# (v3.2)"
        echo "  9) Rust (v2.9)"
        echo "  10) Swift (v2.7)"
        echo "  11) Kotlin (v2.5)"
        read -p "Enter analyzer number: " analyzer_choice

        case $analyzer_choice in
            1) build_to_ocir "java" "v5.1" ;;
            2) build_to_ocir "python" "v4.3" ;;
            3) build_to_ocir "javascript" "v4.2" ;;
            4) build_to_ocir "typescript" "v4.2" ;;
            5) build_to_ocir "go" "v3.8" ;;
            6) build_to_ocir "ruby" "v3.5" ;;
            7) build_to_ocir "php" "v3.4" ;;
            8) build_to_ocir "csharp" "v3.2" ;;
            9) build_to_ocir "rust" "v2.9" ;;
            10) build_to_ocir "swift" "v2.7" ;;
            11) build_to_ocir "kotlin" "v2.5" ;;
            *) echo "Invalid choice" ;;
        esac
        ;;
    4)
        echo -e "${BLUE}Updating codebase to use OCIR...${NC}"

        # Update V9 infrastructure files
        find packages/agents/src -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l "registry.digitalocean.com/codequal-registry" {} \; | while read file; do
            echo "Updating $file"
            sed -i '' "s|registry.digitalocean.com/codequal-registry|${OCIR_REGISTRY}|g" "$file"
        done

        echo "✅ Updated all code references to use OCIR"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Why Oracle-only is better:${NC}"
echo "1. **Cost**: Free ARM compute (4 OCPUs, 24GB RAM) + Free OCIR storage (500GB)"
echo "2. **Performance**: Same-region transfers = faster pulls"
echo "3. **Simplicity**: One cloud provider, one bill, one console"
echo "4. **Native ARM**: Built on ARM, stored on ARM cloud, run on ARM"
echo ""
echo -e "${YELLOW}Lesson learned:${NC}"
echo "When migrating to a new cloud provider, migrate EVERYTHING at once!"
echo "Don't keep dependencies on the old provider - it just creates complexity."