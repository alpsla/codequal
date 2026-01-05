# Deployment Architecture - Oracle Cloud

**Last Updated**: September 30, 2025
**Cloud Provider**: Oracle Cloud Infrastructure (OCI)
**Deployment Model**: Direct Docker on ARM64 VMs

---

## 🏗️ Infrastructure Overview

### Cloud Migration
- ✅ **From**: DigitalOcean Kubernetes
- ✅ **To**: Oracle Cloud Direct Docker
- **Reason**: Lower cost, simpler management, better ARM64 support

### Current Setup
```
Oracle Cloud (iad region)
├── VM Instance: A1.Flex (ARM64)
│   ├── CPU: 4 OCPUs (ARM Ampere)
│   ├── RAM: 24GB
│   ├── Storage: 100GB boot + 50GB block volume
│   └── OS: Ubuntu 22.04 LTS ARM64
│
├── Container Registry: iad.ocir.io/codequal/
│   ├── analyzer:lang-java-v5.3
│   ├── analyzer:lang-python-v4.3
│   ├── analyzer:lang-javascript-v4.3
│   └── analyzer:lang-go-v2.1
│
└── Storage Volumes
    ├── /data/dependency-check/ (10GB - CVE database)
    ├── /opt/codequal/ (App code)
    └── /tmp/analysis-cache/ (Redis persistence)
```

---

## 🐳 Docker Architecture (Not Kubernetes!)

### Why Direct Docker?

| Aspect | Kubernetes | Direct Docker | Winner |
|--------|-----------|---------------|--------|
| Setup Time | 1-2 hours | 10-15 min | ✅ Docker |
| Resource Overhead | ~500MB | ~50MB | ✅ Docker |
| Startup Time | 10-20s | 2-3s | ✅ Docker |
| Debugging | Complex | Simple | ✅ Docker |
| Cost | Higher | Lower | ✅ Docker |

### Tool Execution Model

```
Analysis Request
    ↓
VM receives request
    ↓
Spawns Docker container:
docker run --rm \
  -v /workspace:/workspace:ro \
  -v /data/dependency-check:/data:ro \
  iad.ocir.io/codequal/analyzer:lang-java-v5.3 \
  pmd --scan /workspace ...
    ↓
Container executes tool
    ↓
Container outputs results (JSON)
    ↓
Container exits
    ↓
VM parses results
    ↓
Returns to API
```

**Key Benefits:**
- ✅ Containers are ephemeral (no state)
- ✅ Multiple tools run in parallel
- ✅ Shared volumes (read-only)
- ✅ No orchestration overhead

---

## 📦 Container Registry

### Oracle Container Image Repository (OCIR)

**Registry URL**: `iad.ocir.io/codequal/`

**Available Images:**

```bash
# Java analyzer (most mature)
iad.ocir.io/codequal/analyzer:lang-java-v5.3
- PMD 6.55.0
- Checkstyle 10.12.0
- Semgrep 1.45.0
- SpotBugs 4.8.6
- Dependency-Check 11.1.0

# Python analyzer
iad.ocir.io/codequal/analyzer:lang-python-v4.3
- Pylint
- Bandit
- MyPy
- Safety

# JavaScript/TypeScript analyzer
iad.ocir.io/codequal/analyzer:lang-javascript-v4.3
- ESLint
- TSC
- npm audit

# Go analyzer
iad.ocir.io/codequal/analyzer:lang-go-v2.1
- golangci-lint
- gosec
- go vet
```

### Login & Pull

```bash
# Login to OCIR
docker login iad.ocir.io
Username: <tenancy-namespace>/<username>
Password: <auth-token>

# Pull image
docker pull iad.ocir.io/codequal/analyzer:lang-java-v5.3

# Verify
docker images | grep ocir
```

---

## 💾 Storage Architecture

### Shared Volumes

```
/data/
├── dependency-check/       (10GB - Shared CVE database)
│   ├── active/            (Production DB - read-only for workers)
│   ├── staging/           (Update in progress)
│   ├── backups/           (Last 3 days)
│   └── logs/              (Update logs)
│
├── repositories/          (50GB - Cloned repos cache)
│   ├── apache-kafka/
│   ├── spring-framework/
│   └── ...
│
└── analysis-cache/        (5GB - Redis persistence)
    └── dump.rdb
```

### Volume Management

**CVE Database** (`/data/dependency-check/`):
- **Purpose**: Shared vulnerability database for Dependency-Check
- **Size**: 3GB database + 2GB indexes = 5GB (allocated 10GB)
- **Update**: Daily at 2 AM via cron
- **Access**: Read-only for analysis workers
- **Performance**: 95% faster scans (30-60s vs 15-20 min)

**Repository Cache** (`/data/repositories/`):
- **Purpose**: Cached git clones
- **Size**: ~50GB (top 100 repositories)
- **TTL**: 7 days (LRU eviction)
- **Access**: Read-only for analysis

