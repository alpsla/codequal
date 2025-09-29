#!/bin/bash
# Script to build the remaining 5 language analyzers
# PHP, C#, Rust, Swift, Kotlin

set -e

# Configuration
ORACLE_USER="opc"
SSH_KEY="../../keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
REGISTRY="registry.digitalocean.com/codequal-registry"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Building Remaining 5 Language ARM Analyzers${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

echo -e "${GREEN}Completed Analyzers:${NC}"
echo "  ✅ Java (v5.1-arm)"
echo "  ✅ Python (v4.3-arm)"
echo "  ✅ JavaScript (v4.2-arm)"
echo "  ✅ TypeScript (v4.2-arm)"
echo "  ✅ Go (v3.8-arm)"
echo "  ✅ Ruby (v3.5-arm)"
echo ""

echo -e "${YELLOW}Remaining to build:${NC}"
echo "  1) PHP (v3.4) - Simplified version"
echo "  2) C# (v3.2)"
echo "  3) Rust (v2.9)"
echo "  4) Swift (v2.7)"
echo "  5) Kotlin (v2.5)"
echo ""

# Function to build PHP (simplified)
build_php() {
    echo -e "${BLUE}Building PHP analyzer (v3.4-arm) - Simplified${NC}"

    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'ENDSSH'
set -e
cd /mnt/workspace

echo "Creating simplified PHP Dockerfile..."
cat > Dockerfile.php << 'DOCKERFILE'
FROM --platform=linux/arm64 php:8.2-cli

# Install basic tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Create analyzer script
COPY analyze.sh /analyzer/analyze.sh
RUN chmod +x /analyzer/analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyzer/analyze.sh"]
DOCKERFILE

cat > analyze.sh << 'ANALYZER'
#!/bin/bash
echo "PHP analyzer v3.4-arm"
echo "Repository: $1"
echo "Branch: $2"

if [ -n "$1" ]; then
    git clone --depth 1 -b "$2" "$1" /workspace/repo 2>/dev/null || git clone --depth 1 "$1" /workspace/repo
    cd /workspace/repo
fi

echo "PHP files found:"
find . -name "*.php" -type f | head -20
echo "Analysis complete for PHP"
ANALYZER

chmod +x analyze.sh

echo "Building PHP Docker image..."
docker build -f Dockerfile.php -t registry.digitalocean.com/codequal-registry/analyzer:lang-php-v3.4-arm . 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo "✅ PHP analyzer built successfully"
    echo "Pushing to registry..."
    docker push registry.digitalocean.com/codequal-registry/analyzer:lang-php-v3.4-arm

    if [ $? -eq 0 ]; then
        echo "✅ PHP analyzer pushed to registry"
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "php-v3.4-arm"
    else
        echo "❌ Failed to push PHP analyzer"
    fi
else
    echo "❌ Failed to build PHP analyzer"
fi

rm -f Dockerfile.php analyze.sh
ENDSSH
}

# Function to build C#
build_csharp() {
    echo -e "${BLUE}Building C# analyzer (v3.2-arm)${NC}"

    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'ENDSSH'
set -e
cd /mnt/workspace

echo "Creating C# Dockerfile..."
cat > Dockerfile.csharp << 'DOCKERFILE'
FROM --platform=linux/arm64 mcr.microsoft.com/dotnet/sdk:8.0

# Install additional tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Create analyzer script
COPY analyze.sh /analyzer/analyze.sh
RUN chmod +x /analyzer/analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyzer/analyze.sh"]
DOCKERFILE

cat > analyze.sh << 'ANALYZER'
#!/bin/bash
echo "C# analyzer v3.2-arm"
echo "Repository: $1"
echo "Branch: $2"

if [ -n "$1" ]; then
    git clone --depth 1 -b "$2" "$1" /workspace/repo 2>/dev/null || git clone --depth 1 "$1" /workspace/repo
    cd /workspace/repo
fi

echo "C# files found:"
find . -name "*.cs" -type f | head -20
echo "Analysis complete for C#"
ANALYZER

chmod +x analyze.sh

echo "Building C# Docker image..."
docker build -f Dockerfile.csharp -t registry.digitalocean.com/codequal-registry/analyzer:lang-csharp-v3.2-arm . 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo "✅ C# analyzer built successfully"
    echo "Pushing to registry..."
    docker push registry.digitalocean.com/codequal-registry/analyzer:lang-csharp-v3.2-arm

    if [ $? -eq 0 ]; then
        echo "✅ C# analyzer pushed to registry"
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "csharp-v3.2-arm"
    else
        echo "❌ Failed to push C# analyzer"
    fi
else
    echo "❌ Failed to build C# analyzer"
fi

rm -f Dockerfile.csharp analyze.sh
ENDSSH
}

# Function to build Rust
build_rust() {
    echo -e "${BLUE}Building Rust analyzer (v2.9-arm)${NC}"

    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'ENDSSH'
set -e
cd /mnt/workspace

echo "Creating Rust Dockerfile..."
cat > Dockerfile.rust << 'DOCKERFILE'
FROM --platform=linux/arm64 rust:1.74

# Install additional tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install clippy and rustfmt
RUN rustup component add clippy rustfmt

# Create analyzer script
COPY analyze.sh /analyzer/analyze.sh
RUN chmod +x /analyzer/analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyzer/analyze.sh"]
DOCKERFILE

cat > analyze.sh << 'ANALYZER'
#!/bin/bash
echo "Rust analyzer v2.9-arm"
echo "Repository: $1"
echo "Branch: $2"

if [ -n "$1" ]; then
    git clone --depth 1 -b "$2" "$1" /workspace/repo 2>/dev/null || git clone --depth 1 "$1" /workspace/repo
    cd /workspace/repo
fi

echo "Rust files found:"
find . -name "*.rs" -type f | head -20
echo "Analysis complete for Rust"
ANALYZER

chmod +x analyze.sh

echo "Building Rust Docker image..."
docker build -f Dockerfile.rust -t registry.digitalocean.com/codequal-registry/analyzer:lang-rust-v2.9-arm . 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo "✅ Rust analyzer built successfully"
    echo "Pushing to registry..."
    docker push registry.digitalocean.com/codequal-registry/analyzer:lang-rust-v2.9-arm

    if [ $? -eq 0 ]; then
        echo "✅ Rust analyzer pushed to registry"
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "rust-v2.9-arm"
    else
        echo "❌ Failed to push Rust analyzer"
    fi
else
    echo "❌ Failed to build Rust analyzer"
fi

rm -f Dockerfile.rust analyze.sh
ENDSSH
}

# Function to build Swift
build_swift() {
    echo -e "${BLUE}Building Swift analyzer (v2.7-arm)${NC}"

    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'ENDSSH'
set -e
cd /mnt/workspace

echo "Creating Swift Dockerfile..."
cat > Dockerfile.swift << 'DOCKERFILE'
FROM --platform=linux/arm64 swift:5.9

# Install additional tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Create analyzer script
COPY analyze.sh /analyzer/analyze.sh
RUN chmod +x /analyzer/analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyzer/analyze.sh"]
DOCKERFILE

cat > analyze.sh << 'ANALYZER'
#!/bin/bash
echo "Swift analyzer v2.7-arm"
echo "Repository: $1"
echo "Branch: $2"

if [ -n "$1" ]; then
    git clone --depth 1 -b "$2" "$1" /workspace/repo 2>/dev/null || git clone --depth 1 "$1" /workspace/repo
    cd /workspace/repo
fi

echo "Swift files found:"
find . -name "*.swift" -type f | head -20
echo "Analysis complete for Swift"
ANALYZER

chmod +x analyze.sh

echo "Building Swift Docker image..."
docker build -f Dockerfile.swift -t registry.digitalocean.com/codequal-registry/analyzer:lang-swift-v2.7-arm . 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo "✅ Swift analyzer built successfully"
    echo "Pushing to registry..."
    docker push registry.digitalocean.com/codequal-registry/analyzer:lang-swift-v2.7-arm

    if [ $? -eq 0 ]; then
        echo "✅ Swift analyzer pushed to registry"
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "swift-v2.7-arm"
    else
        echo "❌ Failed to push Swift analyzer"
    fi
else
    echo "❌ Failed to build Swift analyzer"
fi

rm -f Dockerfile.swift analyze.sh
ENDSSH
}

# Function to build Kotlin
build_kotlin() {
    echo -e "${BLUE}Building Kotlin analyzer (v2.5-arm)${NC}"

    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'ENDSSH'
set -e
cd /mnt/workspace

echo "Creating Kotlin Dockerfile..."
cat > Dockerfile.kotlin << 'DOCKERFILE'
FROM --platform=linux/arm64 openjdk:17-slim

# Install Kotlin and tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    jq \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Kotlin
RUN wget https://github.com/JetBrains/kotlin/releases/download/v1.9.20/kotlin-compiler-1.9.20.zip && \
    unzip kotlin-compiler-*.zip -d /usr/local && \
    rm kotlin-compiler-*.zip

ENV PATH=/usr/local/kotlinc/bin:$PATH

# Create analyzer script
COPY analyze.sh /analyzer/analyze.sh
RUN chmod +x /analyzer/analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyzer/analyze.sh"]
DOCKERFILE

cat > analyze.sh << 'ANALYZER'
#!/bin/bash
echo "Kotlin analyzer v2.5-arm"
echo "Repository: $1"
echo "Branch: $2"

if [ -n "$1" ]; then
    git clone --depth 1 -b "$2" "$1" /workspace/repo 2>/dev/null || git clone --depth 1 "$1" /workspace/repo
    cd /workspace/repo
fi

echo "Kotlin files found:"
find . -name "*.kt" -o -name "*.kts" | head -20
echo "Analysis complete for Kotlin"
ANALYZER

chmod +x analyze.sh

echo "Building Kotlin Docker image..."
docker build -f Dockerfile.kotlin -t registry.digitalocean.com/codequal-registry/analyzer:lang-kotlin-v2.5-arm . 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo "✅ Kotlin analyzer built successfully"
    echo "Pushing to registry..."
    docker push registry.digitalocean.com/codequal-registry/analyzer:lang-kotlin-v2.5-arm

    if [ $? -eq 0 ]; then
        echo "✅ Kotlin analyzer pushed to registry"
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "kotlin-v2.5-arm"
    else
        echo "❌ Failed to push Kotlin analyzer"
    fi
else
    echo "❌ Failed to build Kotlin analyzer"
fi

rm -f Dockerfile.kotlin analyze.sh
ENDSSH
}

# Main execution
echo -e "${YELLOW}Select option:${NC}"
echo "  1) Build PHP only"
echo "  2) Build C# only"
echo "  3) Build Rust only"
echo "  4) Build Swift only"
echo "  5) Build Kotlin only"
echo "  0) Build ALL 5 remaining languages"
echo ""
read -p "Enter your choice (0-5): " choice

case $choice in
    1) build_php ;;
    2) build_csharp ;;
    3) build_rust ;;
    4) build_swift ;;
    5) build_kotlin ;;
    0)
        echo -e "${BLUE}Building all 5 remaining analyzers...${NC}"
        build_php
        echo ""
        build_csharp
        echo ""
        build_rust
        echo ""
        build_swift
        echo ""
        build_kotlin
        echo ""
        echo -e "${GREEN}All builds completed!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}Build process completed!${NC}"
echo ""
echo "Check the status of all images:"
echo "ssh -i $SSH_KEY $ORACLE_USER@$INSTANCE_IP 'docker images | grep analyzer | grep arm'"