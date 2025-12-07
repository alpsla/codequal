# Oracle Cloud PostgreSQL Configuration for Dependency-Check

## Overview

This document preserves the PostgreSQL configuration for Dependency-Check's NVD database on Oracle Cloud. This configuration is critical for multi-language V9 analysis and will be integrated into API services.

## PostgreSQL Setup

### Database Configuration

**Server**: Oracle Cloud (129.213.49.128)
**PostgreSQL Version**: 13.22
**Service Status**: Active and running via systemd

### Database Credentials

```bash
# Database Details
POSTGRES_HOST="localhost"  # Use localhost for local connections on cloud server
POSTGRES_PORT="5432"
POSTGRES_USER="nvd_user"
POSTGRES_DB="nvd"
POSTGRES_PASSWORD="postgres123"
DATABASE_URL="postgresql://nvd_user:postgres123@localhost:5432/nvd"
```

### Initial Setup Commands

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create NVD user
CREATE USER nvd_user WITH PASSWORD 'postgres123';

# Create NVD database
CREATE DATABASE nvd OWNER nvd_user;

# Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE nvd TO nvd_user;

# Verify setup
\du nvd_user
\l nvd
```

### Connection Verification

```bash
# Test connection from cloud server
PGPASSWORD=postgres123 psql -h localhost -p 5432 -U nvd_user -d nvd -c 'SELECT current_database(), current_user;'

# Expected output:
# current_database | current_user 
#------------------+--------------
# nvd              | nvd_user
```

## Redis Configuration

### Redis Details

```bash
REDIS_HOST="10.116.0.7"
REDIS_PORT="6379"
REDIS_URL="redis://10.116.0.7:6379"
```

### Connection Verification

```bash
# Test Redis connection
redis-cli -h 10.116.0.7 -p 6379 ping

# Expected output: PONG
```

## Environment Variables for Tests

### Required Environment Variables

All test scripts and API services must export these variables:

```bash
# PostgreSQL Configuration
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"
export POSTGRES_USER="nvd_user"
export POSTGRES_DB="nvd"
export POSTGRES_PASSWORD="postgres123"
export DATABASE_URL="postgresql://nvd_user:postgres123@localhost:5432/nvd"

# Redis Configuration
export REDIS_HOST="10.116.0.7"
export REDIS_PORT="6379"
export REDIS_URL="redis://10.116.0.7:6379"
```

### Integration Points

1. **Test Scripts**: Add environment variable exports before running tests
2. **API Services**: Load from `.env` file or environment configuration
3. **Docker Containers**: Pass as environment variables in docker-compose or Kubernetes

## Dependency-Check Configuration

### NVD Database Behavior

- **Empty Database**: Dependency-Check will download NVD data on first run (~5-10 minutes)
- **Populated Database**: Dependency-Check uses existing data (fast, \u003c1 minute)
- **Database Location**: PostgreSQL on Oracle Cloud (shared across all tests/services)

### Benefits of Shared Database

1. **Performance**: No repeated downloads of NVD data
2. **Consistency**: All analyses use same vulnerability data
3. **Cost Savings**: Reduced bandwidth and time
4. **Multi-Language Support**: Works for Java, TypeScript, Python, etc.

## File Locations

### Configuration Files

```
packages/agents/
├── .env                           # Environment variables (gitignored)
├── scripts/testing/oracle/
│   ├── oracle-cleanup-and-verify.sh    # Environment cleanup and verification
│   ├── oracle-run-typescript-v9-pr69.sh # TypeScript V9 test runner
│   └── oracle-run-v9-lite-e2e.sh       # Multi-language test runner
└── tests/integration/
    ├── test-v9-typescript-lite-e2e.ts  # TypeScript-specific test
    └── test-v9-lite-e2e.ts             # Multi-language test
```

### .env File Template

Create `packages/agents/.env` with:

```bash
# PostgreSQL Configuration (Oracle Cloud)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=nvd_user
POSTGRES_DB=nvd
POSTGRES_PASSWORD=postgres123
DATABASE_URL=postgresql://nvd_user:postgres123@localhost:5432/nvd

# Redis Configuration (Oracle Cloud)
REDIS_HOST=10.116.0.7
REDIS_PORT=6379
REDIS_URL=redis://10.116.0.7:6379

# OpenRouter API (for AI enrichment)
OPENROUTER_API_KEY=your_api_key_here

# Debug Mode (disable rate limiting for tests)
DEBUG_MODE=true
```

## Maintenance Scripts

### Cleanup Script

**Location**: `packages/agents/scripts/testing/oracle/oracle-cleanup-and-verify.sh`

**Purpose**:
- Kill running test processes
- Remove old test results and temporary files
- Verify PostgreSQL and Redis connections
- Check NVD database status

**Usage**:
```bash
./packages/agents/scripts/testing/oracle/oracle-cleanup-and-verify.sh
```

### Database Verification

```bash
# Check PostgreSQL service
ssh -i "$SSH_KEY" opc@129.213.49.128 "systemctl status postgresql"

# Check database size
ssh -i "$SSH_KEY" opc@129.213.49.128 "sudo -u postgres psql -c '\\l+' | grep nvd"

# Check NVD tables
ssh -i "$SSH_KEY" opc@129.213.49.128 "PGPASSWORD=postgres123 psql -h localhost -U nvd_user -d nvd -c '\\dt'"

