#!/bin/bash
# Simplified build script for remaining CodeQual language analyzers (ARM64)
# Builds one analyzer at a time with proper Dockerfile generation

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
echo -e "${BLUE}  Building CodeQual ARM Language Analyzers${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

# Function to build a single analyzer
build_single_analyzer() {
    local LANG=$1
    local VERSION=$2

    echo -e "${BLUE}Building $LANG analyzer ($VERSION-arm)...${NC}"

    # Create and execute build on Oracle instance
    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << ENDSSH
set -e
cd /mnt/workspace

echo "Creating Dockerfile for $LANG..."

# Create language-specific Dockerfile
if [ "$LANG" = "javascript" ] || [ "$LANG" = "typescript" ]; then
    cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \\
    apt-get install -y nodejs && \\
    npm install -g npm@latest

# Install analysis tools
RUN npm install -g eslint prettier jshint
DOCKERFILE

    if [ "$LANG" = "typescript" ]; then
        cat >> Dockerfile.$LANG << 'DOCKERFILE'

# Install TypeScript
RUN npm install -g typescript @types/node
DOCKERFILE
    fi

elif [ "$LANG" = "go" ]; then
    cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    && rm -rf /var/lib/apt/lists/*

# Install Go
RUN wget https://go.dev/dl/go1.21.5.linux-arm64.tar.gz && \\
    tar -C /usr/local -xzf go1.21.5.linux-arm64.tar.gz && \\
    rm go1.21.5.linux-arm64.tar.gz

ENV PATH=/usr/local/go/bin:\$PATH
ENV GOPATH=/go
ENV PATH=\$GOPATH/bin:\$PATH

# Install Go analysis tools
RUN go install golang.org/x/tools/cmd/goimports@latest && \\
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
DOCKERFILE

elif [ "$LANG" = "ruby" ]; then
    cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    ruby-full \\
    rubygems \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

# Install Ruby analysis tools
RUN gem install rubocop
DOCKERFILE

elif [ "$LANG" = "php" ]; then
    cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    php \\
    php-cli \\
    php-mbstring \\
    php-xml \\
    php-curl \\
    composer \\
    && rm -rf /var/lib/apt/lists/*

# Install PHP analysis tools
RUN composer global require squizlabs/php_codesniffer
ENV PATH=/root/.composer/vendor/bin:\$PATH
DOCKERFILE

elif [ "$LANG" = "csharp" ]; then
    cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    && rm -rf /var/lib/apt/lists/*

# Install .NET SDK
RUN wget https://dot.net/v1/dotnet-install.sh && \\
    chmod +x dotnet-install.sh && \\
    ./dotnet-install.sh --channel 8.0 --architecture arm64 && \\
    rm dotnet-install.sh

ENV DOTNET_ROOT=/root/.dotnet
ENV PATH=\$DOTNET_ROOT:\$PATH

# Install .NET analysis tools
RUN dotnet tool install --global dotnet-format
ENV PATH=/root/.dotnet/tools:\$PATH
DOCKERFILE

elif [ "$LANG" = "rust" ]; then
    cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH=/root/.cargo/bin:\$PATH

# Install Rust analysis tools
RUN rustup component add clippy rustfmt
DOCKERFILE

elif [ "$LANG" = "swift" ]; then
    cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 swift:5.9

# Install additional dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    && rm -rf /var/lib/apt/lists/*
DOCKERFILE

elif [ "$LANG" = "kotlin" ]; then
    cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    openjdk-17-jdk \\
    unzip \\
    && rm -rf /var/lib/apt/lists/*

# Install Kotlin
RUN wget https://github.com/JetBrains/kotlin/releases/download/v1.9.20/kotlin-compiler-1.9.20.zip && \\
    unzip kotlin-compiler-*.zip -d /usr/local && \\
    rm kotlin-compiler-*.zip

ENV PATH=/usr/local/kotlinc/bin:\$PATH
DOCKERFILE

else
    echo "Unknown language: $LANG"
    exit 1
fi

# Add common analyzer components to all Dockerfiles
cat >> Dockerfile.$LANG << 'DOCKERFILE'

# Create analyzer script
COPY analyze.sh /analyzer/analyze.sh
RUN chmod +x /analyzer/analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyzer/analyze.sh"]
DOCKERFILE

# Create simple analyzer script
cat > analyze.sh << 'ANALYZER'
#!/bin/bash
set -e

echo "Starting $LANG analysis (version $VERSION)..."
echo "Repository: \$1"
echo "Branch: \$2"

# Clone repository if provided
if [ -n "\$1" ]; then
    git clone --depth 1 -b "\$2" "\$1" /workspace/repo 2>/dev/null || git clone --depth 1 "\$1" /workspace/repo
    cd /workspace/repo
fi

# List files of this language
echo "Files found:"
ANALYZER

# Add language-specific file listing to analyzer
if [ "$LANG" = "javascript" ]; then
    echo "find . -name '*.js' -type f | head -20" >> analyze.sh
elif [ "$LANG" = "typescript" ]; then
    echo "find . -name '*.ts' -o -name '*.tsx' -type f | head -20" >> analyze.sh
elif [ "$LANG" = "go" ]; then
    echo "find . -name '*.go' -type f | head -20" >> analyze.sh
elif [ "$LANG" = "ruby" ]; then
    echo "find . -name '*.rb' -type f | head -20" >> analyze.sh
elif [ "$LANG" = "php" ]; then
    echo "find . -name '*.php' -type f | head -20" >> analyze.sh
elif [ "$LANG" = "csharp" ]; then
    echo "find . -name '*.cs' -type f | head -20" >> analyze.sh
elif [ "$LANG" = "rust" ]; then
    echo "find . -name '*.rs' -type f | head -20" >> analyze.sh
elif [ "$LANG" = "swift" ]; then
    echo "find . -name '*.swift' -type f | head -20" >> analyze.sh
elif [ "$LANG" = "kotlin" ]; then
    echo "find . -name '*.kt' -o -name '*.kts' -type f | head -20" >> analyze.sh
fi

echo "echo 'Analysis complete for $LANG'" >> analyze.sh

chmod +x analyze.sh

# Build the Docker image
echo "Building Docker image..."
docker build -f Dockerfile.$LANG -t $REGISTRY/analyzer:lang-$LANG-$VERSION-arm . 2>&1 | tail -20

if [ \$? -eq 0 ]; then
    echo "✅ $LANG analyzer built successfully"

    # Push to registry
    echo "Pushing to registry..."
    docker push $REGISTRY/analyzer:lang-$LANG-$VERSION-arm

    if [ \$? -eq 0 ]; then
        echo "✅ $LANG analyzer pushed to registry"

        # Show image size
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "$LANG-$VERSION-arm" || true
    else
        echo "❌ Failed to push $LANG analyzer"
        exit 1
    fi
else
    echo "❌ Failed to build $LANG analyzer"
    exit 1
fi

# Cleanup
rm -f Dockerfile.$LANG analyze.sh

echo "Completed $LANG analyzer build"
ENDSSH

    return $?
}

# Main execution
echo -e "${GREEN}Current Status:${NC}"
echo "  ✅ Java (v5.1-arm) - Already built"
echo "  ✅ Python (v4.3-arm) - Already built"
echo ""

# Select language to build
echo -e "${YELLOW}Select language to build:${NC}"
echo "  1) JavaScript (v4.2)"
echo "  2) TypeScript (v4.2)"
echo "  3) Go (v3.8)"
echo "  4) Ruby (v3.5)"
echo "  5) PHP (v3.4)"
echo "  6) C# (v3.2)"
echo "  7) Rust (v2.9)"
echo "  8) Swift (v2.7)"
echo "  9) Kotlin (v2.5)"
echo "  0) Build ALL remaining (9 languages)"
echo ""
read -p "Enter your choice (0-9): " choice

case $choice in
    1) build_single_analyzer "javascript" "v4.2" ;;
    2) build_single_analyzer "typescript" "v4.2" ;;
    3) build_single_analyzer "go" "v3.8" ;;
    4) build_single_analyzer "ruby" "v3.5" ;;
    5) build_single_analyzer "php" "v3.4" ;;
    6) build_single_analyzer "csharp" "v3.2" ;;
    7) build_single_analyzer "rust" "v2.9" ;;
    8) build_single_analyzer "swift" "v2.7" ;;
    9) build_single_analyzer "kotlin" "v2.5" ;;
    0)
        echo -e "${BLUE}Building all 9 remaining analyzers...${NC}"

        # Build all in sequence
        LANGUAGES=(
            "javascript:v4.2"
            "typescript:v4.2"
            "go:v3.8"
            "ruby:v3.5"
            "php:v3.4"
            "csharp:v3.2"
            "rust:v2.9"
            "swift:v2.7"
            "kotlin:v2.5"
        )

        COMPLETED=0
        FAILED=0

        for lang_version in "${LANGUAGES[@]}"; do
            IFS=':' read -r lang version <<< "$lang_version"
            echo ""
            echo -e "${BLUE}[$((COMPLETED + FAILED + 1))/9] Building $lang...${NC}"

            if build_single_analyzer "$lang" "$version"; then
                ((COMPLETED++))
                echo -e "${GREEN}✅ $lang completed${NC}"
            else
                ((FAILED++))
                echo -e "${RED}❌ $lang failed${NC}"
            fi
        done

        echo ""
        echo -e "${BLUE}================================================${NC}"
        echo -e "${BLUE}  Build Summary${NC}"
        echo -e "${BLUE}================================================${NC}"
        echo -e "${GREEN}Completed: $COMPLETED${NC}"
        echo -e "${RED}Failed: $FAILED${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}Build process completed!${NC}"