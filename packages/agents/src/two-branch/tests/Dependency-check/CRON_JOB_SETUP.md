# Dependency-Check Cron Job Setup for Daily Updates

**Recommended Solution**: PostgreSQL with scheduled updates
**Use Case**: Automated daily NVD database updates + on-demand scanning

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Oracle Cloud A1.Flex (ARM64)                       │
│                                                     │
│  ┌──────────────────┐     ┌──────────────────┐    │
│  │  PostgreSQL      │◄────┤  Update Cron     │    │
│  │  Container       │     │  (Daily 2 AM)    │    │
│  │  (Always Running)│     └──────────────────┘    │
│  └────────┬─────────┘                              │
│           │                                         │
│           │         ┌──────────────────┐           │
│           └────────►│  Analysis Jobs   │           │
│                     │  (On-demand)     │           │
│                     └──────────────────┘           │
└─────────────────────────────────────────────────────┘
```

**Key Points**:
1. PostgreSQL container runs 24/7 (persistent database)
2. Daily cron updates NVD database (delta updates)
3. Analysis jobs run on-demand (query existing database)
4. No container recreation needed

---

## Complete Setup Instructions

### Step 1: Permanent PostgreSQL Setup

```bash
#!/bin/bash
# setup-postgres-permanent.sh
# Run once to set up persistent PostgreSQL

# Create persistent data directory
mkdir -p /data/postgres-depcheck
chmod 777 /data/postgres-depcheck

# Start PostgreSQL with auto-restart
docker run -d \
  --name dependency-check-db \
  --restart unless-stopped \
  -e POSTGRES_DB=cvedb \
  -e POSTGRES_USER=depscan \
  -e POSTGRES_PASSWORD=$(cat /root/.depcheck-db-password) \
  -p 5432:5432 \
  -v /data/postgres-depcheck:/var/lib/postgresql/data \
  postgres:16-alpine

# Wait for startup
sleep 15

# Download and run initialization script
wget -q -O /tmp/init-postgres.sql \
  https://raw.githubusercontent.com/jeremylong/DependencyCheck/main/core/src/main/resources/data/initialize_postgres.sql

docker exec -i dependency-check-db \
  psql -U depscan -d cvedb < /tmp/init-postgres.sql

echo "✓ PostgreSQL setup complete"
echo "✓ Container will auto-restart on reboot"
```

### Step 2: Database Password Management

```bash
# Store password securely
echo "SecureDepCheck2025" > /root/.depcheck-db-password
chmod 600 /root/.depcheck-db-password

# For scripts to use
DB_PASSWORD=$(cat /root/.depcheck-db-password)
```

### Step 3: Initial Database Population

```bash
#!/bin/bash
# initial-nvd-download.sh
# Run ONCE to populate database (takes ~15 minutes)

NVD_API_KEY=$(cat /root/.nvd-api-key)
DB_PASSWORD=$(cat /root/.depcheck-db-password)

docker run --rm \
  --network host \
  -e NVD_API_KEY=$NVD_API_KEY \
  -e JAVA_OPTS="-Xmx4g" \
  analyzer:lang-java-v5.3-arm \
  /opt/dependency-check/bin/dependency-check.sh \
  --updateonly \
  --connectionString "jdbc:postgresql://localhost:5432/cvedb?socketTimeout=120" \
  --dbUser depscan \
  --dbPassword $DB_PASSWORD \
  --nvdApiKey $NVD_API_KEY \
  --log /tmp/depcheck-initial-download.log

echo "✓ Initial NVD database populated"
echo "  Log: /tmp/depcheck-initial-download.log"
```

### Step 4: Daily Update Script

```bash
#!/bin/bash
# /opt/scripts/update-nvd-database.sh
# Scheduled by cron: 0 2 * * * (daily at 2 AM)

set -e

# Configuration
LOG_DIR="/var/log/dependency-check"
LOG_FILE="$LOG_DIR/update-$(date +%Y%m%d).log"
NVD_API_KEY=$(cat /root/.nvd-api-key)
DB_PASSWORD=$(cat /root/.depcheck-db-password)

