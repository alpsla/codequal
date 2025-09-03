# CodeQual Deployment Guide - Language-Specific Quality Architecture

**Version:** 3.0  
**Strategy:** Language-specific tool execution with intelligent caching  
**Last Updated:** September 2025

## 🎯 Architecture Overview

Our quality-first approach runs **language-specific tools** (not all 85 for every PR) with intelligent caching and indexing. This provides comprehensive analysis in 2-4 minutes per PR instead of 10+ minutes.

### Analysis Flow with Language Detection

```
┌─────────────────────────────────────────────────────────┐
│                   PR Analysis Request                     │
│                  (Java/Python/JS/Rust/etc)               │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│              1. Language Detection                        │
│         - Analyze file extensions                        │
│         - Identify primary language(s)                   │
│         - Select appropriate tool subset                  │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│              2. Cache Check (Redis)                       │
│         - Check if files already analyzed                 │
│         - Return cached results for unchanged files       │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│              3. Repository Indexing & Caching            │
│         - Clone/update repository                         │
│         - Generate file hashes                           │
│         - Cache file contents in Redis                   │
│         - Identify changed files only                     │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│              4. Language-Specific Tool Execution         │
│         Java PR: 9 tools - 1-2 minutes                   │
│         Python PR: 17 tools - 2-3 minutes                │
│         JavaScript PR: 10 tools - 1-2 minutes            │
│         Rust PR: 16 tools - 2-3 minutes                  │
│         Go PR: 12 tools - 1-2 minutes                    │
│         Ruby PR: 9 tools - 1-2 minutes                   │
│         PHP PR: 7 tools - 1 minute                       │
│         C++ PR: 5 tools - 1 minute                       │
│         + Universal tools (5) for all languages          │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│              5. Results Processing & Caching              │
│         - Store results in PostgreSQL                     │
│         - Cache in Redis (7-day TTL)                     │
│         - Update file hash index                         │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│              6. Comprehensive Report                      │
│         - Aggregate all 85 tool results                  │
│         - Generate quality scores                        │
│         - Create actionable recommendations              │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Tool Distribution by Language

### Language-Specific Tools (Total: 85)

| Language | Tools Count | Tools | Execution Time |
|----------|------------|--------|----------------|
| **Python** | 17 | bandit, safety, pylint, mypy, black, isort, flake8, pycodestyle, pydocstyle, vulture, prospector, radon, xenon, darglint, pip-audit, poetry, pipenv | 2-3 min |
| **JavaScript/TS** | 10 | eslint, prettier, jshint, typescript, madge, dependency-cruiser, depcheck, lighthouse, bundlesize, npm-audit | 1-2 min |
| **Java** | 9 | spotbugs, pmd, checkstyle, error-prone, nullaway, infer, findbugs, sonarjava, google-java-format | 1-2 min |
| **Go** | 12 | golint, go-vet, staticcheck, gosec, ineffassign, errcheck, goconst, gocyclo, gofmt, gomodguard, go-critic, revive | 1-2 min |
| **Rust** | 16 | clippy, cargo-audit, rustfmt, cargo-deny, cargo-outdated, cargo-udeps, cargo-bloat, cargo-geiger, cargo-license, cargo-machete, cargo-nextest, cargo-mutants, cargo-tarpaulin, bacon, rust-analyzer, miri | 2-3 min |
| **Ruby** | 9 | rubocop, brakeman, bundler-audit, reek, flog, flay, rubycritic, fasterer, rails_best_practices | 1-2 min |
| **PHP** | 7 | phpstan, phpcs, phpmd, psalm, phan, php-cs-fixer, phpcpd | 1 min |
| **C++** | 5 | cppcheck, clang-tidy, cpplint, include-what-you-use, pvs-studio | 1 min |
| **Universal** | 5 | semgrep, gitleaks, trivy, snyk, checkov | 30s-1 min |

### Execution Strategy

```typescript
// Language detection and tool selection
function selectToolsForPR(files: string[]): Tool[] {
  const languages = detectLanguages(files);
  const tools: Tool[] = [];
  
  // Always add universal security tools
  tools.push(...getUniversalTools());
  
  // Add language-specific tools
  for (const lang of languages) {
    tools.push(...getToolsForLanguage(lang));
  }
  
  return tools; // Returns 10-20 tools instead of 85
}
```

## 📊 Caching & Indexing Strategy

### Redis Cache Structure

```typescript
// Cache keys structure
cache:repo:{owner}:{repo}:index           // Repository file index
cache:file:{hash}:results:{tool}          // Tool results per file
cache:pr:{owner}:{repo}:{pr_number}       // Complete PR analysis
cache:stats:{owner}:{repo}                // Repository statistics

