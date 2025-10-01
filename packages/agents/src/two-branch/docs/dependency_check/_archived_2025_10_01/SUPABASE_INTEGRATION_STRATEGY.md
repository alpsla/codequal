# Dependency-Check Supabase Integration Strategy

**Date**: 2025-10-01
**Status**: Design Phase
**Replaces**: Standalone PostgreSQL approach

---

## 🎯 Architecture Decision

**OLD APPROACH** ❌:
- Separate PostgreSQL container on Oracle Cloud
- New cron job management
- Additional infrastructure to maintain
- Separate backup/monitoring

**NEW APPROACH** ✅:
- Leverage existing Supabase database
- Reuse existing EnhancedSchedulerService
- Cloud-native, managed solution
- Unified monitoring and backups

---

## 📊 Supabase Table Schema

### Table: `cve_database`

```sql
-- CVE vulnerability cache table
CREATE TABLE cve_database (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- CVE Identity
  cve_id VARCHAR(20) NOT NULL UNIQUE,  -- CVE-2023-12345

  -- Severity
  cvss_v3_score DECIMAL(3,1),          -- 9.8
  cvss_v3_vector TEXT,                 -- CVSS:3.1/AV:N/AC:L/...
  cvss_v2_score DECIMAL(3,1),          -- 7.5
  severity VARCHAR(20),                -- CRITICAL, HIGH, MEDIUM, LOW

  -- Classification
  cwe_id VARCHAR(20),                  -- CWE-79
  description TEXT NOT NULL,

  -- Affected Software (CPE)
  cpe_entries JSONB,                   -- Array of CPE identifiers

  -- References
  references JSONB,                    -- Array of URLs

  -- Metadata
  published_date TIMESTAMP,
  last_modified_date TIMESTAMP,

  -- Cache Management
  cached_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexing
  CONSTRAINT cve_id_format CHECK (cve_id ~ '^CVE-\d{4}-\d{4,}$')
);

-- Indexes for performance
CREATE INDEX idx_cve_id ON cve_database(cve_id);
CREATE INDEX idx_severity ON cve_database(severity);
CREATE INDEX idx_cvss_score ON cve_database(cvss_v3_score DESC);
CREATE INDEX idx_cpe_entries ON cve_database USING GIN (cpe_entries);
CREATE INDEX idx_published_date ON cve_database(published_date DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_cve_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cve_updated_at_trigger
BEFORE UPDATE ON cve_database
FOR EACH ROW
EXECUTE FUNCTION update_cve_updated_at();
```

### Table: `cve_update_log`

```sql
-- Track NVD database update history
CREATE TABLE cve_update_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Update Details
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL,  -- SUCCESS, FAILED, IN_PROGRESS

  -- Metrics
  cves_added INTEGER DEFAULT 0,
  cves_updated INTEGER DEFAULT 0,
  cves_total INTEGER DEFAULT 0,
  duration_seconds INTEGER,

  -- NVD API Info
  nvd_last_modified_date TIMESTAMP,
  api_requests_made INTEGER,

  -- Error Tracking
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  triggered_by VARCHAR(50),     -- SCHEDULER, MANUAL, API
  server_info JSONB
);

CREATE INDEX idx_update_status ON cve_update_log(status);
CREATE INDEX idx_update_started ON cve_update_log(started_at DESC);
```

---

## 🔧 Integration with EnhancedSchedulerService

### Step 1: Add CVE Update Task

