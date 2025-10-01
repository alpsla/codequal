# Daily CVE Update Setup Guide

**Purpose**: Automate daily updates of the Dependency-Check PostgreSQL CVE database

**Update Type**: Delta-only (downloads only new/modified CVEs)

**Duration**: 5-10 minutes (vs 30 minutes for full reload)

**Recommended Schedule**: Daily at 2 AM UTC

---

## Overview

The daily CVE update script keeps your Dependency-Check database current with the latest vulnerability data from the National Vulnerability Database (NVD).

### Key Benefits

- ✅ **Automatic Updates**: No manual intervention required
- ✅ **Delta-Only**: Only downloads new/modified CVEs (efficient)
- ✅ **PostgreSQL Persistence**: Updates survive container restarts
- ✅ **Logging**: Detailed logs for monitoring and troubleshooting
- ✅ **Metrics**: Tracks CVE count before/after updates

### What Gets Updated

- New CVEs published since last update
- Modified CVEs (score changes, additional references)
- CVE-to-CPE mappings (software affected)
- CISA Known Exploited Vulnerabilities (KEV)

---

## Prerequisites

### 1. PostgreSQL Database Configured

```bash
# Database must be running and accessible
# Connection details:
Host: 127.0.0.1
Port: 5432
Database: depcheck
Admin User: depcheck_admin
Admin Password: depcheck_admin_2025
```

### 2. JDBC Driver Available

```bash
# Download PostgreSQL JDBC driver
mkdir -p /tmp/jdbc-drivers
cd /tmp/jdbc-drivers
curl -L -o postgresql-42.7.1.jar \
  "https://jdbc.postgresql.org/download/postgresql-42.7.1.jar"
```

### 3. Docker Image Deployed

```bash
# Pull latest Dependency-Check image
docker pull iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
```

### 4. NVD API Key (Recommended)

```bash
# Get free API key from NVD
# Visit: https://nvd.nist.gov/developers/request-an-api-key

# Add to .env file
echo "NVD_API_KEY=your-api-key-here" >> /path/to/codequal/packages/agents/.env
```

---

## Installation

### Local Development (macOS/Linux)

```bash
# 1. Make script executable
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
chmod +x src/two-branch/scripts/daily-cve-update.sh

# 2. Test manual run
./src/two-branch/scripts/daily-cve-update.sh

# 3. Setup cron job
crontab -e

# Add this line (daily at 2 AM):
0 2 * * * /Users/alpinro/Code\ Prjects/codequal/packages/agents/src/two-branch/scripts/daily-cve-update.sh >> /var/log/cve-updates.log 2>&1

# 4. Create log directory
sudo mkdir -p /var/log/dependency-check
sudo chown $USER /var/log/dependency-check
```

### Oracle Cloud A1.Flex (Production)

```bash
# 1. SSH to Oracle instance
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"
export ORACLE_IP="129.213.49.128"
ssh -i "$SSH_KEY" ubuntu@$ORACLE_IP

# 2. Copy script to Oracle
scp -i "$SSH_KEY" \
  src/two-branch/scripts/daily-cve-update.sh \
  ubuntu@$ORACLE_IP:/home/ubuntu/codequal/

# 3. Make executable
chmod +x /home/ubuntu/codequal/daily-cve-update.sh

# 4. Setup cron on Oracle
crontab -e

# Add this line:
0 2 * * * /home/ubuntu/codequal/daily-cve-update.sh >> /var/log/cve-updates.log 2>&1

# 5. Create log directory
sudo mkdir -p /var/log/dependency-check
sudo chown ubuntu /var/log/dependency-check
```

---

## Cron Schedule Options

### Daily at 2 AM UTC (Recommended)
```bash
0 2 * * * /path/to/daily-cve-update.sh
```

### Twice Daily (2 AM and 2 PM)
```bash
0 2,14 * * * /path/to/daily-cve-update.sh
```

### Every 6 Hours
```bash
0 */6 * * * /path/to/daily-cve-update.sh
```

### Weekly on Sundays at 2 AM
```bash
0 2 * * 0 /path/to/daily-cve-update.sh
```

