-- Simplified Vector Database Setup for CodeQual Testing
-- This version doesn't require pre-existing tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create analysis_chunks table without foreign keys
CREATE TABLE IF NOT EXISTS analysis_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id TEXT NOT NULL, -- Changed from UUID reference to simple TEXT
    source_type TEXT NOT NULL CHECK (source_type IN ('repository_analysis', 'deepwiki_analysis', 'pr_analysis', 'manual')),
    source_id TEXT,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB NOT NULL DEFAULT '{}',
    chunk_index INTEGER NOT NULL DEFAULT 0,
    total_chunks INTEGER NOT NULL DEFAULT 1,
    quality_score FLOAT DEFAULT 0.8,
    relevance_score FLOAT DEFAULT 0.8,
    storage_type TEXT NOT NULL DEFAULT 'permanent' CHECK (storage_type IN ('permanent', 'cached', 'temporary')),
    ttl TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_repository ON analysis_chunks(repository_id);
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_source ON analysis_chunks(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_embedding ON analysis_chunks USING ivfflat (embedding vector_cosine_ops);

-- Create chunk_relationships table
CREATE TABLE IF NOT EXISTS chunk_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_chunk_id UUID NOT NULL REFERENCES analysis_chunks(id) ON DELETE CASCADE,
    target_chunk_id UUID NOT NULL REFERENCES analysis_chunks(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    strength FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create search function
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