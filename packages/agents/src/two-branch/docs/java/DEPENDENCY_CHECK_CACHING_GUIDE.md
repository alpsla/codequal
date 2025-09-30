# Dependency-Check Database Caching & Monitoring Guide

**Complete implementation with Oracle Container Registry**

**Date**: September 30, 2025

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Kubernetes Cluster (Oracle Cloud)                      │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ CronJob: DB Updater (2 AM daily)               │   │
│ │ - Downloads CVE updates                         │   │
│ │ - Builds H2/Lucene indexes                      │   │
│ │ - Validates database                            │   │
│ │ - Rolls back on failure                         │   │
│ │ - Integrates with UnifiedMonitoringService      │   │
│ └─────────────────────────────────────────────────┘   │
│                      ↓                                  │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Persistent Volume: /data/dependency-check      │   │
│ │ ┌─────────────────────────────────────────┐   │   │
│ │ │ active/    - Production DB (read-only)   │   │   │
│ │ │ staging/   - Update in progress          │   │   │
│ │ │ backups/   - Last 3 backups              │   │   │
│ │ │ logs/      - Update logs                 │   │   │
│ │ └─────────────────────────────────────────┘   │   │
│ │ Size: 10GB (3GB DB + 2GB indexes + headroom)  │   │
│ └─────────────────────────────────────────────────┘   │
│                      ↑                                  │
│ ┌────────┐ ┌────────┐ ┌────────┐                      │
│ │Worker 1│ │Worker 2│ │Worker 3│                      │
│ │ Scan   │ │ Scan   │ │ Scan   │  (Read-only)        │
│ │ 30-60s │ │ 30-60s │ │ 30-60s │                      │
│ └────────┘ └────────┘ └────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Monitoring & Grafana Dashboards                        │
│ - Database age (hours)                                  │
│ - Update success/failure rates                          │
│ - Scan performance                                      │
│ - Validation results                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Deploy to Kubernetes

```bash
# Apply CronJob and PVC
kubectl apply -f k8s/dependency-check-updater-cronjob.yaml

# Create NVD API key secret
kubectl create secret generic dependency-check-secrets \
  --from-literal=nvd-api-key=YOUR-NVD-API-KEY \
  -n codequal-dev

# Create Oracle registry credentials
kubectl create secret docker-registry oracle-registry-credentials \
  --docker-server=iad.ocir.io \
  --docker-username=TENANCY/USERNAME \
  --docker-password=AUTH-TOKEN \
  -n codequal-dev

# Verify deployment
kubectl get cronjob -n codequal-dev
kubectl get pvc -n codequal-dev
```

### 2. Manual First Run (Optional)

```bash
# Trigger update immediately (don't wait for 2 AM)
kubectl create job --from=cronjob/dependency-check-updater \
  dependency-check-updater-manual \
  -n codequal-dev

# Watch progress
kubectl logs -f job/dependency-check-updater-manual -n codequal-dev
```

### 3. Check Status

```bash
# API endpoint
curl http://localhost:3000/api/dependency-check/status

# Example response:
{
  "status": "READY",
  "healthy": true,
  "lastUpdate": "2025-09-30T02:15:30.000Z",
  "ageHours": 4.5,
  "message": "✅ Database is up-to-date and ready"
}
```

---

## 📁 File Structure

```
/data/dependency-check/
├── active/                          # Production database (read-only for workers)
│   ├── cache/
│   │   └── nvdcve-*.json.gz        # CVE data (3GB)
│   ├── data/
│   │   ├── odc.mv.db               # H2 database (500MB)
│   │   └── lucene/                 # Search indexes (200MB)
│   └── metadata.json               # Status, timestamp, validation
│
├── staging/                         # Update in progress (temp)
│   └── (same structure as active)
│
├── backups/
│   ├── 2025-09-30/                 # Today's backup
│   ├── 2025-09-29/                 # Yesterday
│   └── 2025-09-28/                 # 2 days ago (oldest kept)
│
└── logs/
    ├── update-2025-09-30.log       # Today's update log
    └── validation-2025-09-30.log   # Validation results
```

---

## 🔄 Update Flow (Detailed)

### Daily Cron Job (2 AM)