mkdir -p $LOG_DIR

echo "[$(date)] Starting NVD database update..." | tee -a $LOG_FILE

# Update database (delta downloads only)
docker run --rm \
  --network host \
  -e NVD_API_KEY=$NVD_API_KEY \
  -e JAVA_OPTS="-Xmx2g" \
  analyzer:lang-java-v5.3-arm \
  /opt/dependency-check/bin/dependency-check.sh \
  --updateonly \
  --connectionString "jdbc:postgresql://localhost:5432/cvedb?socketTimeout=120" \
  --dbUser depscan \
  --dbPassword $DB_PASSWORD \
  --nvdApiKey $NVD_API_KEY 2>&1 | tee -a $LOG_FILE

# Check for errors
if [ $? -eq 0 ]; then
  echo "[$(date)] ✓ Update successful" | tee -a $LOG_FILE
else
  echo "[$(date)] ✗ Update failed" | tee -a $LOG_FILE
  # Send alert (email, Slack, etc.)
  /opt/scripts/send-alert.sh "Dependency-Check update failed"
fi

# Cleanup old logs (keep 30 days)
find $LOG_DIR -name "update-*.log" -mtime +30 -delete

echo "[$(date)] Update complete" | tee -a $LOG_FILE
```

### Step 5: Analysis Script (On-Demand)

```bash
#!/bin/bash
# /opt/scripts/analyze-project.sh
# Usage: ./analyze-project.sh /path/to/project project-name

set -e

PROJECT_PATH=$1
PROJECT_NAME=$2
RESULTS_DIR="/data/dependency-check-results/$PROJECT_NAME-$(date +%Y%m%d)"
DB_PASSWORD=$(cat /root/.depcheck-db-password)
NVD_API_KEY=$(cat /root/.nvd-api-key)

mkdir -p $RESULTS_DIR

echo "Analyzing $PROJECT_NAME..."

docker run --rm \
  --network host \
  -v $PROJECT_PATH:/workspace:ro \
  -v $RESULTS_DIR:/results \
  -e NVD_API_KEY=$NVD_API_KEY \
  analyzer:lang-java-v5.3-arm \
  /opt/dependency-check/bin/dependency-check.sh \
  --project "$PROJECT_NAME" \
  --scan /workspace \
  --format JSON \
  --format HTML \
  --out /results \
  --connectionString "jdbc:postgresql://localhost:5432/cvedb?socketTimeout=120" \
  --dbUser depscan \
  --dbPassword $DB_PASSWORD \
  --noupdate \
  --failOnCVSS 7

echo "✓ Analysis complete"
echo "  HTML Report: $RESULTS_DIR/dependency-check-report.html"
echo "  JSON Report: $RESULTS_DIR/dependency-check-report.json"
```

### Step 6: Cron Configuration

```bash
# Edit crontab
crontab -e

# Add these lines:

# Daily NVD database update (2 AM)
0 2 * * * /opt/scripts/update-nvd-database.sh

# Weekly database backup (Sunday 3 AM)
0 3 * * 0 /opt/scripts/backup-database.sh

# Monthly database vacuum (1st of month, 4 AM)
0 4 1 * * /opt/scripts/vacuum-database.sh
```

### Step 7: Database Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-database.sh
# Scheduled by cron: 0 3 * * 0 (weekly, Sunday 3 AM)

BACKUP_DIR="/data/backups/dependency-check"
BACKUP_FILE="$BACKUP_DIR/cvedb-$(date +%Y%m%d).sql.gz"
DB_PASSWORD=$(cat /root/.depcheck-db-password)

mkdir -p $BACKUP_DIR

echo "[$(date)] Starting database backup..."

# Backup database
docker exec dependency-check-db \
  pg_dump -U depscan cvedb | gzip > $BACKUP_FILE

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -sh $BACKUP_FILE | cut -f1)
  echo "[$(date)] ✓ Backup successful: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date)] ✗ Backup failed"
  /opt/scripts/send-alert.sh "Database backup failed"
fi

# Keep only last 4 backups (1 month)
ls -t $BACKUP_DIR/cvedb-*.sql.gz | tail -n +5 | xargs -r rm

echo "[$(date)] Backup complete"
```

