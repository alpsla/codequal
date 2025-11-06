# Dependency-Check Cron Jobs - Complete Guide

**Purpose**: Automate CVE database updates and validation for production reliability

**Cron Jobs**: 2 complementary jobs working together

---

## Overview

Two cron jobs ensure your Dependency-Check infrastructure stays current and reliable:

### 1. Daily CVE Database Update ⚙️
- **Script**: `daily-cve-update.sh`
- **Schedule**: Daily at 2 AM UTC
- **Purpose**: Keep CVE database current with NVD
- **Duration**: 5-10 minutes
- **Type**: Delta-only updates

### 2. Monthly Log4Shell Validation ✅
- **Script**: `monthly-log4shell-validation.sh`
- **Schedule**: Monthly on 1st at 3 AM UTC
- **Purpose**: Validate critical CVE detection capability
- **Duration**: 2-5 seconds
- **Type**: Integrity validation

---

## Why Both Jobs Are Needed

### Daily CVE Database Update

**Purpose**: Keep vulnerability database current

**Why Daily?**
- New CVEs published daily by NIST
- Critical vulnerabilities need immediate detection
- Delta updates are fast (5-10 minutes)
- Ensures analysis uses latest threat data

**What It Does**:
1. Connects to NVD (National Vulnerability Database)
2. Downloads only NEW and MODIFIED CVEs since last update
3. Updates PostgreSQL database
4. Logs CVE count before/after
5. Reports new CVEs added

**Example Output**:
```
[4/4] Verifying update...
   ✅ Database update successful
   CVEs after update: 208,612
   New CVEs added: 123
```

### Monthly Log4Shell Validation

**Purpose**: Ensure database integrity and critical CVE detection

**Why Monthly?**
- Validates database integrity after ~30 daily updates
- Confirms CVSS v4 parsing still working
- Early warning if database corruption occurs
- Tests critical vulnerability detection (Log4Shell = CVSS 10.0)
- Peace of mind that system is functioning

**What It Does**:
1. Checks CVE-2021-44228 exists in PostgreSQL
2. Creates test project with vulnerable log4j-core 2.14.1
3. Runs Dependency-Check scan
4. Verifies Log4Shell is detected
5. Confirms CRITICAL severity and CVSS 10.0
6. Alerts if detection fails

**Example Output**:
```
✅ MONTHLY VALIDATION PASSED

Validation Results:
  - CVE-2021-44228 (Log4Shell): ✅ DETECTED
  - CVSS Score: 10.0 (CRITICAL)
  - PostgreSQL backend: ✅ WORKING
  - Dependency-Check 12.1.5: ✅ WORKING
  - Database CVE count: 208,612
  - Scan duration: 3s

🎉 Database integrity confirmed - Critical CVE detection working!
```

---

## Complete Cron Configuration

### Recommended Setup (Both Jobs)

```bash
# Edit crontab
crontab -e

# Add both cron jobs:

# 1. Daily CVE Database Update (2 AM UTC)
0 2 * * * /path/to/daily-cve-update.sh >> /var/log/cve-updates.log 2>&1

# 2. Monthly Log4Shell Validation (1st of month, 3 AM UTC)
0 3 1 * * /path/to/monthly-log4shell-validation.sh >> /var/log/log4shell-validation.log 2>&1
```

### Alternative Schedules

**More Frequent Updates (High-Security Environments)**:
```bash
# Update twice daily (2 AM and 2 PM)
0 2,14 * * * /path/to/daily-cve-update.sh >> /var/log/cve-updates.log 2>&1

# Validate weekly (every Monday)
0 3 * * 1 /path/to/monthly-log4shell-validation.sh >> /var/log/log4shell-validation.log 2>&1
```

**Less Frequent (Development Environments)**:
```bash
# Update weekly (Sundays at 2 AM)
0 2 * * 0 /path/to/daily-cve-update.sh >> /var/log/cve-updates.log 2>&1

# Validate quarterly (1st of Jan/Apr/Jul/Oct)
0 3 1 1,4,7,10 * /path/to/monthly-log4shell-validation.sh >> /var/log/log4shell-validation.log 2>&1
```

