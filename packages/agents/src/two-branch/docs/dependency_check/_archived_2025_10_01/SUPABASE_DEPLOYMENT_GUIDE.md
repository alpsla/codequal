# Supabase-Based Dependency-Check Deployment Guide

**Date**: 2025-10-01
**Status**: Production-Ready
**Architecture**: Cloud-native, leveraging existing Supabase + EnhancedSchedulerService

---

## 🎯 Overview

This guide provides step-by-step instructions for deploying the Supabase-based Dependency-Check integration that replaces the problematic ARM64 H2 database approach with a cloud-native solution.

### What This Deployment Includes

1. **Supabase CVE Database** - PostgreSQL tables for 312,000+ CVEs
2. **Daily Update Scheduler** - Automated NVD delta updates via EnhancedSchedulerService
3. **Query Service** - Fast vulnerability lookups during Java analysis
4. **Monitoring & Logging** - Complete audit trail of updates and queries

### Why Supabase vs Standalone PostgreSQL

| Feature | Supabase (This Approach) | Standalone PostgreSQL |
|---------|-------------------------|----------------------|
| **Infrastructure** | ✅ Reuses existing | ❌ New container to manage |
| **Scheduler** | ✅ Reuses EnhancedSchedulerService | ❌ New cron setup |
| **Backups** | ✅ Automatic (Supabase handles) | ⚠️ Manual setup required |
| **Monitoring** | ✅ Unified dashboard | ⚠️ Separate monitoring |
| **Cost** | ✅ Already paying for Supabase | ⚠️ Additional resources |
| **Complexity** | ✅ Simple (2 new tables) | ⚠️ Complex (container + volumes + cron) |

---

## 📋 Prerequisites

### Required Environment Variables

Ensure these are configured in your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NVD API Configuration
NVD_API_KEY=your-nvd-api-key  # Get from: https://nvd.nist.gov/developers/request-an-api-key

# Optional: Docker Image (defaults to analyzer:lang-java-v5.3-arm)
DOCKER_IMAGE=analyzer:lang-java-v5.3-arm
```

### System Requirements

- **Network**: Internet access for NVD API (nvd.nist.gov)
- **Disk Space**: ~5GB in Supabase for CVE data
- **Memory**: 4GB RAM for initial load (NVD download)
- **Docker**: For running Dependency-Check update container

### Supabase Project Setup

1. **Verify Supabase Connection**:
   ```bash
   curl -I https://your-project.supabase.co
   # Should return: HTTP/2 404 (expected - needs auth)
   ```

2. **Verify Service Role Key**:
   - Go to: Supabase Dashboard → Project Settings → API
   - Copy `service_role` key (NOT `anon` key)
   - This key has full database access

---

## 🚀 Deployment Steps

### Phase 1: Database Schema Setup (5 minutes)

1. **Navigate to Supabase SQL Editor**:
   - Open Supabase Dashboard
   - Go to: SQL Editor → New Query

2. **Run Migration Script**:
   ```bash
   # Copy the entire contents of:
   cat packages/agents/src/two-branch/scheduler/migrations/001_create_cve_tables.sql

   # Paste into Supabase SQL Editor and execute
   ```

3. **Verify Tables Created**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('cve_database', 'cve_update_log');
   ```

   Expected output:
   ```
   table_name
   ---------------
   cve_database
   cve_update_log
   ```

