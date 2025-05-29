-- Add missing search function for vector similarity search

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
    WHERE ac.repository_id = repo_id
    AND ac.embedding IS NOT NULL
    AND 1 - (ac.embedding <=> query_embedding) >= min_similarity
    ORDER BY ac.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;