---

## Installation Guide

### Prerequisites (Both Jobs)

1. **PostgreSQL Database Running**
   ```bash
   ps aux | grep postgres  # Should show running process
   ```

2. **JDBC Driver Available**
   ```bash
   ls -lh /tmp/jdbc-drivers/postgresql-42.7.1.jar
   # Should exist, 1.0M size
   ```

3. **Docker Image Available**
   ```bash
   docker images | grep analyzer:lang-java-v6.0-arm
   # Should show the image
   ```

4. **NVD API Key** (Optional but recommended for daily updates)
   ```bash
   grep NVD_API_KEY /path/to/.env
   # Should return: NVD_API_KEY=your-key
   ```

### Local Development Setup (macOS/Linux)

```bash
# 1. Navigate to scripts directory
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents/src/two-branch/scripts

# 2. Make both scripts executable
chmod +x daily-cve-update.sh
chmod +x monthly-log4shell-validation.sh

# 3. Test both scripts manually (IMPORTANT!)
./daily-cve-update.sh
./monthly-log4shell-validation.sh

# 4. Create log directories
sudo mkdir -p /var/log/dependency-check
sudo chown $USER /var/log/dependency-check

# 5. Setup cron jobs
crontab -e

# Add these lines:
0 2 * * * /Users/alpinro/Code\ Prjects/codequal/packages/agents/src/two-branch/scripts/daily-cve-update.sh >> /var/log/cve-updates.log 2>&1
0 3 1 * * /Users/alpinro/Code\ Prjects/codequal/packages/agents/src/two-branch/scripts/monthly-log4shell-validation.sh >> /var/log/log4shell-validation.log 2>&1

# 6. Verify crontab
crontab -l
```

### Oracle Cloud A1.Flex Setup (Production)

```bash
# 1. SSH to Oracle instance
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"
export ORACLE_IP="129.213.49.128"
ssh -i "$SSH_KEY" ubuntu@$ORACLE_IP

# 2. Create directory for scripts
mkdir -p /home/ubuntu/codequal/scripts
cd /home/ubuntu/codequal/scripts

# 3. Copy both scripts from local machine
# (Run this from your local machine)
scp -i "$SSH_KEY" \
  /Users/alpinro/Code\ Prjects/codequal/packages/agents/src/two-branch/scripts/daily-cve-update.sh \
  ubuntu@$ORACLE_IP:/home/ubuntu/codequal/scripts/

scp -i "$SSH_KEY" \
  /Users/alpinro/Code\ Prjects/codequal/packages/agents/src/two-branch/scripts/monthly-log4shell-validation.sh \
  ubuntu@$ORACLE_IP:/home/ubuntu/codequal/scripts/

# 4. SSH back to Oracle and make executable
ssh -i "$SSH_KEY" ubuntu@$ORACLE_IP
cd /home/ubuntu/codequal/scripts
chmod +x daily-cve-update.sh monthly-log4shell-validation.sh

# 5. Test both scripts
./daily-cve-update.sh
./monthly-log4shell-validation.sh

# 6. Create log directory
sudo mkdir -p /var/log/dependency-check
sudo chown ubuntu /var/log/dependency-check

# 7. Setup cron jobs
crontab -e

# Add these lines:
0 2 * * * /home/ubuntu/codequal/scripts/daily-cve-update.sh >> /var/log/cve-updates.log 2>&1
0 3 1 * * /home/ubuntu/codequal/scripts/monthly-log4shell-validation.sh >> /var/log/log4shell-validation.log 2>&1

# 8. Verify crontab
crontab -l
```

---

## Testing Both Jobs

### Manual Testing (Before Cron Setup)

**Test 1: Daily CVE Update**
```bash
cd /path/to/scripts
./daily-cve-update.sh
```