4. **Verify Indexes**:
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename IN ('cve_database', 'cve_update_log')
   ORDER BY indexname;
   ```

   Expected indexes:
   - `idx_cve_id`
   - `idx_severity`
   - `idx_cvss_score`
   - `idx_cpe_entries`
   - `idx_published_date`
   - `idx_update_status`
   - `idx_update_started`

---

### Phase 2: Initial CVE Data Load (15-20 minutes)

**⚠️ IMPORTANT**: This is a **ONE-TIME** operation that downloads ~3GB of NVD data.

1. **Prepare Environment**:
   ```bash
   cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

   # Verify environment variables
   node -e "console.log('Supabase:', process.env.SUPABASE_URL); console.log('NVD Key:', process.env.NVD_API_KEY?.substring(0,8))"
   ```

2. **Run Initial Load Script**:
   ```bash
   npx ts-node src/two-branch/scripts/initial-cve-load.ts
   ```

3. **Expected Output**:
   ```
   ================================================================================
   CVE Database Initial Load Script
   ================================================================================

   [1/6] Validating environment configuration...
   ✅ Environment variables validated

   [2/6] Initializing Supabase connection...
   ✅ Supabase connection successful

   [3/6] Checking current CVE database state...
      Current CVE count: 0

   [4/6] Initializing CVE update task...
   ✅ CVE update task initialized

   [5/6] Starting NVD database download and import...

   ⏱️  Expected time: 15-20 minutes (one-time operation)
   📊 Expected data: ~312,000 CVE records (~3GB)
   🔄 Progress updates will be logged below...

   🔒 Starting CVE database update...
   📥 Downloading NVD data via Dependency-Check...
   [INFO] Checking for updates
   [INFO] NVD API has 312,129 records in this update
   [INFO] Downloaded 10,000/312,129 (3%)
   [INFO] Downloaded 20,000/312,129 (6%)
   ...
   [INFO] Downloaded 312,129/312,129 (100%)
   ✅ NVD data downloaded successfully
   📊 Parsed 312,129 CVE records
   📤 Uploading 312,129 CVE records to Supabase...
   Processing batch 1/313 (1000 records)
   Upload progress: 1%
   ...
   Upload progress: 100%
   ✅ CVE records uploaded to Supabase

   ✅ CVE database load completed successfully!
      Duration: 18 minutes

   [6/6] Verifying final database state...
      Total CVE records: 312,129
      Records added/updated: 312,129

      Most recent CVEs:
         1. CVE-2025-12345 - CRITICAL (CVSS: 9.8)
         2. CVE-2025-12344 - HIGH (CVSS: 7.5)
         3. CVE-2025-12343 - MEDIUM (CVSS: 5.3)
         4. CVE-2025-12342 - HIGH (CVSS: 8.1)
         5. CVE-2025-12341 - LOW (CVSS: 3.7)

      Latest update log:
         Status: SUCCESS
         CVEs added: 312129
         CVEs updated: 0
         Duration: 1080s

   ================================================================================
   ✅ INITIAL CVE LOAD COMPLETE
   ================================================================================
   ```

4. **Verify in Supabase Dashboard**:
   ```sql
   -- Check total count
   SELECT COUNT(*) FROM cve_database;
   -- Expected: ~312,000

   -- Check severity distribution
   SELECT severity, COUNT(*) as count
   FROM cve_database
   GROUP BY severity
   ORDER BY count DESC;

   -- Check recent critical CVEs
   SELECT cve_id, severity, cvss_v3_score, description
   FROM cve_database
   WHERE severity = 'CRITICAL'
   ORDER BY published_date DESC
   LIMIT 10;
   ```

---

### Phase 3: Enable Daily Updates (2 minutes)

The daily update scheduler is **automatically enabled** when EnhancedSchedulerService initializes (if `NVD_API_KEY` is configured).

1. **Verify Scheduler Configuration**:
   ```typescript
   // File: packages/agents/src/two-branch/scheduler/enhanced-scheduler-service.ts

   // Ensure this task is registered (lines 115-123):
   if (this.cveUpdateTask) {
     this.scheduleTask({
       id: 'daily-cve-update',
       name: 'Daily NVD CVE Database Update',
       schedule: '0 2 * * *', // At 02:00 every day
       status: 'active'
     });
   }
   ```

2. **Test Manual Update** (Optional):
   ```bash
   # Re-run the initial load script (will perform delta update only)
   npx ts-node src/two-branch/scripts/initial-cve-load.ts

   # Expected duration: 30-60 seconds (vs 15-20 minutes initial)
   # Expected changes: Only new/modified CVEs since last update
   ```

3. **Verify Update Log**:
   ```sql
   SELECT
     started_at,
     completed_at,
     status,
     cves_added,
     cves_updated,
     duration_seconds
   FROM cve_update_log
   ORDER BY started_at DESC
   LIMIT 5;
   ```

---

### Phase 4: Integration Testing (10 minutes)

1. **Test CVE Query Service**:
   ```typescript
   // Test file: packages/agents/src/two-branch/tools/java/test-supabase-cve-service.ts

   import { createClient } from '@supabase/supabase-js';
   import { DependencyCheckSupabaseService } from './dependency-check-supabase-service';

   const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );

   const service = new DependencyCheckSupabaseService(supabase);

   // Test 1: Check statistics
   const stats = await service.getStatistics();
   console.log('CVE Database Statistics:', stats);
   // Expected: { totalCVEs: ~312000, criticalCount: ~15000, ... }

   // Test 2: Query specific CVE
   const cve = await service.getCVEById('CVE-2023-40010');
   console.log('CVE-2023-40010:', cve);

   // Test 3: Check dependencies
   const testDeps = [
     { group: 'com.fasterxml.jackson.core', artifact: 'jackson-databind', version: '2.9.0' },
     { group: 'org.springframework', artifact: 'spring-core', version: '5.0.0' }
   ];

   const matches = await service.checkDependencies(testDeps);
   console.log(`Found ${matches.length} vulnerabilities`);
   matches.forEach(m => {
     console.log(`  - ${m.cve.cve_id}: ${m.cve.severity} (${m.cve.cvss_v3_score})`);
   });
   ```

2. **Run Test**:
   ```bash
   npx ts-node src/two-branch/tools/java/test-supabase-cve-service.ts
   ```

3. **Expected Output**:
   ```
   CVE Database Statistics: {
     totalCVEs: 312129,
     criticalCount: 14523,
     highCount: 58391,
     mediumCount: 145678,
     lowCount: 93537,
     lastUpdate: '2025-10-01T02:15:33.000Z'
   }

   CVE-2023-40010: {
     cve_id: 'CVE-2023-40010',
     severity: 'HIGH',
     cvss_v3_score: 7.5,
     description: 'Vulnerability in jackson-databind...',
     ...
   }

   Found 12 vulnerabilities
     - CVE-2019-12814: HIGH (7.5)
     - CVE-2019-14379: HIGH (7.5)
     - CVE-2020-36518: HIGH (7.5)
     ...
   ```

---

## 📊 Monitoring & Maintenance

### Daily Update Monitoring

1. **Check Last Update Status**:
   ```sql
   SELECT
     started_at,
     status,
     cves_added,
     cves_updated,
     duration_seconds,
     error_message
   FROM cve_update_log
   WHERE DATE(started_at) = CURRENT_DATE;
   ```

2. **View Update History**:
   ```sql
   SELECT
     DATE(started_at) as update_date,
     COUNT(*) as total_updates,
     COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful,
     COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
     AVG(duration_seconds) FILTER (WHERE status = 'SUCCESS') as avg_duration
   FROM cve_update_log
   WHERE started_at >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(started_at)
   ORDER BY update_date DESC;
   ```

### Performance Metrics

**Expected Performance**:
- Initial load: 15-20 minutes (one-time)
- Daily updates: 30-60 seconds
- Vulnerability queries: <100ms per dependency
- Typical project (200 deps): 5-20 seconds total

**Query Performance**:
```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'cve_database'
ORDER BY idx_scan DESC;
```

### Database Size

```sql
-- Check table sizes
SELECT
  pg_size_pretty(pg_total_relation_size('cve_database')) as cve_db_size,
  pg_size_pretty(pg_total_relation_size('cve_update_log')) as log_size;

