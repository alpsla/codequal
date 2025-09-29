#!/bin/bash

# Build All CodeQual Analyzer Images for ARM Architecture
# This script builds all language analyzers for ARM64/aarch64

set -e

# Configuration
REGISTRY="registry.digitalocean.com/codequal-registry"
PLATFORM="linux/arm64"
BUILD_DIR="./docker/analyzers-arm"

echo "================================================"
echo "  Building CodeQual Analyzers for ARM64"
echo "================================================"
echo ""
echo "Registry: $REGISTRY"
echo "Platform: $PLATFORM"
echo ""

# Create build directory
mkdir -p $BUILD_DIR

# Language list with their versions
declare -A LANGUAGES=(
  ["java"]="v5.1"
  ["python"]="v4.3"
  ["javascript"]="v4.3"
  ["typescript"]="v4.6"
  ["go"]="v4.6"
  ["rust"]="v8"
  ["cpp"]="v4.7"
  ["csharp"]="v4.6"
  ["php"]="v4.3"
  ["ruby"]="v4.3"
  ["perl"]="v4.6"
)

# Build status tracking
declare -A BUILD_STATUS

# Function to create Dockerfile for a language
create_dockerfile() {
  local lang=$1
  local version=$2
  local dockerfile="$BUILD_DIR/Dockerfile.$lang"
  
  echo "📝 Creating Dockerfile for $lang..."
  
  case $lang in
    "java")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 eclipse-temurin:17-jdk-jammy

# Install build tools and dependencies
RUN apt-get update && apt-get install -y \
    maven \
    gradle \
    git \
    curl \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install SpotBugs
RUN wget https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.tgz \
    && tar -xzf spotbugs-4.7.3.tgz -C /opt \
    && ln -s /opt/spotbugs-4.7.3/bin/spotbugs /usr/local/bin/spotbugs \
    && rm spotbugs-4.7.3.tgz

# Install PMD
RUN wget https://github.com/pmd/pmd/releases/download/pmd_releases%2F6.55.0/pmd-bin-6.55.0.zip \
    && unzip pmd-bin-6.55.0.zip -d /opt \
    && ln -s /opt/pmd-bin-6.55.0/bin/run.sh /usr/local/bin/pmd \
    && rm pmd-bin-6.55.0.zip

# Install Checkstyle
RUN wget https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.12.0/checkstyle-10.12.0-all.jar \
    && mv checkstyle-10.12.0-all.jar /opt/checkstyle.jar \
    && echo '#!/bin/bash\njava -jar /opt/checkstyle.jar "$@"' > /usr/local/bin/checkstyle \
    && chmod +x /usr/local/bin/checkstyle

# Install OWASP Dependency Check
RUN wget https://github.com/jeremylong/DependencyCheck/releases/download/v8.4.0/dependency-check-8.4.0-release.zip \
    && unzip dependency-check-8.4.0-release.zip -d /opt \
    && ln -s /opt/dependency-check/bin/dependency-check.sh /usr/local/bin/dependency-check \
    && rm dependency-check-8.4.0-release.zip

# Install Semgrep
RUN apt-get update && apt-get install -y python3 python3-pip \
    && pip3 install semgrep \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "python")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 python:3.11-slim

RUN apt-get update && apt-get install -y \
    git \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python analysis tools
RUN pip install --no-cache-dir \
    bandit \
    pylint \
    flake8 \
    mypy \
    safety \
    semgrep \
    black \
    isort \
    pytest \
    coverage

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "javascript"|"typescript")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 node:18-slim

RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install JavaScript/TypeScript analysis tools
RUN npm install -g \
    eslint \
    jshint \
    typescript \
    tslint \
    prettier \
    npm-audit \
    depcheck \
    madge \
    jscpd

# Install Semgrep
RUN pip3 install semgrep

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "go")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 golang:1.21-alpine

RUN apk add --no-cache git gcc musl-dev python3 py3-pip

# Install Go analysis tools
RUN go install github.com/securego/gosec/v2/cmd/gosec@latest \
    && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest \
    && go install honnef.co/go/tools/cmd/staticcheck@latest \
    && go install github.com/sonatype-nexus-community/nancy@latest

# Install Semgrep
RUN pip3 install semgrep

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "rust")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 rust:1.73-slim

RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Rust analysis tools
RUN rustup component add clippy rustfmt \
    && cargo install cargo-audit cargo-outdated cargo-edit

# Install Semgrep
RUN pip3 install semgrep

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "cpp")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 gcc:12

