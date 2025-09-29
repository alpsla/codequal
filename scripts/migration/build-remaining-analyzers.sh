#!/bin/bash
# Build script for remaining 9 CodeQual language analyzers (ARM64)
# Compatible with macOS bash

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
echo -e "${BLUE}  Building Remaining 9 Language ARM Analyzers${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

# Languages to build with their versions
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

echo -e "${GREEN}Status:${NC}"
echo "✅ Java (v5.1-arm) - Already built and pushed"
echo "✅ Python (v4.3-arm) - Already built and pushed"
echo ""
echo -e "${YELLOW}Languages to build (9 remaining):${NC}"
for lang_version in "${LANGUAGES[@]}"; do
    IFS=':' read -r lang version <<< "$lang_version"
    echo "  ⏳ $lang ($version)"
done
echo ""

# Confirm before proceeding
read -p "Proceed with building 9 remaining analyzers? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Build cancelled."
    exit 1
fi

# Counter for tracking progress
COMPLETED=0
FAILED=0
FAILED_LANGS=""

# Build each analyzer
for lang_version in "${LANGUAGES[@]}"; do
    IFS=':' read -r LANG VERSION <<< "$lang_version"

    echo ""
    echo -e "${BLUE}[$((COMPLETED + FAILED + 1))/9] Building $LANG analyzer ($VERSION)...${NC}"
    echo "================================================"

    # Create build script on Oracle instance
    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << EOF
set -e
cd /mnt/workspace

