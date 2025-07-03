# Build stage
FROM node:18-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/*/package*.json ./packages/*/
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build all packages
RUN npm run build

# Runtime stage
FROM node:18-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/*/package*.json ./packages/*/

# Install production dependencies only
RUN npm ci --production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/*/dist ./packages/*/dist

# Copy necessary files
COPY apps/api/src/templates ./apps/api/dist/templates
COPY apps/api/openapi.yaml ./apps/api/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/index.js"]