#!/bin/bash
# CodeQual V9 Docker Setup for Oracle Linux 9 (ARM64)
# Optimized for Oracle A1.Flex (4 OCPUs, 24GB RAM)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   CodeQual V9 Setup - Oracle Linux 9${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as opc user
if [ "$USER" != "opc" ]; then
    echo -e "${YELLOW}Note: Running as $USER (expected opc)${NC}"
fi

# 1. System Update and Prerequisites
echo -e "\n${YELLOW}Step 1: Installing prerequisites...${NC}"
sudo dnf update -y
sudo dnf install -y git htop iotop jq tree wget curl

# 2. Install Docker on Oracle Linux 9
echo -e "\n${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    # Add Docker repository
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

    # Install Docker
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Enable and start Docker
    sudo systemctl enable docker
    sudo systemctl start docker

    # Add user to docker group
    sudo usermod -aG docker $USER

    echo -e "${GREEN}✓ Docker installed successfully${NC}"
    echo -e "${YELLOW}Note: You'll need to logout and login again or run 'newgrp docker' for docker permissions${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
    docker --version
fi

# 3. Configure Docker for optimization
echo -e "\n${YELLOW}Step 3: Optimizing Docker configuration...${NC}"
sudo bash -c 'cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF'

# Restart Docker to apply configuration
sudo systemctl restart docker
echo -e "${GREEN}✓ Docker optimized${NC}"

# 4. Setup workspace directories
echo -e "\n${YELLOW}Step 4: Setting up workspace...${NC}"
sudo mkdir -p /mnt/workspace/{repos,output,cache,logs}
sudo mkdir -p /mnt/workspace/output/{java,python,javascript,security,dependency,quality}
sudo chown -R $USER:$USER /mnt/workspace

# Optional: Setup tmpfs for faster repository access
echo -e "${BLUE}Setting up tmpfs for repository cache...${NC}"
if ! mount | grep -q "/mnt/workspace/repos"; then
    sudo mount -t tmpfs -o size=8g tmpfs /mnt/workspace/repos
    echo "tmpfs 8GB mounted at /mnt/workspace/repos"

    # Add to fstab for persistence across reboots (optional)
    echo -e "${YELLOW}Add to /etc/fstab for persistent mount? (y/n)${NC}"
    read -r ADD_FSTAB
    if [ "$ADD_FSTAB" = "y" ]; then
        echo "tmpfs /mnt/workspace/repos tmpfs size=8g,defaults 0 0" | sudo tee -a /etc/fstab
    fi
else
    echo "tmpfs already mounted"
fi

echo -e "${GREEN}✓ Workspace ready${NC}"

# 5. Create docker-compose.yml
echo -e "\n${YELLOW}Step 5: Creating docker-compose.yml...${NC}"
cat > /mnt/workspace/docker-compose.yml << 'EOF'
version: "3.8"

networks:
  codequal:
    driver: bridge

services:
  analyzer-java:
    image: registry.digitalocean.com/codequal/analyzer:lang-java-v5.1
    container_name: analyzer-java
    cpuset: "0"
    mem_limit: 5g
    mem_reservation: 2g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/java:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=java
      - OUTPUT_FORMAT=json
      - PARALLEL_THREADS=1
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped

  analyzer-python:
    image: registry.digitalocean.com/codequal/analyzer:lang-python-v4.3
    container_name: analyzer-python
    cpuset: "1"
    mem_limit: 5g
    mem_reservation: 2g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/python:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=python
      - OUTPUT_FORMAT=json
      - PARALLEL_THREADS=1
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped

  analyzer-javascript:
    image: registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3
    container_name: analyzer-javascript
    cpuset: "2"
    mem_limit: 5g
    mem_reservation: 2g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/javascript:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=javascript
      - OUTPUT_FORMAT=json
      - PARALLEL_THREADS=1
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped

  analyzer-security:
    image: registry.digitalocean.com/codequal/analyzer:security-v4.2
    container_name: analyzer-security
    cpuset: "3"
    mem_limit: 5g
    mem_reservation: 2g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/security:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=security
      - OUTPUT_FORMAT=json
      - PARALLEL_THREADS=1
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped
EOF

echo -e "${GREEN}✓ docker-compose.yml created${NC}"

# 6. Create analysis runner script
echo -e "\n${YELLOW}Step 6: Creating analysis runner script...${NC}"
cat > /mnt/workspace/run-analysis.sh << 'SCRIPT'
#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL=${1:-""}
BRANCH=${2:-"main"}

if [ -z "$REPO_URL" ]; then
    echo -e "${RED}Usage: $0 <repo-url> [branch]${NC}"
    echo "Example: $0 https://github.com/apache/kafka trunk"
    exit 1
fi

