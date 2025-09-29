#!/bin/bash
# Complete build script for all 11 CodeQual language analyzers (ARM64)
# This script builds and pushes all remaining 9 language analyzers
# (Java and Python already completed)

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
echo -e "${BLUE}  Building All 11 Language ARM Analyzers${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

# Language configuration - all 11 languages
declare -A LANG_CONFIG=(
    ["java"]="v5.1|COMPLETED"
    ["python"]="v4.3|COMPLETED"
    ["javascript"]="v4.2|PENDING"
    ["typescript"]="v4.2|PENDING"
    ["go"]="v3.8|PENDING"
    ["ruby"]="v3.5|PENDING"
    ["php"]="v3.4|PENDING"
    ["csharp"]="v3.2|PENDING"
    ["rust"]="v2.9|PENDING"
    ["swift"]="v2.7|PENDING"
    ["kotlin"]="v2.5|PENDING"
)

# Extract languages to build
LANGUAGES_TO_BUILD=()
for lang in javascript typescript go ruby php csharp rust swift kotlin; do
    LANGUAGES_TO_BUILD+=($lang)
done

echo -e "${YELLOW}Status Check:${NC}"
echo "✅ Java (v5.1) - Already built and pushed"
echo "✅ Python (v4.3) - Already built and pushed"
echo ""
echo -e "${YELLOW}Languages to build (9 remaining):${NC}"
for lang in "${LANGUAGES_TO_BUILD[@]}"; do
    IFS='|' read -r version status <<< "${LANG_CONFIG[$lang]}"
    echo "  - $lang ($version)"
done
echo ""

# Confirm before proceeding
read -p "Proceed with building 9 remaining analyzers? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Build cancelled."
    exit 1
fi

# Main build function
build_analyzer() {
    local LANG=$1
    local VERSION=$2
    
    echo ""
    echo -e "${BLUE}Building $LANG analyzer ($VERSION)...${NC}"
    
    ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << EOF
set -e
cd /mnt/workspace

# Create Dockerfile for $LANG
cat > Dockerfile.$LANG << 'DOCKERFILE'
$(generate_dockerfile $LANG $VERSION)
DOCKERFILE

# Create analyzer script
cat > analyze.sh << 'ANALYZER'
$(generate_analyzer_script $LANG $VERSION)
ANALYZER

# Build the image
echo "Building $LANG ARM analyzer..."
docker build -f Dockerfile.$LANG -t $REGISTRY/analyzer:lang-$LANG-$VERSION-arm . 2>&1 | tail -10

if [ \$? -eq 0 ]; then
    echo "✅ $LANG analyzer built successfully"
    
    # Push to registry
    echo "Pushing $LANG analyzer to registry..."
    docker push $REGISTRY/analyzer:lang-$LANG-$VERSION-arm 2>&1 | tail -5
    
    if [ \$? -eq 0 ]; then
        echo "📤 $LANG analyzer pushed successfully"
    else
        echo "❌ Failed to push $LANG analyzer"
        exit 1
    fi
else
    echo "❌ Failed to build $LANG analyzer"
    exit 1
fi

# Clean up build files
rm -f Dockerfile.$LANG analyze.sh
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $LANG analyzer completed${NC}"
        return 0
    else
        echo -e "${RED}❌ $LANG analyzer failed${NC}"
        return 1
    fi
}

# Function to generate Dockerfile content based on language
generate_dockerfile() {
    local LANG=$1
    local VERSION=$2
    
    case $LANG in
        javascript|typescript)
            cat << 'DOCKERFILE'
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js analysis tools
RUN npm install -g \
    eslint \
    prettier \
    jshint \
    standard \
    typescript \
    @typescript-eslint/parser \
    @typescript-eslint/eslint-plugin \
    tslint

# Install Semgrep
RUN pip3 install semgrep

COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE
            ;;
            
        go)
            cat << 'DOCKERFILE'
FROM golang:1.21-alpine

# Install system dependencies
RUN apk add --no-cache git bash python3 py3-pip

# Install Go tools
RUN go install golang.org/x/tools/cmd/goimports@latest && \
    go install github.com/securego/gosec/v2/cmd/gosec@latest && \
    go install honnef.co/go/tools/cmd/staticcheck@latest && \
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Install Semgrep
RUN pip3 install semgrep

COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE
            ;;
            
        ruby)
            cat << 'DOCKERFILE'
FROM ruby:3.2-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Ruby analysis tools
RUN gem install \
    rubocop \
    brakeman \
    bundler-audit \
    reek \
    rails_best_practices

# Install Semgrep
RUN pip3 install semgrep

COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE
            ;;
            
        php)
            cat << 'DOCKERFILE'
FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install PHP analysis tools
RUN composer global require \
    squizlabs/php_codesniffer \
    phpstan/phpstan \
    vimeo/psalm \
    phpmd/phpmd

ENV PATH="/root/.composer/vendor/bin:$PATH"

# Install Semgrep
RUN pip3 install semgrep

COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE
            ;;
            
        csharp)
            cat << 'DOCKERFILE'
FROM mcr.microsoft.com/dotnet/sdk:8.0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install .NET tools
RUN dotnet tool install -g dotnet-format && \
    dotnet tool install -g security-scan && \
    dotnet tool install -g Roslynator.DotNet.Cli

