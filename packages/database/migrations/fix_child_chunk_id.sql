-- Fix child_chunk_id column constraint
-- Make child_chunk_id nullable since the new code uses source_chunk_id and target_chunk_id

ALTER TABLE chunk_relationships 
ALTER COLUMN child_chunk_id DROP NOT NULL;