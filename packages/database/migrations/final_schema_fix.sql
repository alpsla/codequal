-- Final schema fixes for ingestion pipeline

-- Add missing target_chunk_id column to chunk_relationships
ALTER TABLE chunk_relationships 
ADD COLUMN IF NOT EXISTS target_chunk_id UUID;

-- Copy data from existing column if it exists (assuming child_chunk_id or similar)
-- Update this based on your actual column name
-- UPDATE chunk_relationships SET target_chunk_id = child_chunk_id WHERE target_chunk_id IS NULL;

-- Update search function to handle both UUID and TEXT for repository_id
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(1536),
    repo_id TEXT,
    match_count INT DEFAULT 10,
    min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.id,
        ac.content,
        ac.metadata,
        1 - (ac.embedding <=> query_embedding) AS similarity
    FROM analysis_chunks ac
    WHERE ac.repository_id::text = repo_id  -- Cast UUID to text for comparison
    AND ac.embedding IS NOT NULL
    AND 1 - (ac.embedding <=> query_embedding) >= min_similarity
    ORDER BY ac.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;