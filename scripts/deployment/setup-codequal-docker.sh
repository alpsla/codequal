#!/bin/bash
# CodeQual V9 Docker Setup on Oracle A1.Flex
# Optimized for 4 OCPU, 24GB RAM

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   CodeQual V9 Docker Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. System Update & Docker Installation (if not already installed)
echo -e "\n${YELLOW}Step 1: Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose git htop iotop jq
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# 2. Docker optimization
echo -e "\n${YELLOW}Step 2: Optimizing Docker configuration...${NC}"
sudo bash -c 'cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF'
sudo systemctl restart docker
echo -e "${GREEN}✓ Docker optimized${NC}"

# 3. Setup workspace
echo -e "\n${YELLOW}Step 3: Setting up workspace...${NC}"
sudo mkdir -p /mnt/workspace/{repos,output,cache,logs}
sudo mkdir -p /mnt/workspace/output/{java,python,javascript,security,dependency,quality}
sudo chown -R $USER:$USER /mnt/workspace

# Optional tmpfs for faster repo access
echo -e "${BLUE}Mounting tmpfs for faster repository access...${NC}"
sudo mount -t tmpfs -o size=8g tmpfs /mnt/workspace/repos 2>/dev/null || echo "tmpfs already mounted"
echo -e "${GREEN}✓ Workspace ready${NC}"

# 4. Create docker-compose.yml
echo -e "\n${YELLOW}Step 4: Creating docker-compose.yml...${NC}"
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
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/java:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=java
      - OUTPUT_FORMAT=json
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped

  analyzer-python:
    image: registry.digitalocean.com/codequal/analyzer:lang-python-v4.3
    container_name: analyzer-python
    cpuset: "1"
    mem_limit: 5g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/python:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=python
      - OUTPUT_FORMAT=json
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped

  analyzer-javascript:
    image: registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3
    container_name: analyzer-javascript
    cpuset: "2"
    mem_limit: 5g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/javascript:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=javascript
      - OUTPUT_FORMAT=json
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped

  analyzer-security:
    image: registry.digitalocean.com/codequal/analyzer:security-v4.2
    container_name: analyzer-security
    cpuset: "3"
    mem_limit: 5g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/security:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=security
      - OUTPUT_FORMAT=json
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped
EOF

echo -e "${GREEN}✓ docker-compose.yml created${NC}"

# 5. Create analysis runner script
echo -e "\n${YELLOW}Step 5: Creating analysis runner script...${NC}"
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

# Clean outputs
rm -rf /mnt/workspace/output/*
mkdir -p /mnt/workspace/output/{java,python,javascript,security,dependency,quality}

# Clone repository
echo -e "\n${YELLOW}Cloning repository...${NC}"
rm -rf /mnt/workspace/repos/repo
git clone --depth=10 --branch="$BRANCH" "$REPO_URL" /mnt/workspace/repos/repo

REPO_SIZE=$(du -sh /mnt/workspace/repos/repo | cut -f1)
FILE_COUNT=$(find /mnt/workspace/repos/repo -type f | wc -l)
echo -e "${BLUE}Repository size: $REPO_SIZE, Files: $FILE_COUNT${NC}"

# Start analysis
echo -e "\n${YELLOW}Starting parallel analysis...${NC}"
START_TIME=$(date +%s)

cd /mnt/workspace
docker-compose up -d

# Monitor
echo -e "\n${YELLOW}Analysis running... Monitoring:${NC}"
sleep 5

while true; do
    RUNNING=$(docker ps --filter "name=analyzer-" --format "{{.Names}}" | wc -l)
    if [ "$RUNNING" -eq 0 ]; then
        break
    fi

    echo -n "."
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep analyzer || true
    sleep 10
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${GREEN}Analysis complete in $DURATION seconds!${NC}"
echo "Results in /mnt/workspace/output/"

docker-compose down
SCRIPT

chmod +x /mnt/workspace/run-analysis.sh
echo -e "${GREEN}✓ Analysis runner created${NC}"

# 6. System info
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}System Information:${NC}"
lscpu | grep -E "CPU\(s\)|Thread|Core|Socket|Model name" || true
free -h
df -h /mnt/workspace
echo ""
echo -e "${YELLOW}Docker Version:${NC}"
docker --version
docker-compose --version || docker compose version
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Configure Docker Registry:"
echo "   docker login registry.digitalocean.com"
echo ""
echo "2. Pull analyzer images:"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-java-v5.1"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-python-v4.3"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:security-v4.2"
echo ""
echo "3. Run analysis:"
echo "   /mnt/workspace/run-analysis.sh <repo-url> [branch]"
echo ""
echo -e "${YELLOW}Note: You may need to run 'newgrp docker' or logout/login for docker permissions${NC}"