// TTL Strategy
Repository Index: 24 hours
File Results: 7 days  
PR Analysis: 30 days
Statistics: 1 hour
```

### Indexing Process

```typescript
class RepositoryIndexer {
  async indexRepository(repoUrl: string): Promise<Index> {
    // 1. Clone or update repository
    const repoPath = await this.cloneOrUpdate(repoUrl);
    
    // 2. Generate file index with hashes
    const fileIndex = await this.generateFileIndex(repoPath);
    
    // 3. Check cache for each file
    const cachedResults = new Map();
    for (const file of fileIndex.files) {
      const cacheKey = `cache:file:${file.hash}:results:*`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        cachedResults.set(file.path, cached);
      }
    }
    
    // 4. Identify files needing analysis
    const filesToAnalyze = fileIndex.files.filter(
      file => !cachedResults.has(file.path)
    );
    
    return {
      totalFiles: fileIndex.files.length,
      cachedFiles: cachedResults.size,
      newFiles: filesToAnalyze.length,
      estimatedTime: this.estimateAnalysisTime(filesToAnalyze),
      fileIndex,
      cachedResults
    };
  }
  
  private async generateFileIndex(repoPath: string): Promise<FileIndex> {
    const files = await this.walkDirectory(repoPath);
    const index = {
      files: [],
      languages: new Set(),
      totalSize: 0,
      timestamp: Date.now()
    };
    
    for (const file of files) {
      const hash = await this.hashFile(file);
      const language = this.detectLanguage(file);
      
      index.files.push({
        path: file,
        hash,
        language,
        size: await this.getFileSize(file),
        lastModified: await this.getLastModified(file)
      });
      
      index.languages.add(language);
      index.totalSize += file.size;
    }
    
    // Cache the index
    await redis.setex(
      `cache:repo:${repoPath}:index`,
      86400, // 24 hours
      JSON.stringify(index)
    );
    
    return index;
  }
}
```

## 🚀 Prerequisites

### Required Secrets

```bash
# Database
DATABASE_URL="postgresql://user:pass@db.supabase.co:5432/postgres"
SUPABASE_URL="https://project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-key"

# GitHub Integration
GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"
GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."

# Container Registry
REGISTRY_TOKEN="your-do-registry-token"

# Redis Cache
REDIS_URL="redis://redis-service:6379"
REDIS_PASSWORD="optional-password"

# Optional: AI Models (for report enhancement)
OPENROUTER_API_KEY="sk-or-xxxxx"
```

### Infrastructure Requirements

```yaml
Kubernetes Cluster:
  provider: DigitalOcean
  nodes: 2
  nodeSize: s-2vcpu-4gb
  totalRAM: 8GB
  totalCPU: 4 cores
  
Database:
  provider: Supabase
  type: PostgreSQL 14
  ram: 2GB
  storage: 30GB
  
Cache:
  type: Redis 7
  memory: 500MB
  persistence: enabled
```

## 📦 Deployment Process

### 1. Build Docker Image

```bash
# Build the all-85-tools image
cd /Users/alpinro/Code\ Prjects/codequal
docker build -f docker/Dockerfile.all-85-tools -t codequal/analyzer:latest .

# Tag for registry
docker tag codequal/analyzer:latest registry.digitalocean.com/codequal/analyzer:latest