### Custom Schedule Syntax
```
* * * * * command
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, Sunday = 0 or 7)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

---

## Manual Testing

Before setting up the cron job, test the script manually:

```bash
# Run update script
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
./src/two-branch/scripts/daily-cve-update.sh
```

**Expected Output**:
```
==============================================
Daily CVE Database Update
Started: 2025-10-01 16:30:00
==============================================

[1/4] Environment check...
   ✅ NVD_API_KEY configured
   ✅ PostgreSQL JDBC driver found

[2/4] Checking PostgreSQL database...
   ✅ PostgreSQL connected
   CVEs before update: 208,489

[3/4] Running Dependency-Check database update...
   This will download only NEW and MODIFIED CVEs
   Expected duration: 5-10 minutes

   Update completed in 487s
   Exit code: 0

[4/4] Verifying update...
   ✅ Database update successful
   CVEs after update: 208,612
   New CVEs added: 123

==============================================
✅ Daily CVE Update Complete
Finished: 2025-10-01 16:38:07
==============================================

Summary:
  - Update duration: 487s
  - CVEs before: 208,489
  - CVEs after: 208,612
  - New CVEs: 123
  - Log file: /var/log/dependency-check/update-2025-10-01.log
```

---

## Monitoring

### Check Cron Job Status

```bash
# View crontab entries
crontab -l

# Check if cron service is running
# macOS:
sudo launchctl list | grep cron

# Linux:
systemctl status cron
```

### View Update Logs

```bash
# View latest update log
tail -f /var/log/cve-updates.log

# View specific date log
cat /var/log/dependency-check/update-2025-10-01.log

# View last 100 lines
tail -100 /var/log/cve-updates.log

# Search for errors
grep -i error /var/log/cve-updates.log
```

### PostgreSQL Database Check

```bash
# Connect to database
PGPASSWORD="depcheck_admin_2025" psql -h 127.0.0.1 -U depcheck_admin -d depcheck

# Check total CVEs
SELECT COUNT(*) FROM vulnerability;

# Check recent CVEs (last 7 days)
SELECT COUNT(*) FROM vulnerability
WHERE last_modified_date >= NOW() - INTERVAL '7 days';

# Check CVE by ID
SELECT * FROM vulnerability WHERE cve = 'CVE-2021-44228';
```

---

## Troubleshooting

### Issue: PostgreSQL Connection Failed

**Error**:
```
[ERROR] Unable to connect to the dependency-check database
```

**Solutions**:
```bash
# Check PostgreSQL is running
ps aux | grep postgres

# Check listen_addresses configuration
grep listen_addresses /opt/homebrew/var/postgresql@14/postgresql.conf

# Update to accept connections (if needed)
listen_addresses = '*'

# Restart PostgreSQL
brew services restart postgresql@14  # macOS
# OR
sudo systemctl restart postgresql    # Linux
```

### Issue: JDBC Driver Not Found

**Error**:
```
❌ JDBC driver not found at /tmp/jdbc-drivers
```

**Solution**:
```bash
mkdir -p /tmp/jdbc-drivers
cd /tmp/jdbc-drivers
curl -L -o postgresql-42.7.1.jar \
  "https://jdbc.postgresql.org/download/postgresql-42.7.1.jar"
```

### Issue: NVD API Rate Limiting

**Error**:
```
[WARN] NVD API rate limit exceeded
```

**Solutions**:
1. Get NVD API key (free): https://nvd.nist.gov/developers/request-an-api-key
2. Add to .env: `NVD_API_KEY=your-key`
3. API key increases rate limit from 5 requests/30s to 50 requests/30s

### Issue: Docker Image Not Found

**Error**:
```
Unable to find image 'iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm'
```

**Solution**:
```bash
# Login to Oracle Container Registry
docker login iad.ocir.io

# Pull image
docker pull iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
```

### Issue: Cron Job Not Running

**Debugging Steps**:
```bash
# 1. Check cron logs
tail -f /var/log/syslog | grep CRON  # Linux
tail -f /var/log/system.log | grep cron  # macOS

