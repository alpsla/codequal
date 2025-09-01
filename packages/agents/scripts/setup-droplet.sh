#!/bin/bash

# DigitalOcean Droplet Setup Script
# This script configures a fresh Ubuntu droplet for CodeQual security testing

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${MAGENTA}${BOLD}"
cat << 'ASCII'
   ____          _       ___              _ 
  / ___|___   __| | ___ / _ \ _   _  __ _| |
 | |   / _ \ / _` |/ _ \ | | | | | |/ _` | |
 | |__| (_) | (_| |  __/ |_| | |_| | (_| | |
  \____\___/ \__,_|\___|\__\_\\__,_|\__,_|_|
                                             
     DigitalOcean Droplet Setup Wizard
ASCII
echo -e "${NC}"

# Check for droplet IP
if [ -z "$DROPLET_IP" ]; then
    echo -e "${YELLOW}Please enter your DigitalOcean droplet IP address:${NC}"
    read -p "IP Address: " DROPLET_IP
    export DROPLET_IP
fi

echo -e "${BLUE}Setting up droplet: root@${DROPLET_IP}${NC}"
echo ""

# Function to run commands on droplet
run_on_droplet() {
    ssh -o StrictHostKeyChecking=no root@$DROPLET_IP "$1"
}

# Function to check SSH connection
check_ssh() {
    echo -e "${YELLOW}Testing SSH connection...${NC}"
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'Connected'" &> /dev/null; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ Cannot connect to droplet${NC}"
        echo -e "${YELLOW}Please check:${NC}"
        echo "  1. Droplet IP is correct: $DROPLET_IP"
        echo "  2. Droplet is running"
        echo "  3. SSH key is added to droplet"
        echo "  4. No firewall blocking port 22"
        return 1
    fi
}

# Check SSH connection
if ! check_ssh; then
    exit 1
fi

echo ""
echo -e "${CYAN}Starting droplet configuration...${NC}"
echo ""

# Step 1: Update system
echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
run_on_droplet "apt-get update -y && apt-get upgrade -y"
echo -e "${GREEN}✅ System updated${NC}"

# Step 2: Install basic dependencies
echo -e "${YELLOW}Step 2: Installing basic dependencies...${NC}"
run_on_droplet "apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    python3-pip \
    unzip \
    jq"
echo -e "${GREEN}✅ Basic dependencies installed${NC}"

# Step 3: Install Node.js
echo -e "${YELLOW}Step 3: Installing Node.js...${NC}"
run_on_droplet "curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs"
NODE_VERSION=$(run_on_droplet "node --version")
echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"

# Step 4: Install Docker (optional, for containerized testing)
echo -e "${YELLOW}Step 4: Installing Docker (optional)...${NC}"
read -p "Install Docker for containerized testing? (y/n) [n]: " INSTALL_DOCKER
if [[ "$INSTALL_DOCKER" == "y" ]]; then
    run_on_droplet "curl -fsSL https://get.docker.com | sh"
    run_on_droplet "systemctl enable docker && systemctl start docker"
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${CYAN}⏭️  Skipping Docker installation${NC}"
fi

# Step 5: Set up swap (important for small droplets)
echo -e "${YELLOW}Step 5: Setting up swap space...${NC}"
run_on_droplet "
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
    sysctl vm.swappiness=10
fi
"
echo -e "${GREEN}✅ Swap space configured (4GB)${NC}"

# Step 6: Configure firewall
echo -e "${YELLOW}Step 6: Configuring firewall...${NC}"
run_on_droplet "
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000:3010/tcp
ufw reload
"
echo -e "${GREEN}✅ Firewall configured${NC}"

# Step 7: Create working directory
echo -e "${YELLOW}Step 7: Creating working directory...${NC}"
run_on_droplet "mkdir -p /opt/codequal /opt/test-repos"
echo -e "${GREEN}✅ Directories created${NC}"

# Step 8: Install monitoring tools (optional)
echo -e "${YELLOW}Step 8: Installing monitoring tools...${NC}"
read -p "Install htop and monitoring tools? (y/n) [y]: " INSTALL_MONITORING
INSTALL_MONITORING="${INSTALL_MONITORING:-y}"
if [[ "$INSTALL_MONITORING" == "y" ]]; then
    run_on_droplet "apt-get install -y htop iotop nethogs"
    echo -e "${GREEN}✅ Monitoring tools installed${NC}"
fi

# Step 9: Display system info
echo ""
echo -e "${CYAN}Gathering system information...${NC}"
echo ""

# Get system stats
SYSTEM_INFO=$(run_on_droplet "
echo 'CPU Cores:' && nproc
echo 'RAM:' && free -h | grep Mem | awk '{print \$2}'
echo 'Disk:' && df -h / | tail -1 | awk '{print \$2}'
echo 'Ubuntu:' && lsb_release -d | cut -f2
")

echo -e "${BLUE}System Information:${NC}"
echo "$SYSTEM_INFO"
echo ""

# Create local configuration file
CONFIG_FILE="droplet-config.env"
cat << EOF > $CONFIG_FILE
# DigitalOcean Droplet Configuration
# Generated: $(date)

DROPLET_IP=$DROPLET_IP
DROPLET_USER=root
DROPLET_SSH_KEY=~/.ssh/id_rsa

# System Info
$(echo "$SYSTEM_INFO" | sed 's/^/# /')
EOF

echo -e "${GREEN}✅ Configuration saved to: $CONFIG_FILE${NC}"

# Final summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Droplet Setup Complete!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}✅ Completed Tasks:${NC}"
echo "   • System updated and upgraded"
echo "   • Basic dependencies installed"
echo "   • Node.js $(run_on_droplet 'node --version') installed"
if [[ "$INSTALL_DOCKER" == "y" ]]; then
    echo "   • Docker installed and running"
fi
echo "   • 4GB swap space configured"
echo "   • Firewall configured with security rules"
echo "   • Working directories created"
if [[ "$INSTALL_MONITORING" == "y" ]]; then
    echo "   • Monitoring tools installed"
fi

echo ""
echo -e "${CYAN}📊 Droplet Ready for:${NC}"
echo "   • Installing security tools"
echo "   • Running test suites"
echo "   • Generating reports"

echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "   1. Install security tools:"
echo "      ${BOLD}./deploy-with-tracking.sh${NC}"
echo ""
echo "   2. Or use the quick start:"
echo "      ${BOLD}./quick-start.sh${NC}"
echo ""
echo -e "${CYAN}📁 Configuration saved to: ${BOLD}$CONFIG_FILE${NC}"
echo ""
echo -e "${GREEN}Your droplet is ready for CodeQual security testing!${NC}"