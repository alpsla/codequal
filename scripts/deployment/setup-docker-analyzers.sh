#!/bin/bash
# Setup Docker analyzers on Oracle A1.Flex instance

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== CodeQual V9 Docker Analyzer Setup ===${NC}"
echo "This script will set up parallel analyzer execution on Oracle A1.Flex"

# Check if running on the instance
if [ ! -d /mnt/workspace ]; then
    echo -e "${RED}Error: /mnt/workspace not found. Are you running this on the Oracle instance?${NC}"
    exit 1
fi

# 1. Performance tuning
echo -e "\n${YELLOW}Step 1: Applying performance tuning...${NC}"

# Increase file descriptors
sudo bash -c 'cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF'

# Docker daemon optimization (already in cloud-init but ensure it's correct)
sudo bash -c 'cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
EOF'

sudo systemctl restart docker
sleep 2

# 2. Set up workspace structure
echo -e "\n${YELLOW}Step 2: Setting up workspace structure...${NC}"

# Create directories for each analyzer output
mkdir -p /mnt/workspace/output/{java,python,javascript,security,dependency,quality,architecture,performance}
mkdir -p /mnt/workspace/repos
mkdir -p /mnt/workspace/cache
mkdir -p /mnt/workspace/logs

# Optional: Create tmpfs for faster repo reads (8GB for repos)
echo -e "${BLUE}Creating tmpfs for fast repo access...${NC}"
sudo mount -t tmpfs -o size=8g tmpfs /mnt/workspace/repos || echo "tmpfs already mounted"

# 3. Docker Registry Configuration
echo -e "\n${YELLOW}Step 3: Configure Docker registry access...${NC}"
echo -e "${RED}Please enter your DigitalOcean Container Registry credentials:${NC}"
read -p "DO Registry username (usually your DO email): " DO_USERNAME
read -s -p "DO Access Token: " DO_ACCESS_TOKEN
echo ""

docker login registry.digitalocean.com -u "$DO_USERNAME" -p "$DO_ACCESS_TOKEN"

# 4. Pull analyzer images
echo -e "\n${YELLOW}Step 4: Pulling analyzer images...${NC}"

IMAGES=(
    "registry.digitalocean.com/codequal/analyzer:lang-java-v5.1"
    "registry.digitalocean.com/codequal/analyzer:lang-python-v4.3"
    "registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3"
    "registry.digitalocean.com/codequal/analyzer:security-v4.2"
    "registry.digitalocean.com/codequal/analyzer:dependency-v3.1"
    "registry.digitalocean.com/codequal/analyzer:quality-v4.0"
    "registry.digitalocean.com/codequal/analyzer:architecture-v3.5"
    "registry.digitalocean.com/codequal/analyzer:performance-v3.2"
)

for image in "${IMAGES[@]}"; do
    echo "Pulling $image..."
    docker pull "$image" || echo "Warning: Could not pull $image"
done

# 5. Create docker-compose.yml
echo -e "\n${YELLOW}Step 5: Creating docker-compose.yml...${NC}"

cat > /mnt/workspace/docker-compose.yml << 'EOF'
version: "3.8"

# CodeQual V9 Parallel Analyzer Configuration
# Optimized for Oracle A1.Flex 4 OCPU / 24GB RAM

networks:
  codequal:
    driver: bridge

services:
  # Core language analyzers (CPU-intensive, pinned to cores)
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

  # Additional analyzers (can share cores since they're less CPU-intensive)
  analyzer-dependency:
    image: registry.digitalocean.com/codequal/analyzer:dependency-v3.1
    container_name: analyzer-dependency
    mem_limit: 3g
    mem_reservation: 1g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/dependency:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=dependency
      - OUTPUT_FORMAT=json
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped

  analyzer-quality:
    image: registry.digitalocean.com/codequal/analyzer:quality-v4.0
    container_name: analyzer-quality
    mem_limit: 3g
    mem_reservation: 1g
    networks:
      - codequal
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/quality:/workspace/output
      - /mnt/workspace/cache:/workspace/cache
    environment:
      - ANALYZER_NAME=quality
      - OUTPUT_FORMAT=json
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
    restart: unless-stopped
EOF

# 6. Create run script
echo -e "\n${YELLOW}Step 6: Creating run script...${NC}"

cat > /mnt/workspace/run-analysis.sh << 'SCRIPT'
#!/bin/bash

# Run CodeQual V9 Analysis

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
    echo "Example: $0 https://github.com/apache/kafka main"
    exit 1
fi

echo -e "${GREEN}=== Starting CodeQual V9 Analysis ===${NC}"
echo "Repository: $REPO_URL"
echo "Branch: $BRANCH"
echo ""