```typescript
// packages/agents/src/two-branch/scheduler/tasks/cve-update-task.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CVEUpdateTask {
  private supabase: SupabaseClient;
  private nvdApiKey: string;

  constructor(supabase: SupabaseClient, nvdApiKey: string) {
    this.supabase = supabase;
    this.nvdApiKey = nvdApiKey;
  }

  async execute(): Promise<void> {
    const updateId = await this.startUpdateLog();

    try {
      // Download NVD data to temp file
      const tempFile = `/tmp/nvd-update-${Date.now()}.json`;

      await execAsync(`
        docker run --rm \
          -v /tmp:/tmp \
          -e NVD_API_KEY=${this.nvdApiKey} \
          analyzer:lang-java-v5.3-arm \
          /opt/dependency-check/bin/dependency-check.sh \
          --updateonly \
          --format JSON \
          --out ${tempFile} \
          --nvdApiKey ${this.nvdApiKey}
      `);

      // Parse and upload to Supabase
      const nvdData = JSON.parse(await fs.readFile(tempFile, 'utf-8'));
      const metrics = await this.uploadToSupabase(nvdData);

      await this.completeUpdateLog(updateId, 'SUCCESS', metrics);

    } catch (error: any) {
      await this.completeUpdateLog(updateId, 'FAILED', null, error);
      throw error;
    }
  }

  private async uploadToSupabase(nvdData: any): Promise<UpdateMetrics> {
    const cves = this.parseNVDData(nvdData);

    let added = 0;
    let updated = 0;

    // Batch upsert (Supabase handles conflicts)
    const batchSize = 1000;
    for (let i = 0; i < cves.length; i += batchSize) {
      const batch = cves.slice(i, i + batchSize);

      const { data, error } = await this.supabase
        .from('cve_database')
        .upsert(batch, { onConflict: 'cve_id' });

      if (error) throw error;

      // Track metrics (simplified - actual logic would count inserts vs updates)
      added += batch.length;
    }

    return {
      cves_added: added,
      cves_updated: updated,
      cves_total: cves.length
    };
  }

  private parseNVDData(nvdData: any): CVERecord[] {
    // Transform NVD JSON to our schema
    return nvdData.CVE_Items?.map((item: any) => ({
      cve_id: item.cve.CVE_data_meta.ID,
      cvss_v3_score: item.impact?.baseMetricV3?.cvssV3?.baseScore,
      cvss_v3_vector: item.impact?.baseMetricV3?.cvssV3?.vectorString,
      cvss_v2_score: item.impact?.baseMetricV2?.cvssV2?.baseScore,
      severity: this.mapSeverity(item.impact?.baseMetricV3?.cvssV3?.baseSeverity),
      cwe_id: item.cve?.problemtype?.problemtype_data?.[0]?.description?.[0]?.value,
      description: item.cve?.description?.description_data?.[0]?.value,
      cpe_entries: item.configurations?.nodes?.flatMap((n: any) =>
        n.cpe_match?.map((c: any) => c.cpe23Uri)
      ),
      references: item.cve?.references?.reference_data?.map((r: any) => r.url),
      published_date: item.publishedDate,
      last_modified_date: item.lastModifiedDate
    })) || [];
  }

  private async startUpdateLog(): Promise<string> {
    const { data, error } = await this.supabase
      .from('cve_update_log')
      .insert({
        started_at: new Date(),
        status: 'IN_PROGRESS',
        triggered_by: 'SCHEDULER'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async completeUpdateLog(
    updateId: string,
    status: string,
    metrics: UpdateMetrics | null,
    error?: Error
  ): Promise<void> {
    await this.supabase
      .from('cve_update_log')
      .update({
        completed_at: new Date(),
        status,
        ...metrics,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000),
        error_message: error?.message,
        error_details: error ? { stack: error.stack } : null
      })
      .eq('id', updateId);
  }
}
```

### Step 2: Register Task in EnhancedSchedulerService

```typescript
// packages/agents/src/two-branch/scheduler/enhanced-scheduler-service.ts

import { CVEUpdateTask } from './tasks/cve-update-task';

class EnhancedSchedulerService {
  // ... existing code ...

  registerDefaultTasks(): void {
    // Existing tasks
    this.scheduleTask({
      name: 'quarterly-model-research',
      schedule: '0 0 1 */3 *', // Every 3 months
      task: async () => this.runQuarterlyModelResearch()
    });

    this.scheduleTask({
      name: 'weekly-freshness-check',
      schedule: '0 8 * * 1', // Every Monday 8 AM
      task: async () => this.runWeeklyFreshnessCheck()
    });

    // NEW: Daily CVE database update
    this.scheduleTask({
      name: 'daily-cve-update',
      schedule: '0 2 * * *', // Daily at 2 AM
      task: async () => this.runDailyCVEUpdate()
    });
  }

  private async runDailyCVEUpdate(): Promise<void> {
    logger.info('🔒 Starting daily CVE database update...');

    const cveTask = new CVEUpdateTask(
      this.supabase,
      process.env.NVD_API_KEY!
    );

    try {
      await cveTask.execute();
      logger.info('✅ CVE database update completed');
    } catch (error: any) {
      logger.error('❌ CVE database update failed:', error);
      // Send alert (already have monitoring infrastructure)
      throw error;
    }
  }
}
```

---