# Push to registry
docker push registry.digitalocean.com/codequal/analyzer:latest
```

### 2. Configure Secrets

```bash
# Create secrets file
cp kubernetes/secrets-template.yaml kubernetes/secrets.yaml

# Edit with your values
vim kubernetes/secrets.yaml

# Apply secrets
kubectl apply -f kubernetes/secrets.yaml
```

### 3. Deploy System

```bash
# Run deployment script
cd kubernetes
chmod +x deploy-quality-first.sh
./deploy-quality-first.sh

# Or manually
kubectl apply -f quality-first-deployment.yaml
```

### 4. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n codequal

# Verify 85 tools installed
kubectl exec -n codequal deployment/codequal-analyzer -- /usr/local/bin/verify-all-tools

# Check cache connectivity
kubectl exec -n codequal deployment/codequal-analyzer -- redis-cli -h redis-service ping
```

## 🔄 Cache Optimization

### Pre-warming Cache

```bash
# Pre-analyze popular repositories to warm cache
kubectl exec -n codequal deployment/codequal-analyzer -- bash -c "
  /usr/local/bin/analyze-quality-first https://github.com/facebook/react /tmp/results
  /usr/local/bin/analyze-quality-first https://github.com/vuejs/vue /tmp/results
"
```

### Cache Management

```typescript
// Cache invalidation strategy
class CacheManager {
  // Invalidate on:
  // 1. Tool version updates
  async invalidateToolCache(toolName: string) {
    const pattern = `cache:file:*:results:${toolName}`;
    await redis.deletePattern(pattern);
  }
  
  // 2. Configuration changes
  async invalidateConfigCache() {
    await redis.flushdb();
    await this.rebuildIndex();
  }
  
  // 3. Manual refresh
  async refreshFileCache(fileHash: string) {
    const pattern = `cache:file:${fileHash}:results:*`;
    await redis.deletePattern(pattern);
  }
  
  // Cache statistics
  async getCacheStats() {
    return {
      size: await redis.dbsize(),
      memory: await redis.info('memory'),
      hitRate: await this.calculateHitRate(),
      topMisses: await this.getTopCacheMisses()
    };
  }
}
```

## 📊 Performance Metrics

### Language-Specific Execution Times

| Language | Tools | First Analysis | With Cache | Concurrent Capacity |
|----------|-------|---------------|------------|---------------------|
| **Python** | 17 | 2-3 minutes | 30-60 seconds | 2-3 PRs parallel |
| **JavaScript** | 10 | 1-2 minutes | 20-40 seconds | 3-4 PRs parallel |
| **Java** | 9 | 1-2 minutes | 20-40 seconds | 3-4 PRs parallel |
| **Rust** | 16 | 2-3 minutes | 30-60 seconds | 2-3 PRs parallel |
| **Go** | 12 | 1-2 minutes | 20-40 seconds | 3-4 PRs parallel |
| **Ruby** | 9 | 1-2 minutes | 20-40 seconds | 3-4 PRs parallel |
| **Mixed Language** | 20-30 | 3-4 minutes | 1-2 minutes | 1-2 PRs parallel |

### Real-World Scenarios

| Scenario | Tools Run | Time (First) | Time (Cached) | Notes |
|----------|-----------|--------------|---------------|-------|
| Java microservice PR | 9 + 5 universal = 14 | 2 min | 30 sec | Single language, focused analysis |
| Python API PR | 17 + 5 universal = 22 | 3 min | 45 sec | More tools due to Python's ecosystem |
| React frontend PR | 10 + 5 universal = 15 | 2 min | 30 sec | JS/TS tools + security |
| Rust system PR | 16 + 5 universal = 21 | 3 min | 45 sec | Comprehensive Rust toolchain |
| Polyglot PR (Python+JS) | 27 + 5 universal = 32 | 4 min | 1.5 min | Multiple languages increase time |

### Concurrency Model

```
8GB Cluster (Single Node):
- Can handle 2-4 concurrent PRs depending on language
- Java/JS/Go: 3-4 concurrent
- Python/Rust: 2-3 concurrent
- Mixed: 1-2 concurrent

With 2-3 Additional Nodes (24-32GB total):
- 8-12 concurrent PRs
- Near-linear scaling
- <1 minute average wait time
```

