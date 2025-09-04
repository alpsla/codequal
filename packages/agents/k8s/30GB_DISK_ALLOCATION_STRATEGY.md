# 📦 30GB PostgreSQL Disk Space Allocation Strategy

## 🎯 Overview
Optimizing 30GB PostgreSQL storage for two-phase execution strategy with intelligent data partitioning and lifecycle management.

## 📊 Current vs Optimized Allocation

### **Current (Unoptimized)**
```
30GB PostgreSQL Disk
├── Random data growth (~15GB used)
├── No partitioning
├── No compression
└── 15GB free (wasted)
```

### **Optimized Two-Phase Allocation**
```
30GB PostgreSQL Disk
├── Phase 1: Development Data (12GB)
│   ├── Full analysis results: 8GB
│   ├── Tool outputs cache: 3GB
│   └── Development metrics: 1GB
├── Phase 2: Production Data (15GB)
│   ├── Critical results: 5GB
│   ├── Compressed archives: 4GB
│   ├── User data: 3GB
│   ├── Audit logs: 2GB
│   └── Indexes: 1GB
└── Reserved/Buffer (3GB)
```

## 🏗️ Database Schema Design

### **1. Partitioned Tables Structure**

```sql
-- Create main schema
CREATE SCHEMA IF NOT EXISTS analysis;
CREATE SCHEMA IF NOT EXISTS cache;
CREATE SCHEMA IF NOT EXISTS metrics;

-- Enable compression
ALTER DATABASE codequal SET default_toast_compression = 'lz4';

-- ============================================
-- PHASE 1: Development Tables (12GB)
-- ============================================

-- Full analysis results with all 85 tools
CREATE TABLE analysis.dev_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL,
    pr_number INTEGER,
    analysis_date TIMESTAMP DEFAULT NOW(),
    language VARCHAR(50),
    tool_name VARCHAR(100),
    tool_version VARCHAR(50),
    result_data JSONB COMPRESSED,
    file_path TEXT,
    severity VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (analysis_date);

-- Create monthly partitions for dev results
CREATE TABLE analysis.dev_results_2025_01 PARTITION OF analysis.dev_results
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE analysis.dev_results_2025_02 PARTITION OF analysis.dev_results
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... continue for each month

-- Tool outputs cache (3GB)
CREATE TABLE cache.tool_outputs (
    cache_key VARCHAR(255) PRIMARY KEY,
    tool_name VARCHAR(100),
    project_hash VARCHAR(64),
    output_data BYTEA COMPRESSED, -- Binary compressed data
    metadata JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
) WITH (fillfactor = 90); -- Optimize for updates

-- Create index for cache lookups
CREATE INDEX idx_cache_expires ON cache.tool_outputs(expires_at)
    WHERE expires_at IS NOT NULL;
CREATE INDEX idx_cache_tool ON cache.tool_outputs(tool_name, project_hash);

-- Development metrics (1GB)
CREATE TABLE metrics.dev_performance (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    tool_name VARCHAR(100),
    execution_time_ms INTEGER,
    memory_used_mb INTEGER,
    cpu_percent DECIMAL(5,2),
    success BOOLEAN,
    error_message TEXT
) PARTITION BY RANGE (timestamp);

-- ============================================
-- PHASE 2: Production Tables (15GB)
-- ============================================

-- Critical production results (5GB)
CREATE TABLE analysis.prod_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL,
    pr_number INTEGER NOT NULL,
    analysis_date TIMESTAMP DEFAULT NOW(),
    -- Aggregated results from available tools
    critical_issues JSONB COMPRESSED,
    security_score INTEGER,
    quality_score INTEGER,
    tools_used INTEGER, -- e.g., 50 out of 85
    tools_missing INTEGER, -- e.g., 35 out of 85
    approximations JSONB, -- Which tools were approximated
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (analysis_date);

-- Compressed historical data (4GB)
CREATE TABLE analysis.archived_results (
    id UUID PRIMARY KEY,
    year_month VARCHAR(7), -- '2025-01'
    compressed_data BYTEA, -- ZSTD compressed
    record_count INTEGER,
    original_size_mb DECIMAL(10,2),
    compressed_size_mb DECIMAL(10,2),
    compression_ratio DECIMAL(5,2),
    archived_at TIMESTAMP DEFAULT NOW()
);

-- User and organization data (3GB)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    organization_id UUID,
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) NOT NULL,
    organization_id UUID,
    last_analysis TIMESTAMP,
    total_analyses INTEGER DEFAULT 0,
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs (2GB)
CREATE TABLE audit.logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id UUID,
    action VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET
) PARTITION BY RANGE (timestamp);

-- Create daily partitions for audit logs
CREATE TABLE audit.logs_2025_01_01 PARTITION OF audit.logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-01-02');
-- Auto-create daily partitions via pg_partman

-- ============================================
-- INDEXES (1GB total)
-- ============================================

-- Production critical path indexes
CREATE INDEX idx_prod_project_date ON analysis.prod_results(project_id, analysis_date DESC);
CREATE INDEX idx_prod_pr ON analysis.prod_results(pr_number, project_id);
CREATE INDEX idx_prod_scores ON analysis.prod_results(security_score, quality_score);

-- Development analysis indexes
CREATE INDEX idx_dev_project ON analysis.dev_results(project_id);
CREATE INDEX idx_dev_tool ON analysis.dev_results(tool_name);
CREATE INDEX idx_dev_severity ON analysis.dev_results(severity)
    WHERE severity IN ('critical', 'high');

-- User activity indexes
CREATE INDEX idx_user_org ON public.users(organization_id);
CREATE INDEX idx_repo_org ON public.repositories(organization_id);
CREATE INDEX idx_repo_last ON public.repositories(last_analysis);
```

