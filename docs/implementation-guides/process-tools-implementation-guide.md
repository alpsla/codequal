# Process Tools Implementation Guide

## Overview

To make process-spawning tools work in both local and cloud environments, we have several options. Here's a comprehensive guide:

## Current Process-Spawning Tools

1. **madge-direct** - Dependency graph analysis
2. **npm-audit-direct** - Security vulnerability scanning
3. **npm-outdated-direct** - Package update checking
4. **dependency-cruiser-direct** - Dependency rule validation
5. **eslint-direct** - Code linting
6. **prettier-direct** - Code formatting

## Option 1: Quick Fix - Install Binaries in Docker (Recommended for MVP)

### Update Dockerfile.production

```dockerfile
# Add after line 32 (after installing git)
RUN apk add --no-cache git openssh-client

# Install global npm tools
RUN npm install -g \
    madge@2.13.0 \
    eslint@8.57.0 \
    prettier@3.2.5 \
    dependency-cruiser@16.2.0

# Note: npm audit and npm outdated are built into npm
```

### Pros:
- ✅ Minimal code changes
- ✅ Tools work immediately
- ✅ Same behavior as local development
- ✅ Can deploy in 1 day

### Cons:
- ❌ Larger Docker image (~100MB extra)
- ❌ Slower container startup
- ❌ Process spawning overhead
- ❌ Harder to scale

### Testing:
```bash
# Build and test locally
docker build -f Dockerfile.production -t codequal-api:test .
docker run --rm codequal-api:test npx madge --version
docker run --rm codequal-api:test npx eslint --version
```

## Option 2: Direct API Implementation (Recommended for Production)

### Replace Process Spawning with Node APIs

#### 1. **Madge → Use madge programmatically**
```typescript
// Instead of:
const { stdout } = await execAsync(`npx madge --json ${files}`);

// Use:
import madge from 'madge';
const result = await madge(files, {
  fileExtensions: ['js', 'ts', 'tsx'],
  detectiveOptions: {
    ts: { skipTypeImports: true }
  }
});
const dependencies = result.obj();
```

#### 2. **NPM Audit → Use npm-audit-report**
```typescript
// Instead of:
const { stdout } = await execAsync('npm audit --json');

// Use:
import audit from 'npm-audit-report';
const auditResult = await audit({
  packageLock: packageLockJson,
  registry: 'https://registry.npmjs.org'
});
```

#### 3. **ESLint → Use ESLint API**
```typescript
// Already partially implemented in eslint-direct.ts
// Just need to ensure it doesn't spawn process
import { ESLint } from 'eslint';
const eslint = new ESLint({ fix: false });
const results = await eslint.lintFiles(['**/*.js']);
```

#### 4. **Prettier → Use Prettier API**
```typescript
// Instead of:
await executeCommand('npx', ['prettier', '--check', file]);

// Use:
import * as prettier from 'prettier';
const formatted = await prettier.check(content, {
  filepath: file.path,
  ...prettierConfig
});
```

### Implementation Timeline:
- Madge API: 2 days
- NPM Audit API: 2 days
- ESLint API: 1 day (mostly done)
- Prettier API: 1 day
- Testing: 2 days
- **Total: ~1 week**

## Option 3: Microservices Architecture (Future)

### Deploy Tools as Separate Services

```yaml
# docker-compose.yml
services:
  api:
    image: codequal/api
    environment:
      - TOOLS_SERVICE_URL=http://tools:3001
  
  tools:
    image: codequal/tools-service
    volumes:
      - ./workspace:/workspace
```

```typescript
// tools-service/index.ts
app.post('/analyze/madge', async (req, res) => {
  const { files } = req.body;
  const result = await madge(files);
  res.json(result);
});
```

### Pros:
- ✅ Clean separation
- ✅ Independent scaling
- ✅ Language agnostic
- ✅ Fault isolation

### Cons:
- ❌ More complex deployment
- ❌ Network latency
- ❌ Requires service mesh

## Immediate Testing Setup

### 1. Set up test environment
```bash
# Create .env.test
cat > .env.test << EOF
NODE_ENV=development
REF_API_KEY=ref-498218bce18e561f5cd0
USE_MOCK_TOOLS=false
EOF
```

### 2. Test Ref API (now real!)
```bash
# Test the real Perplexity integration
npm test -- --testNamePattern="ref-mcp"
```

### 3. Test Process Tools Locally
```bash
# Install tools locally first
npm install -g madge eslint prettier dependency-cruiser

# Run tests
npm test -- --testNamePattern="madge|npm-audit|eslint|prettier"
```

### 4. Create Integration Test
```typescript
// test-all-tools-integration.ts
import { toolRegistry } from '@codequal/mcp-hybrid';

describe('All Tools Integration', () => {
  it('should run all tools on sample PR', async () => {
    const context = createMockContext({
      agentRole: 'security',
      pr: {
        files: [{
          path: 'package.json',
          content: JSON.stringify({
            dependencies: {
              'axios': '0.21.1',  // Known vulnerable version
              'lodash': '4.17.21'
            }
          })
        }]
      }
    });
    
    const tools = toolRegistry.getToolsForRole('security');
    
    for (const tool of tools) {
      const result = await tool.analyze(context);
      console.log(`${tool.name}: ${result.findings.length} findings`);
      expect(result.success).toBe(true);
    }
  });
});
```

## Environment Variables

### For Local Testing:
```bash
export NODE_ENV=development
export REF_API_KEY=ref-498218bce18e561f5cd0
export USE_MOCK_TOOLS=false
```

### For Cloud (MVP):
```bash
export NODE_ENV=production
export REF_API_KEY=ref-498218bce18e561f5cd0
export USE_MOCK_TOOLS=true  # Until binaries installed
```

### For Cloud (After Docker Update):
```bash
export NODE_ENV=production
export REF_API_KEY=ref-498218bce18e561f5cd0
export USE_MOCK_TOOLS=false  # Can use real tools
```

## Verification Commands

```bash
# 1. Verify Ref API is working
curl -X POST http://localhost:3000/api/tools/test \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "ref-mcp",
    "context": {
      "agentRole": "security",
      "pr": {
        "files": [{
          "path": "package.json",
          "content": "{\"dependencies\":{\"axios\":\"0.21.1\"}}"
        }]
      }
    }
  }'

# 2. Test all tools
npm run test:tools

# 3. Build for production
npm run build

# 4. Test Docker image
docker build -f Dockerfile.production -t test .
docker run --rm -e REF_API_KEY=$REF_API_KEY test npm test
```

## Recommended Approach

### Phase 1 (This Week):
1. ✅ Ref API is now real with your API key
2. 📝 Add binaries to Dockerfile (Option 1)
3. 🧪 Test all tools work in Docker
4. 🚀 Deploy with USE_MOCK_TOOLS=false

### Phase 2 (Next Sprint):
1. 🔄 Convert tools to use APIs (Option 2)
2. 📊 Benchmark performance difference
3. 🎯 Remove process spawning entirely

### Phase 3 (Future):
1. 🏗️ Microservices for heavy tools
2. ⚡ Lambda functions for scalability
3. 🔍 Advanced caching strategies

## Summary

- **Ref MCP is now REAL** - Will make actual Perplexity API calls
- **Process tools need binaries** - Add to Dockerfile for quick fix
- **API implementation is better** - But takes more time
- **Start with Option 1** - Get it working, optimize later