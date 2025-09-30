# Dependency-Check Testing Suite

Complete testing infrastructure for OWASP Dependency-Check with NVD API v2.0.

## Overview

This directory contains comprehensive tests for Dependency-Check 11.1.0 integration, including:
- Initial database setup (one-time 3GB download)
- Incremental updates (delta downloads only)
- Performance monitoring
- Cache validation
- Production readiness verification

## Quick Start

```bash
# On Oracle Cloud server
cd /tmp
scp -i <key> test-dependency-check-*.sh opc@129.213.49.128:/tmp/

# Run complete test suite (first time: ~15 minutes)
ssh opc@129.213.49.128 "/tmp/test-dependency-check-complete.sh"

# Run quick test (cached: ~30-60 seconds)
ssh opc@129.213.49.128 "/tmp/test-dependency-check-quick.sh"
```

## Database Download Behavior

### First Run (~15 minutes)
- **What happens**: Downloads entire NVD CVE database
- **Size**: ~3GB compressed
- **Time**: 10-15 minutes (depends on network)
- **Frequency**: One-time only
- **Storage**: `/tmp/dependency-check-data/` (persistent)

### Subsequent Runs (~30-60 seconds)
- **What happens**: Downloads only **incremental updates** (delta)
- **Size**: Few MB (only new CVEs since last update)
- **Time**: 30-60 seconds
- **Frequency**: Every run (automatically checks for updates)
- **Performance**: **20-30x faster** than initial download

### Update Frequency
The NVD database is updated by NIST:
- **Daily**: New CVEs added continuously
- **Auto-check**: Dependency-Check checks for updates on every run
- **Delta download**: Only downloads changes since last update
- **No manual action**: Fully automatic

## Test Scripts

### 1. `test-dependency-check-complete.sh`
**Purpose**: Complete end-to-end test with monitoring

**What it does**:
1. Environment setup (creates directories)
2. Pre-flight checks (verifies Docker image, API key)
3. Version verification
4. **Initial database download** (3GB, ~15 minutes)
5. Database validation (size, files, integrity)
6. First analysis run (Apache Kafka: 3,472 files)
7. **Cached second run** (performance test: ~30-60s)
8. Performance comparison and metrics

**Monitoring includes**:
- Database size and file count
- Download time vs cached time
- Dependencies scanned
- Vulnerabilities found
- Performance improvement (speedup factor)

**Outputs**:
- HTML report: `dependency-check-report.html`
- JSON report: `dependency-check-report.json`
- Logs: `depcheck-initial.log`, `depcheck-cached.log`

### 2. `test-dependency-check-quick.sh`
**Purpose**: Fast validation test (assumes database already exists)

**What it does**:
1. Verifies database exists
2. Runs analysis (uses cached database)
3. Quick performance check

**Use when**:
- Database already downloaded
- Testing configuration changes
- Quick validation after updates
- CI/CD integration

### 3. `test-dependency-check-monitoring.sh`
**Purpose**: Performance monitoring and metrics collection

**What it does**:
- Runs analysis with detailed timing
- Monitors resource usage (CPU, memory, disk I/O)
- Tracks database update sizes
- Generates performance reports

### 4. `oracle-deploy-dependency-check.sh`
**Purpose**: Deploy to Oracle Cloud from local machine

**What it does**:
- Transfers test scripts to Oracle
- Sets execute permissions
- Provides ready-to-run commands

## Performance Benchmarks

### Expected Performance (Oracle A1.Flex, 4 OCPUs)

| Scenario | Time | Notes |
|----------|------|-------|
| **Initial Setup** | 10-15 min | One-time 3GB database download |
| **First Analysis** | 30-60s | With fresh database |
| **Cached Analysis** | 30-60s | Database already exists |
| **Database Update** | 5-30s | Only downloads delta (few MB) |
| **Full Re-scan** | 30-60s | Subsequent runs |

### Apache Kafka Repository (3,472 Java files)

| Metric | Value |
|--------|-------|
| Dependencies Scanned | ~200-300 |
| Vulnerabilities Found | Varies (typically 0-50) |
| Analysis Time | 30-60 seconds |
| Database Size | ~3GB (compressed) |

## Database Management

### Storage Location
```
/tmp/dependency-check-data/
├── nvd/                    # NVD CVE database
├── cache/                  # Dependency cache
└── analyzers/              # Analyzer data
```

### Backup Strategy
```bash
# Backup database (saves 15 minutes on next setup)
tar -czf dependency-check-backup.tar.gz /tmp/dependency-check-data/

# Restore database
tar -xzf dependency-check-backup.tar.gz -C /
```

### Database Updates
- **Automatic**: Checks for updates on every run
- **Manual**: Not required (handled automatically)
- **Frequency**: Daily (NIST updates NVD continuously)

## NVD API Key

### Current Key
Stored in `.env`:
```
NVD_API_KEY=1daf9d02-c365-499f-a834-ca9c1d3ae3c5
```

