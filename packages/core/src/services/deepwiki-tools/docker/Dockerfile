# DeepWiki with Tools Dockerfile
# This extends the base DeepWiki image to include analysis tools

# Use the official DeepWiki base image
FROM deepwiki:latest

# Set environment variables
ENV NODE_ENV=production
ENV TOOLS_ENABLED=true
ENV TOOLS_TIMEOUT=60000
ENV TOOLS_PARALLEL=true
ENV TOOLS_MAX_BUFFER=20971520

# Create tools directory and set permissions
WORKDIR /tools
RUN mkdir -p /tools /workspace /tmp/tool-results && \
    chmod -R 755 /tools /workspace /tmp/tool-results

# Install system dependencies and Node.js tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create package.json for tool dependencies
RUN echo '{ \
  "name": "deepwiki-tools", \
  "version": "1.0.0", \
  "description": "Analysis tools for DeepWiki", \
  "dependencies": { \
    "npm-audit": "^1.0.0", \
    "license-checker": "^25.0.1", \
    "madge": "^6.1.0", \
    "dependency-cruiser": "^15.0.0" \
  }, \
  "engines": { \
    "node": ">=18.0.0" \
  } \
}' > /tools/package.json

# Install tool dependencies
RUN cd /tools && npm install --production

# Install global npm tools
RUN npm install -g \
    npm-audit@latest \
    license-checker@latest \
    madge@latest \
    dependency-cruiser@latest

# Copy tool runner service files (these should be built and copied from host)
COPY ./tool-runner.service.js /tools/
COPY ./tool-executor.js /tools/
COPY ./deepwiki-tool-integration.js /tools/

# Create tool execution wrapper
RUN echo '#!/bin/bash\nset -e\n\nREPO_PATH=$1\nENABLED_TOOLS=$2\nTIMEOUT=${3:-60000}\n\nif [ -z "$REPO_PATH" ] || [ -z "$ENABLED_TOOLS" ]; then\n    echo "Usage: $0 <repo_path> <enabled_tools> [timeout]"\n    exit 1\nfi\n\n# Change to repository directory\ncd "$REPO_PATH" || exit 1\n\n# Run the Node.js tool executor\nexec node /tools/tool-executor.js "$REPO_PATH" "$ENABLED_TOOLS" "$TIMEOUT"' > /tools/run-tools.sh

RUN chmod +x /tools/run-tools.sh

# Create health check script
RUN echo '#!/bin/bash\n# Check if tools are accessible\nnode -e "console.log(\"Tools ready\")" && \\\nnpm list -g npm-audit license-checker madge dependency-cruiser > /dev/null 2>&1' > /tools/healthcheck.sh

RUN chmod +x /tools/healthcheck.sh

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /tools/healthcheck.sh

# Create non-root user for security
RUN useradd -m -u 1001 tooluser && \
    chown -R tooluser:tooluser /tools /workspace /tmp/tool-results

USER tooluser

# The base DeepWiki entrypoint should remain unchanged
# Tools will be invoked by DeepWiki during analysis through the integration module