## 🛠️ Maintenance

### Daily Tasks

```bash
# Check cache hit rate
kubectl exec -n codequal deployment/codequal-api -- npm run cache:stats

# Monitor memory usage
kubectl top pods -n codequal

# Check for failed analyses
kubectl logs deployment/codequal-analyzer -n codequal --since=24h | grep ERROR
```

### Weekly Tasks

```bash
# Clean old cache entries
kubectl exec -n codequal deployment/redis -- redis-cli --scan --pattern "cache:*" | \
  xargs -I {} redis-cli TTL {} | grep -c "-1"

# Backup Redis data
kubectl exec -n codequal deployment/redis -- redis-cli BGSAVE

# Update tool versions (if needed)
docker build -f docker/Dockerfile.all-85-tools -t codequal/analyzer:new .
kubectl set image deployment/codequal-analyzer analyzer=codequal/analyzer:new -n codequal
```

## 🔧 Troubleshooting

### Slow Analysis Despite Cache

```bash
# Check cache connectivity
kubectl exec -n codequal deployment/codequal-analyzer -- redis-cli -h redis-service ping

# Verify cache is being used
kubectl logs deployment/codequal-analyzer -n codequal | grep "Cache hit"

# Check file hashing
kubectl exec -n codequal deployment/codequal-analyzer -- bash -c "
  echo 'test' > /tmp/test.txt
  sha256sum /tmp/test.txt
"
```

### Cache Misses

```bash
# Debug why files aren't cached
kubectl exec -n codequal deployment/codequal-analyzer -- redis-cli KEYS "cache:file:*" | head -10

# Check TTL on cached entries
kubectl exec -n codequal deployment/codequal-analyzer -- redis-cli TTL "cache:file:abc123:results:eslint"

# Force cache refresh
kubectl exec -n codequal deployment/codequal-api -- npm run cache:invalidate -- --file=path/to/file.js
```

## 📈 Scaling with Cache

### When to Scale

```yaml
Indicators to add nodes:
- Cache hit rate > 80% but still slow
- Queue depth > 10 analyses
- Memory pressure on analyzer pod
- Customer SLA requirements

With 3-4 nodes (12-16GB):
- Run 2-3 analyzer pods
- Parallel batch execution
- Shared cache benefits all pods
- <2 minute analysis with cache
```

### Scaling Command

```bash
# Add node to cluster
doctl kubernetes cluster node-pool create codequal-k8s \
  --name analyzer-pool-2 \
  --size s-2vcpu-4gb \
  --count 1

# Scale analyzer deployment
kubectl scale deployment codequal-analyzer --replicas=2 -n codequal

# Ensure cache is shared
kubectl get service redis-service -n codequal
```

## ✅ Deployment Checklist

### Pre-deployment
- [ ] Docker image built with all 85 tools
- [ ] Redis cache service configured
- [ ] Database migrations completed
- [ ] Secrets configured
- [ ] Registry access verified

### Deployment
- [ ] Namespace created
- [ ] Redis deployed and accessible
- [ ] Analyzer pod running
- [ ] API/Worker pods running
- [ ] Cache connectivity verified

### Post-deployment
- [ ] All 85 tools verified
- [ ] Cache hit/miss logging working
- [ ] First analysis successful
- [ ] Cache hit on second analysis
- [ ] Monitoring configured

## 📚 Related Documentation

- [Master Deployment Guide](../docs/deployment/MASTER_DEPLOYMENT_GUIDE.md)
- [Quality-First Strategy](../docs/QUALITY_FIRST_85_TOOLS_STRATEGY.md)
- [Cache Implementation](../src/cache/README.md)
- [Tool Documentation](../docs/tools/README.md)

---

**Remember:** Our caching strategy maintains 100% quality while improving performance through intelligent result reuse. Every file still gets analyzed by all applicable tools - we just don't repeat work unnecessarily!