---

## 🔄 Service Architecture

### System Services

```bash
# View services
systemctl list-units --type=service | grep codequal

# Main services:
codequal-api.service           # API server
codequal-redis.service         # Redis cache
codequal-update-cron.timer     # Dep-Check updates
```

### Cron Jobs

```bash
# View cron jobs
crontab -l

# Daily dependency-check update (2 AM)
0 2 * * * /usr/bin/ts-node /opt/codequal/packages/agents/src/two-branch/tools/java/run-dependency-check-update.ts >> /data/dependency-check/logs/cron.log 2>&1

# Weekly repository cache cleanup (Sunday 3 AM)
0 3 * * 0 /opt/codequal/scripts/cleanup-repo-cache.sh

# Daily metrics export to Grafana (every hour)
0 * * * * /opt/codequal/scripts/export-metrics.sh
```

---

## 🔍 Monitoring & Observability

### UnifiedMonitoringService

**Integration Points:**
```typescript
// Tool execution
monitoring.trackPerformance('tool-execution', duration, {
  tool: 'pmd',
  language: 'java',
  filesScanned: 3472,
  issuesFound: 138
});

// Dependency-Check updates
monitoring.trackPerformance('dependency-check-update', duration, {
  success: true,
  databaseSize: 3221225472,
  validationPassed: true
});

// Analysis pipeline
monitoring.trackPerformance('v9-analysis', duration, {
  repository: 'apache/kafka',
  prNumber: 17620,
  issuesFound: 141
});
```

### Grafana Dashboards

**Metrics Exposed:**
```
# Tool performance
codequal_tool_execution_duration_seconds
codequal_tool_execution_success_total
codequal_files_scanned_total

# Database health
dependency_check_database_age_hours
dependency_check_database_healthy
dependency_check_last_update_duration_seconds

# Analysis metrics
codequal_analysis_duration_seconds
codequal_issues_found_total
codequal_cache_hit_rate
```

**Dashboard Panels:**
1. Analysis Pipeline Performance
2. Tool Execution Times
3. Database Health & Age
4. Cache Hit Rates
5. Error Rates & Alerts

---

## 🚀 Deployment Process

### Initial Deployment

```bash
# 1. Provision Oracle VM
oci compute instance launch \
  --availability-domain <ad> \
  --compartment-id <compartment> \
  --shape VM.Standard.A1.Flex \
  --shape-config '{"ocpus":4,"memoryInGBs":24}' \
  --image-id <ubuntu-22-arm64> \
  --subnet-id <subnet>

# 2. SSH to VM
ssh -i oracle-key.pem opc@<vm-ip>

# 3. Run deployment script
curl -fsSL https://raw.githubusercontent.com/codequal/agents/main/scripts/deploy-oracle-cloud.sh | bash

# Or manual:
cd /opt/codequal
./scripts/deploy-dependency-check-oracle.sh <vm-ip>
```

### Updates & Rollouts

```bash
# Update application code
cd /opt/codequal
git pull origin main
npm install
npm run build

# Restart services
sudo systemctl restart codequal-api

# Update analyzer images
docker pull iad.ocir.io/codequal/analyzer:lang-java-v5.3
```

### Rollback

```bash
# Rollback code
cd /opt/codequal
git checkout <previous-commit>
npm install
npm run build
sudo systemctl restart codequal-api

# Rollback database
sudo cp -r /data/dependency-check/backups/<date> \
           /data/dependency-check/active
```

---

## 🔐 Security

### Secrets Management

**Environment Variables** (`/opt/codequal/.env`):
```bash
# Never committed to Git!
NVD_API_KEY=xxx
OPENROUTER_API_KEY=xxx
GITHUB_TOKEN=xxx
REDIS_PASSWORD=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**Oracle Cloud Secrets** (preferred for production):
```bash
# Store in OCI Vault
oci vault secret create \
  --compartment-id <compartment> \
  --secret-name codequal-nvd-api-key \
  --vault-id <vault-id> \
  --key-id <key-id> \
  --secret-content-content "xxx"
```

### Network Security

```bash
# Security List (Firewall Rules)
Ingress:
- Port 22 (SSH) - From bastion only
- Port 443 (HTTPS API) - From internet
- Port 6379 (Redis) - From localhost only

