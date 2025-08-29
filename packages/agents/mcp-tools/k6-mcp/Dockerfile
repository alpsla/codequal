FROM node:18-alpine

# Install K6 with architecture detection
RUN apk add --no-cache ca-certificates && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
        K6_ARCH="arm64"; \
    else \
        K6_ARCH="amd64"; \
    fi && \
    echo "Installing K6 for architecture: $K6_ARCH" && \
    wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-${K6_ARCH}.tar.gz && \
    tar -xzf k6-v0.47.0-linux-${K6_ARCH}.tar.gz && \
    mv k6-v0.47.0-linux-${K6_ARCH}/k6 /usr/bin/ && \
    rm -rf k6-v0.47.0-linux-${K6_ARCH}* && \
    chmod +x /usr/bin/k6

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Security: Run as non-root
RUN adduser -D -u 1001 mcpuser && \
    mkdir -p /tmp/k6-tests && \
    chown -R mcpuser:mcpuser /tmp/k6-tests
USER mcpuser

EXPOSE 3004

CMD ["node", "dist/index.js"]