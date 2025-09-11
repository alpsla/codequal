#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 CodeQual Pre-Deployment Checklist${NC}"
echo "====================================="

READY=true

# Check Docker daemon
echo -e "\n${YELLOW}Checking Docker...${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker is running${NC}"
else
    echo -e "${RED}✗ Docker is not running. Please start Docker Desktop${NC}"
    READY=false
fi

# Check doctl authentication
echo -e "\n${YELLOW}Checking DigitalOcean CLI...${NC}"
if doctl account get > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Authenticated with DigitalOcean${NC}"
else
    echo -e "${RED}✗ Not authenticated. Run: doctl auth init${NC}"
    READY=false
fi

# Check kubectl
echo -e "\n${YELLOW}Checking kubectl...${NC}"
if command -v kubectl &> /dev/null; then
    echo -e "${GREEN}✓ kubectl installed${NC}"
else
    echo -e "${RED}✗ kubectl not found. Run: brew install kubectl${NC}"
    READY=false
fi

# Check secrets file
echo -e "\n${YELLOW}Checking Kubernetes secrets...${NC}"
SECRETS_FILE="kubernetes/production/secrets.yaml"
if [ -f "$SECRETS_FILE" ]; then
    if grep -q "CHANGE_ME" "$SECRETS_FILE"; then
        echo -e "${RED}✗ Secrets file contains placeholder values!${NC}"
        echo "  Please update the following in $SECRETS_FILE:"
        grep -n "CHANGE_ME" "$SECRETS_FILE" | head -10
        READY=false
    else
        echo -e "${GREEN}✓ Secrets file configured${NC}"
    fi
else
    echo -e "${RED}✗ Secrets file not found at $SECRETS_FILE${NC}"
    READY=false
fi

# Check build
echo -e "\n${YELLOW}Checking build...${NC}"
if [ -d "apps/api/dist" ] && [ -d "packages/core/dist" ]; then
    echo -e "${GREEN}✓ Build artifacts exist${NC}"
else
    echo -e "${YELLOW}⚠ Build artifacts missing. Running build...${NC}"
    npm run build
fi

# Check environment variables from .env
echo -e "\n${YELLOW}Checking local environment...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
else
    echo -e "${YELLOW}⚠ .env file not found. Using .env.example as reference${NC}"
fi

# Summary
echo -e "\n${GREEN}Summary:${NC}"
echo "========="
if [ "$READY" = true ]; then
    echo -e "${GREEN}✅ All checks passed! Ready to deploy.${NC}"
    echo -e "\nNext steps:"
    echo "1. Review and update kubernetes/production/secrets.yaml"
    echo "2. Run: ./scripts/deploy-to-digitalocean.sh"
else
    echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    exit 1
fi