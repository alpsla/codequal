-- Migration: Fix analysis_chunks unique constraint
-- Date: 2025-05-28
-- Description: Remove content from unique constraint to allow re-ingestion of documents

-- Drop the existing constraint
ALTER TABLE analysis_chunks 
DROP CONSTRAINT IF EXISTS analysis_chunks_repository_source_idx;

-- Create a new constraint without content field
-- This allows the same content to be stored multiple times (e.g., for updates)
ALTER TABLE analysis_chunks 
ADD CONSTRAINT analysis_chunks_repository_source_idx 
UNIQUE (repository_id, source_type, source_id, chunk_index);

-- Add chunk_index column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analysis_chunks' 
                   AND column_name = 'chunk_index') THEN
        ALTER TABLE analysis_chunks ADD COLUMN chunk_index INTEGER;
        
        -- Update existing records with sequential chunk_index
        WITH numbered_chunks AS (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY repository_id, source_type, source_id 
                                      ORDER BY created_at) - 1 as new_index
            FROM analysis_chunks
        )
        UPDATE analysis_chunks ac
        SET chunk_index = nc.new_index
        FROM numbered_chunks nc
        WHERE ac.id = nc.id;
        
        -- Make chunk_index NOT NULL after populating
        ALTER TABLE analysis_chunks ALTER COLUMN chunk_index SET NOT NULL;
    END IF;
END $$;

-- Add an index on chunk_index for performance
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_chunk_index 
ON analysis_chunks(repository_id, source_type, source_id, chunk_index);

-- Add total_chunks column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'analysis_chunks' 
                   AND column_name = 'total_chunks') THEN
        ALTER TABLE analysis_chunks ADD COLUMN total_chunks INTEGER;
    END IF;
END $$;

-- Add comment explaining the change
COMMENT ON CONSTRAINT analysis_chunks_repository_source_idx ON analysis_chunks IS 
'Unique constraint on repository, source, and chunk index to allow content updates while preventing duplicate chunks';