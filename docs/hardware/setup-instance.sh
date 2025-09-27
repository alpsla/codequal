#!/bin/bash
# Quick setup script for Oracle A1.Flex instance
# Run this after SSHing into the instance

set -e

echo "=== CodeQual Docker Environment Setup ==="
echo ""

# Check if running on the instance
if [ ! -f /home/ubuntu/READY ] && [ "$USER" != "ubuntu" ]; then
    echo "This script should be run on the Oracle instance as ubuntu user"
    exit 1
fi

# 1. Install Docker if needed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose git htop iotop jq
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker ubuntu
    echo "Docker installed - please run 'newgrp docker' or re-login"
fi

# 2. Setup workspace
echo "Setting up workspace..."
sudo mkdir -p /mnt/workspace/{repos,output,cache,logs}
sudo chown -R ubuntu:ubuntu /mnt/workspace

# 3. Docker config
sudo bash -c 'cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "local",
  "log-opts": {"max-size": "10m", "max-file": "3"},
  "storage-driver": "overlay2"
}
EOF'
sudo systemctl restart docker

# 4. Create docker-compose.yml
cat > /mnt/workspace/docker-compose.yml << 'EOF'
version: "3.8"

services:
  analyzer-java:
    image: registry.digitalocean.com/codequal/analyzer:lang-java-v5.1
    cpuset: "0"
    mem_limit: 5g
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/java:/workspace/output
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]

  analyzer-python:
    image: registry.digitalocean.com/codequal/analyzer:lang-python-v4.3
    cpuset: "1"
    mem_limit: 5g
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/python:/workspace/output
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]

  analyzer-javascript:
    image: registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3
    cpuset: "2"
    mem_limit: 5g
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/javascript:/workspace/output
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]

  analyzer-security:
    image: registry.digitalocean.com/codequal/analyzer:security-v4.2
    cpuset: "3"
    mem_limit: 5g
    volumes:
      - /mnt/workspace/repos:/workspace/repos:ro
      - /mnt/workspace/output/security:/workspace/output
    command: ["/analyze.sh", "/workspace/repos/repo", "/workspace/output"]
EOF

# 5. Create run script
cat > /mnt/workspace/run-analysis.sh << 'SCRIPT'
#!/bin/bash
REPO_URL=$1
BRANCH=${2:-main}

if [ -z "$REPO_URL" ]; then
    echo "Usage: $0 <repo-url> [branch]"
    exit 1
fi

echo "Analyzing: $REPO_URL ($BRANCH)"

# Clean & prepare
rm -rf /mnt/workspace/output/*
mkdir -p /mnt/workspace/output/{java,python,javascript,security}

# Clone repo
rm -rf /mnt/workspace/repos/repo
git clone --depth=10 --branch="$BRANCH" "$REPO_URL" /mnt/workspace/repos/repo

# Run analyzers
cd /mnt/workspace
docker-compose up -d

echo "Analysis running... Check status with: docker ps"
echo "View logs with: docker logs <container-name>"
echo "Stop with: docker-compose down"
SCRIPT

chmod +x /mnt/workspace/run-analysis.sh

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Login to Docker registry:"
echo "   docker login registry.digitalocean.com"
echo ""
echo "2. Pull images:"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-java-v5.1"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-python-v4.3"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3"
echo "   docker pull registry.digitalocean.com/codequal/analyzer:security-v4.2"
echo ""
echo "3. Run analysis:"
echo "   /mnt/workspace/run-analysis.sh <repo-url>"
echo ""
echo "System info:"
lscpu | grep -E "Model name|CPU\(s\):" || true
free -h | grep Mem || true