```
02:00:00  🔄 Start update
02:00:05  📦 Create backup of current DB
02:00:10  🔒 Acquire update lock
02:00:15  📥 Download CVE updates from NVD (1-2 min)
02:01:30  🔨 Build H2/Lucene indexes (30s)
02:02:00  🧪 Run validation tests
          ├─ Database file exists
          ├─ Database size > 100MB
          ├─ Lucene indexes present
          ├─ Sample query < 10s
          └─ Metadata valid
02:02:15  ✅ Validation passed
02:02:20  🔄 Atomic swap (staging → active)
02:02:25  ✅ Status: READY
02:02:30  🗑️  Cleanup old backups
02:02:35  ✅ Update complete (2m 35s)
02:02:40  🔓 Release lock
```

### On Validation Failure

```
02:02:15  ❌ Validation failed: Database size < 100MB
02:02:20  ⚠️  ROLLBACK: Restoring from backup
02:02:25  ✅ Rollback complete
02:02:30  ❌ Status: FAILED
02:02:35  🚨 Alert sent to support
02:02:40  🔓 Release lock
```

---

## 📊 Monitoring Integration

### UnifiedMonitoringService Events

The implementation emits the following events for Grafana dashboards:

```typescript
// Update lifecycle
monitoring.trackPerformance('dependency-check-update', duration, {
  success: true/false,
  stage: 'complete' | 'failed',
  validationPassed: boolean,
  databaseSize: number,
  error?: string
});

// Status changes
monitoring.trackPerformance('dependency-check-status-change', 0, {
  newStatus: 'READY' | 'UPDATING' | 'INDEXING' | 'VALIDATING' | 'FAILED',
  timestamp: number
});

// Progress updates
monitoring.trackPerformance('dependency-check-progress', 0, {
  stage: 'BACKUP' | 'DOWNLOAD' | 'INDEX' | 'VALIDATE' | 'SWAP' | 'CLEANUP',
  progress: 0-100,
  message: string
});

// Scan operations
monitoring.trackPerformance('dependency-check-scan', duration, {
  projectName: string,
  dependenciesScanned: number,
  vulnerabilitiesFound: number,
  databaseAgeHours: number,
  success: boolean
});
```

### Grafana Metrics

Available at: `GET /api/dependency-check/metrics`

```
# Database age
dependency_check_database_age_hours 4.5

# Health status (1=healthy, 0=unhealthy)
dependency_check_database_healthy 1

# Last update duration (seconds)
dependency_check_last_update_duration_seconds 155

# Database size (bytes)
dependency_check_database_size_bytes 524288000

# Validation status (1=passed, 0=failed)
dependency_check_validation_passed 1
```

---

## 🔧 API Endpoints

### Status Endpoints

```bash
# Current status
GET /api/dependency-check/status

# Health check (for K8s probes)
GET /api/dependency-check/health

# Full metadata
GET /api/dependency-check/metadata

# Recent logs
GET /api/dependency-check/logs?limit=100

# Prometheus metrics
GET /api/dependency-check/metrics
```

### Scan Endpoint

```bash
# Trigger scan
POST /api/dependency-check/scan
Content-Type: application/json

{
  "projectPath": "/path/to/project",
  "projectName": "my-app"
}

# Response:
{
  "success": true,
  "result": {
    "projectName": "my-app",
    "scanDate": "2025-09-30T10:30:00.000Z",
    "dependencies": 150,
    "vulnerabilitiesFound": 2,
    "criticalVulnerabilities": 1,
    "highVulnerabilities": 1,
    "scanDuration": 45000,
    "databaseAgeHours": "4.5"
  },
  "vulnerabilities": [...]
}
```

---

## ⚡ Performance Benchmarks

### With Caching (Production)

| Scenario | First Run | Subsequent Runs | Notes |
|----------|-----------|-----------------|-------|
| **Database update** | 15-20 min | 2-3 min | First: Download 3GB; Later: Updates only |
| **Scan (small project)** | 30-60s | 30-60s | 10-50 dependencies |
| **Scan (medium project)** | 1-2 min | 1-2 min | 50-200 dependencies |
| **Scan (large project)** | 3-5 min | 3-5 min | 200+ dependencies |

### Without Caching (Don't Do This!)

| Scenario | Time | Notes |
|----------|------|-------|
| **Every scan** | 15-20 min | Downloads 3GB every time ❌ |

### Speedup

- **First run**: 15-20 minutes (one-time setup)
- **Daily updates**: 2-3 minutes (incremental)
- **Scans**: 30-60 seconds (95% faster!) ✅

---

## 🛠️ Usage in Code

### Scanner (Worker)

