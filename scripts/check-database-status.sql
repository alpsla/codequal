-- Check Database Status for RAG Deployment
-- Run this in Supabase SQL Editor to see current state

-- 1. Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 2. Check existing tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE 'rag_%' OR table_name = 'analysis_chunks')
ORDER BY table_name;

-- 3. Check existing views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'rag_%'
ORDER BY table_name;

-- 4. Check existing functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'rag_%'
ORDER BY routine_name;

-- 5. Check analysis_chunks table structure
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'analysis_chunks'
ORDER BY ordinal_position;