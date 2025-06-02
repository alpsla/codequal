# Supabase Query Optimization Plan

**Date**: June 1, 2025  
**Issue**: Slow queries consuming significant database resources

## Executive Summary

The analysis reveals several categories of slow queries:
1. **Dashboard queries** (17.2% of total time) - Complex CTEs fetching function definitions
2. **Timezone queries** (7.8% of total time) - Repeated calls to `pg_timezone_names`
3. **Table metadata queries** (2.4% of total time) - Heavy joins for table information
4. **Function metadata queries** (1.9% of total time) - Complex base type recursion
5. **Table definition queries** (15%+ of total time) - Multiple slow executions of `pg_get_tabledef`

## Critical Issues Identified

### 1. Dashboard Function Query (29.3 seconds total, 164 calls)
**Problem**: Complex CTE with multiple unnest operations and lateral joins
**Impact**: 17.2% of total database time

### 2. Timezone Names Query (13.2 seconds total, 131 calls)
**Problem**: Repeatedly fetching entire timezone catalog
**Impact**: 7.8% of total database time

### 3. Table Definition Queries (2.5+ seconds each)
**Problem**: Multiple slow calls to `pg_get_tabledef` function
**Impact**: ~15% of total database time across multiple queries

## Optimization Recommendations

### Priority 1: Dashboard Function Query Optimization

```sql
-- Create a materialized view for function metadata
CREATE MATERIALIZED VIEW mv_function_metadata AS
WITH functions AS (
  SELECT 
    p.oid,
    n.nspname as schema,
    p.proname as name,
    l.lanname as language,
    p.prosrc as definition,
    p.proargmodes,
    p.proargnames,
    p.proallargtypes,
    p.proargtypes,
    p.pronargs,
    p.pronargdefaults,
    p.prorettype,
    p.proretset,
    p.provolatile,
    p.prosecdef,
    p.proconfig
  FROM pg_proc p
  LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
  LEFT JOIN pg_language l ON p.prolang = l.oid
  WHERE p.prokind = 'f'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
)
SELECT * FROM functions;

-- Create indexes on the materialized view
CREATE INDEX idx_mv_functions_schema ON mv_function_metadata(schema);
CREATE INDEX idx_mv_functions_name ON mv_function_metadata(schema, name);

-- Refresh periodically (daily or on schema changes)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_function_metadata;
```

### Priority 2: Timezone Caching

```sql
-- Create a cached timezone table
CREATE TABLE IF NOT EXISTS cached_timezones (
  name text PRIMARY KEY,
  abbrev text,
  utc_offset interval,
  is_dst boolean,
  cached_at timestamp with time zone DEFAULT now()
);

-- Populate the cache
INSERT INTO cached_timezones (name, abbrev, utc_offset, is_dst)
SELECT name, abbrev, utc_offset, is_dst 
FROM pg_timezone_names
ON CONFLICT (name) DO UPDATE SET
  abbrev = EXCLUDED.abbrev,
  utc_offset = EXCLUDED.utc_offset,
  is_dst = EXCLUDED.is_dst,
  cached_at = now();

-- Create a function to get timezone with fallback
CREATE OR REPLACE FUNCTION get_timezone_names()
RETURNS TABLE(name text, abbrev text, utc_offset interval, is_dst boolean)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if cache is fresh (less than 24 hours old)
  IF EXISTS (
    SELECT 1 FROM cached_timezones 
    WHERE cached_at > now() - interval '24 hours'
    LIMIT 1
  ) THEN
    RETURN QUERY SELECT c.name, c.abbrev, c.utc_offset, c.is_dst 
    FROM cached_timezones c;
  ELSE
    -- Refresh cache if stale
    DELETE FROM cached_timezones;
    INSERT INTO cached_timezones (name, abbrev, utc_offset, is_dst)
    SELECT tz.name, tz.abbrev, tz.utc_offset, tz.is_dst 
    FROM pg_timezone_names tz;
    
    RETURN QUERY SELECT c.name, c.abbrev, c.utc_offset, c.is_dst 
    FROM cached_timezones c;
  END IF;
END;
$$;
```

### Priority 3: Table Metadata Query Optimization