### Step 8: Database Maintenance Script

```bash
#!/bin/bash
# /opt/scripts/vacuum-database.sh
# Scheduled by cron: 0 4 1 * * (monthly, 1st at 4 AM)

echo "[$(date)] Starting database vacuum..."

docker exec dependency-check-db \
  psql -U depscan -d cvedb -c "VACUUM ANALYZE;"

echo "[$(date)] ✓ Vacuum complete"
```

---

## Performance Expectations

### Daily Update (Delta)
```
Time: 30-60 seconds
Size: 1-10 MB (only new CVEs since yesterday)
Network: ~100-500 KB/s
CPU: Low (mostly network I/O)
```

### Weekly Full Scan (Apache Kafka, 3,472 files)
```
Time: 30-60 seconds
Disk I/O: Reading project files
CPU: Medium (dependency analysis)
Network: None (uses local database)
```

### Monthly Vacuum
```
Time: 2-5 minutes
Effect: Reclaims disk space, optimizes queries
Impact: Minimal (runs during low-traffic hours)
```

---

## Monitoring & Alerts

### Health Check Script

```bash
#!/bin/bash
# /opt/scripts/health-check.sh
# Scheduled by cron: */30 * * * * (every 30 minutes)

# Check PostgreSQL is running
if ! docker ps | grep -q dependency-check-db; then
  echo "ERROR: PostgreSQL container not running"
  docker start dependency-check-db
  /opt/scripts/send-alert.sh "PostgreSQL restarted automatically"
fi

# Check database connectivity
if ! docker exec dependency-check-db pg_isready -U depscan; then
  echo "ERROR: PostgreSQL not accepting connections"
  /opt/scripts/send-alert.sh "PostgreSQL connection failed"
fi

# Check disk space
USAGE=$(df -h /data | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
  echo "WARNING: Disk usage at $USAGE%"
  /opt/scripts/send-alert.sh "Disk usage high: $USAGE%"
fi
```

### Log Monitoring

```bash
# View today's update log
tail -f /var/log/dependency-check/update-$(date +%Y%m%d).log

# Check for errors in last 7 days
grep ERROR /var/log/dependency-check/update-*.log | tail -20

# Database size over time
docker exec dependency-check-db \
  psql -U depscan -d cvedb -c "
    SELECT pg_size_pretty(pg_database_size('cvedb')) AS size;
  "
```

---

## Complete Setup Checklist

### One-Time Setup (30 minutes)
- [ ] Create `/data/postgres-depcheck` directory
- [ ] Store NVD API key in `/root/.nvd-api-key`
- [ ] Store DB password in `/root/.depcheck-db-password`
- [ ] Run `setup-postgres-permanent.sh`
- [ ] Run `initial-nvd-download.sh` (takes 15 minutes)
- [ ] Create `/opt/scripts/` directory
- [ ] Copy all scripts to `/opt/scripts/`
- [ ] Make scripts executable: `chmod +x /opt/scripts/*.sh`
- [ ] Configure cron jobs
- [ ] Test manual update: `/opt/scripts/update-nvd-database.sh`
- [ ] Test health check: `/opt/scripts/health-check.sh`

### Verify Setup
```bash
# Check PostgreSQL is running
docker ps | grep dependency-check-db

# Check database size
docker exec dependency-check-db \
  psql -U depscan -d cvedb -c "SELECT count(*) FROM vulnerability;"

# Test analysis
/opt/scripts/analyze-project.sh /tmp/kafka-repo kafka-test

# Check cron jobs
crontab -l
```

---

## Why PostgreSQL Beats Other Solutions for Cron Jobs

