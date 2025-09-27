# Java Analyzer Image v5.2
# Includes: PMD, Checkstyle, Semgrep, Infer (replacing SpotBugs), Trivy (replacing Dependency-Check)

FROM openjdk:17-slim

LABEL maintainer="CodeQual Team"
LABEL version="5.2"
LABEL description="Java static analysis tools for CodeQual - optimized for source code analysis"

# Install base dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    python3 \
    python3-pip \
    apt-transport-https \
    gnupg \
    lsb-release \
    build-essential \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Install PMD (working - keep as is)
RUN wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F6.55.0/pmd-bin-6.55.0.zip \
    && unzip -q pmd-bin-6.55.0.zip \
    && mv pmd-bin-6.55.0 /opt/pmd \
    && ln -s /opt/pmd/bin/run.sh /usr/local/bin/pmd \
    && rm pmd-bin-6.55.0.zip

# Install Checkstyle (working - keep as is)
RUN wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.12.0/checkstyle-10.12.0-all.jar \
    && mv checkstyle-10.12.0-all.jar /opt/checkstyle.jar \
    && echo '#!/bin/bash\njava -jar /opt/checkstyle.jar "$@"' > /usr/local/bin/checkstyle \
    && chmod +x /usr/local/bin/checkstyle

# Add Google Checks configuration for Checkstyle
RUN wget -q https://raw.githubusercontent.com/checkstyle/checkstyle/master/src/main/resources/google_checks.xml \
    -O /google_checks.xml

# Install Semgrep (working - keep as is)
RUN pip3 install --no-cache-dir semgrep

# Install Infer (NEW - replaces SpotBugs)
# Infer works on source code without compilation
ENV INFER_VERSION=1.1.0
RUN curl -sSL "https://github.com/facebook/infer/releases/download/v${INFER_VERSION}/infer-linux64-v${INFER_VERSION}.tar.xz" \
    | tar -C /opt -xJ \
    && ln -s "/opt/infer-linux64-v${INFER_VERSION}/bin/infer" /usr/local/bin/infer

# Install Trivy (NEW - replaces Dependency-Check)
# Trivy scans for vulnerabilities in dependencies
RUN wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add - \
    && echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | tee -a /etc/apt/sources.list.d/trivy.list \
    && apt-get update \
    && apt-get install -y trivy \
    && rm -rf /var/lib/apt/lists/*

# Optional: Add Google Java Format for code formatting checks
RUN wget -q https://github.com/google/google-java-format/releases/download/v1.17.0/google-java-format-1.17.0-all-deps.jar \
    && mv google-java-format-1.17.0-all-deps.jar /opt/google-java-format.jar \
    && echo '#!/bin/bash\njava -jar /opt/google-java-format.jar "$@"' > /usr/local/bin/google-java-format \
    && chmod +x /usr/local/bin/google-java-format

# Create workspace directory
WORKDIR /workspace

# Add health check script
RUN echo '#!/bin/bash' > /health-check.sh && \
    echo 'echo "Checking installed tools..."' >> /health-check.sh && \
    echo 'pmd pmd --version && echo "✓ PMD"' >> /health-check.sh && \
    echo 'checkstyle --version && echo "✓ Checkstyle"' >> /health-check.sh && \
    echo 'semgrep --version && echo "✓ Semgrep"' >> /health-check.sh && \
    echo 'infer --version && echo "✓ Infer"' >> /health-check.sh && \
    echo 'trivy --version && echo "✓ Trivy"' >> /health-check.sh && \
    echo 'echo "All tools installed successfully!"' >> /health-check.sh && \
    chmod +x /health-check.sh

# Set entrypoint to bash for flexibility
ENTRYPOINT ["/bin/bash"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /health-check.sh || exit 1