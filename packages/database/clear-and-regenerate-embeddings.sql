-- Clear existing embeddings and regenerate with correct dimensions

-- Delete all existing chunks (they have malformed embeddings)
DELETE FROM analysis_chunks WHERE repository_id = '550e8400-e29b-41d4-a716-446655440000';

-- Update the analysis_chunks table to use 1536 dimensions
ALTER TABLE analysis_chunks ALTER COLUMN embedding TYPE vector(1536);

-- Update the search function to use 1536 dimensions  
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(1536),  -- Back to 1536 as configured
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
    WHERE ac.repository_id::text = repo_id
    AND ac.embedding IS NOT NULL
    AND 1 - (ac.embedding <=> query_embedding) >= min_similarity
    ORDER BY ac.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;