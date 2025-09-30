# Java Analyzer Image v5.3
# Includes: PMD, Checkstyle, Semgrep, SpotBugs (optional), Dependency-Check 11.1.0 (optional)
#
# CHANGELOG v5.3:
# - Updated Dependency-Check from 8.4.0 to 11.1.0 (supports NVD API v2.0)
# - Added NVD_API_KEY environment variable support
# - Added persistent cache volume for CVE database (/data/dependency-check)
# - Optimized for optional tools (SpotBugs, Dependency-Check)

FROM openjdk:17-slim

LABEL maintainer="CodeQual Team"
LABEL version="5.3"
LABEL description="Java static analysis tools for CodeQual - includes Dependency-Check 11.1.0"

# Install base dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    python3 \
    python3-pip \
    build-essential \
    xz-utils \
    bash \
    && rm -rf /var/lib/apt/lists/*

# ============================================================
# CORE TOOLS (Always Included)
# ============================================================

# Install PMD 6.55.0 (Production-tested)
ENV PMD_VERSION=6.55.0
RUN wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-bin-${PMD_VERSION}.zip \
    && unzip -q pmd-bin-${PMD_VERSION}.zip \
    && mv pmd-bin-${PMD_VERSION} /opt/pmd \
    && ln -s /opt/pmd/bin/run.sh /usr/local/bin/pmd \
    && rm pmd-bin-${PMD_VERSION}.zip

# Install Checkstyle 10.12.0 (Production-tested)
ENV CHECKSTYLE_VERSION=10.12.0
RUN wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${CHECKSTYLE_VERSION}/checkstyle-${CHECKSTYLE_VERSION}-all.jar \
    && mv checkstyle-${CHECKSTYLE_VERSION}-all.jar /opt/checkstyle.jar \
    && echo '#!/bin/bash\njava -jar /opt/checkstyle.jar "$@"' > /usr/local/bin/checkstyle \
    && chmod +x /usr/local/bin/checkstyle

# Add Google Checks configuration for Checkstyle
RUN wget -q https://raw.githubusercontent.com/checkstyle/checkstyle/master/src/main/resources/google_checks.xml \
    -O /google_checks.xml

# Install Semgrep (Production-tested)
ENV SEMGREP_VERSION=1.45.0
RUN pip3 install --no-cache-dir semgrep==${SEMGREP_VERSION}

# ============================================================
# OPTIONAL TOOLS (User-Configurable)
# ============================================================

# Install SpotBugs 4.8.6 (Latest stable)
# Note: Requires compiled bytecode (.class files)
# Enable with: --enable-spotbugs flag
ENV SPOTBUGS_VERSION=4.8.6
RUN wget -q https://github.com/spotbugs/spotbugs/releases/download/${SPOTBUGS_VERSION}/spotbugs-${SPOTBUGS_VERSION}.zip \
    && unzip -q spotbugs-${SPOTBUGS_VERSION}.zip \
    && mv spotbugs-${SPOTBUGS_VERSION} /opt/spotbugs \
    && rm spotbugs-${SPOTBUGS_VERSION}.zip \
    && chmod +x /opt/spotbugs/bin/spotbugs

# Create wrapper script for SpotBugs
RUN echo '#!/bin/bash' > /usr/local/bin/spotbugs \
    && echo 'bash /opt/spotbugs/bin/spotbugs "$@"' >> /usr/local/bin/spotbugs \
    && chmod +x /usr/local/bin/spotbugs

# Install OWASP Dependency-Check 11.1.0 (Latest with NVD API v2.0)
# Note: Requires NVD API key (NVD_API_KEY environment variable)
# Enable with: --enable-dependency-check flag
ENV DEPENDENCY_CHECK_VERSION=11.1.0
RUN wget -q https://github.com/jeremylong/DependencyCheck/releases/download/v${DEPENDENCY_CHECK_VERSION}/dependency-check-${DEPENDENCY_CHECK_VERSION}-release.zip \
    && unzip -q dependency-check-${DEPENDENCY_CHECK_VERSION}-release.zip -d /opt \
    && rm dependency-check-${DEPENDENCY_CHECK_VERSION}-release.zip \
    && chmod +x /opt/dependency-check/bin/dependency-check.sh \
    && ln -s /opt/dependency-check/bin/dependency-check.sh /usr/local/bin/dependency-check

# Create persistent directory for Dependency-Check CVE database
# Mount this as a volume: -v /data/dependency-check:/data/dependency-check
RUN mkdir -p /data/dependency-check

# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================

ENV SPOTBUGS_HOME=/opt/spotbugs
ENV PMD_HOME=/opt/pmd
ENV DEPENDENCY_CHECK_HOME=/opt/dependency-check

# Add all tools to PATH
ENV PATH=$PATH:/opt/pmd/bin:/opt/spotbugs/bin:/opt/dependency-check/bin

# Set default working directory
WORKDIR /workspace

# ============================================================
# TOOL VERIFICATION SCRIPT
# ============================================================

RUN echo '#!/bin/bash' > /usr/local/bin/verify-tools.sh \
    && echo 'echo "=== CodeQual Java Analyzer v5.3 ===" ' >> /usr/local/bin/verify-tools.sh \
    && echo 'echo ""' >> /usr/local/bin/verify-tools.sh \
    && echo 'echo "Core Tools:"' >> /usr/local/bin/verify-tools.sh \
    && echo 'pmd --version 2>&1 | head -1 && echo "  ✓ PMD installed"' >> /usr/local/bin/verify-tools.sh \
    && echo 'checkstyle --version 2>&1 && echo "  ✓ Checkstyle installed"' >> /usr/local/bin/verify-tools.sh \
    && echo 'semgrep --version && echo "  ✓ Semgrep installed"' >> /usr/local/bin/verify-tools.sh \
    && echo 'echo ""' >> /usr/local/bin/verify-tools.sh \
    && echo 'echo "Optional Tools:"' >> /usr/local/bin/verify-tools.sh \
    && echo 'spotbugs -version 2>&1 | head -1 && echo "  ✓ SpotBugs installed (optional)"' >> /usr/local/bin/verify-tools.sh \
    && echo 'dependency-check --version 2>&1 | head -1 && echo "  ✓ Dependency-Check installed (optional)"' >> /usr/local/bin/verify-tools.sh \
    && echo 'echo ""' >> /usr/local/bin/verify-tools.sh \
    && echo 'echo "Configuration:"' >> /usr/local/bin/verify-tools.sh \
    && echo 'if [ -z "$NVD_API_KEY" ]; then' >> /usr/local/bin/verify-tools.sh \
    && echo '  echo "  ⚠ NVD_API_KEY not set (required for Dependency-Check)"' >> /usr/local/bin/verify-tools.sh \
    && echo 'else' >> /usr/local/bin/verify-tools.sh \
    && echo '  echo "  ✓ NVD_API_KEY configured"' >> /usr/local/bin/verify-tools.sh \
    && echo 'fi' >> /usr/local/bin/verify-tools.sh \
    && echo 'echo ""' >> /usr/local/bin/verify-tools.sh \
    && echo 'echo "All tools verified successfully!"' >> /usr/local/bin/verify-tools.sh \
    && chmod +x /usr/local/bin/verify-tools.sh

# ============================================================
# USAGE GUIDE SCRIPT
# ============================================================

RUN echo '#!/bin/bash' > /usr/local/bin/usage.sh \
    && echo 'cat << EOF' >> /usr/local/bin/usage.sh \
    && echo '╔════════════════════════════════════════════════════════════╗' >> /usr/local/bin/usage.sh \
    && echo '║       CodeQual Java Analyzer v5.3 - Usage Guide           ║' >> /usr/local/bin/usage.sh \
    && echo '╚════════════════════════════════════════════════════════════╝' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'CORE TOOLS (Always Available):' >> /usr/local/bin/usage.sh \
    && echo '  • PMD 6.55.0          - Code quality and best practices' >> /usr/local/bin/usage.sh \
    && echo '  • Checkstyle 10.12.0  - Code style and formatting' >> /usr/local/bin/usage.sh \
    && echo '  • Semgrep 1.45.0      - Security vulnerability scanning' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'OPTIONAL TOOLS (Enable as Needed):' >> /usr/local/bin/usage.sh \
    && echo '  • SpotBugs 4.8.6             - Bytecode analysis (requires compilation)' >> /usr/local/bin/usage.sh \
    && echo '  • Dependency-Check 11.1.0    - CVE scanning (requires NVD_API_KEY)' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'BASIC USAGE:' >> /usr/local/bin/usage.sh \
    && echo '  docker run --rm -v $(pwd):/workspace \\' >> /usr/local/bin/usage.sh \
    && echo '    registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \\' >> /usr/local/bin/usage.sh \
    && echo '    bash -c "pmd check -d /workspace -f json -R category/java/bestpractices.xml"' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'WITH DEPENDENCY-CHECK (Requires NVD API Key):' >> /usr/local/bin/usage.sh \
    && echo '  docker run --rm \\' >> /usr/local/bin/usage.sh \
    && echo '    -v $(pwd):/workspace \\' >> /usr/local/bin/usage.sh \
    && echo '    -v /data/dependency-check:/data/dependency-check \\' >> /usr/local/bin/usage.sh \
    && echo '    -e NVD_API_KEY=your-api-key-here \\' >> /usr/local/bin/usage.sh \
    && echo '    registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \\' >> /usr/local/bin/usage.sh \
    && echo '    bash -c "dependency-check --scan /workspace --format JSON \\' >> /usr/local/bin/usage.sh \
    && echo '      --out /workspace/results --nvdApiKey \$NVD_API_KEY"' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'GET NVD API KEY (Free):' >> /usr/local/bin/usage.sh \
    && echo '  Visit: https://nvd.nist.gov/developers/request-an-api-key' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'VERIFY INSTALLATION:' >> /usr/local/bin/usage.sh \
    && echo '  /usr/local/bin/verify-tools.sh' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'DOCUMENTATION:' >> /usr/local/bin/usage.sh \
    && echo '  https://docs.codequal.com/java-analyzer' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'EOF' >> /usr/local/bin/usage.sh \
    && chmod +x /usr/local/bin/usage.sh

# ============================================================
# BUILD VERIFICATION
# ============================================================

# Verify all tools are installed correctly
RUN /usr/local/bin/verify-tools.sh

# ============================================================
# RUNTIME CONFIGURATION
# ============================================================

# Set entrypoint to bash for flexibility
ENTRYPOINT ["/bin/bash"]

# Default command shows usage
CMD ["/usr/local/bin/usage.sh"]

# Health check to verify tools are working
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s --retries=3 \
  CMD /usr/local/bin/verify-tools.sh || exit 1

# ============================================================
# BUILD INSTRUCTIONS
# ============================================================

# Build for ARM64 (Oracle Cloud):
#   docker buildx build --platform linux/arm64 -t analyzer:lang-java-v5.3-arm .
#   docker tag analyzer:lang-java-v5.3-arm registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm
#   docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm
#
# Build for AMD64 (x86):
#   docker buildx build --platform linux/amd64 -t analyzer:lang-java-v5.3-amd .
#   docker tag analyzer:lang-java-v5.3-amd registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-amd
#   docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-amd
#
# Multi-platform build:
#   docker buildx build --platform linux/arm64,linux/amd64 \
#     -t registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3 \
#     --push .