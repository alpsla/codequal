-- Check the actual columns in vector and analysis tables
-- This will help us create the correct indexes

-- 1. Check vector_embeddings columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'vector_embeddings'
ORDER BY ordinal_position;

-- 2. Check vector_chunks columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'vector_chunks'
ORDER BY ordinal_position;

-- 3. Check pr_reviews columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'pr_reviews'
ORDER BY ordinal_position;

-- 4. Check analysis_results columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'analysis_results'
ORDER BY ordinal_position;

-- 5. Check api_usage columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'api_usage'
ORDER BY ordinal_position;