# Clean previous outputs
echo -e "${YELLOW}Cleaning previous outputs...${NC}"
rm -rf /mnt/workspace/output/*
mkdir -p /mnt/workspace/output/{java,python,javascript,security,dependency,quality,architecture,performance}

# Clone repository
echo -e "${YELLOW}Cloning repository...${NC}"
rm -rf /mnt/workspace/repos/repo
git clone --depth=10 --branch="$BRANCH" "$REPO_URL" /mnt/workspace/repos/repo

# Get repo stats
REPO_SIZE=$(du -sh /mnt/workspace/repos/repo | cut -f1)
FILE_COUNT=$(find /mnt/workspace/repos/repo -type f | wc -l)
echo -e "${BLUE}Repository size: $REPO_SIZE${NC}"
echo -e "${BLUE}File count: $FILE_COUNT${NC}"

# Start analysis
echo -e "\n${YELLOW}Starting parallel analysis with Docker Compose...${NC}"
START_TIME=$(date +%s)

cd /mnt/workspace
docker-compose up -d

# Monitor progress
echo -e "\n${YELLOW}Monitoring analysis progress...${NC}"
echo "Press Ctrl+C to stop monitoring (analysis will continue in background)"
echo ""

# Function to check container status
check_status() {
    while true; do
        clear
        echo -e "${GREEN}=== CodeQual V9 Analysis Status ===${NC}"
        echo "Repository: $REPO_URL"
        echo "Start time: $(date -d @$START_TIME)"
        echo "Elapsed: $(($(date +%s) - $START_TIME)) seconds"
        echo ""

        echo -e "${YELLOW}Container Status:${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep analyzer || true

        echo -e "\n${YELLOW}CPU Usage by Core:${NC}"
        mpstat -P ALL 1 1 | grep -E "^Average|CPU" || top -b -n 1 | head -20

        echo -e "\n${YELLOW}Output Files Generated:${NC}"
        for dir in /mnt/workspace/output/*/; do
            if [ -d "$dir" ]; then
                count=$(find "$dir" -type f 2>/dev/null | wc -l)
                size=$(du -sh "$dir" 2>/dev/null | cut -f1)
                echo "$(basename $dir): $count files ($size)"
            fi
        done

        # Check if all containers have finished
        RUNNING=$(docker ps --filter "name=analyzer-" --format "{{.Names}}" | wc -l)
        if [ "$RUNNING" -eq 0 ]; then
            echo -e "\n${GREEN}All analyzers completed!${NC}"
            break
        fi

        sleep 5
    done
}

# Run status check in background
check_status &
STATUS_PID=$!

# Wait for user interrupt or completion
trap "kill $STATUS_PID 2>/dev/null; exit" INT
wait $STATUS_PID

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${GREEN}=== Analysis Complete ===${NC}"
echo "Total duration: $DURATION seconds"
echo ""
echo "Results saved in /mnt/workspace/output/"
echo ""
echo "To view logs for a specific analyzer:"
echo "  docker logs analyzer-java"
echo "  docker logs analyzer-security"
echo ""
echo "To stop all containers:"
echo "  docker-compose down"
SCRIPT

chmod +x /mnt/workspace/run-analysis.sh

# 7. Create quick test script
echo -e "\n${YELLOW}Step 7: Creating quick test script...${NC}"

cat > /mnt/workspace/test-performance.sh << 'TEST'
#!/bin/bash

# Quick performance test with a small repo

echo "Testing with a small repository (redis)..."
/mnt/workspace/run-analysis.sh https://github.com/redis/redis unstable

echo ""
echo "Performance baseline established!"
echo "For larger repos, try:"
echo "  /mnt/workspace/run-analysis.sh https://github.com/apache/kafka trunk"
echo "  /mnt/workspace/run-analysis.sh https://github.com/microsoft/vscode main"
TEST

chmod +x /mnt/workspace/test-performance.sh

# 8. System info
echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo ""
echo -e "${BLUE}System Information:${NC}"
lscpu | grep -E "CPU\(s\)|Thread|Core|Model name" || true
free -h
df -h /mnt/workspace
docker --version
docker-compose --version

echo ""
echo -e "${GREEN}Available Commands:${NC}"
echo "  Run analysis:     /mnt/workspace/run-analysis.sh <repo-url> [branch]"
echo "  Test performance: /mnt/workspace/test-performance.sh"
echo "  Monitor:          docker stats"
echo "  View logs:        docker logs <container-name>"
echo "  Stop all:         cd /mnt/workspace && docker-compose down"
echo ""
echo -e "${YELLOW}Example:${NC}"
echo "  /mnt/workspace/run-analysis.sh https://github.com/apache/kafka trunk"
echo ""
echo -e "${GREEN}Setup complete! The system is ready for parallel analysis.${NC}"