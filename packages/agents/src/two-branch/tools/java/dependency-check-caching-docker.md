# Dependency-Check Caching - Direct Docker on Oracle Cloud

**Simplified implementation without Kubernetes**

**Date**: September 30, 2025

---

## 📊 Architecture (Simplified Docker)

```
Oracle Cloud VM (ARM64)
├── Docker Host
│   ├── Shared Volume: /data/dependency-check/
│   │   ├── active/     (read-only for workers)
│   │   ├── staging/    (update in progress)
│   │   ├── backups/    (last 3 backups)
│   │   └── logs/       (update logs)
│   │
│   ├── Cron Job (runs on VM, not in container)
│   │   └── Executes: ts-node dependency-check-updater.ts
│   │
│   └── Analysis Workers (Docker containers)
│       ├── Worker 1: Mounts /data/dependency-check/active:ro
│       ├── Worker 2: Mounts /data/dependency-check/active:ro
│       └── Worker 3: Mounts /data/dependency-check/active:ro
│
└── Monitoring
    └── UnifiedMonitoringService → Grafana
```

**Key Difference from Kubernetes:**
- ❌ No Kubernetes CronJob
- ❌ No PVC (Persistent Volume Claim)
- ✅ Direct VM disk storage
- ✅ System cron on VM
- ✅ Docker containers mount shared volume

---

## 🚀 Setup on Oracle Cloud VM

### 1. Prepare VM Storage

```bash
# SSH to Oracle Cloud VM
ssh -i oracle-key.pem opc@<oracle-vm-ip>

# Create directory structure
sudo mkdir -p /data/dependency-check/{active,staging,backups,logs}
sudo chown -R opc:opc /data/dependency-check

# Verify disk space (need 10GB)
df -h /data
```

### 2. Install Dependencies

```bash
# Install Node.js and TypeScript (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g typescript ts-node

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker opc

# Login to Oracle Container Registry
docker login iad.ocir.io
# Username: <tenancy-namespace>/<username>
# Password: <auth-token>

# Pull analyzer image
docker pull iad.ocir.io/codequal/analyzer:lang-java-v5.3
```

### 3. Set Environment Variables

```bash
# Add to ~/.bashrc or /etc/environment
export NVD_API_KEY="your-nvd-api-key-here"
export ENABLE_MONITORING="true"
export METRICS_DIR="/data/dependency-check/logs"

# Source it
source ~/.bashrc
```

### 4. Deploy Application Code

```bash
# Clone repository (or copy files)
cd /opt/codequal
git pull origin main

# Or use rsync from local machine
rsync -avz -e "ssh -i oracle-key.pem" \
  ./packages/agents/ \
  opc@<oracle-vm-ip>:/opt/codequal/packages/agents/

# Install dependencies
cd /opt/codequal/packages/agents
npm install
```

### 5. Setup Cron Job (VM System Cron)

```bash
# Edit crontab
crontab -e

# Add daily update at 2 AM
0 2 * * * /usr/bin/ts-node /opt/codequal/packages/agents/src/two-branch/tools/java/run-dependency-check-update.ts >> /data/dependency-check/logs/cron.log 2>&1
```

### 6. Create Update Runner Script

```bash
# Create runner script
cat > /opt/codequal/packages/agents/src/two-branch/tools/java/run-dependency-check-update.ts << 'EOF'
#!/usr/bin/env ts-node

/**
 * Cron job runner for Dependency-Check updates
 * Runs directly on Oracle Cloud VM (not in container)
 */

import DependencyCheckUpdater from './dependency-check-updater';

async function main() {
  const updater = new DependencyCheckUpdater();

  try {
    console.log('='.repeat(60));
    console.log('Starting Dependency-Check daily update...');
    console.log('Time:', new Date().toISOString());
    console.log('='.repeat(60));

    await updater.performDailyUpdate();

    console.log('='.repeat(60));
    console.log('Update completed successfully');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('='.repeat(60));
    console.error('Update failed:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

main();
EOF

# Make executable
chmod +x /opt/codequal/packages/agents/src/two-branch/tools/java/run-dependency-check-update.ts
```

### 7. Run First Update (Manual)

```bash
# Run manually first time (don't wait for 2 AM)
cd /opt/codequal/packages/agents
ts-node src/two-branch/tools/java/run-dependency-check-update.ts

# Watch progress (takes 15-20 minutes first time)
tail -f /data/dependency-check/logs/update-$(date +%Y-%m-%d).log
```

---

## 🔧 Analysis Worker Usage

### Running Scans with Docker

```bash
# Run scan using shared cached database
docker run --rm \
  -v /path/to/project:/workspace:ro \
  -v /data/dependency-check/active:/data:ro \
  iad.ocir.io/codequal/analyzer:lang-java-v5.3 \
  bash -c 'dependency-check \
    --scan /workspace \
    --data /data \
    --noupdate \
    --format JSON \
    --out /workspace/dependency-check-results.json'

# Example: Scan Apache Kafka
docker run --rm \
  -v /tmp/kafka-repo:/workspace:ro \
  -v /data/dependency-check/active:/data:ro \
  iad.ocir.io/codequal/analyzer:lang-java-v5.3 \
  dependency-check --scan /workspace --data /data --noupdate --format JSON --out /workspace/results

# Typical scan time: 30-60 seconds ✅
```

