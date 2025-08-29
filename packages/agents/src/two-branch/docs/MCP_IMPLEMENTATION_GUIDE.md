# MCP Implementation Guide - Security-First Approach
## Generated: 2025-08-28

# 🚨 PHASE 1: SECURITY FOUNDATION (Week 1)

## Step 1: Install MCP-Scan (TODAY - CRITICAL)

### Installation
```bash
# Install using UV (Python package manager)
# First install UV if you don't have it:
curl -LsSf https://astral.sh/uv/install.sh | sh

# Then install MCP-Scan
uvx mcp-scan@latest

# Or using pip:
pip install mcp-scan

# Verify installation
mcp-scan --version
```

### Usage
```bash
# Scan our current MCP tools directory
mcp-scan scan /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid/src/adapters/

# Scan specific MCP server
mcp-scan scan /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid/src/adapters/mcp/semgrep-mcp.ts

# Generate security report
mcp-scan report --output security-audit.json
```

### What to Look For
- Command injection vulnerabilities
- Unrestricted URL fetches
- Tool poisoning attacks
- Authentication bypasses

---

## Step 2: Docker Containerization (TODAY)

### Install Docker Desktop
```bash
# macOS (your system)
# Download from: https://www.docker.com/products/docker-desktop/
# Or use Homebrew:
brew install --cask docker

# Verify installation
docker --version
docker-compose --version
```

### Create Dockerfile for MCP Tools
```dockerfile
# Save as: packages/agents/docker/Dockerfile.mcp
FROM node:18-alpine

# Security: Run as non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp

# Install MCP tools
RUN npm install -g @eslint/mcp-server
RUN npm install -g @mcp/server-stdlib

# Install security tools
RUN apk add --no-cache python3 py3-pip
RUN pip3 install mcp-scan

WORKDIR /app
USER mcp

# Security: No root access
```

---

# 📦 PHASE 2: TOOL INSTALLATION (Week 1-2)

## Required Registrations & API Keys

### 🟢 FREE Tools (No Registration Required)
1. **MCP-Scan** - ✅ No key needed
2. **ESLint MCP Server** - ✅ No key needed
3. **FileScopeMCP** - ✅ No key needed
4. **K6 MCP Server** - ✅ No key needed

### 🔵 FREE with Registration
5. **DevSecOps-MCP Server**
   - GitHub account required (for GitHub API)
   - No additional keys needed

6. **BrowserTools MCP**
   - No keys for local usage
   - Optional: Browserless.io API key for cloud execution

### 🟡 Optional Paid Tools (Skip During Beta)
7. **Quality Guard MCP**
   - Free tier available
   - Pro: $500/month (skip for now)

---

## Tool Installation Commands

### 1. DevSecOps-MCP Server (Security)
```bash
# Clone the repository
git clone https://github.com/devsecops/mcp-server.git
cd mcp-server

# Install dependencies
npm install

# No API keys needed - uses local tools
# Integrates: Semgrep, Bandit, OWASP ZAP, npm audit, OSV Scanner, Trivy

# Run in Docker
docker build -t devsecops-mcp .
docker run -p 3000:3000 devsecops-mcp
```

### 2. ESLint MCP Server (Code Quality)
```bash
# Official ESLint MCP Server
npm install -g @eslint/mcp-server

# Start the server
eslint-mcp-server --port 3001

# No API keys required
```

### 3. FileScopeMCP (Architecture)
```bash
# Clone repository
git clone https://github.com/admica/FileScopeMCP.git
cd FileScopeMCP

# Install dependencies
npm install

# Start server
npm start

# No API keys required
# Provides: Multi-language parsing, importance scoring, Mermaid diagrams
```

### 4. K6 MCP Server (Performance)
```bash
# Install K6
brew install k6

# Clone K6 MCP Server
git clone https://github.com/grafana/k6-mcp-server.git
cd k6-mcp-server

# Install and run
npm install
npm start

# No API keys required
# Perfect CI/CD integration (10/10 score)
```

### 5. BrowserTools MCP (Web Performance)
```bash
# Clone repository
git clone https://github.com/browsertools/mcp-server.git
cd mcp-server

# Install with Puppeteer
npm install

# Optional: Set Browserless API key for cloud execution
# export BROWSERLESS_API_KEY=your_key_here

# Start server
npm start

# Includes: Lighthouse, Puppeteer, Accessibility testing
```

### 6. Inspector MCP (Production Debugging)
```bash
# Clone repository
git clone https://github.com/inspector/mcp-server.git
cd mcp-server

# Install
npm install

# Optional: Sentry integration
# export SENTRY_DSN=your_sentry_dsn_here

# Start server
npm start

# 5ms read times for production debugging
```

---

# 🔧 PHASE 3: CUSTOM WRAPPERS (Week 2)

## Critical: npm-audit MCP Wrapper

Since no MCP tool exists for dependency analysis (biggest gap!), create this:

