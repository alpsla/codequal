FROM node:18-alpine

# Install security tools
RUN apk add --no-cache python3 py3-pip gcc python3-dev musl-dev linux-headers git

# Install security scanners
RUN pip3 install --break-system-packages bandit semgrep

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Security: Run as non-root
RUN adduser -D -u 1001 mcpuser
USER mcpuser

EXPOSE 3001

CMD ["npm", "start"]