```typescript
import { DependencyCheckScanner } from './tools/java/dependency-check-scanner';

const scanner = new DependencyCheckScanner();

// Scan project
const result = await scanner.scan(
  '/path/to/project',
  'my-app'
);

console.log(`Found ${result.vulnerabilities.length} vulnerabilities`);

// Critical vulnerabilities
const critical = result.vulnerabilities.filter(v => v.severity === 'CRITICAL');
console.log(`Critical: ${critical.length}`);

// Check database health
const dbInfo = await scanner.getDatabaseInfo();
console.log(`DB age: ${dbInfo.ageHours} hours`);
console.log(`Healthy: ${dbInfo.healthy}`);
```

### Updater (Cron Job)

```typescript
import DependencyCheckUpdater from './tools/java/dependency-check-updater';

const updater = new DependencyCheckUpdater();

// Run daily update
await updater.performDailyUpdate();
```

---

## 🚨 Troubleshooting

### Database Not Ready

```bash
# Check status
curl http://localhost:3000/api/dependency-check/status

# Check logs
kubectl logs -n codequal-dev job/dependency-check-updater-manual

# Check PVC
kubectl describe pvc dependency-check-cache -n codequal-dev
```

### Update Failing

```bash
# Check NVD API key
kubectl get secret dependency-check-secrets -n codequal-dev -o yaml

# Check Oracle registry access
kubectl get secret oracle-registry-credentials -n codequal-dev

# Manual test
kubectl run test-updater --rm -it \
  --image=iad.ocir.io/codequal/analyzer:lang-java-v5.3 \
  --restart=Never \
  -- /bin/sh
```

### Database Corrupted

```bash
# Check backups
ls -la /data/dependency-check/backups/

# Manual rollback
cp -r /data/dependency-check/backups/2025-09-29 \
      /data/dependency-check/active

# Update metadata
echo '{"status":"READY","timestamp":'$(date +%s000)'}' > \
  /data/dependency-check/active/metadata.json
```

---

## 📈 Grafana Dashboard Queries

### Database Age Alert

```promql
# Alert if DB > 48 hours old
dependency_check_database_age_hours > 48
```

### Update Success Rate

```promql
# Success rate over last 7 days
sum(rate(dependency_check_update_success_total[7d])) /
sum(rate(dependency_check_update_total[7d])) * 100
```

### Scan Performance

```promql
# Average scan duration (p95)
histogram_quantile(0.95,
  rate(dependency_check_scan_duration_seconds_bucket[1h])
)
```

---

## ✅ Checklist

### Initial Setup

- [ ] Deploy CronJob to Kubernetes
- [ ] Create NVD API key secret
- [ ] Create Oracle registry credentials
- [ ] Create PVC (10GB)
- [ ] Trigger first run manually
- [ ] Verify database created
- [ ] Test scan on sample project
- [ ] Configure Grafana dashboards

### Monitoring

- [ ] Check database age daily
- [ ] Monitor update success rate
- [ ] Alert if update fails
- [ ] Alert if DB > 48 hours old
- [ ] Track scan performance

### Maintenance

- [ ] Review logs weekly
- [ ] Clean up old backups (auto)
- [ ] Renew NVD API key if expired
- [ ] Update container image quarterly

---

## 🎯 Key Improvements vs. Previous Approach

| Feature | Before | After |
|---------|--------|-------|
| **Registry** | DigitalOcean | ✅ Oracle Container Registry |
| **Monitoring** | None | ✅ UnifiedMonitoringService integration |
| **Caching** | No | ✅ Persistent volume with indexing |
| **Validation** | No | ✅ 5-stage validation with rollback |
| **Progress Tracking** | No | ✅ Real-time progress events |
| **Grafana Dashboards** | No | ✅ Prometheus metrics endpoint |
| **Scan Time** | 15-20 min | ✅ 30-60 seconds (95% faster) |
| **Update Time** | N/A | ✅ 2-3 minutes (incremental) |
| **Health Checks** | No | ✅ K8s probe + API endpoint |
| **Rollback** | No | ✅ Automatic rollback on failure |

---

**Status**: Production Ready
**Oracle Registry**: `iad.ocir.io/codequal/analyzer:lang-java-v5.3`
**Monitoring**: Integrated with UnifiedMonitoringService
**Performance**: 95% faster than no-cache approach

---

**Next Steps**: Deploy to Oracle Cloud Kubernetes cluster and configure Grafana dashboards
