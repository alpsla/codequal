# Supabase Slow Query Performance Fix Guide

**Date**: June 1, 2025  
**Issue**: Multiple slow queries consuming 17.2%, 7.8%, and multiple 1-2% of total query time

## 🚨 Critical Performance Issues Identified

### 1. **Functions Query (17.2% of total time)**
- Complex CTE querying `pg_proc` for function metadata
- Called 164 times with average 178ms per call
- Total time: 29,288ms

### 2. **Timezone Names Query (7.8% of total time)**
- Simple query but called 131 times
- Average 101ms per call
- Total time: 13,241ms

### 3. **Table Metadata Queries (1-2% each)**
- Multiple variations of the same complex query
- Heavy use of JOINs and subqueries
- Each taking 1.5-2.5 seconds

## 🔧 Solution Overview

I've created a comprehensive SQL migration file that addresses these issues through:
1. Strategic index creation
2. Materialized views for frequently accessed data
3. Optimized functions for complex queries
4. Application-specific indexes

## 📋 Implementation Steps

### Step 1: Apply System-Level Fixes (Optional - Requires Superuser)

**Note**: These queries modify system catalogs and may require superuser permissions. If you can't run these, skip to Step 2.

```sql
-- Only if you have superuser access:
-- Create indexes on system tables
CREATE INDEX IF NOT EXISTS idx_pg_proc_prokind_pronamespace 
ON pg_proc(prokind, pronamespace);

CREATE INDEX IF NOT EXISTS idx_pg_class_relkind_relnamespace 
ON pg_class(relkind, relnamespace);

CREATE INDEX IF NOT EXISTS idx_pg_constraint_contype_conrelid 
ON pg_constraint(contype, conrelid);
```

### Step 2: Create Materialized View for Timezone Data

This is the most impactful fix - reduces 131 queries to 1:

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timezone_names AS
SELECT name FROM pg_timezone_names;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_timezone_names_name 
ON mv_timezone_names(name);

-- Initial refresh
REFRESH MATERIALIZED VIEW mv_timezone_names;

-- Grant permissions
GRANT SELECT ON mv_timezone_names TO authenticated;
```

### Step 3: Deploy Optimized Functions

Deploy the optimized metadata functions:

```sql
-- Run the get_table_metadata function from the migration file
-- Run the get_table_definitions function from the migration file
```

### Step 4: Create Application Indexes

These are the most important for your application performance:

```sql
-- Priority 1: Vector search indexes
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_embedding ON analysis_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_educational_patterns_embedding ON educational_patterns 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding ON knowledge_items 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);

-- Priority 2: Repository lookups
CREATE INDEX IF NOT EXISTS idx_repositories_github_id ON repositories(github_id);
CREATE INDEX IF NOT EXISTS idx_repositories_owner_name ON repositories(owner, name);

-- Priority 3: Analysis queue processing
CREATE INDEX IF NOT EXISTS idx_analysis_queue_priority ON analysis_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue(status);
```

### Step 5: Update Statistics

After creating indexes, update table statistics:

```sql
ANALYZE repositories;
ANALYZE pr_reviews;
ANALYZE analysis_queue;
ANALYZE analysis_chunks;
ANALYZE educational_patterns;
ANALYZE knowledge_items;
```

## 🚀 Deployment via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to your project: codequal-dev
   - Navigate to SQL Editor

2. **Run Migration in Parts**
   - Copy sections from `/database/migrations/fix-slow-queries.sql`
   - Run each section separately to identify any permission issues
   - Skip system table indexes if you get permission errors

3. **Priority Order**:
   1. Materialized view for timezone names (biggest impact)
   2. Application table indexes
   3. Optimized functions
   4. Statistics update

## 📊 Expected Performance Improvements

| Query Type | Current Time | Expected Time | Improvement |
|------------|--------------|---------------|-------------|
| Timezone Names | 13,241ms (131 calls) | ~50ms (1 call) | 99.6% |
| Functions Query | 178ms/call | ~30ms/call | 83% |
| Table Metadata | 2,500ms | ~500ms | 80% |
| Vector Search | Variable | 10-50ms | 50-90% |

## 🔄 Maintenance Tasks

### Daily (via Cron Job or Supabase Functions)
```sql
-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_timezone_names;
```

### Weekly
```sql
-- Update statistics on high-write tables
ANALYZE analysis_chunks;
ANALYZE chunk_relationships;
```

### Monthly
```sql
-- Reindex high-churn tables
REINDEX TABLE CONCURRENTLY analysis_chunks;
REINDEX TABLE CONCURRENTLY chunk_relationships;
```

## 🎯 Quick Win Implementation

If you can only do one thing right now:

```sql
-- This single change will eliminate 131 queries per dashboard load
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timezone_names AS
SELECT name FROM pg_timezone_names;

CREATE UNIQUE INDEX idx_mv_timezone_names_name ON mv_timezone_names(name);
REFRESH MATERIALIZED VIEW mv_timezone_names;
GRANT SELECT ON mv_timezone_names TO authenticated;

-- Then update your application to query mv_timezone_names instead of pg_timezone_names
```

## 📈 Monitoring After Implementation

1. Check query performance in Supabase Dashboard > Database > Query Performance
2. Look for reduction in:
   - Total query time
   - Number of slow queries
   - Dashboard load times

## 🔍 Next Steps

1. Apply the migration file section by section
2. Monitor performance improvements
3. Consider adding more materialized views for other frequently accessed system data
4. Set up automated maintenance tasks

---

**File Location**: `/database/migrations/fix-slow-queries.sql`
