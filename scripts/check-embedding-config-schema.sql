-- Check existing embedding_configurations table schema

-- 1. Check if the table exists and show its columns
SELECT 
    'Current schema' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'embedding_configurations'
ORDER BY ordinal_position;

-- 2. Check if there's any data in the existing table
SELECT 
    'Row count' as info,
    COUNT(*) as count
FROM embedding_configurations;

-- 3. Sample data (if any)
SELECT * FROM embedding_configurations LIMIT 5;