## 📈 Storage Management Strategy

### **1. Data Lifecycle Policies**

```sql
-- Automated cleanup job
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete dev cache older than 7 days
    DELETE FROM cache.tool_outputs 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    -- Archive dev results older than 30 days
    INSERT INTO analysis.archived_results (
        year_month,
        compressed_data,
        record_count,
        original_size_mb,
        compressed_size_mb,
        compression_ratio
    )
    SELECT 
        TO_CHAR(analysis_date, 'YYYY-MM'),
        compress_data(jsonb_agg(row_to_json(dr))),
        COUNT(*),
        pg_column_size(jsonb_agg(row_to_json(dr))) / 1048576.0,
        pg_column_size(compress_data(jsonb_agg(row_to_json(dr)))) / 1048576.0,
        pg_column_size(jsonb_agg(row_to_json(dr)))::numeric / 
            pg_column_size(compress_data(jsonb_agg(row_to_json(dr))))::numeric
    FROM analysis.dev_results dr
    WHERE analysis_date < NOW() - INTERVAL '30 days'
    GROUP BY TO_CHAR(analysis_date, 'YYYY-MM');
    
    -- Delete archived dev results
    DELETE FROM analysis.dev_results 
    WHERE analysis_date < NOW() - INTERVAL '30 days';
    
    -- Drop old partitions
    CALL drop_old_partitions('analysis.dev_results', 90);
    CALL drop_old_partitions('audit.logs', 180);
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('cleanup-job', '0 2 * * *', 'SELECT cleanup_old_data();');
```

### **2. Compression Strategy**

```sql
-- ZSTD compression function for archival
CREATE OR REPLACE FUNCTION compress_data(data text)
RETURNS bytea AS $$
    import zstandard as zstd
    cctx = zstd.ZstdCompressor(level=3)
    return cctx.compress(data.encode('utf-8'))
$$ LANGUAGE plpython3u;

-- Enable TOAST compression for JSONB columns
ALTER TABLE analysis.dev_results ALTER COLUMN result_data SET COMPRESSION lz4;
ALTER TABLE analysis.prod_results ALTER COLUMN critical_issues SET COMPRESSION lz4;

-- Compress existing data
VACUUM FULL analysis.dev_results;
VACUUM FULL analysis.prod_results;
```

## 🔄 Data Flow Between Phases

