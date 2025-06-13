# DeepWiki with Tools Dockerfile
# This extends the base DeepWiki image to include analysis tools

# Assuming DeepWiki base image exists
FROM deepwiki:latest

# Install Node.js and npm if not already present
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create tools directory
WORKDIR /tools

# Copy tool runner service files
COPY ./tool-runner.service.js /tools/
COPY ./tool-executor.js /tools/

# Install global npm packages for tools
RUN npm install -g \
    npm-audit \
    license-checker \
    madge \
    dependency-cruiser \
    npm-outdated

# Create a wrapper script for tool execution
COPY ./run-tools.sh /tools/
RUN chmod +x /tools/run-tools.sh

# Environment variables
ENV TOOLS_ENABLED=true
ENV TOOLS_TIMEOUT=60000
ENV TOOLS_PARALLEL=true

# The base DeepWiki entrypoint should remain unchanged
# Tools will be invoked by DeepWiki during analysis