-- Expected: cve_database ~3-4GB, cve_update_log < 1MB
```

---

## 🔧 Troubleshooting

### Issue: Initial Load Fails with "Failed to download NVD data"

**Symptoms**:
```
❌ CVE database load failed: Failed to download NVD data: Command failed
```

**Solutions**:
1. **Check NVD API Key**:
   ```bash
   echo $NVD_API_KEY
   # Should output your 36-character API key
   ```

2. **Verify Docker Image**:
   ```bash
   docker images | grep analyzer
   # Should show: analyzer:lang-java-v5.3-arm
   ```

3. **Check Internet Connection**:
   ```bash
   curl -I https://services.nvd.nist.gov/
   # Should return: HTTP/2 200
   ```

4. **Increase Timeout** (if on slow connection):
   ```typescript
   // In cve-update-task.ts, line 163:
   const { stdout, stderr } = await execAsync(command, {
     timeout: 60 * 60 * 1000, // Increase to 60 minutes
   });
   ```

---

### Issue: "Connection pool failed" or ARM64 Errors

**Symptoms**:
```
org.h2.jdbc.JdbcSQLNonTransientException: General error
Cannot invoke "String.equals(Object)" because "<local2>[0]" is null
```

**Root Cause**: Using H2 database instead of Supabase

**Solution**: Ensure you're running the Supabase version:
```bash
# Verify you're using the right script
head -5 src/two-branch/scripts/initial-cve-load.ts
# Should mention Supabase, NOT H2
```

---

### Issue: "Supabase connection failed"

**Symptoms**:
```
❌ Failed to connect to Supabase: relation "cve_database" does not exist
```

**Solutions**:
1. **Run migration script** (Phase 1):
   - Go to Supabase SQL Editor
   - Execute `001_create_cve_tables.sql`

2. **Verify tables exist**:
   ```sql
   \dt cve_*
   ```

3. **Check service role key**:
   - Ensure using `service_role` key, NOT `anon` key
   - `anon` key has Row Level Security restrictions

---

### Issue: Daily Updates Not Running

**Symptoms**:
- No new entries in `cve_update_log`
- `lastUpdate` timestamp is old

**Solutions**:
1. **Check EnhancedSchedulerService is running**:
   ```typescript
   // Verify service is initialized
   import { enhancedScheduler } from './scheduler/enhanced-scheduler-service';
   enhancedScheduler.start();
   ```

2. **Check NVD_API_KEY is configured**:
   ```bash
   node -e "console.log('NVD_API_KEY:', process.env.NVD_API_KEY ? 'Configured' : 'Missing')"
   ```

3. **Manually trigger update**:
   ```bash
   npx ts-node src/two-branch/scripts/initial-cve-load.ts
   ```

4. **Check cron schedule**:
   ```typescript
   // Should be: '0 2 * * *' (daily at 2 AM)
   // Timezone: America/New_York
   ```

---

## 📈 Performance Optimization

### Index Optimization

If queries are slow (>1 second per dependency):

```sql
-- Rebuild indexes
REINDEX TABLE cve_database;

