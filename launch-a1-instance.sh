#!/bin/bash
#
# Oracle A1.Flex Instance Launcher for CodeQual V9
# Pay-as-you-go instance creation with immediate availability checking
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Oracle A1.Flex Launcher for CodeQual${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check OCI CLI
if ! command -v oci &> /dev/null; then
    echo -e "${RED}Error: OCI CLI not found${NC}"
    echo "Please run: ./docs/hardware/setup-oci-cli.sh first"
    exit 1
fi

# Test OCI authentication
echo -e "${YELLOW}Testing OCI authentication...${NC}"
export SUPPRESS_LABEL_WARNING=True
if ! oci iam availability-domain list 2>/dev/null | grep -q "name"; then
    echo -e "${RED}Error: OCI CLI not authenticated properly${NC}"
    echo "Please check your ~/.oci/config file"
    exit 1
fi

echo -e "${GREEN}✓ OCI CLI authenticated${NC}"

# Configuration
COMPARTMENT_ID=$(oci iam compartment list --all --compartment-id-in-subtree true --query 'data[0].id' --raw-output 2>/dev/null || echo "ocid1.tenancy.oc1..aaaaaaaaphbe3h3pzvami57wiaxlkxwecu7beyeijrynfcr6w24lxn6u7k4a")
SHAPE="VM.Standard.A1.Flex"
DISPLAY_NAME="codequal-v9-docker-${RANDOM}"

# Instance specs
OCPUS="4"
MEMORY_IN_GBS="24"
BOOT_VOLUME_SIZE="200"

echo ""
echo -e "${BLUE}Instance Configuration:${NC}"
echo "  Shape: $SHAPE"
echo "  OCPUs: $OCPUS"
echo "  Memory: ${MEMORY_IN_GBS}GB"
echo "  Boot Volume: ${BOOT_VOLUME_SIZE}GB"
echo "  Name: $DISPLAY_NAME"
echo ""

# Find Ubuntu image - use hardcoded for speed or search
echo -e "${YELLOW}Finding Ubuntu 22.04 ARM image...${NC}"

# Try hardcoded first (fastest)
IMAGE_ID="ocid1.image.oc1.iad.aaaaaaaa2qup33kak66ll3loslunng52zk5haq4pggre5gg7y3snr5wh55rq"

# Verify it exists
if ! oci compute image get --image-id $IMAGE_ID 2>/dev/null | grep -q "id"; then
    echo "Searching for Ubuntu 22.04 image..."
    IMAGE_ID=$(oci compute image list \
        --compartment-id $COMPARTMENT_ID \
        --operating-system "Canonical Ubuntu" \
        --operating-system-version "22.04" \
        --shape $SHAPE \
        --query 'data[0].id' \
        --raw-output 2>/dev/null)
fi

if [ -z "$IMAGE_ID" ] || [ "$IMAGE_ID" == "null" ]; then
    echo -e "${RED}Error: Could not find Ubuntu 22.04 ARM image${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found image: ${IMAGE_ID:0:60}...${NC}"

# Get availability domains
echo -e "\n${YELLOW}Checking availability domains...${NC}"
ADS=$(oci iam availability-domain list --query 'data[].name' --raw-output)
AD_COUNT=$(echo "$ADS" | wc -l)
echo -e "${GREEN}✓ Found $AD_COUNT availability domains${NC}"

# Check for existing VCN or create new one
echo -e "\n${YELLOW}Setting up network...${NC}"
VCN_ID=$(oci network vcn list --compartment-id $COMPARTMENT_ID --query 'data[0].id' --raw-output 2>/dev/null)

if [ -z "$VCN_ID" ] || [ "$VCN_ID" == "null" ]; then
    echo "Creating new VCN..."
    VCN_ID=$(oci network vcn create \
        --compartment-id $COMPARTMENT_ID \
        --display-name "codequal-vcn" \
        --cidr-blocks '["10.0.0.0/16"]' \
        --query 'data.id' \
        --raw-output \
        --wait-for-state AVAILABLE)

    # Create Internet Gateway
    IGW_ID=$(oci network internet-gateway create \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --display-name "codequal-igw" \
        --is-enabled true \
        --query 'data.id' \
        --raw-output)

    # Update route table
    RT_ID=$(oci network route-table list \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --query 'data[0].id' \
        --raw-output)

    oci network route-table update \
        --rt-id $RT_ID \
        --route-rules "[{\"destination\":\"0.0.0.0/0\",\"networkEntityId\":\"$IGW_ID\"}]" \
        --force
fi

echo -e "${GREEN}✓ VCN ready${NC}"

# Get or create subnet
SUBNET_ID=$(oci network subnet list --compartment-id $COMPARTMENT_ID --vcn-id $VCN_ID --query 'data[0].id' --raw-output 2>/dev/null)

if [ -z "$SUBNET_ID" ] || [ "$SUBNET_ID" == "null" ]; then
    echo "Creating subnet..."
    # Try first AD
    FIRST_AD=$(echo "$ADS" | head -n 1)
    SUBNET_ID=$(oci network subnet create \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --display-name "codequal-subnet" \
        --cidr-block "10.0.1.0/24" \
        --availability-domain $FIRST_AD \
        --query 'data.id' \
        --raw-output)
fi

echo -e "${GREEN}✓ Subnet ready${NC}"

# Generate SSH key
if [ ! -f ~/.ssh/oci_codequal_rsa ]; then
    echo -e "\n${YELLOW}Generating SSH key...${NC}"
    ssh-keygen -t rsa -b 2048 -f ~/.ssh/oci_codequal_rsa -N "" -C "codequal-v9"
fi

# Cloud-init for Docker setup
cat > /tmp/cloud-init.yaml << 'EOF'
#cloud-config
package_update: true
packages:
  - docker.io
  - docker-compose
  - git
  - htop
  - jq
  - iotop
  - mpstat

write_files:
  - path: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "local",
        "log-opts": {"max-size": "10m", "max-file": "3"},
        "storage-driver": "overlay2"
      }

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker ubuntu
  - mkdir -p /mnt/workspace/{repos,output,cache,logs}
  - chown -R ubuntu:ubuntu /mnt/workspace
  - echo "CodeQual V9 Ready" > /home/ubuntu/READY