ENV PATH="/root/.dotnet/tools:$PATH"

# Install Semgrep
RUN pip3 install semgrep

COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE
            ;;
            
        rust)
            cat << 'DOCKERFILE'
FROM rust:1.73-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust tools
RUN rustup component add clippy rustfmt && \
    cargo install cargo-audit cargo-outdated

# Install Semgrep
RUN pip3 install semgrep

COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE
            ;;
            
        swift)
            cat << 'DOCKERFILE'
FROM swift:5.9-jammy

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install SwiftLint (if available for ARM)
RUN git clone https://github.com/realm/SwiftLint.git && \
    cd SwiftLint && \
    swift build -c release && \
    cp .build/release/swiftlint /usr/local/bin/ && \
    cd .. && rm -rf SwiftLint

# Install Semgrep
RUN pip3 install semgrep

COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE
            ;;
            
        kotlin)
            cat << 'DOCKERFILE'
FROM eclipse-temurin:17-jdk-jammy

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Kotlin
RUN wget https://github.com/JetBrains/kotlin/releases/download/v1.9.20/kotlin-compiler-1.9.20.zip && \
    unzip kotlin-compiler-1.9.20.zip && \
    mv kotlinc /opt/ && \
    rm kotlin-compiler-1.9.20.zip

ENV PATH="/opt/kotlinc/bin:$PATH"

# Install ktlint
RUN wget https://github.com/pinterest/ktlint/releases/download/1.0.1/ktlint && \
    chmod +x ktlint && \
    mv ktlint /usr/local/bin/

# Install detekt
RUN wget https://github.com/detekt/detekt/releases/download/v1.23.3/detekt-cli-1.23.3-all.jar && \
    mv detekt-cli-1.23.3-all.jar /usr/local/lib/detekt.jar

# Install Semgrep
RUN pip3 install semgrep

COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE
            ;;
    esac
}

# Function to generate analyzer script based on language
generate_analyzer_script() {
    local LANG=$1
    local VERSION=$2
    
    cat << ANALYZER
#!/bin/bash
echo "${LANG^} Analyzer $VERSION (ARM)"
echo "========================"
echo "Repository: \$1"
echo "Output: \$2"

if [ ! -d "\$1" ]; then
    echo "Error: Repository path '\$1' not found"
    exit 1
fi

cd "\$1" || exit 1

echo "Running ${LANG} analysis..."

# Run language-specific tools
case "$LANG" in
    javascript|typescript)
        eslint . --format json 2>/dev/null || true
        ;;
    go)
        gosec ./... 2>/dev/null || true
        staticcheck ./... 2>/dev/null || true
        ;;
    ruby)
        rubocop --format json 2>/dev/null || true
        brakeman --format json 2>/dev/null || true
        ;;
    php)
        phpcs --report=json . 2>/dev/null || true
        phpstan analyse --error-format=json 2>/dev/null || true
        ;;
    csharp)
        dotnet build 2>/dev/null || true
        dotnet format --verify-no-changes 2>/dev/null || true
        ;;
    rust)
        cargo clippy -- -D warnings 2>/dev/null || true
        cargo fmt --check 2>/dev/null || true
        ;;
    swift)
        swiftlint lint --reporter json 2>/dev/null || true
        ;;
    kotlin)
        ktlint --reporter=json 2>/dev/null || true
        java -jar /usr/local/lib/detekt.jar --report txt 2>/dev/null || true
        ;;
esac

# Run Semgrep for all languages
semgrep --config=auto --json . 2>/dev/null || true

echo "Analysis complete for $LANG"

# Output results to specified location if provided
if [ -n "\$2" ]; then
    echo "Results would be written to: \$2"
fi
ANALYZER
}

# Track build results
BUILD_RESULTS=()
FAILED_BUILDS=()

# Build each remaining language analyzer
for lang in "${LANGUAGES_TO_BUILD[@]}"; do
    IFS='|' read -r version status <<< "${LANG_CONFIG[$lang]}"
    
    if build_analyzer "$lang" "$version"; then
        BUILD_RESULTS+=("✅ $lang ($version)")
    else
        BUILD_RESULTS+=("❌ $lang ($version)")
        FAILED_BUILDS+=("$lang")
    fi
done

# Final summary
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Build Summary - All 11 Languages${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

echo -e "${GREEN}Previously Completed:${NC}"
echo "  ✅ Java (v5.1)"
echo "  ✅ Python (v4.3)"
echo ""

echo -e "${YELLOW}Build Results:${NC}"
for result in "${BUILD_RESULTS[@]}"; do
    echo "  $result"
done

# Check final status on Oracle instance
echo ""
echo -e "${BLUE}Checking all ARM images on Oracle instance...${NC}"
ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" "docker images | grep analyzer | grep arm | sort"

# Report any failures
if [ ${#FAILED_BUILDS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}⚠️  Some builds failed: ${FAILED_BUILDS[*]}${NC}"
    echo "Please check the logs and retry failed builds individually."
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 All 11 language analyzers successfully built and pushed!${NC}"
    echo ""
    echo "All ARM analyzer images are now available in the registry:"
    echo "  ${REGISTRY}/analyzer:lang-{language}-{version}-arm"
fi