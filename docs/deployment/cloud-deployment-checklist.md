# Cloud Deployment Checklist - Quick Reference

## 🚨 Critical Issues to Fix Before Cloud Deployment

### 1. **Update Dockerfile.production**
```dockerfile
# Add after line 32
RUN apk add --no-cache git openssh-client

# Optional: Add global npm tools (or use mock mode)
# RUN npm install -g madge eslint prettier dependency-cruiser
```

### 2. **Environment Variables for Cloud**
```env
# Essential
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=3072

# Feature flags
USE_MOCK_TOOLS=true  # Disable process spawning tools
USE_MOCK_DEEPWIKI=false  # Keep real DeepWiki

# API Keys (store in K8s secrets)
DEEPWIKI_API_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=xxx
```

### 3. **Kubernetes Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: codequal/api:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        volumeMounts:
        - name: temp-storage
          mountPath: /tmp
        - name: workspace
          mountPath: /workspace
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
      volumes:
      - name: temp-storage
        emptyDir:
          sizeLimit: 5Gi
      - name: workspace
        emptyDir:
          sizeLimit: 20Gi
```

### 4. **Add Health Check Endpoint**
```typescript
// In apps/api/src/routes/health.ts
router.get('/health/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await supabase.from('users').select('id').limit(1);
    res.json({ status: 'ready', timestamp: new Date() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

### 5. **Tool Configuration for Cloud**
```typescript
// In mcp-hybrid initialization
if (process.env.USE_MOCK_TOOLS === 'true') {
  // Skip tools that spawn processes
  const cloudSafeTools = [
    'ref-mcp',           // ✅ Cloud ready
    'serena-mcp',        // ✅ Cloud ready
    'bundlephobia-direct', // ✅ Uses HTTP API
    'sonarjs-direct',     // ✅ In-process analysis
  ];
  
  // Exclude process-spawning tools
  // ❌ madge-direct
  // ❌ npm-outdated-direct
  // ❌ npm-audit-direct
  // ❌ dependency-cruiser-direct
}
```

## ✅ Tools Cloud Compatibility Status

| Tool | Cloud Ready | Issue | Solution |
|------|-------------|-------|----------|
| ref-mcp | ✅ Yes | None | Works as-is |
| serena-mcp | ✅ Yes | None | Works as-is |
| bundlephobia-direct | ✅ Yes | None | Uses HTTP API |
| sonarjs-direct | ✅ Yes | None | In-process analysis |
| madge-direct | ❌ No | Spawns `npx madge` | Use mock or install globally |
| npm-outdated-direct | ❌ No | Spawns `npm outdated` | Use mock or npm API |
| npm-audit-direct | ❌ No | Spawns `npm audit` | Use mock or npm API |
| dependency-cruiser | ❌ No | Spawns `depcruise` | Use mock or install globally |
| eslint-direct | ❌ No | Spawns `npx eslint` | Use ESLint API |
| prettier-direct | ❌ No | Spawns `npx prettier` | Use Prettier API |

## 🚀 Quick Deployment Path

### For MVP/Demo (USE_MOCK_TOOLS=true):
1. Update Dockerfile to add git
2. Set USE_MOCK_TOOLS=true
3. Deploy with 2GB memory minimum
4. Monitor for OOM errors

### For Production:
1. Implement tool APIs (no spawning)
2. Add connection pooling
3. Configure persistent volumes
4. Implement circuit breakers
5. Add comprehensive monitoring

## 🔍 Monitoring Commands

```bash
# Check memory usage
kubectl top pod -l app=codequal-api

# Check logs
kubectl logs -l app=codequal-api --tail=100

# Check health
curl https://api.codequal.com/health/ready

# Test analysis (with mock tools)
curl -X POST https://api.codequal.com/api/pr-analysis \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repoUrl": "...", "prNumber": 1}'
```

## ⚠️ Known Limitations in Cloud

1. **Tools using process spawning won't work** unless:
   - Binaries are installed in container
   - USE_MOCK_TOOLS=false
   - Sufficient memory allocated

2. **Temp files are ephemeral**:
   - Lost on pod restart
   - Not shared between replicas
   - Need persistent volume for production

3. **Git operations require**:
   - Git installed in container
   - SSH keys for private repos
   - Sufficient disk space

4. **External API calls need**:
   - Retry logic
   - Circuit breakers
   - Rate limit handling

## 📊 Resource Recommendations

| Component | Memory | CPU | Storage |
|-----------|--------|-----|---------|
| API Server | 2-4GB | 1-2 cores | 5GB /tmp |
| DeepWiki workspace | - | - | 20GB /workspace |
| Database connections | - | - | Max 20 pooled |

## 🎯 Next Steps

1. **Immediate** (for demo):
   - Add git to Dockerfile ✓
   - Set USE_MOCK_TOOLS=true ✓
   - Deploy with basic health check ✓

2. **Short-term** (for beta):
   - Replace spawn with APIs
   - Add connection pooling
   - Implement retry logic

3. **Long-term** (for scale):
   - Microservices architecture
   - Horizontal pod autoscaling
   - Redis caching layer