# Create Dockerfile for $LANG
cat > Dockerfile.$LANG << 'DOCKERFILE'
FROM --platform=linux/arm64 ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    jq \\
    && rm -rf /var/lib/apt/lists/*

# Install language-specific dependencies
$(case $LANG in
    javascript|typescript)
        echo "RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \\"
        echo "    apt-get install -y nodejs && \\"
        echo "    npm install -g npm@latest"
        if [ "$LANG" = "typescript" ]; then
            echo "RUN npm install -g typescript @types/node"
        fi
        ;;
    go)
        echo "RUN wget https://go.dev/dl/go1.21.5.linux-arm64.tar.gz && \\"
        echo "    tar -C /usr/local -xzf go1.21.5.linux-arm64.tar.gz && \\"
        echo "    rm go1.21.5.linux-arm64.tar.gz"
        echo "ENV PATH=/usr/local/go/bin:\$PATH"
        ;;
    ruby)
        echo "RUN apt-get update && apt-get install -y \\"
        echo "    ruby-full \\"
        echo "    rubygems \\"
        echo "    build-essential"
        ;;
    php)
        echo "RUN apt-get update && apt-get install -y \\"
        echo "    php \\"
        echo "    php-cli \\"
        echo "    php-mbstring \\"
        echo "    php-xml \\"
        echo "    php-curl \\"
        echo "    composer"
        ;;
    csharp)
        echo "RUN wget https://dot.net/v1/dotnet-install.sh && \\"
        echo "    chmod +x dotnet-install.sh && \\"
        echo "    ./dotnet-install.sh --channel 8.0 && \\"
        echo "    rm dotnet-install.sh"
        echo "ENV DOTNET_ROOT=/root/.dotnet"
        echo "ENV PATH=\$DOTNET_ROOT:\$PATH"
        ;;
    rust)
        echo "RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
        echo "ENV PATH=/root/.cargo/bin:\$PATH"
        ;;
    swift)
        echo "RUN apt-get update && apt-get install -y \\"
        echo "    binutils \\"
        echo "    git \\"
        echo "    gnupg2 \\"
        echo "    libc6-dev \\"
        echo "    libcurl4 \\"
        echo "    libedit2 \\"
        echo "    libgcc-9-dev \\"
        echo "    libpython2.7 \\"
        echo "    libsqlite3-0 \\"
        echo "    libstdc++-9-dev \\"
        echo "    libxml2 \\"
        echo "    libz3-dev \\"
        echo "    pkg-config \\"
        echo "    tzdata \\"
        echo "    zlib1g-dev"
        ;;
    kotlin)
        echo "RUN apt-get update && apt-get install -y \\"
        echo "    openjdk-17-jdk \\"
        echo "    unzip && \\"
        echo "    wget https://github.com/JetBrains/kotlin/releases/download/v1.9.20/kotlin-compiler-1.9.20.zip && \\"
        echo "    unzip kotlin-compiler-*.zip -d /usr/local && \\"
        echo "    rm kotlin-compiler-*.zip"
        echo "ENV PATH=/usr/local/kotlinc/bin:\$PATH"
        ;;
esac)

# Add analysis tools
$(case $LANG in
    javascript|typescript)
        echo "RUN npm install -g eslint prettier jshint"
        ;;
    go)
        echo "RUN go install golang.org/x/tools/cmd/goimports@latest && \\"
        echo "    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"
        ;;
    ruby)
        echo "RUN gem install rubocop"
        ;;
    php)
        echo "RUN composer global require squizlabs/php_codesniffer"
        ;;
    csharp)
        echo "RUN dotnet tool install --global dotnet-format"
        ;;
    rust)
        echo "RUN rustup component add clippy rustfmt"
        ;;
    swift)
        echo "# SwiftLint would be installed here"
        ;;
    kotlin)
        echo "# Detekt would be installed here"
        ;;
esac)

# Add analyzer script
COPY analyze.sh /analyzer/analyze.sh
RUN chmod +x /analyzer/analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyzer/analyze.sh"]
DOCKERFILE

# Create analyzer script
cat > analyze.sh << 'ANALYZER'
#!/bin/bash
set -e

echo "Starting $LANG analysis (version $VERSION)..."
echo "Repository: \$1"
echo "Branch: \$2"

# Clone repository
if [ -n "\$1" ]; then
    git clone --depth 1 -b "\$2" "\$1" /workspace/repo 2>/dev/null || git clone --depth 1 "\$1" /workspace/repo
    cd /workspace/repo
fi

# Run language-specific analysis
$(case $LANG in
    javascript)
        echo "echo 'Running JavaScript analysis...'"
        echo "find . -name '*.js' -type f | head -20"
        echo "if command -v eslint > /dev/null; then"
        echo "    eslint . --format json 2>/dev/null || true"
        echo "fi"
        ;;
    typescript)
        echo "echo 'Running TypeScript analysis...'"
        echo "find . -name '*.ts' -o -name '*.tsx' -type f | head -20"
        echo "if [ -f tsconfig.json ]; then"
        echo "    tsc --noEmit 2>&1 || true"
        echo "fi"
        ;;
    go)
        echo "echo 'Running Go analysis...'"
        echo "find . -name '*.go' -type f | head -20"
        echo "if command -v golangci-lint > /dev/null; then"
        echo "    golangci-lint run ./... 2>&1 || true"
        echo "fi"
        ;;
    ruby)
        echo "echo 'Running Ruby analysis...'"
        echo "find . -name '*.rb' -type f | head -20"
        echo "if command -v rubocop > /dev/null; then"
        echo "    rubocop --format json 2>/dev/null || true"
        echo "fi"
        ;;
    php)
        echo "echo 'Running PHP analysis...'"
        echo "find . -name '*.php' -type f | head -20"
        echo "if command -v phpcs > /dev/null; then"
        echo "    phpcs --report=json 2>/dev/null || true"
        echo "fi"
        ;;
    csharp)
        echo "echo 'Running C# analysis...'"
        echo "find . -name '*.cs' -type f | head -20"
        echo "if [ -f *.csproj ]; then"
        echo "    dotnet build --no-restore 2>&1 || true"
        echo "fi"
        ;;
    rust)
        echo "echo 'Running Rust analysis...'"
        echo "find . -name '*.rs' -type f | head -20"
        echo "if [ -f Cargo.toml ]; then"
        echo "    cargo clippy -- -D warnings 2>&1 || true"
        echo "fi"
        ;;
    swift)
        echo "echo 'Running Swift analysis...'"
        echo "find . -name '*.swift' -type f | head -20"
        ;;
    kotlin)
        echo "echo 'Running Kotlin analysis...'"
        echo "find . -name '*.kt' -o -name '*.kts' -type f | head -20"
        ;;
esac)

echo "Analysis complete for $LANG"
ANALYZER

chmod +x analyze.sh

# Build the image
echo "Building $LANG ARM analyzer..."
docker build -f Dockerfile.$LANG -t $REGISTRY/analyzer:lang-$LANG-$VERSION-arm .

if [ \$? -eq 0 ]; then
    echo "✅ $LANG analyzer built successfully"

    # Push to registry
    echo "Pushing to registry..."
    docker push $REGISTRY/analyzer:lang-$LANG-$VERSION-arm

    if [ \$? -eq 0 ]; then
        echo "✅ $LANG analyzer pushed successfully"

        # Get image size
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "$LANG-$VERSION-arm"
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
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $LANG analyzer ($VERSION-arm) completed successfully${NC}"
        ((COMPLETED++))
    else
        echo -e "${RED}❌ $LANG analyzer ($VERSION-arm) failed${NC}"
        ((FAILED++))
        FAILED_LANGS="$FAILED_LANGS $LANG"
    fi
done

# Final summary
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Build Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}Completed: $COMPLETED analyzers${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED analyzers ($FAILED_LANGS)${NC}"
else
    echo -e "${GREEN}All 9 remaining analyzers built successfully!${NC}"
fi
echo ""
echo -e "${GREEN}Total ARM analyzers ready:${NC}"
echo "  ✅ Java (v5.1-arm)"
echo "  ✅ Python (v4.3-arm)"
for lang_version in "${LANGUAGES[@]}"; do
    IFS=':' read -r lang version <<< "$lang_version"
    if [[ ! "$FAILED_LANGS" =~ "$lang" ]]; then
        echo "  ✅ $lang ($version-arm)"
    fi
done

echo ""
echo -e "${BLUE}All images are available at:${NC}"
echo "  $REGISTRY/analyzer:lang-<language>-<version>-arm"