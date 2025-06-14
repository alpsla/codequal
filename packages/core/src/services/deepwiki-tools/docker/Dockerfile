# DeepWiki with Tools Dockerfile
# This extends the base DeepWiki image to include analysis tools

# Use the same DeepWiki image that's currently deployed
FROM ghcr.io/asyncfuncai/deepwiki-open:latest

# Set environment variables
ENV NODE_ENV=production
ENV TOOLS_ENABLED=true
ENV TOOLS_TIMEOUT=60000
ENV TOOLS_PARALLEL=true
ENV TOOLS_MAX_BUFFER=20971520
ENV PATH="/tools/node_modules/.bin:${PATH}"

# Switch to root for installation
USER root

# Install system dependencies including jq
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18 if not already present
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create tools directory and set permissions
WORKDIR /tools
RUN mkdir -p /tools /workspace /tmp/tool-results && \
    chmod -R 755 /tools /workspace /tmp/tool-results

# Create package.json for tool dependencies
RUN echo '{ \
  "name": "deepwiki-tools", \
  "version": "1.0.0", \
  "description": "Analysis tools for DeepWiki", \
  "dependencies": { \
    "license-checker": "^25.0.1", \
    "madge": "^6.1.0", \
    "dependency-cruiser": "^15.0.0" \
  } \
}' > /tools/package.json

# Install tool dependencies locally in /tools
RUN cd /tools && npm install --production

# Also install tools globally for command line access
RUN npm install -g \
    license-checker@latest \
    madge@latest \
    dependency-cruiser@latest

# Copy tool executor files (these will be added by build script)
COPY tool-executor.js /tools/
COPY deepwiki-tool-integration.js /tools/

# Create tool execution wrapper
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
REPO_PATH=$1\n\
ENABLED_TOOLS=$2\n\
TIMEOUT=${3:-60000}\n\
\n\
if [ -z "$REPO_PATH" ] || [ -z "$ENABLED_TOOLS" ]; then\n\
    echo "Usage: $0 <repo_path> <enabled_tools> [timeout]"\n\
    exit 1\n\
fi\n\
\n\
# Change to repository directory\n\
cd "$REPO_PATH" || exit 1\n\
\n\
# Run the Node.js tool executor\n\
exec node /tools/tool-executor.js "$REPO_PATH" "$ENABLED_TOOLS" "$TIMEOUT"' > /tools/run-tools.sh

RUN chmod +x /tools/run-tools.sh

# Create health check script
RUN echo '#!/bin/bash\n\
echo "Checking tools installation..."\n\
which license-checker && echo "✓ license-checker installed" || echo "✗ license-checker NOT installed"\n\
which madge && echo "✓ madge installed" || echo "✗ madge NOT installed"\n\
which depcruise && echo "✓ dependency-cruiser installed" || echo "✗ dependency-cruiser NOT installed"\n\
which jq && echo "✓ jq installed" || echo "✗ jq NOT installed"\n\
\n\
# Check npm tools\n\
echo -e "\nGlobal npm packages:"\n\
npm list -g --depth=0 2>/dev/null | grep -E "license-checker|madge|dependency-cruiser" || echo "No global tools found"\n\
\n\
# Check local tools\n\
echo -e "\nLocal npm packages in /tools:"\n\
cd /tools && npm list --depth=0 2>/dev/null | grep -E "license-checker|madge|dependency-cruiser" || echo "No local tools found"\n\
\n\
# Final status\n\
if which license-checker && which madge && which depcruise; then\n\
    echo -e "\n✓ All tools installed successfully"\n\
    exit 0\n\
else\n\
    echo -e "\n✗ Some tools are missing"\n\
    exit 1\n\
fi' > /tools/healthcheck.sh

RUN chmod +x /tools/healthcheck.sh

# Test that tools are installed
RUN /tools/healthcheck.sh || true

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /tools/healthcheck.sh

# The base DeepWiki entrypoint should remain unchanged
