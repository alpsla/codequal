# 📦 CodeQual Caching Strategy

## Executive Summary

This document outlines the comprehensive caching strategy for CodeQual's PR analysis system, designed to reduce analysis time by 70% and operational costs by 90%.

**Key Metrics:**
- **Performance**: 20+ min → 2-3 min repository setup
- **Cost Savings**: $500/month → $45/month
- **Cache Hit Rate Target**: 75%
- **Storage Budget**: 100GB disk + 2GB Redis

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Cache Tiers & TTL Strategy](#cache-tiers--ttl-strategy)
3. [Implementation Components](#implementation-components)
4. [Cost Analysis](#cost-analysis)
5. [Operational Guidelines](#operational-guidelines)
6. [Testing vs Production](#testing-vs-production)
7. [Monitoring & Metrics](#monitoring--metrics)
8. [Immediate Action Items](#immediate-action-items)

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Cache Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────────┐ │
│  │ Disk Cache   │     │ Redis Cache  │    │  Memory Cache│ │
│  │ (Repos)      │     │ (Metadata)   │    │  (Hot Data)  │ │
│  │ 100GB        │     │ 2GB          │    │  512MB       │ │
│  └──────────────┘     └──────────────┘    └──────────────┘ │
│         ↓                    ↓                    ↓         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              OptimizedRepoManager                       │ │
│  │  - Shallow cloning (--depth=500)                       │ │
│  │  - Hard link workspaces                                │ │
│  │  - Smart TTL calculation                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Check Cache** → Redis metadata lookup (< 1ms)
2. **Cache Hit** → Create hard link workspace (< 2s)
3. **Cache Miss** → Shallow clone + index (1-3 min)
4. **Update TTL** → Reset based on access pattern
5. **Cleanup** → Remove expired entries

## Cache Tiers & TTL Strategy

### Repository Classification

| Tier | Criteria | TTL | Reset Policy | Examples |
|------|----------|-----|--------------|----------|
| 🔥 **HOT** | >10 PRs/day OR >10k stars | 14 days | Sliding window | facebook/react, microsoft/vscode |
| ♨️ **WARM** | 1-10 PRs/day OR >1k stars | 7 days | Hybrid | tokio-rs/tokio, rust-lang/rust |
| ❄️ **COOL** | 0.1-1 PRs/day | 3 days | Fixed + extend | Company repos |
| 🧊 **COLD** | <0.1 PRs/day | 6 hours | Fixed | Personal projects |

### TTL Calculation Algorithm

```typescript
function calculateTTL(repo: RepoStats): number {
  const BASE_TTL = 86400; // 1 day
  
  let multiplier = 1.0;
  
  // Activity multiplier
  if (repo.prsPerDay > 10) multiplier *= 3;
  else if (repo.prsPerDay > 5) multiplier *= 2;
  else if (repo.prsPerDay < 0.5) multiplier *= 0.5;
  
  // Popularity multiplier
  if (repo.stars > 10000) multiplier *= 2;
  else if (repo.stars > 1000) multiplier *= 1.5;
  
  // Size penalty (larger = longer TTL)
  if (repo.sizeGB > 0.5) multiplier *= 2;
  else if (repo.sizeGB > 0.1) multiplier *= 1.5;
  
  // Recent access bonus
  if (repo.hoursSinceLastAccess < 1) multiplier *= 2;
  
  return Math.min(
    Math.max(BASE_TTL * multiplier, 3600),  // Min: 1 hour
    1209600  // Max: 14 days
  );
}
```

### Reset Strategies

#### Sliding Window (HOT repos)
- TTL resets to full duration on every access
- Keeps frequently accessed repos always available
- Cost: Higher storage, better performance

#### Hybrid (WARM repos)
- Extends TTL when < 6 hours remaining
- Balances storage cost with availability
- Default for most repositories

#### Fixed Window (COLD repos)
- Never resets, expires on schedule
- Minimizes storage for rarely accessed repos
- Automatic cleanup after expiry

## Implementation Components

### 1. OptimizedRepoManager (`/packages/agents/src/two-branch/utils/optimized-repo-manager.ts`)

**Key Features:**
- Shallow cloning with configurable depth
- Hard link workspace creation
- Adaptive buffer management for large repos
- Smart file indexing with size limits

**Configuration:**
```typescript
const repoManager = new OptimizedRepoManager(
  '/cache/repos',        // Persistent cache directory
  '/tmp/workspaces',     // Temporary workspaces
  'redis://localhost:6379'
);
```

### 2. Cache Storage Paths

```bash
# Production
/cache/
├── repos/                 # Cloned repositories
│   ├── facebook/
│   │   └── react/        # ~50MB
│   ├── rust-lang/
│   │   ├── rust/         # ~750MB (shallow)
│   │   └── rustlings/    # ~6MB
│   └── tokio-rs/
│       └── tokio/        # ~15MB
└── metadata/             # Redis dump files

# Testing (Local Development)
/tmp/codequal-test/
├── cache/               # Test cache
└── workspaces/          # Test workspaces
```

### 3. Redis Schema

```typescript
// Repository metadata
repo:{owner}:{name}:meta {
  fileCount: number,
  lastIndexed: ISO8601,
  lastAccessed: ISO8601,
  accessCount: number,
  sizeBytes: number,
  ttl: number,
  tier: 'HOT' | 'WARM' | 'COOL' | 'COLD'
}

// File index (repos < 10k files)
repo:{owner}:{name}:files [
  "src/main.rs",
  "Cargo.toml",
  ...
]

// PR workspace tracking
workspace:{owner}:{repo}:{pr} {
  path: string,
  createdAt: ISO8601,
  changedFiles: string[],
  baseBranch: string,
  prBranch: string
}

// Cache statistics
cache:stats {
  hits: number,
  misses: number,
  evictions: number,
  totalSize: number,
  repoCount: number
}
```

## Cost Analysis

### Monthly Cost Breakdown

| Component | Specification | Cost/Month | Notes |
|-----------|--------------|------------|-------|
| **Disk Storage** | 100GB block storage | $10 | DigitalOcean/AWS |
| **Redis** | 2GB managed instance | $30 | Or self-host for $0 |
| **Network** | ~50GB transfer | $5 | GitHub clones |
| **Total** | - | **$45** | 91% savings |

### Cost Without Caching

| Component | Impact | Cost/Month |
|-----------|--------|------------|
| **Compute Time** | +20 min per analysis | $400 |
| **Network** | Repeated full clones | $100 |
| **Total** | - | **$500** |

### ROI Calculation

```
Monthly Savings = $500 - $45 = $455
Annual Savings = $455 × 12 = $5,460
ROI = 1,011% (pays for itself in 3 days)
```

## Operational Guidelines

### Cache Warmup

```typescript
// Preload popular repositories on startup
const PRELOAD_REPOS = [
  { owner: 'facebook', repo: 'react' },
  { owner: 'microsoft', repo: 'vscode' },
  { owner: 'rust-lang', repo: 'rust' },
  { owner: 'torvalds', repo: 'linux' }
];

async function warmupCache() {
  for (const repo of PRELOAD_REPOS) {
    await repoManager.setupRepo({
      ...repo,
      defaultBranch: 'main',
      shallowDepth: 500
    });
  }
}
```

### Cache Maintenance

```bash
# Daily cleanup (cron job)
0 2 * * * /usr/bin/node /app/scripts/cache-cleanup.js

# Weekly optimization
0 3 * * 0 redis-cli --scan --pattern "repo:*" | xargs redis-cli DEL

# Monthly statistics
0 0 1 * * /usr/bin/node /app/scripts/cache-report.js
```

### Eviction Policy

```typescript
const EVICTION_RULES = {
  // Never evict
  pinned: [
    'rust-lang/rustlings',  // Test repo
    'facebook/react'        // High traffic
  ],
  
  // Evict when space > 80%
  threshold: 0.8,
  
  // Eviction priority (higher = evict first)
  scoring: {
    age: 0.4,        // Days since last access
    size: 0.3,       // Repository size
    frequency: 0.3   // Access count (inverse)
  }
};
```

## Testing vs Production

### Testing Environment

```yaml
# .env.test
CACHE_DIR=/tmp/codequal-test/cache
WORKSPACE_DIR=/tmp/codequal-test/workspaces
REDIS_URL=redis://localhost:6379/1  # Use DB 1 for testing
CACHE_TTL_MULTIPLIER=0.1  # Shorter TTLs for testing
CACHE_MAX_SIZE_GB=10
```

### Production Environment

```yaml
# .env.production
CACHE_DIR=/cache/repos
WORKSPACE_DIR=/tmp/workspaces
REDIS_URL=redis://redis-cluster:6379/0
CACHE_TTL_MULTIPLIER=1.0
CACHE_MAX_SIZE_GB=100
ENABLE_CACHE_WARMUP=true
ENABLE_PREDICTIVE_CACHING=true
```

### Kubernetes Configuration

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: repo-cache-pvc
spec:
  accessModes:
    - ReadWriteMany  # Multiple pods can access
  resources:
    requests:
      storage: 100Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cache-config
data:
  strategy: "hybrid"
  max_size: "100"
  default_ttl: "86400"
  eviction_threshold: "0.8"
```

## Monitoring & Metrics

### Key Performance Indicators

| Metric | Target | Alert Threshold | Action |
|--------|--------|-----------------|--------|
| **Cache Hit Rate** | >75% | <60% | Review TTL strategy |
| **Avg Response Time** | <3 min | >5 min | Check cache health |
| **Storage Usage** | <80% | >90% | Trigger eviction |
| **Redis Memory** | <1.5GB | >1.8GB | Increase capacity |
| **Eviction Rate** | <5/hour | >20/hour | Adjust TTLs |

### Monitoring Dashboard

```typescript
// Metrics to track
interface CacheMetrics {
  // Performance
  hitRate: number;           // Target: >75%
  avgSetupTime: number;      // Target: <3s for cached
  avgCloneTime: number;      // Target: <2min for new
  
  // Storage
  diskUsageGB: number;       // Limit: 100GB
  redisMemoryMB: number;     // Limit: 2048MB
  repoCount: number;         // Track growth
  
  // Cost
  estimatedMonthlyCost: number;
  savingsVsNoCache: number;
  
  // Health
  lastEviction: Date;
  oldestCache: Date;
  errorRate: number;
}
```

### Grafana Dashboard Queries

```sql
-- Cache hit rate (last hour)
SELECT 
  (hits / (hits + misses)) * 100 as hit_rate
FROM cache_metrics
WHERE time > now() - 1h

-- Storage trend (last 7 days)
SELECT 
  date_trunc('day', timestamp) as day,
  max(disk_usage_gb) as peak_usage,
  avg(repo_count) as avg_repos
FROM cache_metrics
WHERE timestamp > now() - 7d
GROUP BY day

-- Cost savings (monthly)
SELECT 
  sum(cache_hits * 0.20) as savings_usd
FROM cache_metrics
WHERE timestamp > date_trunc('month', now())
```

## Immediate Action Items

### For Testing (Do Now)

1. **Create cache directories:**
```bash
mkdir -p /tmp/codequal-test/cache
mkdir -p /tmp/codequal-test/workspaces
```

2. **Set environment variables:**
```bash
export CACHE_DIR=/tmp/codequal-test/cache
export WORKSPACE_DIR=/tmp/codequal-test/workspaces
export REDIS_URL=redis://localhost:6379/1
```

3. **Install Redis locally (if not installed):**
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

4. **Test cache functionality:**
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node test-cache-setup.ts
```

### For Production (Next Sprint)

1. **Provision storage:**
   - 100GB persistent volume for cache
   - 2GB Redis instance (managed or self-hosted)

2. **Deploy cache warmup job:**
   - Kubernetes CronJob for popular repos
   - Run daily at 2 AM

3. **Setup monitoring:**
   - Prometheus metrics collection
   - Grafana dashboard
   - Alert rules for cache health

4. **Configure backup:**
   - Daily Redis snapshots
   - Weekly cache validation
   - Monthly usage reports

## Appendix

### A. Cache Commands Reference

```bash
# Check cache status
redis-cli INFO memory

# List cached repos
redis-cli --scan --pattern "repo:*:meta"

# Get repo TTL
redis-cli TTL "repo:rust-lang:rust:meta"

# Manual cache warmup
node scripts/warmup-cache.js --repo=facebook/react

# Clear all cache (careful!)
redis-cli FLUSHDB

# Export cache stats
redis-cli --csv HGETALL "cache:stats" > stats.csv
```

### B. Troubleshooting

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| Low hit rate | TTLs too short | Increase TTL multiplier |
| High storage | No eviction | Enable auto-eviction |
| Slow clones | Network issues | Check bandwidth, use mirrors |
| Redis OOM | Too many indexes | Limit indexing to small repos |
| Workspace errors | Disk full | Clean /tmp regularly |

### C. References

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Git Shallow Cloning](https://git-scm.com/docs/git-clone#Documentation/git-clone.txt---depthltdepthgt)
- [Linux Hard Links](https://www.gnu.org/software/coreutils/manual/html_node/ln-invocation.html)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Next Review: February 2025*