### From Node.js Code

```typescript
import { DependencyCheckScanner } from './dependency-check-scanner';

const scanner = new DependencyCheckScanner();

// Scan project
const result = await scanner.scan('/path/to/project', 'my-app');

console.log(`Scanned ${result.dependencies} dependencies`);
console.log(`Found ${result.vulnerabilities.length} vulnerabilities`);
console.log(`Scan took ${result.scanDuration}ms`);
```

---

## 📁 File System Layout (Oracle Cloud VM)

```
/data/dependency-check/
├── active/                          # Production DB (read-only)
│   ├── cache/
│   │   └── nvdcve-*.json.gz        # 3GB CVE data
│   ├── data/
│   │   ├── odc.mv.db               # 500MB H2 database
│   │   └── lucene/                 # 200MB search indexes
│   └── metadata.json               # Status, timestamp
│
├── staging/                         # Temp during update
│   └── (same structure)
│
├── backups/
│   ├── 2025-09-30/
│   ├── 2025-09-29/
│   └── 2025-09-28/
│
└── logs/
    ├── update-2025-09-30.log
    ├── cron.log                     # Cron job output
    └── validation-2025-09-30.log

/opt/codequal/packages/agents/
└── src/two-branch/tools/java/
    ├── dependency-check-updater.ts        # Update manager
    ├── dependency-check-scanner.ts        # Scan worker
    ├── run-dependency-check-update.ts     # Cron runner
    └── dependency-check-status-api.ts     # API endpoints
```

---

## 🔄 How It Works

### Daily Update Process (2 AM)

```
02:00:00  System cron triggers
          ↓
02:00:01  VM executes: ts-node run-dependency-check-update.ts
          ↓
02:00:05  Script runs DependencyCheckUpdater.performDailyUpdate()
          ↓
02:00:10  Docker container launched for CVE download
          docker run -v /data/dependency-check/staging:/data ...
          ↓
02:01:30  Download complete, container exits
          ↓
02:01:35  Docker container launched for indexing
          ↓
02:02:00  Indexing complete, validation runs
          ↓
02:02:15  Atomic swap: staging → active
          ↓
02:02:20  Status updated: READY
          ↓
02:02:25  Script exits successfully
          ↓
02:02:30  Cron job complete
```

### Worker Scan Process

```
User triggers analysis
          ↓
Node.js calls scanner.scan()
          ↓
Launches Docker container with read-only volume:
docker run -v /data/dependency-check/active:/data:ro ...
          ↓
Container scans dependencies (30-60s)
          ↓
Container writes results, exits
          ↓
Node.js parses results, returns to user
```

**Key Point**: Multiple workers can scan simultaneously because they mount the database **read-only** (`/data:ro`)

---

## 🔍 Monitoring & Status

### Check Status from VM

```bash
# Check database status
cat /data/dependency-check/active/metadata.json | jq

# Check database age
stat -c %Y /data/dependency-check/active/metadata.json
# Compare with current time

# Check recent logs
tail -n 50 /data/dependency-check/logs/update-$(date +%Y-%m-%d).log

# Check disk usage
du -sh /data/dependency-check/*
```

### API Endpoints (If Running Express Server)

```bash
# Status
curl http://localhost:3000/api/dependency-check/status

# Metrics (for Grafana)
curl http://localhost:3000/api/dependency-check/metrics

# Health check
curl http://localhost:3000/api/dependency-check/health
```

### Cron Job Logs

```bash
# View cron job output
tail -f /data/dependency-check/logs/cron.log

# Check if cron is running
crontab -l

# View cron job history
grep CRON /var/log/syslog | grep dependency-check
```

---

## 🚨 Troubleshooting

### Update Not Running

```bash
# Check cron is active
sudo systemctl status cron

# Check cron job is scheduled
crontab -l

# Run manually to test
ts-node /opt/codequal/packages/agents/src/two-branch/tools/java/run-dependency-check-update.ts

# Check permissions
ls -la /data/dependency-check/
```

### Database Not Accessible

```bash
# Check volume mount
ls -la /data/dependency-check/active/

# Check Docker can access it
docker run --rm -v /data/dependency-check/active:/test:ro alpine ls -la /test

# Fix permissions if needed
sudo chown -R opc:opc /data/dependency-check
sudo chmod -R 755 /data/dependency-check
```

### NVD API Key Issues

```bash
# Check environment variable
echo $NVD_API_KEY

# Test API key manually
curl -H "apiKey: $NVD_API_KEY" \
  https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1

# Set permanently
echo 'export NVD_API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc
```

### Oracle Registry Access

```bash
# Check Docker login
cat ~/.docker/config.json | jq '.auths'

# Re-login if needed
docker login iad.ocir.io

# Test pull
docker pull iad.ocir.io/codequal/analyzer:lang-java-v5.3
```

