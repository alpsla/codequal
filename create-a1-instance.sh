#!/bin/bash
# Create Oracle A1.Flex instance for CodeQual V9 - Pay as You Go

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Oracle A1.Flex Instance Creator for CodeQual V9 ===${NC}"
echo "Creating pay-as-you-go instance with 4 OCPUs, 24GB RAM"

# Configuration
COMPARTMENT_ID=$(oci iam compartment list --all --compartment-id-in-subtree true --query 'data[0].id' --raw-output 2>/dev/null || echo "ocid1.tenancy.oc1..aaaaaaaaphbe3h3pzvami57wiaxlkxwecu7beyeijrynfcr6w24ixn6u7k4a")
SHAPE="VM.Standard.A1.Flex"
OCPUS="4"
MEMORY_IN_GBS="24"
BOOT_VOLUME_SIZE_IN_GBS="200"
DISPLAY_NAME="codequal-v9-analyzer"
OS_IMAGE="Canonical Ubuntu 22.04" # Will find the correct image OCID

# Get availability domains
echo -e "\n${YELLOW}Checking availability domains...${NC}"
ADS=$(oci iam availability-domain list --query 'data[].name' --raw-output)
echo "Available ADs: $(echo $ADS | tr '\n' ' ')"

# Find Ubuntu 22.04 image
echo -e "\n${YELLOW}Finding Ubuntu 22.04 image...${NC}"
IMAGE_ID=$(oci compute image list \
    --compartment-id $COMPARTMENT_ID \
    --operating-system "Canonical Ubuntu" \
    --operating-system-version "22.04" \
    --shape $SHAPE \
    --sort-by TIMECREATED \
    --sort-order DESC \
    --query 'data[0].id' \
    --raw-output 2>/dev/null)

if [ -z "$IMAGE_ID" ]; then
    echo -e "${RED}Error: Could not find Ubuntu 22.04 image for A1.Flex${NC}"
    echo "Trying alternative search..."
    IMAGE_ID=$(oci compute image list --all --query "data[?contains(\"display-name\", 'aarch64') && contains(\"display-name\", 'Ubuntu-22.04')].id | [0]" --raw-output)
fi

echo "Image ID: $IMAGE_ID"

# Get or create VCN and subnet
echo -e "\n${YELLOW}Checking networking...${NC}"
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
    echo "Created VCN: $VCN_ID"

    # Create Internet Gateway
    IGW_ID=$(oci network internet-gateway create \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --display-name "codequal-igw" \
        --is-enabled true \
        --query 'data.id' \
        --raw-output \
        --wait-for-state AVAILABLE)

    # Update route table
    RT_ID=$(oci network route-table list \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --query 'data[0].id' \
        --raw-output)

    oci network route-table update \
        --rt-id $RT_ID \
        --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW_ID\"}]" \
        --force
fi

SUBNET_ID=$(oci network subnet list --compartment-id $COMPARTMENT_ID --vcn-id $VCN_ID --query 'data[0].id' --raw-output 2>/dev/null)

if [ -z "$SUBNET_ID" ] || [ "$SUBNET_ID" == "null" ]; then
    echo "Creating subnet..."
    for AD in $ADS; do
        SUBNET_ID=$(oci network subnet create \
            --compartment-id $COMPARTMENT_ID \
            --vcn-id $VCN_ID \
            --display-name "codequal-subnet" \
            --cidr-block "10.0.1.0/24" \
            --availability-domain $AD \
            --query 'data.id' \
            --raw-output \
            --wait-for-state AVAILABLE 2>/dev/null) && break
    done
fi

echo "Using Subnet: $SUBNET_ID"

# Generate SSH key if not exists
if [ ! -f ~/.ssh/oci_codequal_rsa ]; then
    echo -e "\n${YELLOW}Generating SSH key...${NC}"
    ssh-keygen -t rsa -b 2048 -f ~/.ssh/oci_codequal_rsa -N "" -C "codequal-v9"
fi

SSH_PUBLIC_KEY=$(cat ~/.ssh/oci_codequal_rsa.pub)

# Cloud-init script for initial setup
cat > /tmp/cloud-init.yaml << 'EOF'
#cloud-config
package_update: true
package_upgrade: false

packages:
  - docker.io
  - docker-compose
  - git
  - htop
  - iotop
  - jq

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker ubuntu
  - mkdir -p /mnt/workspace/repos /mnt/workspace/output
  - chown -R ubuntu:ubuntu /mnt/workspace
  - echo '{"log-driver":"local","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json
  - systemctl restart docker
  - echo "Instance ready for CodeQual V9 analyzer setup" > /home/ubuntu/READY.txt
  - chown ubuntu:ubuntu /home/ubuntu/READY.txt
EOF

CLOUD_INIT=$(base64 -i /tmp/cloud-init.yaml | tr -d '\n')

# Try creating instance in each AD
echo -e "\n${YELLOW}Creating A1.Flex instance...${NC}"

for AD in $ADS; do
    echo "Trying in $AD..."

    INSTANCE_ID=$(oci compute instance launch \
        --compartment-id $COMPARTMENT_ID \
        --availability-domain $AD \
        --shape $SHAPE \
        --shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEMORY_IN_GBS}" \
        --display-name $DISPLAY_NAME \
        --image-id $IMAGE_ID \
        --subnet-id $SUBNET_ID \
        --assign-public-ip true \
        --assign-private-dns-record true \
        --ssh-authorized-keys-file ~/.ssh/oci_codequal_rsa.pub \
        --user-data "$CLOUD_INIT" \
        --boot-volume-size-in-gbs $BOOT_VOLUME_SIZE_IN_GBS \
        --query 'data.id' \
        --raw-output \
        --wait-for-state RUNNING \
        --max-wait-seconds 300 \
        2>/dev/null) && break

    echo "No capacity in $AD, trying next..."
done

if [ -z "$INSTANCE_ID" ]; then
    echo -e "${RED}Failed to create instance in any AD. A1.Flex capacity might be limited.${NC}"
    echo "Try again later or in a different region."
    exit 1
fi

echo -e "${GREEN}Instance created successfully!${NC}"
echo "Instance ID: $INSTANCE_ID"

# Get instance details
echo -e "\n${YELLOW}Getting instance details...${NC}"
sleep 5

PUBLIC_IP=$(oci compute instance list-vnics \
    --instance-id $INSTANCE_ID \
    --query 'data[0]."public-ip"' \
    --raw-output)

echo -e "\n${GREEN}=== Instance Created Successfully ===${NC}"
echo "Instance Name: $DISPLAY_NAME"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "SSH Key: ~/.ssh/oci_codequal_rsa"
echo ""
echo -e "${YELLOW}Connect with:${NC}"
echo "ssh -i ~/.ssh/oci_codequal_rsa ubuntu@$PUBLIC_IP"
echo ""
echo -e "${YELLOW}Wait ~2 minutes for cloud-init to complete, then run:${NC}"
echo "ssh -i ~/.ssh/oci_codequal_rsa ubuntu@$PUBLIC_IP 'cat READY.txt'"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. SSH into the instance"
echo "2. Clone your repo to /mnt/workspace/repos/"
echo "3. Run the Docker setup script (will be created next)"

# Save connection info
cat > ~/.oci/codequal_instance_info << EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
SSH_KEY=~/.ssh/oci_codequal_rsa
SSH_COMMAND="ssh -i ~/.ssh/oci_codequal_rsa ubuntu@$PUBLIC_IP"
EOF

echo -e "\n${GREEN}Instance info saved to ~/.oci/codequal_instance_info${NC}"