# Check CVE count
ssh -i "$SSH_KEY" opc@129.213.49.128 "PGPASSWORD=postgres123 psql -h localhost -U nvd_user -d nvd -c 'SELECT COUNT(*) FROM vulnerability;'"
```

## API Service Integration

### Docker Compose Example

```yaml
version: '3.8'

services:
  codequal-api:
    image: codequal/api:latest
    environment:
      # PostgreSQL Configuration
      POSTGRES_HOST: 129.213.49.128  # External access from Docker
      POSTGRES_PORT: 5432
      POSTGRES_USER: nvd_user
      POSTGRES_DB: nvd
      POSTGRES_PASSWORD: postgres123
      DATABASE_URL: postgresql://nvd_user:postgres123@129.213.49.128:5432/nvd
      
      # Redis Configuration
      REDIS_HOST: 10.116.0.7
      REDIS_PORT: 6379
      REDIS_URL: redis://10.116.0.7:6379
    networks:
      - codequal-network

networks:
  codequal-network:
    driver: bridge
```

### Kubernetes ConfigMap Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: codequal-config
data:
  POSTGRES_HOST: "129.213.49.128"
  POSTGRES_PORT: "5432"
  POSTGRES_USER: "nvd_user"
  POSTGRES_DB: "nvd"
  REDIS_HOST: "10.116.0.7"
  REDIS_PORT: "6379"

---
apiVersion: v1
kind: Secret
metadata:
  name: codequal-secrets
type: Opaque
stringData:
  POSTGRES_PASSWORD: "postgres123"
  DATABASE_URL: "postgresql://nvd_user:postgres123@129.213.49.128:5432/nvd"
  REDIS_URL: "redis://10.116.0.7:6379"
```

## Troubleshooting

### PostgreSQL Connection Issues

**Symptom**: `FATAL: password authentication failed for user "nvd_user"`

**Solutions**:
1. Verify user exists: `sudo -u postgres psql -c '\du nvd_user'`
2. Reset password: `sudo -u postgres psql -c "ALTER USER nvd_user WITH PASSWORD 'postgres123';"`
3. Check pg_hba.conf for authentication method

**Symptom**: `could not connect to server`

**Solutions**:
1. Check service status: `systemctl status postgresql`
2. Verify port is listening: `netstat -tuln | grep 5432`
3. Use `localhost` instead of external IP for local connections

### Redis Connection Issues

**Symptom**: `Could not connect to Redis`

**Solutions**:
1. Check Redis is running: `redis-cli -h 10.116.0.7 -p 6379 ping`
2. Verify network connectivity
3. Check firewall rules

### NVD Database Download

**Symptom**: Dependency-Check takes 5-10 minutes on first run

**Expected Behavior**: This is normal for first run when database is empty

**Solution**: Wait for initial download to complete. Subsequent runs will be fast.

## Security Considerations

### Production Deployment

1. **Change Default Password**: Use strong, unique password for `nvd_user`
2. **Network Security**: Restrict PostgreSQL access to trusted IPs
3. **SSL/TLS**: Enable SSL for PostgreSQL connections
4. **Secrets Management**: Use proper secrets management (Vault, AWS Secrets Manager, etc.)
5. **Firewall Rules**: Configure firewall to allow only necessary connections

### Environment Variables

- **Never commit** `.env` files to version control
- Use `.env.example` as template
- Load secrets from secure storage in production

## Backup and Recovery

### Database Backup

```bash
# Backup NVD database
pg_dump -h localhost -U nvd_user -d nvd -F c -f nvd_backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -h localhost -U nvd_user -d nvd -c nvd_backup_20250119.dump
```

### Automated Backups

Consider setting up automated daily backups:
```bash
# Add to crontab
0 2 * * * pg_dump -h localhost -U nvd_user -d nvd -F c -f /backups/nvd_$(date +\%Y\%m\%d).dump
```

## Performance Optimization

### PostgreSQL Tuning

```sql
-- Increase shared buffers for better performance
ALTER SYSTEM SET shared_buffers = '256MB';

-- Increase work memory for complex queries
ALTER SYSTEM SET work_mem = '16MB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Connection Pooling

For API services, use connection pooling (e.g., PgBouncer) to manage database connections efficiently.

## Monitoring

### Health Checks

```bash
# PostgreSQL health check
PGPASSWORD=postgres123 psql -h localhost -U nvd_user -d nvd -c 'SELECT 1;'

# Redis health check
redis-cli -h 10.116.0.7 -p 6379 ping

# Check database size
PGPASSWORD=postgres123 psql -h localhost -U nvd_user -d nvd -c "SELECT pg_size_pretty(pg_database_size('nvd'));"
```

### Logging

Monitor PostgreSQL logs:
```bash
tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

## Summary

This configuration provides:
- ✅ Shared NVD database for all languages (Java, TypeScript, Python)
- ✅ Fast Dependency-Check analysis (no repeated downloads)
- ✅ Redis caching for improved performance
- ✅ Easy integration with tests and API services
- ✅ Documented maintenance and troubleshooting procedures

**Key Files to Preserve**:
1. This configuration document
2. `.env.example` template
3. Cleanup and verification scripts
4. Test runner scripts with environment variable exports