Egress:
- Port 443 (HTTPS) - To NVD, GitHub, OpenRouter
- Port 5432 (PostgreSQL) - To Supabase
```

---

## 📊 Cost Analysis

### Oracle Cloud Costs (Estimated)

| Resource | Specs | Monthly Cost |
|----------|-------|--------------|
| **VM A1.Flex** | 4 OCPU, 24GB RAM | **$0** (Always Free) |
| **Block Volume** | 50GB | $2.55 |
| **OCIR Storage** | ~20GB images | $0.40 |
| **Egress** | ~100GB/month | $1.00 |
| **TOTAL** | | **~$4/month** |

### vs DigitalOcean

| Provider | Monthly Cost | Notes |
|----------|--------------|-------|
| **DigitalOcean** | $50-100 | Kubernetes + Registry + Volumes |
| **Oracle Cloud** | $4 | Direct Docker + Always Free tier |
| **Savings** | **92-96%** | ✅ |

---

## 🎯 Scaling Strategy

### Current Capacity (Single VM)

```
Oracle Cloud A1.Flex (4 OCPU, 24GB RAM):
├── Concurrent analyses: ~6 (basic tier)
├── Analyses per minute: ~60
└── Estimated throughput: ~200 PRs/hour
```

### Session 75: Dynamic Rate Limiting

Rate limits now scale automatically with:
- **Tool Type**: Heavy tools (SpotBugs) get 5 min timeout, fast tools (ESLint) get 1 min
- **Repo Size**: Enterprise repos (200k+ lines) get 8× timeout multiplier
- **CPU Count**: Concurrent limits = 75% of available CPUs
- **User Tier**: Basic/Pro/Enterprise quotas

```bash
# Configure via environment
export CODEQUAL_USER_TIER=pro
export CODEQUAL_REPO_SIZE=large
export CODEQUAL_MAX_CONCURRENT=20
```

### Horizontal Scaling (Phase 1: Load Balancer)

```
                    ┌─────────────┐
    Users ──────────▶│ NGINX/HAProxy│
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌─────────┐     ┌─────────┐     ┌─────────┐
     │ API #1  │     │ API #2  │     │ API #3  │
     │ A1.Flex │     │ A1.Flex │     │ A1.Flex │
     └─────────┘     └─────────┘     └─────────┘
           │               │               │
           └───────────────┴───────────────┘
                           ▼
                    ┌─────────────┐
                    │    Redis    │ (shared rate limits)
                    └─────────────┘
```

```bash
# Add more VMs
VM 1 (Primary): 129.213.49.128
VM 2 (Secondary): <new-ip>
VM 3 (Tertiary): <new-ip>

# Oracle Cloud Load Balancer
oci lb load-balancer create \
  --compartment-id <compartment> \
  --display-name codequal-lb \
  --shape flexible \
  --backend-sets '...'
```

### Horizontal Scaling (Phase 2: Job Queue)

For high-volume usage (100+ concurrent users):

```
     ┌─────────┐         ┌─────────────┐
     │   API   │─────────▶│  Bull Queue │
     └─────────┘         └──────┬──────┘
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌─────────┐┌─────────┐┌─────────┐
              │Worker 1 ││Worker 2 ││Worker 3 │
              │SpotBugs ││  PMD    ││ ESLint  │
              └─────────┘└─────────┘└─────────┘
```

**Benefits:**
- PRO users get priority queue
- Dedicated workers for heavy tools
- Scales independently from API
- Handles burst traffic gracefully

### Vertical Scaling

```bash
# Increase VM resources (requires stop)
oci compute instance update \
  --instance-id <instance-id> \
  --shape-config '{"ocpus":8,"memoryInGBs":48}'

# New capacity after upgrade:
# Concurrent analyses: ~12 (basic tier)
# Analyses per minute: ~120
```

### Kubernetes (Phase 3: Enterprise Scale)

For 1000+ concurrent users:
- HPA (Horizontal Pod Autoscaler)
- Pod per language for isolation
- Auto-scaling based on queue depth
- Multi-region deployment

---

## 📋 Runbook

### Daily Operations

**Morning checklist:**
```bash
# 1. Check database age
cat /data/dependency-check/active/metadata.json | jq '.timestamp'

# 2. Check services
systemctl status codequal-api
systemctl status codequal-redis

# 3. Check disk space
df -h /data

# 4. Check logs
tail -n 50 /data/dependency-check/logs/cron.log
```

### Troubleshooting

**Database update failed:**
```bash
# Check logs
cat /data/dependency-check/logs/update-$(date +%Y-%m-%d).log

# Manual retry
cd /opt/codequal/packages/agents
ts-node src/two-branch/tools/java/run-dependency-check-update.ts
```

**High memory usage:**
```bash
# Check running containers
docker ps
docker stats

# Kill stuck containers
docker kill $(docker ps -q)
```

---

## ✅ Summary

**Deployment Model**: ✅ Direct Docker on Oracle Cloud
**Infrastructure**: ✅ Simplified (no Kubernetes)
**Registry**: ✅ Oracle OCIR (`iad.ocir.io`)
**Cost**: ✅ $4/month (vs $50-100)
**Performance**: ✅ Same or better
**Maintenance**: ✅ Easier

**Status**: Production Ready
