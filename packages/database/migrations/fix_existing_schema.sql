-- Fix existing schema to work with the ingestion pipeline

-- Add missing columns to analysis_chunks table
ALTER TABLE analysis_chunks 
ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_chunks INTEGER DEFAULT 1;

-- Add missing column to chunk_relationships table (add source_chunk_id as alias to parent_chunk_id)
-- Option 1: Add the column the code expects
ALTER TABLE chunk_relationships 
ADD COLUMN IF NOT EXISTS source_chunk_id UUID;

-- Copy data from parent_chunk_id to source_chunk_id for existing rows
UPDATE chunk_relationships 
SET source_chunk_id = parent_chunk_id 
WHERE source_chunk_id IS NULL;

-- Option 2: Or we could modify the code to use parent_chunk_id instead
-- But for now, let's add the expected column