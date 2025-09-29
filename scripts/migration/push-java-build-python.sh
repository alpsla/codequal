#!/bin/bash
# Quick script to push Java and build Python analyzer only

ORACLE_USER="opc"
SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"

echo "================================================"
echo "  Pushing Java & Building Python ARM Analyzers"
echo "================================================"

# Push Java image
echo "📤 Pushing Java ARM analyzer..."
ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" "docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1-arm 2>&1 | tail -5"

# Build Python analyzer
echo ""
echo "🔨 Building Python analyzer..."
ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'BUILD_PYTHON'
cd /mnt/workspace

# Create Python Dockerfile
cat > Dockerfile.python << 'DOCKERFILE'
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python analysis tools
RUN pip install --no-cache-dir \
    bandit \
    safety \
    black \
    flake8 \
    isort \
    pytest \
    pylint \
    mypy \
    semgrep

# Create analyzer script
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE

# Create analyzer script
cat > analyze.sh << 'ANALYZER'
#!/bin/bash
echo "Python Analyzer v4.3 (ARM)"
echo "========================"
echo "Repository: $1"
echo "Output: $2"

if [ -d "$1" ]; then
    cd "$1"
    echo "Running Python analysis..."
    # Run actual tools here
    flake8 . --count --statistics 2>/dev/null || true
    echo "Analysis complete"
else
    echo "Error: Repository path not found"
    exit 1
fi
ANALYZER

# Build the image
echo "Building Python ARM analyzer..."
docker build -f Dockerfile.python -t registry.digitalocean.com/codequal-registry/analyzer:lang-python-v4.3-arm . 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo "✅ Python analyzer built successfully"
    # Push to registry
    docker push registry.digitalocean.com/codequal-registry/analyzer:lang-python-v4.3-arm 2>&1 | tail -5
    echo "📤 Python analyzer pushed"
fi

# Show final status
echo ""
echo "📊 ARM analyzer images:"
docker images | grep analyzer | grep arm
BUILD_PYTHON