---

## ⚡ Performance Comparison

### Direct Docker vs Kubernetes

| Aspect | Kubernetes | Direct Docker | Winner |
|--------|-----------|---------------|--------|
| **Setup Complexity** | High (YAML, kubectl) | Low (cron + Docker) | ✅ Docker |
| **Deployment Time** | 30-60 min | 10-15 min | ✅ Docker |
| **Resource Overhead** | ~500MB (K8s components) | ~50MB (just Docker) | ✅ Docker |
| **Startup Time** | 10-20s (pod scheduling) | 2-3s (direct container) | ✅ Docker |
| **Failure Recovery** | Automatic (K8s) | Manual (cron retry) | ⚠️  K8s |
| **Scaling** | Automatic | Manual | ⚠️  K8s |
| **Cost** | Higher (K8s overhead) | Lower (just VM) | ✅ Docker |

**Recommendation for CodeQual**: Direct Docker is better for your use case because:
- ✅ Simpler setup
- ✅ Lower resource usage
- ✅ Faster execution
- ✅ Easier debugging
- ✅ No Kubernetes learning curve

---

## 🎯 Migration from DigitalOcean to Oracle

### Before (DigitalOcean)
```bash
# Old image
registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm
```

### After (Oracle Cloud)
```bash
# New image
iad.ocir.io/codequal/analyzer:lang-java-v5.3

# Login
docker login iad.ocir.io
```

### Registry Endpoints by Region

```bash
# US East (Ashburn) - Recommended
iad.ocir.io/codequal/analyzer:lang-java-v5.3

# US West (Phoenix)
phx.ocir.io/codequal/analyzer:lang-java-v5.3

# Europe (Frankfurt)
fra.ocir.io/codequal/analyzer:lang-java-v5.3

# Asia Pacific (Tokyo)
nrt.ocir.io/codequal/analyzer:lang-java-v5.3
```

---

## 📊 Monitoring Integration

### UnifiedMonitoringService Events

All monitoring events work the same way:

```typescript
// In updater
monitoring.trackPerformance('dependency-check-update', duration, {
  success: true,
  databaseSize: 3221225472 // bytes
});

// In scanner
monitoring.trackPerformance('dependency-check-scan', duration, {
  projectName: 'my-app',
  vulnerabilitiesFound: 5
});
```

### Grafana Dashboards

Metrics are available at the same API endpoint:

```bash
# Prometheus metrics
curl http://localhost:3000/api/dependency-check/metrics
```

No difference in monitoring between Kubernetes and direct Docker!

---

## 🔄 Backup & Recovery

### Manual Backup

```bash
# Create backup
sudo cp -r /data/dependency-check/active \
           /data/dependency-check/backups/manual-$(date +%Y-%m-%d)

# Verify backup
ls -lh /data/dependency-check/backups/
```

### Manual Restore

```bash
# Restore from backup
sudo rm -rf /data/dependency-check/active
sudo cp -r /data/dependency-check/backups/2025-09-29 \
           /data/dependency-check/active

# Update metadata
echo "{\"status\":\"READY\",\"timestamp\":$(date +%s)000}" | \
  sudo tee /data/dependency-check/active/metadata.json
```

---

## 🚀 Deployment Checklist

### Initial Setup
- [ ] SSH to Oracle Cloud VM
- [ ] Create `/data/dependency-check/` directory
- [ ] Install Docker
- [ ] Login to Oracle Container Registry
- [ ] Pull analyzer image
- [ ] Install Node.js and TypeScript
- [ ] Clone/copy application code
- [ ] Set NVD_API_KEY environment variable
- [ ] Create cron job (2 AM daily)
- [ ] Run first update manually
- [ ] Verify database created
- [ ] Test scan on sample project

### Verification
- [ ] Check cron job logs
- [ ] Verify database age < 24 hours
- [ ] Run test scan (should take 30-60s)
- [ ] Check monitoring metrics
- [ ] Verify backups are being created

### Maintenance
- [ ] Monitor cron job logs weekly
- [ ] Check database age daily (should be < 24h)
- [ ] Review failed updates (if any)
- [ ] Clean old backups (auto, but verify)

---

## ✅ Summary

**Setup Method**: Direct Docker on Oracle Cloud VM (no Kubernetes)

**Benefits**:
- ✅ 95% faster scans (30-60s vs 15-20 min)
- ✅ Shared cached database
- ✅ Simple cron job on VM
- ✅ No Kubernetes overhead
- ✅ Oracle Container Registry
- ✅ Full monitoring integration

**Files Created**:
1. `dependency-check-updater.ts` - Update manager
2. `dependency-check-scanner.ts` - Scan worker
3. `run-dependency-check-update.ts` - Cron runner
4. `dependency-check-status-api.ts` - API endpoints

**Deployment**: Just copy files to VM, setup cron, done! ✅

---

**Next Steps**: Deploy to your Oracle Cloud VM and run first update
