-- Simple test queries that should work with any PostgreSQL connection

-- Test 1: Single value (for Gauge/Stat panels)
SELECT 25.5::float as value;

-- Test 2: Time series (for graphs)
SELECT 
  generate_series(
    NOW() - INTERVAL '1 hour',
    NOW(),
    INTERVAL '5 minutes'
  ) as time,
  random() * 30 + 15 as value;

-- Test 3: Multiple metrics
SELECT 
  NOW() as time,
  25.5 as disk_usage,
  3 as repo_count,
  7.5 as available_gb;

-- Test 4: Simple number
SELECT 42;