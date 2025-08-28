# Strategic Decisions for Two-Branch Analysis Implementation

## 1. Architecture Strategy: Hybrid Now, RAG-Ready Later

### Recommendation: Build Hybrid, Prepare for RAG

**Current Plan:** Enhanced Hybrid Intelligence (2-3 weeks to ship)
**Future Evolution:** Custom RAG Pipeline (can add later)

### Implementation Strategy

```typescript
// Use Strategy Pattern for swappable backends
interface AnalysisBackend {
  analyzeRepository(repo: string, options: AnalysisOptions): Promise<AnalysisResult>;
  getCapabilities(): string[];
}

// Phase 1: Tool-based backend (Week 1-2)
class ToolBasedBackend implements AnalysisBackend {
  async analyzeRepository(repo: string) {
    // Current: Use Semgrep, ESLint, npm-audit
    return await this.runTools(repo);
  }
}

// Phase 2: Hybrid backend (Week 3)
class HybridBackend implements AnalysisBackend {
  constructor(
    private toolBackend: ToolBasedBackend,
    private llmEnhancer: LLMEnhancer
  ) {}
  
  async analyzeRepository(repo: string) {
    const toolResults = await this.toolBackend.analyzeRepository(repo);
    const enhanced = await this.llmEnhancer.enhance(toolResults);
    return enhanced;
  }
}

// Phase 3: RAG backend (Future - Month 2-3)
class RAGBackend implements AnalysisBackend {
  async analyzeRepository(repo: string) {
    // Future: Custom embeddings + vector search
    await this.indexRepository(repo);
    return await this.ragAnalysis(repo);
  }
}

// Easy to switch backends without changing core logic
export class TwoBranchAnalyzer {
  constructor(private backend: AnalysisBackend = new HybridBackend()) {}
  
  // Core logic stays the same regardless of backend
  async analyzePR(repoUrl: string, prNumber: number) {
    const mainResults = await this.backend.analyzeRepository(mainBranch);
    const prResults = await this.backend.analyzeRepository(prBranch);
    return this.compare(mainResults, prResults);
  }
}
```

### Migration Path
1. **Week 1-2:** Ship with ToolBasedBackend (real value immediately)
2. **Week 3:** Add HybridBackend (AI enhancement layer)
3. **Month 2-3:** Develop RAGBackend in parallel
4. **Month 3:** A/B test both approaches
5. **Month 4:** Full RAG if it proves superior

---

## 2. Reusing DeepWiki's Caching & Indexing

### Components to Copy and Adapt

#### A. Cache Service (REUSE THIS!)
```typescript
// Copy from: packages/agents/src/standard/services/deepwiki-cache-service.ts
// To: packages/agents/src/two-branch/cache/AnalysisCacheService.ts

export class AnalysisCacheService extends DeepWikiCacheService {
  // Reuse all the Redis + memory fallback logic
  // Just change the cache keys and TTL strategy
  
  generateCacheKey(repo: string, branch: string, tool: string): string {
    return `two-branch:${repo}:${branch}:${tool}:${this.hashContent(repo+branch+tool)}`;
  }
  
  // Cache strategy:
  // - Tool results: 7 days (rarely change)
  // - Branch analysis: 1 hour (may have new commits)
  // - PR comparison: 5 minutes (real-time)
}
```

#### B. Repository Indexing (ADAPT THIS!)
```typescript
// DeepWiki's approach (keep the good parts):
// 1. Clone repository ✅
// 2. Create embeddings ✅  
// 3. Store in vector DB ✅
// 4. But DON'T hallucinate responses ❌

// Our improved approach:
export class RepositoryIndexer {
  async indexRepository(repoPath: string): Promise<IndexedRepo> {
    // Reuse DeepWiki's file scanning
    const files = await this.scanFiles(repoPath);
    
    // Reuse DeepWiki's embedding generation
    const embeddings = await this.generateEmbeddings(files);
    
    // Store for future RAG use
    await this.vectorDB.store(embeddings);
    
    // But for now, just run tools on actual files
    return { files, embeddings, ready: true };
  }
}
```

#### C. What to Copy
```bash
# Copy these files to two-branch directory:
cp packages/agents/src/standard/services/deepwiki-cache-service.ts \
   packages/agents/src/two-branch/cache/AnalysisCacheService.ts

cp packages/agents/src/standard/deepwiki/services/deepwiki-cache-manager.ts \
   packages/agents/src/two-branch/cache/CacheManager.ts

# Adapt for our use case (remove DeepWiki-specific logic)
```

---

## 3. MCP Tools Integration Strategy

### Current Situation
- **Direct Adapters:** Run tools directly in Node.js (faster, no overhead)
- **MCP Servers:** Run tools via MCP protocol (more flexible, remote capable)

### Recommendation: Hybrid Approach