# 2. Verify crontab syntax
crontab -l

# 3. Check script permissions
ls -l /path/to/daily-cve-update.sh

# 4. Make script executable
chmod +x /path/to/daily-cve-update.sh

# 5. Test script manually
/path/to/daily-cve-update.sh
```

---

## Performance Metrics

### Update Duration (Typical)

- **First Time (Full Database)**: 30-45 minutes (208K CVEs)
- **Daily Delta Updates**: 5-10 minutes (10-200 new CVEs)
- **With NVD API Key**: 5-7 minutes
- **Without API Key**: 8-12 minutes (rate limited)

### Database Growth

- **Initial Size**: ~500 MB (208K CVEs)
- **Daily Growth**: 1-5 MB (10-200 new CVEs)
- **Yearly Growth**: ~2-3 GB (projected)

### Network Usage

- **Full Database**: ~50-100 MB download
- **Daily Updates**: ~5-15 MB download

---

## Integration with V9ToolOrchestrator

### Future Integration Points

1. **Pre-Analysis Check**: Verify database is current before scanning
2. **Auto-Update Trigger**: Update database if older than 24 hours
3. **Metrics Collection**: Track update frequency and CVE counts
4. **Health Monitoring**: Alert on failed updates

### Example Integration

```typescript
// In V9ToolOrchestrator or JavaToolOrchestrator
async function ensureCVEDatabaseCurrent(): Promise<void> {
  const lastUpdateTime = await getLastCVEUpdateTime();
  const hoursSinceUpdate = (Date.now() - lastUpdateTime) / (1000 * 60 * 60);

  if (hoursSinceUpdate > 24) {
    console.log('CVE database outdated, triggering update...');
    await runCVEUpdate();
  }
}
```

---

## Maintenance

### Weekly Tasks

1. Check update logs for errors
2. Verify CVE count is increasing
3. Monitor disk space usage

### Monthly Tasks

1. Review PostgreSQL database size
2. Clean up old log files
3. Test backup/restore procedures

### Quarterly Tasks

1. Update JDBC driver (if new version available)
2. Update Dependency-Check Docker image
3. Review and optimize PostgreSQL configuration

---

## Backup Strategy

### Database Backup

```bash
# Backup PostgreSQL database
PGPASSWORD="depcheck_admin_2025" pg_dump \
  -h 127.0.0.1 \
  -U depcheck_admin \
  -d depcheck \
  -F c \
  -f /backup/depcheck-$(date +%Y-%m-%d).dump

# Restore from backup
PGPASSWORD="depcheck_admin_2025" pg_restore \
  -h 127.0.0.1 \
  -U depcheck_admin \
  -d depcheck \
  -F c \
  /backup/depcheck-2025-10-01.dump
```

### Automated Backup Cron

```bash
# Add to crontab (daily backup at 3 AM)
0 3 * * * PGPASSWORD="depcheck_admin_2025" pg_dump -h 127.0.0.1 -U depcheck_admin -d depcheck -F c -f /backup/depcheck-$(date +\%Y-\%m-\%d).dump

# Keep only last 7 days of backups
0 4 * * * find /backup -name "depcheck-*.dump" -mtime +7 -delete
```

---

## Next Steps

1. ✅ Install and test update script manually
2. ✅ Configure cron job with desired schedule
3. ✅ Monitor first automated update
4. ✅ Verify logs and metrics
5. ⏭️ Integrate with V9ToolOrchestrator
6. ⏭️ Deploy to Oracle Cloud production

---

## Resources

- **NVD API Documentation**: https://nvd.nist.gov/developers
- **Dependency-Check CLI**: https://jeremylong.github.io/DependencyCheck/dependency-check-cli/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Cron Guide**: https://crontab.guru/

---

## Contact & Support

For issues or questions:
1. Check logs: `/var/log/dependency-check/`
2. Review troubleshooting section above
3. Test script manually for immediate feedback
4. Verify PostgreSQL connection and database status

---

**Status**: ✅ Ready for Production Deployment
**Last Updated**: October 1, 2025
**Version**: 1.0.0