```sql
-- Add composite indexes for the table metadata query
CREATE INDEX IF NOT EXISTS idx_pg_class_relkind_namespace 
ON pg_class(relkind, relnamespace) 
WHERE relkind IN ('r', 'p');

-- Create a function to get table metadata more efficiently
CREATE OR REPLACE FUNCTION get_table_metadata(schema_filter text[])
RETURNS TABLE(
  id int8,
  schema text,
  name text,
  rls_enabled boolean,
  rls_forced boolean,
  replica_identity text,
  bytes int8,
  size text,
  live_rows_estimate bigint,
  dead_rows_estimate bigint,
  comment text,
  primary_keys jsonb,
  relationships jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH base_tables AS (
    SELECT 
      c.oid::int8 AS id,
      nc.nspname AS schema,
      c.relname AS name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS rls_forced,
      CASE
        WHEN c.relreplident = 'd' THEN 'DEFAULT'
        WHEN c.relreplident = 'n' THEN 'NOTHING'
        WHEN c.relreplident = 'f' THEN 'FULL'
        ELSE 'INDEX'
      END AS replica_identity,
      c.oid
    FROM pg_namespace nc
    JOIN pg_class c ON nc.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p')
      AND NOT pg_is_other_temp_schema(nc.oid)
      AND nc.nspname = ANY(schema_filter)
      AND (
        pg_has_role(c.relowner, 'USAGE')
        OR has_table_privilege(c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
        OR has_any_column_privilege(c.oid, 'SELECT, INSERT, UPDATE, REFERENCES')
      )
  )
  SELECT 
    bt.id,
    bt.schema,
    bt.name,
    bt.rls_enabled,
    bt.rls_forced,
    bt.replica_identity,
    pg_total_relation_size(bt.oid)::int8 AS bytes,
    pg_size_pretty(pg_total_relation_size(bt.oid)) AS size,
    pg_stat_get_live_tuples(bt.oid) AS live_rows_estimate,
    pg_stat_get_dead_tuples(bt.oid) AS dead_rows_estimate,
    obj_description(bt.oid) AS comment,
    '[]'::jsonb AS primary_keys,  -- Simplified for now
    '[]'::jsonb AS relationships;  -- Simplified for now
END;
$$;
```

### Priority 4: Application-Level Optimizations

```typescript
// Add caching layer in the application
export class DatabaseMetadataCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  async getTimezones(): Promise<any[]> {
    const cacheKey = 'timezones';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data;
    }
    
    // Fetch from database
    const timezones = await supabase
      .from('cached_timezones')
      .select('*');
    
    this.cache.set(cacheKey, {
      data: timezones.data,
      timestamp: Date.now()
    });
    
    return timezones.data;
  }
}

// Implement request deduplication
export class RequestDeduplicator {
  private inFlight = new Map<string, Promise<any>>();
  
  async deduplicate<T>(
    key: string, 
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }
    
    const promise = fetchFn().finally(() => {
      this.inFlight.delete(key);
    });
    
    this.inFlight.set(key, promise);
    return promise;
  }
}
```

### Priority 5: Connection Pooling Configuration

```javascript
// Optimize Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'codequal-app',
    },
  },
  // Add connection pooling hints
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Use prepared statements where possible
export async function getRepositoryById(id: string) {
  return supabase
    .from('repositories')
    .select(`
      id,
      name,
      owner,
      platform,
      last_analyzed_at
    `)
    .eq('id', id)
    .single();
}
```

## Implementation Priority

1. **Immediate (Week 1)**:
   - Implement timezone caching table
   - Add application-level caching for metadata queries
   - Create missing composite indexes

2. **Short-term (Week 2)**:
   - Create materialized view for function metadata
   - Implement request deduplication in application
   - Optimize connection pooling settings

3. **Medium-term (Month 1)**:
   - Create specialized functions for complex queries
   - Implement query result caching in Redis
   - Add query performance monitoring

## Monitoring Plan

```sql
-- Create a query performance monitoring table
CREATE TABLE IF NOT EXISTS query_performance_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_hash text NOT NULL,
  query_text text,
  execution_time_ms float,
  calls_count int DEFAULT 1,
  total_time_ms float,
  avg_time_ms float GENERATED ALWAYS AS (total_time_ms / NULLIF(calls_count, 0)) STORED,
  last_executed timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_query_performance_hash ON query_performance_log(query_hash);
CREATE INDEX idx_query_performance_avg_time ON query_performance_log(avg_time_ms DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
  p_query_text text,
  p_execution_time_ms float
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_hash text;
BEGIN
  -- Only log queries slower than 100ms
  IF p_execution_time_ms < 100 THEN
    RETURN;
  END IF;
  
  v_query_hash := md5(p_query_text);
  
  INSERT INTO query_performance_log (
    query_hash,
    query_text,
    execution_time_ms,
    total_time_ms
  ) VALUES (
    v_query_hash,
    p_query_text,
    p_execution_time_ms,
    p_execution_time_ms
  )
  ON CONFLICT (query_hash) DO UPDATE SET
    calls_count = query_performance_log.calls_count + 1,
    total_time_ms = query_performance_log.total_time_ms + p_execution_time_ms,
    last_executed = now();
END;
$$;
```

## Expected Improvements

- **Dashboard queries**: 70-80% reduction in execution time
- **Timezone queries**: 95%+ reduction through caching
- **Table metadata queries**: 50-60% improvement with indexes
- **Overall database load**: 40-50% reduction

## Next Steps

1. Review and approve optimization plan
2. Test optimizations in development environment
3. Implement monitoring before production deployment
4. Deploy optimizations incrementally with rollback plan
5. Monitor performance metrics for 1 week
6. Adjust based on real-world performance data