```typescript
export class ToolExecutor {
  private directTools = new Map<string, DirectAdapter>();
  private mcpTools = new Map<string, MCPAdapter>();
  
  async executeTool(toolId: string, context: ToolContext): Promise<ToolResult> {
    // Prefer direct for speed, fall back to MCP
    if (this.directTools.has(toolId)) {
      return await this.directTools.get(toolId).analyze(context);
    }
    
    if (this.mcpTools.has(toolId)) {
      return await this.mcpTools.get(toolId).analyze(context);
    }
    
    throw new Error(`Tool ${toolId} not found`);
  }
}

// Tool selection strategy:
const TOOL_STRATEGY = {
  // Use DIRECT for tools that:
  // - Run quickly (< 10 seconds)
  // - Don't need special environment
  // - Are JavaScript-based
  direct: [
    'eslint-direct',        // Fast, JS-native
    'prettier-direct',      // Fast formatting check
    'npm-audit-direct',     // Quick security scan
    'sonarjs-direct'        // JS quality rules
  ],
  
  // Use MCP for tools that:
  // - Need special runtime (Python, Go)
  // - Benefit from caching server-side
  // - May timeout or need retries
  mcp: [
    'semgrep-mcp',          // Complex security rules, Python-based
    'lighthouse-mcp',       // Chrome automation needed
    'trivy-mcp',           // Container scanning, Go-based
    'serena-mcp'           // Code understanding, complex
  ]
};
```

### Implementation Priority
1. **Week 1:** Use only direct adapters (simpler, faster)
2. **Week 2:** Add MCP for complex tools
3. **Week 3:** Auto-select based on performance

---

## 4. Development Environment Strategy

### Recommendation: Hybrid Local/Cloud Development

#### A. Architecture
```
┌─────────────────────────────────────┐
│       Developer Machine (Local)      │
│                                      │
│  • IDE/Editor                        │
│  • Code changes                      │
│  • Unit tests                        │
│  • Quick iterations                  │
└──────────────┬──────────────────────┘
               │ Push/Deploy
               ▼
┌─────────────────────────────────────┐
│    DigitalOcean Cloud (Existing)     │
│                                      │
│  • Repository cloning                │
│  • Full tool execution               │
│  • Integration tests                 │
│  • Production-like environment       │
│                                      │
│  ┌─────────────────────────────┐    │
│  │   Kubernetes Cluster         │    │
│  │   • Analysis workers         │    │
│  │   • Redis cache              │    │
│  │   • Tool runners             │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

#### B. Development Workflow

**Local Development (Fast Iteration):**
```bash
# On your machine
cd packages/agents/src/two-branch

# 1. Write code locally
code core/TwoBranchAnalyzer.ts

# 2. Run unit tests locally
npm test core/TwoBranchAnalyzer.test.ts

# 3. Test with small repos locally
npm run dev:test -- --repo sindresorhus/is-odd
```

**Cloud Testing (Real Analysis):**
```bash
# Deploy to cloud for real testing
npm run deploy:dev

# SSH to cloud instance
ssh codequal-dev.digitalocean.com

# Run full analysis on cloud
cd /app/codequal
npm run analyze -- --repo facebook/react --pr 12345
```

#### C. Specific Setup Steps

1. **Keep existing cloud infrastructure:**
   - DigitalOcean Kubernetes ✅
   - Redis on cloud ✅
   - Supabase connection ✅

2. **Add development deployment:**
```yaml
# k8s/dev-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: two-branch-analyzer-dev
  namespace: codequal-dev
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: analyzer
        image: codequal/two-branch:dev
        env:
        - name: ENVIRONMENT
          value: development
        - name: REDIS_URL
          value: redis://redis-service:6379
        volumeMounts:
        - name: repo-storage
          mountPath: /tmp/repos
      volumes:
      - name: repo-storage
        persistentVolumeClaim:
          claimName: repo-storage-pvc
```

3. **Local development tools:**
```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Test Two-Branch Locally",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/packages/agents/src/two-branch/test-local.ts",
      "env": {
        "USE_LOCAL_TOOLS": "true",
        "REDIS_URL": "redis://localhost:6379"
      }
    },
    {
      "name": "Test Two-Branch Cloud",
      "type": "node", 
      "request": "launch",
      "program": "${workspaceFolder}/packages/agents/src/two-branch/test-cloud.ts",
      "env": {
        "USE_CLOUD": "true",
        "CLOUD_API": "https://api.codequal.dev"
      }
    }
  ]
}
```

#### D. Repository Storage Strategy

```typescript
export class RepositoryManager {
  private getStoragePath(): string {
    if (process.env.NODE_ENV === 'production') {
      // Cloud: Use persistent volume
      return '/mnt/repo-storage/repos';
    } else if (process.env.USE_CLOUD_STORAGE) {
      // Dev cloud: Use temp but larger disk
      return '/tmp/large-disk/repos';
    } else {
      // Local: Use system temp
      return path.join(os.tmpdir(), 'codequal-repos');
    }
  }
  
  async cloneRepository(url: string): Promise<string> {
    const storagePath = this.getStoragePath();
    // Clone to appropriate location based on environment
    return await this.gitClone(url, storagePath);
  }
}
```

---

## Summary of Decisions

1. **Architecture:** Build Hybrid now, prepare for RAG later (use Strategy pattern)
2. **Caching:** Reuse DeepWiki's cache service (copy & adapt)
3. **Tools:** Use direct adapters for speed, MCP for complex tools
4. **Environment:** Hybrid local/cloud development
   - Code locally, test small repos locally
   - Deploy to cloud for real testing
   - Keep repos on cloud storage

## Next Steps

1. **Today:**
   - Copy DeepWiki cache service to two-branch
   - Set up local dev environment
   - Start with RepositoryManager

2. **Tomorrow:**
   - Implement FileScanner with caching
   - Test with direct adapters first
   - Deploy dev version to cloud

3. **This Week:**
   - Complete two-branch analyzer
   - Test on cloud with real repos
   - Compare results with DeepWiki