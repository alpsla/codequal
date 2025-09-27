#!/bin/bash
#
# Create A1.Flex Instance for CodeQual V9 (Paid Account)
# Run this after upgrading to paid Oracle Cloud account
#

set -e

echo "🎯 Creating A1.Flex Instance for CodeQual V9 (Paid Account)"
echo "============================================================"

# Configuration
REGION="us-ashburn-1"
COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaaphbe3h3pzvami57wiaxlkxwecu7beyeijrynfcr6w24ixn6u7k4a"
SUBNET_ID="ocid1.subnet.oc1.iad.aaaaaaaambo47na3prh7dxdwdt3tvg7tii3mnjfjjz4g5kmkkcgnelgzli4a"
AVAILABILITY_DOMAIN="SEsF:US-ASHBURN-AD-1"
IMAGE_ID="ocid1.image.oc1.iad.aaaaaaaa2qup33kak66ll3loslunng52zk5haq4pggre5gg7y3snr5wh55rq"  # Ubuntu 22.04

# Instance configuration for CodeQual V9
OCPUS=4
MEMORY_GB=24
BOOT_GB=200

# Generate unique name
TIMESTAMP=$(date +%m%d-%H%M%S)
INSTANCE_NAME="codequal-v9-paid-${TIMESTAMP}"

echo "📋 Configuration:"
echo "  • Name: ${INSTANCE_NAME}"
echo "  • Shape: VM.Standard.A1.Flex"
echo "  • OCPUs: ${OCPUS}"
echo "  • Memory: ${MEMORY_GB}GB"
echo "  • Storage: ${BOOT_GB}GB"
echo "  • Region: ${REGION}"
echo "  • AD: ${AVAILABILITY_DOMAIN}"
echo ""

read -p "🚀 Ready to create instance? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo "🚀 Creating A1.Flex instance..."

oci compute instance launch \
    --region "${REGION}" \
    --compartment-id "${COMPARTMENT_ID}" \
    --availability-domain "${AVAILABILITY_DOMAIN}" \
    --image-id "${IMAGE_ID}" \
    --shape "VM.Standard.A1.Flex" \
    --shape-config "{\"ocpus\":${OCPUS},\"memoryInGBs\":${MEMORY_GB}}" \
    --display-name "${INSTANCE_NAME}" \
    --boot-volume-size-in-gbs "${BOOT_GB}" \
    --subnet-id "${SUBNET_ID}" \
    --assign-public-ip true \
    --wait-for-state RUNNING \
    --max-wait-seconds 300 \
    --query 'data.{InstanceName:"display-name",PublicIP:"primary-public-ip",InstanceId:"id",State:"lifecycle-state"}' \
    --output table

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! A1.Flex instance created successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. SSH into your instance using the public IP above"
    echo "2. Install Docker: curl -fsSL https://get.docker.com | sh"
    echo "3. Install k3s: curl -sfL https://get.k3s.io | sh"  
    echo "4. Deploy CodeQual V9 with parallel execution enabled"
    echo ""
    echo "💡 SSH Command:"
    echo "ssh ubuntu@<PUBLIC_IP_FROM_ABOVE>"
    echo ""
    echo "📊 Expected monthly cost: ~\$7-10 for this configuration"
else
    echo ""
    echo "❌ Failed to create instance. Check your account upgrade status."
    echo "💡 Make sure you've successfully upgraded to Pay As You Go account."
fi