RUN apt-get update && apt-get install -y \
    clang \
    clang-tidy \
    cppcheck \
    valgrind \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install cpplint
RUN pip3 install cpplint semgrep

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "csharp")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 mcr.microsoft.com/dotnet/sdk:7.0

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install .NET analysis tools
RUN dotnet tool install --global dotnet-format \
    && dotnet tool install --global security-scan \
    && dotnet tool install --global dotnet-outdated-tool

ENV PATH="${PATH}:/root/.dotnet/tools"

# Install Semgrep
RUN pip3 install semgrep

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "php")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 php:8.2-cli

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install PHP analysis tools
RUN composer global require \
    squizlabs/php_codesniffer \
    phpstan/phpstan \
    vimeo/psalm \
    phpmd/phpmd

ENV PATH="${PATH}:/root/.composer/vendor/bin"

# Install Semgrep
RUN pip3 install semgrep

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "ruby")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 ruby:3.2-slim

RUN apt-get update && apt-get install -y \
    git \
    gcc \
    make \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Ruby analysis tools
RUN gem install \
    brakeman \
    rubocop \
    bundler-audit \
    reek \
    rails_best_practices

# Install Semgrep
RUN pip3 install semgrep

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    "perl")
      cat > $dockerfile << 'EOF'
FROM --platform=linux/arm64 perl:5.38-slim

RUN apt-get update && apt-get install -y \
    git \
    gcc \
    make \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Perl analysis tools
RUN cpan install Perl::Critic Perl::Tidy

# Install Semgrep
RUN pip3 install semgrep

WORKDIR /workspace
COPY analyze.sh /analyze.sh
RUN chmod +x /analyze.sh
ENTRYPOINT ["/analyze.sh"]
EOF
      ;;
      
    *)
      echo "❌ Unknown language: $lang"
      return 1
      ;;
  esac
  
  echo "✅ Created Dockerfile for $lang"
  return 0
}

# Create the common analyze.sh script
cat > $BUILD_DIR/analyze.sh << 'ANALYZE_SCRIPT'
#!/bin/bash
# Generic analyzer script that runs all tools for the language

REPO_PATH=${1:-/workspace/repo}
OUTPUT_PATH=${2:-/workspace/output}

echo "Starting analysis..."
echo "Repository: $REPO_PATH"
echo "Output: $OUTPUT_PATH"

cd "$REPO_PATH" || exit 1

# Create output directory
mkdir -p "$OUTPUT_PATH"

# Run analysis based on available tools
echo "Running available analysis tools..."

# The actual tool commands will be injected based on language
# This is a placeholder that each language will customize

echo "Analysis complete!"
ANALYZE_SCRIPT

chmod +x $BUILD_DIR/analyze.sh

# Build each language image
echo ""
echo "🔨 Starting builds..."
echo ""

for lang in "${!LANGUAGES[@]}"; do
  version="${LANGUAGES[$lang]}"
  image_tag="$REGISTRY/analyzer:lang-$lang-$version-arm"
  
  echo "================================================"
  echo "Building $lang analyzer (version $version)"
  echo "================================================"
  
  # Create Dockerfile
  if create_dockerfile "$lang" "$version"; then
    # Build the image
    echo "🔨 Building image: $image_tag"
    
    if docker build \
      --platform "$PLATFORM" \
      -f "$BUILD_DIR/Dockerfile.$lang" \
      -t "$image_tag" \
      "$BUILD_DIR"; then
      
      echo "✅ Successfully built $lang analyzer"
      BUILD_STATUS[$lang]="✅ Success"
    else
      echo "❌ Failed to build $lang analyzer"
      BUILD_STATUS[$lang]="❌ Failed"
    fi
  else
    BUILD_STATUS[$lang]="❌ Dockerfile creation failed"
  fi
  
  echo ""
done

# Summary
echo "================================================"
echo "  Build Summary"
echo "================================================"
echo ""
for lang in "${!BUILD_STATUS[@]}"; do
  echo "$lang: ${BUILD_STATUS[$lang]}"
done

echo ""
echo "📊 Next Steps:"
echo "1. Push images to registry:"
echo "   for lang in ${!LANGUAGES[@]}; do"
echo "     docker push $REGISTRY/analyzer:lang-\$lang-\${LANGUAGES[\$lang]}-arm"
echo "   done"
echo ""
echo "2. Copy to Oracle instance and run there"
echo "3. Test with real repositories"