```typescript
// Save as: packages/agents/src/mcp-wrappers/npm-audit-mcp.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class NpmAuditMCP {
  async analyze(packagePath: string) {
    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json', {
        cwd: packagePath
      });
      
      const auditResult = JSON.parse(stdout);
      
      // Format for MCP
      return {
        tool: 'npm-audit',
        success: true,
        findings: this.convertToMCPFormat(auditResult),
        metrics: {
          total: auditResult.metadata.totalDependencies,
          vulnerabilities: auditResult.metadata.vulnerabilities
        }
      };
    } catch (error) {
      return {
        tool: 'npm-audit',
        success: false,
        error: error.message
      };
    }
  }
  
  private convertToMCPFormat(auditResult: any) {
    // Convert npm audit format to MCP findings
    const findings = [];
    
    for (const [key, advisory] of Object.entries(auditResult.advisories || {})) {
      findings.push({
        type: 'vulnerability',
        severity: advisory.severity,
        category: 'dependency',
        message: advisory.title,
        package: advisory.module_name,
        version: advisory.vulnerable_versions,
        cve: advisory.cves?.join(', '),
        recommendation: advisory.recommendation
      });
    }
    
    return findings;
  }
}
```

---

# 🔄 PHASE 4: AGENT UPDATES (Week 2-3)

## Update Agent Configurations

### Security Agent
```typescript
// packages/agents/src/specialized/security-agent.ts
export class SecurityAgent {
  tools = [
    'devsecops-mcp',    // Replaces all: semgrep, bandit, npm-audit
    'mcp-scan',         // MCP vulnerability scanner
    'npm-audit-wrapper' // Our custom wrapper
  ];
}
```

### Performance Agent
```typescript
export class PerformanceAgent {
  tools = [
    'k6-mcp-server',      // API/load testing
    'browsertools-mcp',   // Browser performance
    'inspector-mcp'       // Production monitoring
  ];
}
```

### Architecture Agent
```typescript
export class ArchitectureAgent {
  tools = [
    'filescope-mcp'      // Replaces madge + dependency-cruiser
  ];
}
```

### Code Quality Agent
```typescript
export class CodeQualityAgent {
  tools = [
    'eslint-mcp-server'  // Official ESLint integration
  ];
}
```

---

# 🚀 DOCKER COMPOSE SETUP

Create `docker-compose.yml` for all services:

```yaml
version: '3.8'

services:
  mcp-scan:
    build: ./docker
    command: mcp-scan serve --port 3000
    ports:
      - "3000:3000"
    security_opt:
      - no-new-privileges:true
    read_only: true
    
  devsecops-mcp:
    image: devsecops-mcp:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    security_opt:
      - no-new-privileges:true
      
  eslint-mcp:
    image: node:18-alpine
    command: npx @eslint/mcp-server
    ports:
      - "3002:3002"
    security_opt:
      - no-new-privileges:true
      
  filescope-mcp:
    build: ./FileScopeMCP
    ports:
      - "3003:3003"
    security_opt:
      - no-new-privileges:true
      
  k6-mcp:
    build: ./k6-mcp-server
    ports:
      - "3004:3004"
    security_opt:
      - no-new-privileges:true
      
  browsertools-mcp:
    build: ./browsertools-mcp
    ports:
      - "3005:3005"
    environment:
      - BROWSERLESS_API_KEY=${BROWSERLESS_API_KEY:-}
    security_opt:
      - no-new-privileges:true
```

---

# 📋 ENVIRONMENT VARIABLES (.env)

```bash
# No API keys needed for most tools!
# All are FREE during development

# Optional (only if using cloud features)
BROWSERLESS_API_KEY=      # Optional: For cloud browser execution
SENTRY_DSN=               # Optional: For error tracking

# Your existing keys (keep these)
SUPABASE_URL=your_existing_url
SUPABASE_SERVICE_ROLE_KEY=your_existing_key
OPENROUTER_API_KEY=your_existing_key
REDIS_URL=redis://localhost:6379

# GitHub (you already have this)
GITHUB_TOKEN=your_existing_token
```

---

# ✅ VERIFICATION CHECKLIST

## After Installation:
1. [ ] MCP-Scan installed and scanning tools
2. [ ] Docker Desktop running
3. [ ] All tools containerized
4. [ ] DevSecOps-MCP running on port 3001
5. [ ] ESLint MCP Server on port 3002
6. [ ] FileScopeMCP on port 3003
7. [ ] K6 MCP on port 3004
8. [ ] BrowserTools MCP on port 3005
9. [ ] npm-audit wrapper created
10. [ ] All agents updated with new tools

---

# 🎯 Success Metrics

- **Security**: 0 vulnerabilities in MCP tools
- **Performance**: <30 second analysis
- **Cost**: $0 for tools (all free)
- **Efficiency**: 25-40% improvement

---

# 🚨 DO NOT PROCEED WITHOUT:
1. Running MCP-Scan first
2. Containerizing everything
3. Removing vulnerable tools
4. Testing in isolation first