## 🚀 Analysis-Time Integration

### Query Supabase Instead of Local Database

```typescript
// packages/agents/src/two-branch/tools/java/dependency-check-supabase.ts

export class DependencyCheckSupabaseService {
  private supabase: SupabaseClient;

  async checkDependencyVulnerabilities(
    dependencies: Dependency[]
  ): Promise<CVEMatch[]> {
    const matches: CVEMatch[] = [];

    for (const dep of dependencies) {
      // Convert dependency to CPE
      const cpe = this.toCPE(dep);

      // Query Supabase CVE cache
      const { data: cves, error } = await this.supabase
        .from('cve_database')
        .select('*')
        .contains('cpe_entries', [cpe])
        .gte('cvss_v3_score', 0);

      if (error) throw error;

      matches.push(...cves.map(cve => ({
        dependency: dep,
        cve: cve,
        severity: cve.severity,
        score: cve.cvss_v3_score
      })));
    }

    return matches;
  }

  private toCPE(dep: Dependency): string {
    // Convert Maven/Gradle dependency to CPE format
    // Example: com.fasterxml.jackson.core:jackson-databind:2.12.3
    // → cpe:2.3:a:fasterxml:jackson-databind:2.12.3:*:*:*:*:*:*:*
    return `cpe:2.3:a:${dep.group}:${dep.name}:${dep.version}:*:*:*:*:*:*:*`;
  }
}
```

---

## 📊 Benefits of This Approach

### 1. **Unified Infrastructure**
- ✅ Everything in Supabase (models, CVEs, monitoring)
- ✅ Single backup strategy
- ✅ Single monitoring dashboard

### 2. **Reuse Existing Components**
- ✅ EnhancedSchedulerService (already handles cron)
- ✅ Supabase client (already configured)
- ✅ Monitoring infrastructure (already in place)

### 3. **Cloud-Native Benefits**
- ✅ Automatic backups (Supabase handles)
- ✅ Automatic scaling (Supabase handles)
- ✅ Global CDN (faster queries)
- ✅ Point-in-time recovery

### 4. **Cost Optimization**
- ✅ No separate PostgreSQL instance
- ✅ Already paying for Supabase
- ✅ CVE data ~3GB ≈ negligible in Supabase pricing

### 5. **Operational Simplicity**
- ✅ No container management for database
- ✅ No separate backup scripts
- ✅ No manual database maintenance

---

## ⚙️ Migration Plan

### Phase 1: Schema Setup (15 min)
```bash
# Run SQL migrations in Supabase dashboard
# Create cve_database and cve_update_log tables
```

### Phase 2: Initial Data Load (15 min)
```bash
# One-time NVD data download and upload to Supabase
npx ts-node src/two-branch/scripts/initial-cve-load.ts
```

### Phase 3: Scheduler Integration (30 min)
```bash
# Add CVE update task to EnhancedSchedulerService
# Test daily update job
```

### Phase 4: Analysis Integration (1 hour)
```bash
# Update JavaToolOrchestrator to query Supabase
# Test with Apache Kafka
```

**Total Time**: ~2.5 hours

---

## 🔒 Security Considerations

1. **API Key Storage**: Already handled (`.env` file)
2. **Supabase RLS**: Enable Row Level Security
3. **Rate Limiting**: NVD API already rate-limited (100 req/30s with key)
4. **Data Validation**: Schema constraints ensure data integrity

---

## 📈 Performance Expectations

### Initial Load
- **Time**: 15-20 minutes (one-time)
- **Data**: ~312,000 CVEs (~3GB)
- **Supabase**: Can handle easily

### Daily Updates
- **Time**: 30-60 seconds
- **Data**: Delta only (few MB)
- **Impact**: Negligible

### Analysis Queries
- **Time**: < 100ms per dependency
- **Typical Project**: 50-200 dependencies = 5-20 seconds total
- **vs H2 Local**: Comparable speed (network latency offset by indexing)

---

## ✅ Next Steps

1. **Create Supabase tables** (use SQL above)
2. **Test Supabase connectivity from Oracle Cloud** ✓ (already verified)
3. **Implement CVEUpdateTask**
4. **Add to EnhancedSchedulerService**
5. **Create initial data load script**
6. **Update JavaToolOrchestrator**
7. **Test end-to-end**

---

**This approach is simpler, cheaper, and leverages your existing infrastructure perfectly!**