### Rate Limits (NVD API v2.0)
- **With API key**: 100 requests per 30 seconds
- **Without API key**: 10 requests per 30 seconds
- **Recommendation**: Always use API key for production

### Obtaining a Key
1. Visit: https://nvd.nist.gov/developers/request-an-api-key
2. Free registration (no credit card)
3. Email approval (typically within 1 hour)
4. Add to `.env` file

## Troubleshooting

### Issue: "Database download taking too long"
**Solution**:
- First download takes 10-15 minutes (normal)
- Check network speed: `curl -o /dev/null https://services.nvd.nist.gov/`
- Consider backing up database for future use

### Issue: "API rate limit exceeded"
**Solution**:
- Verify NVD_API_KEY is set correctly
- Wait 30 seconds between runs
- With API key: 100 requests/30s (should never hit limit)

### Issue: "Database not found"
**Solution**:
- Run initial setup: `test-dependency-check-complete.sh`
- Verify `/tmp/dependency-check-data/` exists
- Check Docker volume mounts

### Issue: "No vulnerabilities found"
**Expected**: Many well-maintained projects (like Kafka) have 0 vulnerabilities
- This is normal for mature projects
- Test with a project known to have CVEs
- Check JSON report for dependency count

## Integration with V9

### JavaToolOrchestrator Configuration
```typescript
dependencyCheck: {
  enabled: boolean        // Default: false (optional tool)
  nvdApiKey: string      // From env: NVD_API_KEY
  dataDir: string        // Persistent cache location
  formats: ['JSON']      // Output formats
  failOnCVSS: number     // Fail threshold (e.g., 7 = HIGH)
}
```

### V9 Pipeline Integration
```
Stage 0: Compilation (if SpotBugs enabled)
Stage 1: Semgrep (47s)
Stage 2: PMD + Checkstyle + Dependency-Check (parallel, 94s)
Stage 3: SpotBugs (4s)

Total with Dependency-Check: ~180s (3 minutes)
```

### When to Enable
✅ **Enable when**:
- Security compliance requirements (SOC 2, ISO 27001)
- Enterprise environments
- Critical infrastructure
- Regular security audits

❌ **Skip when**:
- Already using GitHub Dependabot or Snyk
- Fast CI/CD requirements (<2 min)
- No compliance requirements
- Development/testing only

## Test Results Interpretation

### Sample Output (Complete Test)
```
========================================
Dependency-Check Complete Test Suite
========================================

[1/8] Setting up environment...
  ✓ Directories created
  - Data dir: /tmp/dependency-check-data
  - Results dir: /tmp/dependency-check-results
  - Workspace: /tmp/kafka-repo

[2/8] Pre-flight checks...
  - Docker image: analyzer:lang-java-v5.3-arm
  - NVD API Key: 1daf9d02...ae3c5
  - Workspace files: 3472 Java files

[3/8] Verifying Dependency-Check version...
  Dependency-Check Core version 11.1.0

[4/8] Initial database download...
  Starting at: 2025-09-30 15:30:00
  ✓ Database download time: 847s (14m 7s)

[5/8] Validating database installation...
  - Database size: 3.2G
  - Database files: 1247
  ✓ Database validated

[6/8] Analyzing first run results...
  - Dependencies scanned: 287
  - Vulnerabilities found: 12
  ✓ Analysis complete

[7/8] Testing cached second run...
  ✓ Cached run time: 45s
  ✓ Performance improvement: 18x faster

[8/8] Test Summary
========================================
Performance:
  - Initial run (with DB download): 847s (14m 7s)
  - Cached run: 45s
  - Speedup: 18x

✓ ALL TESTS PASSED
```

## Files in This Directory

```
Dependency-check/
├── README.md                                    # This file
├── test-dependency-check-complete.sh            # Full test suite
├── test-dependency-check-quick.sh               # Quick validation
├── test-dependency-check-monitoring.sh          # Performance monitoring
├── oracle-deploy-dependency-check.sh            # Deployment script
└── PERFORMANCE_RESULTS.md                       # Test results log
```

## Next Steps

1. **First Time Setup**:
   ```bash
   ./oracle-deploy-dependency-check.sh
   ssh opc@129.213.49.128 "/tmp/test-dependency-check-complete.sh"
   ```

2. **Review Results**:
   - Check HTML report: `/tmp/dependency-check-results/dependency-check-report.html`
   - Review JSON output for V9 integration

3. **Integrate into V9**:
   - Update `JavaToolOrchestrator`
   - Add configuration schema
   - Test with real PR

4. **Production Deployment**:
   - Enable for security-critical projects
   - Set up persistent database storage
   - Configure automated backups

## References

- [OWASP Dependency-Check Documentation](https://jeremylong.github.io/DependencyCheck/)
- [NVD API Documentation](https://nvd.nist.gov/developers)
- [CVE Database](https://cve.mitre.org/)