**Expected Output**:
```
==============================================
Daily CVE Database Update
Started: 2025-10-02 16:00:00
==============================================

[1/4] Environment check...
   ✅ NVD_API_KEY configured
   ✅ PostgreSQL JDBC driver found

[2/4] Checking PostgreSQL database...
   ✅ PostgreSQL connected
   CVEs before update: 208,489

[3/4] Running Dependency-Check database update...
   Update completed in 487s

[4/4] Verifying update...
   ✅ Database update successful
   CVEs after update: 208,612
   New CVEs added: 123
```

**Test 2: Monthly Log4Shell Validation**
```bash
cd /path/to/scripts
./monthly-log4shell-validation.sh
```

**Expected Output**:
```
==============================================
Monthly Log4Shell Validation
Started: 2025-10-02 16:10:00
==============================================

[1/6] Environment check...
   ✅ PostgreSQL JDBC driver found

[2/6] Verifying PostgreSQL database...
   ✅ PostgreSQL connected
   Total CVEs in database: 208,612

[3/6] Checking Log4Shell in database...
   ✅ CVE-2021-44228 found in database
   CVSS v3 Score: 10.0 (expected: 10.0)

[4/6] Creating test project with vulnerable Log4j...
   ✅ Test project created

[5/6] Running Dependency-Check validation scan...
   Scan completed in 3s

[6/6] Validating results...
   ✅ Report generated
   ✅ CVE-2021-44228 detected in scan
   ✅ Severity: CRITICAL (correct)
   ✅ Exit code: 1 (vulnerability found, correct)

==============================================
✅ MONTHLY VALIDATION PASSED
==============================================

🎉 Database integrity confirmed!
```

---

## Monitoring

### Check Cron Job Status

```bash
# View crontab entries
crontab -l

# Check cron service (macOS)
sudo launchctl list | grep cron

# Check cron service (Linux)
systemctl status cron
```

### View Logs

**Daily Update Logs**:
```bash
# View latest update
tail -f /var/log/cve-updates.log

# View specific month
cat /var/log/dependency-check/update-2025-10-01.log

# Search for errors
grep -i error /var/log/cve-updates.log

# Count successful updates this month
grep "✅ Database update successful" /var/log/cve-updates.log | wc -l
```

**Monthly Validation Logs**:
```bash
# View latest validation
tail -f /var/log/log4shell-validation.log

# View specific month
cat /var/log/dependency-check/log4shell-validation-2025-10.log

# Check if validation passed
grep "✅ MONTHLY VALIDATION PASSED" /var/log/log4shell-validation.log

# Count failed validations
grep "❌ MONTHLY VALIDATION FAILED" /var/log/log4shell-validation.log | wc -l
```

### PostgreSQL Monitoring

```bash
# Connect to database
PGPASSWORD="depcheck_scan_2025" psql -h 127.0.0.1 -U depcheck_scanner -d depcheck

# Check total CVEs
SELECT COUNT(*) FROM vulnerability;

# Check CVEs added in last 7 days
SELECT COUNT(*) FROM vulnerability
WHERE last_modified_date >= NOW() - INTERVAL '7 days';

# Verify Log4Shell exists
SELECT cve, cvssv3_base_score, description FROM vulnerability
WHERE cve = 'CVE-2021-44228';

# Check database size
SELECT pg_size_pretty(pg_database_size('depcheck'));
```

---

## Troubleshooting

### Issue: Daily Update Fails

**Error**: `[ERROR] Unable to connect to the dependency-check database`

**Solutions**:
```bash
# 1. Check PostgreSQL is running
ps aux | grep postgres

# 2. Test database connection
PGPASSWORD="depcheck_admin_2025" psql -h 127.0.0.1 -U depcheck_admin -d depcheck

# 3. Check PostgreSQL logs
tail -f /opt/homebrew/var/postgresql@14/server.log  # macOS
tail -f /var/log/postgresql/postgresql-14-main.log   # Linux

# 4. Restart PostgreSQL
brew services restart postgresql@14  # macOS
sudo systemctl restart postgresql    # Linux
```