EOF

# Try to create instance
echo -e "\n${YELLOW}Attempting to create A1.Flex instance...${NC}"
echo "This may take a few attempts if capacity is limited..."
echo ""

ATTEMPT=0
MAX_ATTEMPTS=5
INSTANCE_CREATED=false

for AD in $ADS; do
    ATTEMPT=$((ATTEMPT + 1))
    echo -e "${BLUE}Attempt $ATTEMPT/$MAX_ATTEMPTS in $AD${NC}"

    INSTANCE_ID=$(oci compute instance launch \
        --compartment-id $COMPARTMENT_ID \
        --availability-domain $AD \
        --shape $SHAPE \
        --shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEMORY_IN_GBS}" \
        --display-name $DISPLAY_NAME \
        --image-id $IMAGE_ID \
        --subnet-id $SUBNET_ID \
        --assign-public-ip true \
        --ssh-authorized-keys-file ~/.ssh/oci_codequal_rsa.pub \
        --user-data "$(base64 -i /tmp/cloud-init.yaml | tr -d '\n')" \
        --boot-volume-size-in-gbs $BOOT_VOLUME_SIZE \
        --query 'data.id' \
        --raw-output 2>&1)

    if [[ $INSTANCE_ID == ocid1.instance.* ]]; then
        INSTANCE_CREATED=true
        break
    else
        if echo "$INSTANCE_ID" | grep -q "Out of capacity"; then
            echo -e "${YELLOW}  No capacity in $AD${NC}"
        else
            echo -e "${YELLOW}  Failed: $(echo $INSTANCE_ID | head -n 1)${NC}"
        fi
    fi
done

if [ "$INSTANCE_CREATED" = false ]; then
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}   Instance Creation Failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}A1.Flex capacity is currently limited.${NC}"
    echo ""
    echo -e "${BLUE}Your options:${NC}"
    echo ""
    echo "1. ${GREEN}Try different regions${NC} (modify script for other regions)"
    echo "   Current region: us-ashburn-1"
    echo ""
    echo "2. ${GREEN}Contact Oracle Sales Support${NC}"
    echo "   - Explain you need A1.Flex for development/testing"
    echo "   - Request capacity reservation or pre-approval"
    echo "   - Phone: 1-800-633-0738 (US)"
    echo "   - Chat: https://www.oracle.com/cloud/contact-sales.html"
    echo ""
    echo "3. ${GREEN}Try at different times${NC}"
    echo "   - Early morning hours often have better availability"
    echo "   - Run: watch -n 300 ./launch-a1-instance.sh"
    echo ""
    echo "4. ${GREEN}Consider alternative shapes${NC} (if budget allows)"
    echo "   - VM.Standard3.Flex (Intel, more expensive but available)"
    echo "   - VM.Standard.E4.Flex (AMD, good price/performance)"
    echo ""
    echo -e "${YELLOW}Note: Oracle has very limited A1.Flex capacity on free tier${NC}"
    echo -e "${YELLOW}Pay-as-you-go accounts have better access but still limited${NC}"
    exit 1
fi

# Wait for instance to be running
echo -e "\n${GREEN}✓ Instance created! Waiting for it to start...${NC}"
oci compute instance get --instance-id $INSTANCE_ID --query 'data."lifecycle-state"' --wait-for-state RUNNING

# Get public IP
PUBLIC_IP=$(oci compute instance list-vnics \
    --instance-id $INSTANCE_ID \
    --query 'data[0]."public-ip"' \
    --raw-output)

# Save instance info
cat > ~/.oci/codequal_instance_info << EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
DISPLAY_NAME=$DISPLAY_NAME
CREATED=$(date)
SSH_KEY=~/.ssh/oci_codequal_rsa
EOF

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✓ Instance Created Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Instance Name: $DISPLAY_NAME"
echo "Public IP: $PUBLIC_IP"
echo "SSH Key: ~/.ssh/oci_codequal_rsa"
echo ""
echo -e "${YELLOW}Connect with:${NC}"
echo "ssh -i ~/.ssh/oci_codequal_rsa ubuntu@$PUBLIC_IP"
echo ""
echo -e "${YELLOW}Wait 2-3 minutes for cloud-init, then:${NC}"
echo "1. Copy setup script to instance:"
echo "   scp -i ~/.ssh/oci_codequal_rsa ./docs/hardware/a1-flex-docker-setup.sh ubuntu@$PUBLIC_IP:~/"
echo ""
echo "2. SSH to instance and run setup:"
echo "   ssh -i ~/.ssh/oci_codequal_rsa ubuntu@$PUBLIC_IP"
echo "   ./a1-flex-docker-setup.sh"
echo ""
echo -e "${GREEN}Instance is ready for CodeQual V9 Docker setup!${NC}"