echo -e "${GREEN}=== CodeQual V9 Analysis ===${NC}"
echo "Repository: $REPO_URL"
echo "Branch: $BRANCH"
echo ""

# Clean previous outputs
echo -e "${YELLOW}Cleaning previous outputs...${NC}"
rm -rf /mnt/workspace/output/*
mkdir -p /mnt/workspace/output/{java,python,javascript,security,dependency,quality}

# Clone repository
echo -e "${YELLOW}Cloning repository...${NC}"
rm -rf /mnt/workspace/repos/repo
git clone --depth=10 --branch="$BRANCH" "$REPO_URL" /mnt/workspace/repos/repo

# Get repository statistics
REPO_SIZE=$(du -sh /mnt/workspace/repos/repo 2>/dev/null | cut -f1)
FILE_COUNT=$(find /mnt/workspace/repos/repo -type f 2>/dev/null | wc -l)
echo -e "${BLUE}Repository size: $REPO_SIZE${NC}"
echo -e "${BLUE}File count: $FILE_COUNT${NC}"

# Start parallel analysis
echo -e "\n${YELLOW}Starting parallel analysis...${NC}"
START_TIME=$(date +%s)

cd /mnt/workspace
docker compose up -d

# Monitor progress
echo -e "\n${YELLOW}Monitoring analysis (Ctrl+C to stop monitoring)...${NC}"
echo ""

# Simple monitoring loop
PREV_RUNNING=0
while true; do
    RUNNING=$(docker ps --filter "name=analyzer-" --format "{{.Names}}" 2>/dev/null | wc -l)

    if [ "$RUNNING" -ne "$PREV_RUNNING" ]; then
        echo -e "${BLUE}Active analyzers: $RUNNING${NC}"
        if [ "$RUNNING" -gt 0 ]; then
            docker ps --filter "name=analyzer-" --format "table {{.Names}}\t{{.Status}}\t{{.CPUPerc}}\t{{.MemUsage}}"
        fi
        PREV_RUNNING=$RUNNING
    fi

    if [ "$RUNNING" -eq 0 ] && [ "$PREV_RUNNING" -ne 0 ]; then
        break
    fi

    sleep 5
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${GREEN}=== Analysis Complete ===${NC}"
echo "Duration: $DURATION seconds"
echo "Results saved in /mnt/workspace/output/"
echo ""
echo "To view specific results:"
ls -la /mnt/workspace/output/*/

# Stop containers
docker compose down

echo -e "\n${GREEN}Done!${NC}"
SCRIPT

chmod +x /mnt/workspace/run-analysis.sh
echo -e "${GREEN}✓ Analysis runner script created${NC}"

# 7. Check SELinux status (Oracle Linux specific)
echo -e "\n${YELLOW}Step 7: Checking SELinux configuration...${NC}"
if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    echo "SELinux status: $SELINUX_STATUS"
    if [ "$SELINUX_STATUS" = "Enforcing" ]; then
        echo -e "${YELLOW}Note: SELinux is enforcing. Docker volumes may need :z or :Z flags${NC}"
    fi
else
    echo "SELinux not installed"
fi

# 8. System information
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}System Information:${NC}"
echo "OS: $(cat /etc/oracle-release 2>/dev/null || cat /etc/redhat-release)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo ""
echo "CPU Information:"
lscpu | grep -E "Model name|CPU\(s\):|Thread|Core|Socket" || true
echo ""
echo "Memory:"
free -h | grep -E "Mem|Swap" || true
echo ""
echo "Storage:"
df -h /mnt/workspace
echo ""
echo -e "${BLUE}Docker Version:${NC}"
docker --version 2>/dev/null || echo "Docker not accessible yet (need to re-login)"
docker compose version 2>/dev/null || echo "Docker Compose not accessible yet"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Next Steps${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "1. ${YELLOW}Apply Docker permissions:${NC}"
echo "   newgrp docker"
echo "   OR logout and login again"
echo ""
echo "2. ${YELLOW}Configure Docker Registry:${NC}"
echo "   docker login registry.digitalocean.com"
echo "   Username: <your-digitalocean-email>"
echo "   Password: <your-digitalocean-api-token>"
echo ""
echo "3. ${YELLOW}Pull analyzer images:${NC}"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-java-v5.1"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-python-v4.3"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:security-v4.2"
echo ""
echo "4. ${YELLOW}Test with a small repository:${NC}"
echo "   /mnt/workspace/run-analysis.sh https://github.com/redis/redis unstable"
echo ""
echo "5. ${YELLOW}Run production analysis:${NC}"
echo "   /mnt/workspace/run-analysis.sh https://github.com/apache/kafka trunk"
echo ""
echo -e "${GREEN}Instance is ready for CodeQual V9 analysis!${NC}"