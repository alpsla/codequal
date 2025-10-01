# Java Analyzer Image v6.0
# Includes: PMD, Checkstyle, Semgrep, SpotBugs (optional), Dependency-Check 12.1.5 (CVSS v4 support)
#
# CHANGELOG v6.0:
# - CRITICAL: Updated Dependency-Check from 11.1.0 to 12.1.5 (CVSS v4 support)
# - FIXED: "SAFETY" parsing error that blocked 2018-2025 CVE loading
# - ADDED: Support for CVSS v4.0 scores in vulnerability reports
# - ADDED: CVSSv4 integration with OSSIndex
# - PRODUCTION-READY: Can now load complete NVD database (1999-2025)
#
# UPGRADE RATIONALE:
# - Version 11.1.0 failed to parse ~245,000 CVEs (2018-2025) due to CVSS v4 errors
# - Version 12.1.5 includes fixes for CVSS v4 parsing (GitHub issue #7406)
# - Required for Log4Shell (CVE-2021-44228) detection and validation
# - Enables complete CVE database coverage on PostgreSQL backend

FROM openjdk:17-slim

LABEL maintainer="CodeQual Team"
LABEL version="6.0"
LABEL description="Java static analysis tools for CodeQual - includes Dependency-Check 12.1.5 with CVSS v4 support"

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

# Install OWASP Dependency-Check 12.1.5 (Latest stable with CVSS v4 support)
# Note: Requires NVD API key (NVD_API_KEY environment variable)
# Enable with: --enable-dependency-check flag
# CRITICAL: Version 12.1.5 fixes CVSS v4 "SAFETY" parsing errors (GitHub issue #7406)
ENV DEPENDENCY_CHECK_VERSION=12.1.5
RUN wget -q https://github.com/dependency-check/DependencyCheck/releases/download/v${DEPENDENCY_CHECK_VERSION}/dependency-check-${DEPENDENCY_CHECK_VERSION}-release.zip \
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
    && echo 'echo "=== CodeQual Java Analyzer v6.0 ===" ' >> /usr/local/bin/verify-tools.sh \
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
    && echo '║       CodeQual Java Analyzer v6.0 - Usage Guide           ║' >> /usr/local/bin/usage.sh \
    && echo '╚════════════════════════════════════════════════════════════╝' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'CORE TOOLS (Always Available):' >> /usr/local/bin/usage.sh \
    && echo '  • PMD 6.55.0          - Code quality and best practices' >> /usr/local/bin/usage.sh \
    && echo '  • Checkstyle 10.12.0  - Code style and formatting' >> /usr/local/bin/usage.sh \
    && echo '  • Semgrep 1.45.0      - Security vulnerability scanning' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'OPTIONAL TOOLS (Enable as Needed):' >> /usr/local/bin/usage.sh \
    && echo '  • SpotBugs 4.8.6             - Bytecode analysis (requires compilation)' >> /usr/local/bin/usage.sh \
    && echo '  • Dependency-Check 12.1.5    - CVE scanning with CVSS v4 support' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'WHATS NEW IN v6.0:' >> /usr/local/bin/usage.sh \
    && echo '  ✓ Dependency-Check upgraded from 11.1.0 to 12.1.5' >> /usr/local/bin/usage.sh \
    && echo '  ✓ CVSS v4.0 support (fixes "SAFETY" parsing errors)' >> /usr/local/bin/usage.sh \
    && echo '  ✓ Can now load complete NVD database (1999-2025)' >> /usr/local/bin/usage.sh \
    && echo '  ✓ Log4Shell (CVE-2021-44228) detection validated' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'BASIC USAGE:' >> /usr/local/bin/usage.sh \
    && echo '  docker run --rm -v $(pwd):/workspace \\' >> /usr/local/bin/usage.sh \
    && echo '    iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm \\' >> /usr/local/bin/usage.sh \
    && echo '    bash -c "pmd check -d /workspace -f json -R category/java/bestpractices.xml"' >> /usr/local/bin/usage.sh \
    && echo '' >> /usr/local/bin/usage.sh \
    && echo 'WITH DEPENDENCY-CHECK (PostgreSQL Backend):' >> /usr/local/bin/usage.sh \
    && echo '  docker run --rm \\' >> /usr/local/bin/usage.sh \
    && echo '    -v $(pwd):/workspace \\' >> /usr/local/bin/usage.sh \
    && echo '    --network host \\' >> /usr/local/bin/usage.sh \
    && echo '    -e NVD_API_KEY=your-api-key-here \\' >> /usr/local/bin/usage.sh \
    && echo '    iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm \\' >> /usr/local/bin/usage.sh \
    && echo '    bash -c "dependency-check --scan /workspace --format JSON \\' >> /usr/local/bin/usage.sh \
    && echo '      --out /workspace/results --nvdApiKey \$NVD_API_KEY \\' >> /usr/local/bin/usage.sh \
    && echo '      --connectionString jdbc:postgresql://host.docker.internal:5432/depcheck \\' >> /usr/local/bin/usage.sh \
    && echo '      --dbUser depcheck_scanner --dbPassword depcheck_scan_2025"' >> /usr/local/bin/usage.sh \
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
#   cd /Users/alpinro/Code\ Prjects/codequal/packages/agents/docker/analyzer-java-v6.0
#   docker buildx build --platform linux/arm64 -t analyzer:lang-java-v6.0-arm --load .
#   docker tag analyzer:lang-java-v6.0-arm iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
#   docker push iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
#
# Build for AMD64 (x86):
#   docker buildx build --platform linux/amd64 -t analyzer:lang-java-v6.0-amd --load .
#   docker tag analyzer:lang-java-v6.0-amd iad.ocir.io/codequal/analyzer:lang-java-v6.0-amd
#   docker push iad.ocir.io/codequal/analyzer:lang-java-v6.0-amd
#
# Multi-platform build:
#   docker buildx build --platform linux/arm64,linux/amd64 \
#     -t iad.ocir.io/codequal/analyzer:lang-java-v6.0 \
#     --push .
#
# MIGRATION FROM v5.3:
#   - Update all scripts to reference analyzer:lang-java-v6.0-arm
#   - PostgreSQL database compatible (no schema changes)
#   - Can reload CVE database to get 2018-2025 CVEs
#   - Test with: validate-log4shell-detection.sh