### Issue: Monthly Validation Fails

**Error**: `❌ CVE-2021-44228 NOT found in scan!`

**Debugging Steps**:
```bash
# 1. Check if CVE exists in database
PGPASSWORD="depcheck_scan_2025" psql -h 127.0.0.1 -U depcheck_scanner -d depcheck \
  -c "SELECT * FROM vulnerability WHERE cve='CVE-2021-44228';"

# 2. If not found, run daily update
./daily-cve-update.sh

# 3. Verify JDBC driver
ls -lh /tmp/jdbc-drivers/postgresql-42.7.1.jar

# 4. Test Docker image
docker run --rm iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm \
  -c "dependency-check --version"

# 5. Run validation with verbose logging
./monthly-log4shell-validation.sh 2>&1 | tee /tmp/validation-debug.log
```

### Issue: Cron Jobs Not Running

**Debugging**:
```bash
# 1. Check cron logs (Linux)
tail -f /var/log/syslog | grep CRON

# 2. Check cron logs (macOS)
tail -f /var/log/system.log | grep cron

# 3. Verify script permissions
ls -l /path/to/daily-cve-update.sh
ls -l /path/to/monthly-log4shell-validation.sh
# Both should be -rwxr-xr-x

# 4. Test scripts manually
/path/to/daily-cve-update.sh
/path/to/monthly-log4shell-validation.sh

# 5. Check crontab syntax
crontab -l
# Should show both jobs with correct paths
```

---

## Performance Metrics

### Daily CVE Update

| Metric | Value | Notes |
|--------|-------|-------|
| First-time (full DB) | 30-45 min | 208K CVEs |
| Daily delta updates | 5-10 min | 10-200 new CVEs |
| With NVD API key | 5-7 min | 50 req/30s |
| Without API key | 8-12 min | 5 req/30s (rate limited) |
| Network usage | 5-15 MB | Compressed downloads |
| DB growth per day | 1-5 MB | Varies by CVE count |

### Monthly Log4Shell Validation

| Metric | Value | Notes |
|--------|-------|-------|
| Database check | < 1 sec | PostgreSQL query |
| Docker container start | 1-2 sec | Image cached |
| Dependency scan | 2-3 sec | PostgreSQL cached |
| Total duration | 3-5 sec | Extremely fast |
| Network usage | < 1 MB | No downloads needed |
| Disk usage | ~10 MB | Temporary test directory |

---

## Alerting and Notifications

### Email Alerts (Optional)

**Setup Email Notifications** (Linux with `sendmail`):
```bash
# Install sendmail
sudo apt-get install sendmail  # Ubuntu/Debian
sudo yum install sendmail       # CentOS/RHEL

# Create wrapper script: /usr/local/bin/cron-with-email.sh
#!/bin/bash
SCRIPT=$1
RECIPIENT="your-email@example.com"
LOG_FILE="/tmp/cron-output-$$.log"

$SCRIPT > "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  # Send email on failure
  cat "$LOG_FILE" | mail -s "Cron Job Failed: $SCRIPT" "$RECIPIENT"
fi

cat "$LOG_FILE"
rm "$LOG_FILE"
exit $EXIT_CODE

# Update crontab to use wrapper
0 2 * * * /usr/local/bin/cron-with-email.sh /path/to/daily-cve-update.sh >> /var/log/cve-updates.log 2>&1
0 3 1 * * /usr/local/bin/cron-with-email.sh /path/to/monthly-log4shell-validation.sh >> /var/log/log4shell-validation.log 2>&1
```

### Slack Notifications (Optional)

**Setup Slack Webhook**:
```bash
# Add to end of each script (before exit):

# Slack webhook URL
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Send notification
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ CVE Update Complete: $NEW_CVES new CVEs added\"}" \
  "$SLACK_WEBHOOK"
```

---

## Maintenance

### Weekly Tasks
- [ ] Check both cron job logs for errors
- [ ] Verify CVE count is increasing
- [ ] Monitor disk space usage

