# Database Statistics

Show statistics and row counts for database tables.

## Usage

```
/db-stats
/db-stats analysis_results
```

## Instructions

When this skill is invoked:

1. **If no table specified**, show overview stats:
   ```sql
   SELECT
     schemaname as schema,
     relname as table_name,
     n_tup_ins as inserts,
     n_tup_upd as updates,
     n_tup_del as deletes,
     n_live_tup as live_rows,
     n_dead_tup as dead_rows,
     last_vacuum,
     last_autovacuum
   FROM pg_stat_user_tables
   ORDER BY n_live_tup DESC
   LIMIT 20;
   ```

2. **If table specified**, show detailed stats:
   ```sql
   -- Row count
   SELECT COUNT(*) as total_rows FROM table_name;

   -- Recent activity (if timestamp column exists)
   SELECT
     DATE(created_at) as date,
     COUNT(*) as count
   FROM table_name
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

3. **Format output** as summary statistics

## Arguments

$ARGUMENTS - Optional table name for detailed stats
