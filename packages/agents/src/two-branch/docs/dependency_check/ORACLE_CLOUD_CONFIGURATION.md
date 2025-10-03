# Oracle Cloud Environment Configuration

**Last Updated**: October 3, 2025
**Status**: ✅ PRODUCTION READY

## Overview

Automatic environment configuration for all Oracle Cloud testing, ensuring consistent PostgreSQL credentials across all languages and test scenarios.

## Configuration Files

### 1. `/home/opc/codequal/.env.oracle`
**Primary configuration file** loaded automatically for all tests.

```bash
# Oracle Cloud PostgreSQL Configuration
ORACLE_DEPCHECK_DB_URL=jdbc:postgresql://localhost:5432/depcheck
ORACLE_DEPCHECK_DB_USER=depcheck_scanner
ORACLE_DEPCHECK_DB_PASSWORD=postgres123
ORACLE_DEPCHECK_JDBC_DRIVER=/tmp/jdbc-drivers/postgresql-42.7.1.jar
```

**Permissions**: `600` (read-only by owner)
**Location**: `/home/opc/codequal/.env.oracle`

### 2. `/home/opc/codequal/scripts/load-oracle-env.sh`
**Auto-loader script** sourced by all test scripts.

```bash
#!/bin/bash
# Auto-load Oracle Cloud environment configuration
# Usage: source /home/opc/codequal/scripts/load-oracle-env.sh

ENV_FILE="/home/opc/codequal/.env.oracle"

if [ -f "$ENV_FILE" ]; then
  export $(cat "$ENV_FILE" | grep -v "^#" | xargs)
  echo "✅ Oracle Cloud environment loaded"
else
  echo "⚠️  Warning: $ENV_FILE not found"
fi
```

### 3. `~/.bashrc` Integration
**Automatic loading** for all SSH sessions.

```bash
# Auto-load Oracle Cloud CodeQual environment
if [ -f /home/opc/codequal/scripts/load-oracle-env.sh ]; then
    source /home/opc/codequal/scripts/load-oracle-env.sh
fi
```

## Usage

### Automatic (Recommended)
Configuration is loaded automatically when:
1. SSH session starts (via `~/.bashrc`)
2. Validation scripts run (via `source` command)
3. Tests execute (environment variables already set)

**No manual configuration needed!**

### Manual Override
Override specific values when needed:

```bash
# Override database name for testing
export ORACLE_DEPCHECK_DB_URL=jdbc:postgresql://localhost:5432/test_db

# Run test with override
npx ts-node src/two-branch/tests/__tests__/test-*.ts
```

## PostgreSQL Configuration

### Database Details
- **Host**: `localhost` (127.0.0.1)
- **Port**: `5432`
- **Database**: `depcheck`
- **User**: `depcheck_scanner` (read-only)
- **Password**: `postgres123`
- **CVEs**: 208,740+ (updated daily at 2 AM UTC)

### Connection String Format
```
jdbc:postgresql://localhost:5432/depcheck
```

**Why localhost?**
- PostgreSQL listens only on `127.0.0.1`
- Docker containers use `--network host` to access localhost
- External IP (129.213.49.128) is not accessible from containers

## Verification

### Test Configuration Loading
```bash
# SSH to Oracle Cloud
ssh -i <key> opc@129.213.49.128

# Verify environment variables are set
echo $ORACLE_DEPCHECK_DB_URL
echo $ORACLE_DEPCHECK_DB_USER

# Test database connection
PGPASSWORD=$ORACLE_DEPCHECK_DB_PASSWORD psql \
  -h 127.0.0.1 -p 5432 \
  -U $ORACLE_DEPCHECK_DB_USER \
  -d depcheck \
  -c "SELECT COUNT(*) FROM vulnerability LIMIT 1"
```

Expected output:
```
total_cves
------------
     208740
(1 row)
```

## Language Support

This configuration works for **ALL languages**:
- ✅ Java (Dependency-Check)
- ✅ Python (Safety, pip-audit)
- ✅ JavaScript (npm audit, Snyk)
- ✅ Rust (cargo-audit)
- ✅ Go (govulncheck)

All tools that need CVE scanning can use these environment variables.

## Troubleshooting

### Issue: Environment not loaded
**Symptoms**: Tests fail with PostgreSQL connection errors

**Solution**:
```bash
# Manually load environment
source /home/opc/codequal/scripts/load-oracle-env.sh

# Verify
echo $ORACLE_DEPCHECK_DB_URL
```

### Issue: Wrong password
**Symptoms**: `FATAL: password authentication failed`

**Solution**:
```bash
# Reset password
sudo -u postgres psql -c "ALTER USER depcheck_scanner WITH PASSWORD 'postgres123';"

# Update .env.oracle if password changed
nano /home/opc/codequal/.env.oracle
```

### Issue: Database connection timeout
**Symptoms**: Connection hangs for 15+ seconds

**Solution**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check listening on localhost
ss -tlnp | grep 5432
```

Expected: `LISTEN 0 244 127.0.0.1:5432`

## Security Notes

1. **Password Security**:
   - `.env.oracle` has `600` permissions (owner read-only)
   - Not committed to git
   - Only accessible from Oracle Cloud

2. **Read-Only User**:
   - `depcheck_scanner` has SELECT-only permissions
   - Cannot modify CVE database
   - Safe for parallel testing

3. **Local Network Only**:
   - PostgreSQL only listens on localhost
   - Not exposed to internet
   - Containers access via host network

## Maintenance

### Update CVE Database
```bash
# Manual CVE update (runs daily at 2 AM UTC automatically)
/home/opc/codequal/scripts/daily-cve-update-with-validation.sh
```

### Change Password
```bash
# 1. Update PostgreSQL
sudo -u postgres psql -c "ALTER USER depcheck_scanner WITH PASSWORD 'NEW_PASSWORD';"

# 2. Update configuration
nano /home/opc/codequal/.env.oracle

# 3. Reload environment
source ~/.bashrc
```

### Add New Configuration
```bash
# Edit .env.oracle
nano /home/opc/codequal/.env.oracle

# Add new variable
echo "NEW_CONFIG_VAR=value" >> /home/opc/codequal/.env.oracle

# Reload
source /home/opc/codequal/scripts/load-oracle-env.sh
```

## Benefits

1. **Consistency**: Same config across all tests and languages
2. **Automation**: No manual setup required
3. **Security**: Credentials not hardcoded in tests
4. **Flexibility**: Easy to override for testing
5. **Maintainability**: Single source of truth
6. **Reliability**: Prevents password mismatches

## Files Created (October 3, 2025)

1. `/home/opc/codequal/.env.oracle` - Configuration file
2. `/home/opc/codequal/scripts/load-oracle-env.sh` - Auto-loader script
3. Updated: `/home/opc/codequal/scripts/oracle-5-repo-validation.sh` - Validation script
4. Updated: `~/.bashrc` - User profile

---

**Status**: ✅ Deployed and tested
**Next Action**: None required - configuration is automatic