-- Analyze table for query planner
ANALYZE cve_database;

-- Check for missing indexes
SELECT * FROM pg_stat_user_tables WHERE tablename = 'cve_database';
```

### Query Optimization

```sql
-- Identify slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%cve_database%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🚀 Production Deployment Checklist

### Pre-Deployment

- [ ] Supabase connection tested and verified
- [ ] NVD API key obtained and configured
- [ ] Docker image `analyzer:lang-java-v5.3-arm` available
- [ ] `.env` file configured with all required variables
- [ ] Migration script executed successfully
- [ ] Initial CVE load completed (312,000+ records)

### Post-Deployment

- [ ] Verify daily updates are scheduled
- [ ] Test manual update (should complete in <60 seconds)
- [ ] Run integration tests with DependencyCheckSupabaseService
- [ ] Monitor first automated update (check logs)
- [ ] Set up alerts for failed updates
- [ ] Document any environment-specific configuration

### Ongoing Maintenance

- [ ] Weekly: Check update logs for failures
- [ ] Monthly: Verify CVE count is growing (new CVEs added daily)
- [ ] Quarterly: Review database size and Supabase storage limits
- [ ] Annually: Validate NVD API key is still valid

---

## 📚 Additional Resources

### Related Documentation

- [SUPABASE_INTEGRATION_STRATEGY.md](./SUPABASE_INTEGRATION_STRATEGY.md) - Architecture overview
- [DEPENDENCY_CHECK_SETUP.md](./DEPENDENCY_CHECK_SETUP.md) - General Dependency-Check guide
- [SESSION_SUMMARY_2025_09_30.md](../session_summary/SESSION_SUMMARY_2025_09_30_JAVA_BLOCKER_RESOLUTION.md) - Context and decisions

### External References

- [NVD API Documentation](https://nvd.nist.gov/developers)
- [Supabase PostgreSQL Guide](https://supabase.com/docs/guides/database)
- [OWASP Dependency-Check](https://jeremylong.github.io/DependencyCheck/)
- [CPE 2.3 Specification](https://nvd.nist.gov/products/cpe)

---

## 🎯 Success Metrics

### Immediate (Day 1)

- ✅ CVE database populated with 312,000+ records
- ✅ Daily update scheduled and configured
- ✅ Query service tested and operational

### Short-term (Week 1)

- ✅ 7 successful daily updates
- ✅ No failed update attempts
- ✅ Query performance <100ms average

### Long-term (Month 1)

- ✅ 30 successful daily updates
- ✅ Database growing (new CVEs added)
- ✅ Integration with JavaToolOrchestrator complete
- ✅ Zero ARM64 compatibility issues

---

**Deployment complete! Your Supabase-based Dependency-Check integration is now operational.**