### vs H2 Embedded Database
| Feature | PostgreSQL | H2 Embedded |
|---------|-----------|-------------|
| **Concurrent Access** | ✅ Excellent | ❌ Poor (connection pool issues) |
| **Persistence** | ✅ Survives restarts | ⚠️ Requires volume mounts |
| **Scheduled Updates** | ✅ Perfect | ⚠️ Can corrupt with concurrent writes |
| **Backup** | ✅ Standard tools | ⚠️ File copy only |
| **Monitoring** | ✅ Built-in tools | ❌ Limited |
| **ARM64 Stability** | ✅ Native support | ❌ Known issues |

### vs Sequential Download (Solution #3)
- PostgreSQL: Daily updates in 30-60s (delta)
- Sequential: Slower, no benefit for scheduled updates

### vs x86_64 Transfer (Solution #4)
- PostgreSQL: Direct ARM64, no transfer needed
- x86_64: Requires dual architecture, complex

### vs Partial Database (Solution #5)
- PostgreSQL: 100% accuracy, production-grade
- Partial: 99.94% accuracy, missing CVEs never retry

---

## Resource Requirements

### Disk Space
```
PostgreSQL database: ~4 GB
Logs (30 days): ~100 MB
Backups (4 weeks): ~16 GB (4 × 4GB compressed)
─────────────────────────────
Total: ~20 GB
```

### Memory
```
PostgreSQL: 512 MB (idle) - 2 GB (during updates)
Update job: 2 GB (Java heap)
Analysis job: 2 GB (Java heap)
─────────────────────────────
Recommended: 8 GB total on server
```

### Network
```
Initial download: ~3 GB (one-time)
Daily delta: 1-10 MB
Monthly total: ~300 MB
```

---

## Disaster Recovery

### Database Restore from Backup
```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1  # e.g., /data/backups/dependency-check/cvedb-20250930.sql.gz
DB_PASSWORD=$(cat /root/.depcheck-db-password)

# Drop and recreate database
docker exec dependency-check-db \
  psql -U depscan -d postgres -c "DROP DATABASE IF EXISTS cvedb;"
docker exec dependency-check-db \
  psql -U depscan -d postgres -c "CREATE DATABASE cvedb;"

# Restore from backup
gunzip -c $BACKUP_FILE | \
  docker exec -i dependency-check-db \
    psql -U depscan -d cvedb

echo "✓ Database restored from $BACKUP_FILE"
```

### Complete Rebuild
```bash
# If everything fails, rebuild from scratch
docker stop dependency-check-db
docker rm dependency-check-db
rm -rf /data/postgres-depcheck

# Re-run setup
./setup-postgres-permanent.sh
./initial-nvd-download.sh
```

---

## Production Deployment Timeline

### Day 1 (30 minutes)
- Set up PostgreSQL container
- Initialize database schema
- Download initial NVD database

### Day 2 (1 hour)
- Create all cron job scripts
- Configure crontab
- Test manual execution
- Monitor first automated update

### Day 3 (30 minutes)
- Set up monitoring and alerts
- Configure log rotation
- Test backup and restore
- Document procedures

### Ongoing (Automated)
- Daily: NVD delta updates (30-60s each)
- Weekly: Database backups
- Monthly: Database vacuum
- On-demand: Project analysis

---

## Summary

**PostgreSQL is THE solution for permanent scheduled operation because**:

✅ **Reliable**: No connection pool issues on ARM64
✅ **Fast**: Delta updates in 30-60 seconds daily
✅ **Persistent**: Survives reboots (auto-restart enabled)
✅ **Production-grade**: Battle-tested database
✅ **Easy to monitor**: Standard PostgreSQL tools
✅ **Easy to backup**: `pg_dump` with compression
✅ **Scales**: Handles concurrent analysis jobs
✅ **Low maintenance**: Automated updates and cleanup

**Total ongoing effort**: 0 minutes (fully automated)

**Setup time**: 30 minutes one-time investment
**Daily operation**: Fully automated via cron
**Maintenance**: Automated backups and vacuum

This is the **only solution** that truly works for permanent scheduled operation.
