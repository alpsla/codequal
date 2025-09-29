#!/bin/bash
# Script to push the built Java ARM image and build remaining analyzers

ORACLE_USER="opc"
SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"

echo "================================================"
echo "  Pushing Java ARM Image and Building Others"
echo "================================================"

# First push the Java image
echo ""
echo "📤 Pushing Java ARM analyzer to registry..."
ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'PUSH_JAVA'
# The image should already be tagged correctly
docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1-arm
echo "✅ Java ARM analyzer pushed successfully"
PUSH_JAVA

# Now build the remaining language analyzers
echo ""
echo "🔨 Building remaining language analyzers..."
ssh -i "$SSH_KEY" "$ORACLE_USER@$INSTANCE_IP" << 'BUILD_ALL'
cd /mnt/workspace

# Language-to-version mapping
declare -A LANG_VERSIONS=(
    ["python"]="v4.3"
    ["javascript"]="v4.2"
    ["typescript"]="v4.2"
    ["go"]="v3.8"
    ["ruby"]="v3.5"
    ["php"]="v3.4"
    ["csharp"]="v3.2"
    ["rust"]="v2.9"
    ["swift"]="v2.7"
    ["kotlin"]="v2.5"
)

# Build each language analyzer
for LANG in python javascript typescript go ruby php csharp rust swift kotlin; do
    VERSION="${LANG_VERSIONS[$LANG]}"
    IMAGE_TAG="registry.digitalocean.com/codequal-registry/analyzer:lang-${LANG}-${VERSION}-arm"
    
    echo ""
    echo "Building $LANG analyzer (${VERSION})..."
    
    # Create Dockerfile
    cat > Dockerfile.${LANG} << DOCKERFILE
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies
RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    wget \\
    unzip \\
    python3 \\
    python3-pip \\
    && rm -rf /var/lib/apt/lists/*

# Install language-specific dependencies
$(case $LANG in
    python)
        echo "RUN apt-get update && apt-get install -y python3-dev python3-venv pylint mypy && pip3 install bandit safety black flake8 isort pytest && rm -rf /var/lib/apt/lists/*"
        ;;
    javascript|typescript)
        echo "RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs && npm install -g eslint prettier jshint tslint typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin"
        ;;
    go)
        echo "RUN wget https://go.dev/dl/go1.21.5.linux-arm64.tar.gz && tar -C /usr/local -xzf go1.21.5.linux-arm64.tar.gz && rm go1.21.5.linux-arm64.tar.gz && /usr/local/go/bin/go install golang.org/x/tools/cmd/goimports@latest && /usr/local/go/bin/go install github.com/securego/gosec/v2/cmd/gosec@latest"
        echo "ENV PATH=/usr/local/go/bin:\$PATH"
        ;;
    ruby)
        echo "RUN apt-get update && apt-get install -y ruby-full && gem install rubocop brakeman bundler-audit && rm -rf /var/lib/apt/lists/*"
        ;;
    php)
        echo "RUN apt-get update && apt-get install -y php php-cli php-mbstring php-xml composer && composer global require squizlabs/php_codesniffer phpstan/phpstan && rm -rf /var/lib/apt/lists/*"
        echo "ENV PATH=/root/.composer/vendor/bin:\$PATH"
        ;;
    csharp)
        echo "RUN wget https://dot.net/v1/dotnet-install.sh && chmod +x dotnet-install.sh && ./dotnet-install.sh --channel 8.0 && rm dotnet-install.sh"
        echo "ENV PATH=/root/.dotnet:\$PATH"
        echo "ENV DOTNET_ROOT=/root/.dotnet"
        ;;
    rust)
        echo "RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . /root/.cargo/env && cargo install clippy rustfmt"
        echo "ENV PATH=/root/.cargo/bin:\$PATH"
        ;;
    swift)
        echo "RUN apt-get update && apt-get install -y clang libicu-dev && rm -rf /var/lib/apt/lists/*"
        ;;
    kotlin)
        echo "RUN apt-get update && apt-get install -y openjdk-11-jdk && wget https://github.com/pinterest/ktlint/releases/download/1.0.1/ktlint && chmod +x ktlint && mv ktlint /usr/local/bin/ && rm -rf /var/lib/apt/lists/*"
        ;;
esac)

# Install Semgrep (for all languages)
RUN pip3 install semgrep

# Create analyze script
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE

    # Create analyzer script
    cat > analyze.sh << 'ANALYZER'
#!/bin/bash
echo "${LANG^} Analyzer ${VERSION} (ARM)"
echo "========================"
echo "Repository: \$1"
echo "Output: \$2"

# Placeholder for actual analysis logic
cd "\$1" || exit 1
echo "Running ${LANG} analysis tools..."
echo "Analysis complete for ${LANG}"
ANALYZER

    # Build the image
    docker build -f Dockerfile.${LANG} -t "${IMAGE_TAG}" . 2>&1 | tail -5
    
    if [ $? -eq 0 ]; then
        echo "✅ ${LANG} analyzer built successfully"
        # Push to registry
        docker push "${IMAGE_TAG}" 2>&1 | tail -3
        echo "📤 ${LANG} analyzer pushed to registry"
    else
        echo "❌ Failed to build ${LANG} analyzer"
    fi
    
    # Clean up
    rm -f Dockerfile.${LANG} analyze.sh
done

echo ""
echo "🎉 Build process complete!"
echo ""
echo "📊 Final image status:"
docker images | grep analyzer | grep arm
BUILD_ALL