### Monthly Tasks
- [ ] Review PostgreSQL database size
- [ ] Clean up old log files (> 30 days)
- [ ] Verify monthly validation passed
- [ ] Check for failed daily updates

### Quarterly Tasks
- [ ] Update JDBC driver (if new version available)
- [ ] Update Dependency-Check Docker image
- [ ] Review and optimize cron schedules
- [ ] Test backup/restore procedures

### Cleanup Old Logs

```bash
# Add to crontab (weekly cleanup - Sundays at 4 AM)
0 4 * * 0 find /var/log/dependency-check -name "*.log" -mtime +30 -delete

# Manual cleanup
find /var/log/dependency-check -name "*.log" -mtime +30 -ls
find /var/log/dependency-check -name "*.log" -mtime +30 -delete
```

---

## Security Considerations

### PostgreSQL Passwords

**Best Practice**: Use environment variables or property files instead of hardcoded passwords

```bash
# Create properties file (restricted permissions)
cat > /home/ubuntu/.depcheck.properties <<EOF
data.connection_string=jdbc:postgresql://127.0.0.1:5432/depcheck
data.user=depcheck_admin
data.password=depcheck_admin_2025
EOF

chmod 600 /home/ubuntu/.depcheck.properties

# Update scripts to use properties file
dependency-check \
  --updateonly \
  --propertyfile /home/ubuntu/.depcheck.properties
```

### NVD API Key Protection

```bash
# Store in .env file (not in cron directly)
echo "NVD_API_KEY=your-key-here" > /path/to/.env
chmod 600 /path/to/.env

# Scripts already load from .env:
export $(grep "^NVD_API_KEY=" "$SCRIPT_DIR/../../../.env" | xargs)
```

---

## Integration with V9ToolOrchestrator

### Pre-Analysis Check (Future Enhancement)

```typescript
// Before running Java analysis
async function ensureCVEDatabaseCurrent(): Promise<void> {
  const lastUpdateTime = await getLastCVEUpdateTime();
  const hoursSinceUpdate = (Date.now() - lastUpdateTime) / (1000 * 60 * 60);

  if (hoursSinceUpdate > 24) {
    console.log('⚠️  CVE database outdated, triggering update...');
    await runCVEUpdate();
  } else {
    console.log(`✅ CVE database current (updated ${hoursSinceUpdate.toFixed(1)}h ago)`);
  }
}

// Before analysis
await ensureCVEDatabaseCurrent();
await runDependencyCheckAnalysis();
```

---

## Quick Reference

### Cron Syntax
```
* * * * * command
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, Sunday = 0 or 7)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

### Common Schedules
```bash
# Daily at 2 AM
0 2 * * *

# Monthly on 1st at 3 AM
0 3 1 * *

# Twice daily (2 AM and 2 PM)
0 2,14 * * *

# Every 6 hours
0 */6 * * *

# Weekly on Sundays
0 2 * * 0

# Weekdays only
0 2 * * 1-5
```

### Quick Commands
```bash
# Edit crontab
crontab -e

# List crontab
crontab -l

# Remove all cron jobs
crontab -r

# Test script
./script.sh

# Check logs
tail -f /var/log/cve-updates.log
tail -f /var/log/log4shell-validation.log

# Check CVE count
PGPASSWORD="..." psql -h 127.0.0.1 -U ... -d depcheck -c "SELECT COUNT(*) FROM vulnerability;"
```

---

## Next Steps

1. ✅ Install both scripts on target system
2. ✅ Test both scripts manually
3. ✅ Configure cron jobs with desired schedules
4. ✅ Monitor first automated runs
5. ⏭️ Setup email/Slack notifications (optional)
6. ⏭️ Integrate with V9ToolOrchestrator
7. ⏭️ Configure log cleanup automation

---

**Status**: ✅ **PRODUCTION READY**

Both cron jobs tested and documented. Ready for deployment.

**Last Updated**: October 2, 2025
**Version**: 1.0.0
