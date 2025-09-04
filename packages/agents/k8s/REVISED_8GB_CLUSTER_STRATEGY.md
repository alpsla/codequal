# CodeQual Universal Analysis Image - Optimized for 8GB Cluster
# Memory: 2.5-3GB | Tools: 30+ essentials across all languages

FROM ubuntu:22.04 as base

LABEL maintainer="CodeQual Team" \
      version="2.0.0" \
      description="Lightweight universal analyzer for 8GB cluster" \
      memory.target="3GB"

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Essential tools
    git curl wget ca-certificates gnupg2 \
    # Build tools (minimal)
    build-essential pkg-config \
    # Python 3.11
    python3.11 python3-pip \
    # Node.js 20
    nodejs npm \
    # Java 17 (OpenJDK)
    openjdk-17-jre-headless \
    # Go 1.21
    golang-1.21 \
    # Ruby (minimal)
    ruby \
    # PHP (minimal)
    php-cli \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set up Python
RUN python3.11 -m pip install --upgrade pip setuptools wheel --no-cache-dir

# ============================================
# LAYER 1: Universal Security Tools (All Languages)
# ============================================
RUN pip install --no-cache-dir \
    semgrep \
    gitpython \
    safety

# Install security tools via script
RUN curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh -s -- -b /usr/local/bin && \
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# ============================================
# LAYER 2: Essential Python Tools (Most Used)
# ============================================
RUN pip install --no-cache-dir \
    bandit \
    pylint \
    mypy \
    black \
    flake8

# ============================================
# LAYER 3: Essential JavaScript/TypeScript Tools
# ============================================
RUN npm install -g \
    eslint@latest \
    prettier@latest \
    typescript@latest \
    @typescript-eslint/parser@latest \
    @typescript-eslint/eslint-plugin@latest

# ============================================
# LAYER 4: Essential Java Tools (Lightweight)
# ============================================
# Download PMD (smaller than SpotBugs)
RUN wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip -O /tmp/pmd.zip && \
    unzip -q /tmp/pmd.zip -d /opt/ && \
    mv /opt/pmd-* /opt/pmd && \
    ln -s /opt/pmd/bin/pmd /usr/local/bin/pmd && \
    rm /tmp/pmd.zip

# ============================================
# LAYER 5: Go Tools (Essential Only)
# ============================================
ENV PATH="/usr/lib/go-1.21/bin:${PATH}"
ENV GOPATH="/opt/go"
ENV PATH="${GOPATH}/bin:${PATH}"

RUN go install github.com/securego/gosec/v2/cmd/gosec@latest && \
    go install honnef.co/go/tools/cmd/staticcheck@latest

# ============================================
# LAYER 6: Rust Tools (via Cargo - Optional)
# ============================================
# Skip Rust for now to save space - can be added if needed

# ============================================
# Memory Optimization Settings
# ============================================
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV JAVA_OPTS="-Xmx1024m -XX:+UseG1GC"
ENV PYTHONOPTIMIZE=1
ENV GOMAXPROCS=2

# ============================================
# Tool Activation Script
# ============================================
RUN mkdir -p /tools /cache /analysis

COPY <<'EOF' /tools/activate.sh
#!/bin/bash
# Dynamic tool activation based on detected language

PROJECT_PATH=${1:-.}
LANGUAGES=$(find $PROJECT_PATH -type f \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.java" -o -name "*.go" \) | head -100 | sed 's/.*\.//' | sort -u)

echo "Detected languages: $LANGUAGES"

for lang in $LANGUAGES; do
    case $lang in
        py)
            echo "✓ Python tools activated"
            export PYTHON_TOOLS_ENABLED=1
            ;;
        js|jsx|ts|tsx)
            echo "✓ JavaScript/TypeScript tools activated"
            export JS_TOOLS_ENABLED=1
            ;;
        java)
            echo "✓ Java tools activated"
            export JAVA_TOOLS_ENABLED=1
            ;;
        go)
            echo "✓ Go tools activated"
            export GO_TOOLS_ENABLED=1
            ;;
    esac
done
EOF
RUN chmod +x /tools/activate.sh

# ============================================
# Universal Analysis Script
# ============================================
COPY <<'EOF' /usr/local/bin/analyze-universal
#!/bin/bash
set -e

PROJECT_PATH=${1:-.}
OUTPUT_DIR=${2:-./analysis-results}
MAX_MEMORY=${3:-2048}  # MB

# Set memory limits
export NODE_OPTIONS="--max-old-space-size=$((MAX_MEMORY/3))"
export JAVA_OPTS="-Xmx$((MAX_MEMORY/3))m"

# Activate tools based on project
source /tools/activate.sh $PROJECT_PATH

mkdir -p $OUTPUT_DIR

echo "🔍 Universal CodeQual Analysis (Memory-Optimized)"
echo "Memory Limit: ${MAX_MEMORY}MB"

# Universal security scan (all projects)
echo "Running security scans..."
semgrep --config=auto --json -o $OUTPUT_DIR/semgrep-results.json $PROJECT_PATH 2>/dev/null || true
gitleaks detect --source $PROJECT_PATH --report-path $OUTPUT_DIR/gitleaks-report.json 2>/dev/null || true

# Language-specific analysis
if [ "$PYTHON_TOOLS_ENABLED" = "1" ]; then
    echo "Analyzing Python code..."
    bandit -r $PROJECT_PATH -f json -o $OUTPUT_DIR/bandit-report.json 2>/dev/null || true
    pylint $PROJECT_PATH --output-format=json > $OUTPUT_DIR/pylint-report.json 2>&1 || true
fi

if [ "$JS_TOOLS_ENABLED" = "1" ]; then
    echo "Analyzing JavaScript/TypeScript..."
    eslint $PROJECT_PATH --ext .js,.jsx,.ts,.tsx --format json -o $OUTPUT_DIR/eslint-report.json 2>/dev/null || true
fi

if [ "$JAVA_TOOLS_ENABLED" = "1" ]; then
    echo "Analyzing Java code..."
    pmd check -d $PROJECT_PATH -R rulesets/java/quickstart.xml -f json > $OUTPUT_DIR/pmd-report.json 2>&1 || true
fi

if [ "$GO_TOOLS_ENABLED" = "1" ]; then
    echo "Analyzing Go code..."
    cd $PROJECT_PATH && gosec -fmt json -out $OUTPUT_DIR/gosec-report.json ./... 2>/dev/null || true
fi

echo "✅ Analysis complete"
EOF
RUN chmod +x /usr/local/bin/analyze-universal

# ============================================
# Health Check
# ============================================
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python3.11 --version && node --version && java -version

WORKDIR /analysis

# Default entrypoint
ENTRYPOINT ["/usr/local/bin/analyze-universal"]
CMD ["/analysis"]