# Dockerfile for DeepWiki Analyzer
FROM ubuntu:22.04

# Install required dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    bash \
    ca-certificates \
    build-essential \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python for mock DeepWiki (remove this when you have the real binary)
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Copy mock DeepWiki analyzer (replace with real binary later)
COPY mock-deepwiki.py /usr/local/bin/deepwiki
RUN chmod +x /usr/local/bin/deepwiki

# Verify installation
RUN deepwiki --version

# Create directories for analysis
RUN mkdir -p /tmp/analyses /app/logs

# Add health check script
COPY health-check.sh /app/health-check.sh
RUN chmod +x /app/health-check.sh

# Set environment variables
ENV DEEPWIKI_TEMP_DIR=/tmp/analyses
ENV DEEPWIKI_LOG_DIR=/app/logs
ENV DEEPWIKI_MODE=production

# Expose port for health checks
EXPOSE 9090

# Run DeepWiki in server mode
CMD ["/usr/local/bin/deepwiki", "server", "--port", "9090", "--temp-dir", "/tmp/analyses"]