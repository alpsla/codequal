#!/bin/bash
# Script to migrate all ARM analyzer images from DigitalOcean to Oracle Container Registry
# This consolidates everything on Oracle Cloud Infrastructure

set -e

# Configuration
ORACLE_USER="opc"
SSH_KEY="../../keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"

# Registry configurations
DO_REGISTRY="registry.digitalocean.com/codequal-registry"
# OCIR format: <region>.ocir.io/<tenancy-namespace>/<repository>
OCIR_REGISTRY="iad.ocir.io/idvysoan2pwh/codequal"  # Update with your tenancy namespace

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Migrating ARM Analyzers to Oracle Registry${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# List of all analyzers with versions
ANALYZERS=(
    "java:v5.1"
    "python:v4.3"
    "javascript:v4.2"
    "typescript:v4.2"
    "go:v3.8"
    "ruby:v3.5"
    "php:v3.4"
    "csharp:v3.2"
    "rust:v2.9"
    "swift:v2.7"
    "kotlin:v2.5"
)

echo -e "${YELLOW}Images to migrate:${NC}"
for analyzer in "${ANALYZERS[@]}"; do
    IFS=':' read -r lang version <<< "$analyzer"
    echo "  - analyzer:lang-$lang-$version-arm"
done
echo ""

echo -e "${RED}IMPORTANT:${NC} Make sure you have:"
echo "1. Configured OCI CLI on the Oracle instance"
echo "2. Generated an auth token for OCIR"
echo "3. Updated the OCIR_REGISTRY variable with your tenancy namespace"
echo ""
read -p "Continue with migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

# Function to migrate a single image
migrate_image() {
    local LANG=$1
    local VERSION=$2
    local DO_IMAGE="$DO_REGISTRY/analyzer:lang-$LANG-$VERSION-arm"
    local OCIR_IMAGE="$OCIR_REGISTRY/analyzer:lang-$LANG-$VERSION-arm"

    echo -e "${BLUE}Migrating $LANG analyzer ($VERSION-arm)...${NC}"

    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << EOF
set -e

echo "Pulling from DigitalOcean registry..."
docker pull $DO_IMAGE

if [ \$? -eq 0 ]; then
    echo "✅ Pulled $LANG analyzer from DO registry"

    echo "Tagging for Oracle registry..."
    docker tag $DO_IMAGE $OCIR_IMAGE

    echo "Pushing to Oracle registry..."
    docker push $OCIR_IMAGE

    if [ \$? -eq 0 ]; then
        echo "✅ $LANG analyzer pushed to OCIR"

        # Verify the image exists in OCIR
        docker pull $OCIR_IMAGE > /dev/null 2>&1
        if [ \$? -eq 0 ]; then
            echo "✅ Verified $LANG analyzer in OCIR"

            # Get image size
            docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "$LANG-$VERSION-arm"
        else
            echo "❌ Failed to verify $LANG analyzer in OCIR"
        fi
    else
        echo "❌ Failed to push $LANG analyzer to OCIR"
        exit 1
    fi
else
    echo "❌ Failed to pull $LANG analyzer from DO registry"
    exit 1
fi

# Optional: Remove local copies to save space
docker rmi $DO_IMAGE $OCIR_IMAGE 2>/dev/null || true
EOF

    return $?
}

# Setup OCIR authentication on Oracle instance
echo -e "${YELLOW}Setting up OCIR authentication...${NC}"
ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'EOF'
# Check if OCI CLI is configured
if [ ! -f ~/.oci/config ]; then
    echo "❌ OCI CLI not configured. Please run 'oci setup config' first"
    exit 1
fi

# Login to OCIR
echo "Logging into Oracle Container Registry..."
# Format: docker login <region>.ocir.io
# Username: <tenancy-namespace>/<username> or <tenancy-namespace>/oracleidentitycloudservice/<username>
# Password: Auth token (not OCI password)

# You need to set these environment variables or replace them
OCIR_REGION="iad"
OCIR_NAMESPACE="idvysoan2pwh"  # Your tenancy namespace
OCIR_USERNAME="${OCIR_NAMESPACE}/oracleidentitycloudservice/your.email@example.com"  # Update this
OCIR_AUTH_TOKEN="your_auth_token_here"  # Update this

echo $OCIR_AUTH_TOKEN | docker login ${OCIR_REGION}.ocir.io \
    --username ${OCIR_USERNAME} \
    --password-stdin

if [ $? -eq 0 ]; then
    echo "✅ Successfully logged into OCIR"
else
    echo "❌ Failed to login to OCIR"
    echo "Please ensure:"
    echo "1. You have generated an auth token in OCI Console"
    echo "2. Username format is correct: <namespace>/<username>"
    echo "3. Using auth token as password (not your OCI password)"
    exit 1
fi

# Also ensure we're logged into DigitalOcean registry
doctl registry login 2>/dev/null || echo "Note: Assuming already logged into DO registry"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to setup authentication. Please configure OCIR credentials first.${NC}"
    exit 1
fi

# Migrate all images
echo ""
echo -e "${BLUE}Starting migration of all analyzers...${NC}"
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_LANGS=""

for analyzer in "${ANALYZERS[@]}"; do
    IFS=':' read -r lang version <<< "$analyzer"

    if migrate_image "$lang" "$version"; then
        ((SUCCESS_COUNT++))
        echo -e "${GREEN}✅ $lang migrated successfully${NC}"
    else
        ((FAILED_COUNT++))
        FAILED_LANGS="$FAILED_LANGS $lang"
        echo -e "${RED}❌ $lang migration failed${NC}"
    fi
    echo ""
done

# Final summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Migration Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}Successfully migrated: $SUCCESS_COUNT analyzers${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_COUNT analyzers ($FAILED_LANGS)${NC}"
else
    echo -e "${GREEN}All 11 analyzers migrated successfully!${NC}"
fi
echo ""
echo -e "${BLUE}New registry location:${NC}"
echo "  $OCIR_REGISTRY/analyzer:lang-<language>-<version>-arm"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update V9 infrastructure to use OCIR instead of DO registry"
echo "2. Update Kubernetes image pull secrets for OCIR"
echo "3. Test pulling from OCIR in your local environment"
echo "4. Consider removing images from DO registry to avoid confusion"
echo ""

# Generate update script for V9 infrastructure
echo -e "${BLUE}Creating infrastructure update script...${NC}"
cat > update-v9-to-ocir.sh << 'UPDATE_SCRIPT'
#!/bin/bash
# Script to update V9 infrastructure to use Oracle Container Registry

# Update all TypeScript/JavaScript files
find packages/agents/src -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i '' \
    's|registry.digitalocean.com/codequal-registry|iad.ocir.io/idvysoan2pwh/codequal|g' {} \;

# Update Kubernetes manifests
find . -name "*.yaml" -o -name "*.yml" | xargs sed -i '' \
    's|registry.digitalocean.com/codequal-registry|iad.ocir.io/idvysoan2pwh/codequal|g'

echo "✅ Updated all references to use OCIR"
echo "Don't forget to:"
echo "1. Create Kubernetes secret for OCIR authentication"
echo "2. Update imagePullSecrets in deployments"
UPDATE_SCRIPT

chmod +x update-v9-to-ocir.sh
echo "✅ Created update-v9-to-ocir.sh to update codebase references"