```typescript
// src/storage/DataLifecycleManager.ts
export class DataLifecycleManager {
  private readonly storageQuotas = {
    phase1: {
      maxSize: 12 * 1024, // 12GB in MB
      tables: {
        dev_results: 8192,      // 8GB
        tool_outputs: 3072,      // 3GB
        dev_performance: 1024    // 1GB
      }
    },
    phase2: {
      maxSize: 15 * 1024, // 15GB in MB
      tables: {
        prod_results: 5120,      // 5GB
        archived_results: 4096,  // 4GB
        users: 3072,            // 3GB
        audit_logs: 2048,       // 2GB
        indexes: 1024           // 1GB
      }
    },
    buffer: 3072 // 3GB buffer
  };

  async optimizeStorage(): Promise<StorageReport> {
    // 1. Check current usage
    const usage = await this.getCurrentUsage();
    
    // 2. Identify optimization opportunities
    const optimizations = [];
    
    // Archive old dev results
    if (usage.phase1.dev_results > 6144) { // >6GB
      optimizations.push(
        this.archiveOldDevResults(30) // Archive >30 days
      );
    }
    
    // Compress production results
    if (usage.phase2.prod_results > 4096) { // >4GB
      optimizations.push(
        this.compressHistoricalData(60) // Compress >60 days
      );
    }
    
    // Clean expired cache
    if (usage.phase1.tool_outputs > 2048) { // >2GB
      optimizations.push(
        this.cleanExpiredCache()
      );
    }
    
    // Execute optimizations
    await Promise.all(optimizations);
    
    // 3. Vacuum and analyze
    await this.vacuumAnalyze();
    
    return this.generateStorageReport();
  }

  async promoteDevToProduction(analysisId: string): Promise<void> {
    // Move critical findings from dev to production
    const query = `
      WITH dev_data AS (
        SELECT 
          project_id,
          pr_number,
          jsonb_agg(
            CASE 
              WHEN severity IN ('critical', 'high') 
              THEN result_data 
            END
          ) FILTER (WHERE severity IN ('critical', 'high')) as critical_issues,
          COUNT(DISTINCT tool_name) as tools_used,
          85 - COUNT(DISTINCT tool_name) as tools_missing
        FROM analysis.dev_results
        WHERE project_id = $1
        GROUP BY project_id, pr_number
      )
      INSERT INTO analysis.prod_results (
        project_id, pr_number, critical_issues, 
        tools_used, tools_missing
      )
      SELECT * FROM dev_data
      ON CONFLICT (project_id, pr_number) 
      DO UPDATE SET
        critical_issues = EXCLUDED.critical_issues,
        tools_used = EXCLUDED.tools_used,
        analysis_date = NOW();
    `;
    
    await this.db.query(query, [analysisId]);
  }
}
```

## 📊 Monitoring & Alerts

```sql
-- Storage monitoring views
CREATE VIEW storage.usage_summary AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
    ROUND(100 * pg_total_relation_size(schemaname||'.'||tablename) / 
          (SELECT SUM(pg_total_relation_size(schemaname||'.'||tablename)) 
           FROM pg_tables)::numeric, 2) AS percentage
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Alert on high storage usage
CREATE OR REPLACE FUNCTION check_storage_alerts()
RETURNS TABLE(alert_type text, message text) AS $$
BEGIN
    -- Check if approaching 30GB limit
    IF (SELECT pg_database_size(current_database()) > 28 * 1024^3) THEN
        RETURN QUERY SELECT 'CRITICAL', 'Database size exceeds 28GB (93% full)';
    END IF;
    
    -- Check individual table sizes
    IF EXISTS (
        SELECT 1 FROM storage.usage_summary 
        WHERE tablename = 'dev_results' 
        AND pg_total_relation_size('analysis.dev_results') > 10 * 1024^3
    ) THEN
        RETURN QUERY SELECT 'WARNING', 'dev_results table exceeds 10GB';
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
```

## 🎯 Benefits of This Allocation

### **Phase 1 Benefits (Development)**
- Store complete analysis for 30-60 days
- Full tool output preservation
- Historical comparison capability
- Development metrics tracking

### **Phase 2 Benefits (Production)**
- Optimized for critical data only
- Compressed historical storage
- Efficient indexing strategy
- Audit compliance (180 days)

### **Overall Benefits**
- 30GB fully utilized (no waste)
- Automatic data lifecycle
- 10x compression for archives
- Intelligent data promotion
- Performance optimized queries

## 📈 Capacity Planning

### **Current (Month 1)**
```
Dev Data:  8GB (300 full analyses)
Prod Data: 5GB (1000 production runs)
Cache:     3GB (7-day retention)
Archive:   2GB (compressed history)
Free:      12GB
```

### **Month 6 Projection**
```
Dev Data:  10GB (rolling 30 days)
Prod Data: 8GB (6 months history)
Cache:     3GB (constant)
Archive:   6GB (6 months compressed)
Free:      3GB (buffer maintained)
```

### **Year 1 Projection**
```
Dev Data:  10GB (rolling window)
Prod Data: 10GB (critical data only)
Cache:     3GB (constant)
Archive:   7GB (12 months @ 10:1 compression)
Free:      0GB (time to upgrade!)
```

## 🚀 Implementation Steps

```bash
# 1. Create database schemas
psql -d codequal -f k8s/schema/01-create-schemas.sql

# 2. Set up partitioning
psql -d codequal -f k8s/schema/02-setup-partitions.sql

# 3. Enable compression
psql -d codequal -f k8s/schema/03-enable-compression.sql

# 4. Create indexes
psql -d codequal -f k8s/schema/04-create-indexes.sql

# 5. Set up automation
psql -d codequal -f k8s/schema/05-automation.sql

# 6. Monitor usage
watch -n 60 'psql -d codequal -c "SELECT * FROM storage.usage_summary;"'
```

This optimized 30GB allocation perfectly supports our two-phase strategy with room for growth!