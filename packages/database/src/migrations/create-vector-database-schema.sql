-- Enhanced Vector Database Schema for Selective RAG Framework
-- This schema supports rich metadata filtering and semantic search

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Repository metadata table for RAG context
CREATE TABLE IF NOT EXISTS rag_repositories (
    id SERIAL PRIMARY KEY,
    repository_url VARCHAR(500) UNIQUE NOT NULL,
    repository_name VARCHAR(255) NOT NULL,
    primary_language VARCHAR(50),
    framework_stack JSONB, -- e.g., ["react", "node", "express"]
    repository_size_bytes BIGINT,
    last_analyzed_at TIMESTAMP,
    analysis_frequency VARCHAR(20) DEFAULT '7 days', -- weekly, daily, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced document embeddings with rich metadata
CREATE TABLE IF NOT EXISTS rag_document_embeddings (
    id BIGSERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES rag_repositories(id) ON DELETE CASCADE,
    
    -- Content information
    file_path VARCHAR(1000) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'code', 'documentation', 'config', 'test'
    content_language VARCHAR(50), -- programming language or 'markdown', 'text'
    content_chunk TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_total INTEGER NOT NULL,
    
    -- Vector embedding
    embedding vector(1536), -- OpenAI text-embedding-3-large size
    
    -- Rich metadata for filtering
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Content analysis metadata
    code_complexity_score FLOAT, -- 0-1 for code files
    importance_score FLOAT NOT NULL DEFAULT 0.5, -- 0-1, higher = more important
    
    -- Contextual metadata
    function_names TEXT[], -- extracted function names for code
    class_names TEXT[], -- extracted class names for code
    dependencies TEXT[], -- imported modules/dependencies
    framework_references TEXT[], -- detected framework usage
    
    -- File-level metadata
    file_size_bytes INTEGER,
    last_modified_at TIMESTAMP,
    git_commit_hash VARCHAR(40),
    
    -- Lifecycle management
    expires_at TIMESTAMP, -- for automatic cleanup
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure uniqueness per file chunk
    UNIQUE(repository_id, file_path, chunk_index)
);

-- Analysis results storage for RAG enhancement
CREATE TABLE IF NOT EXISTS rag_analysis_results (
    id BIGSERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES rag_repositories(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL, -- 'architecture', 'security', 'performance', etc.
    
    -- Analysis content for RAG
    analysis_summary TEXT NOT NULL,
    key_findings JSONB, -- structured findings for easy querying
    recommendations JSONB, -- actionable recommendations
    
    -- Analysis metadata
    confidence_score FLOAT, -- 0-1, how confident the analysis is
    model_used VARCHAR(100), -- which AI model performed the analysis
    analysis_duration_ms INTEGER,
    
    -- Vector embedding of the analysis
    summary_embedding vector(1536),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One analysis per type per repository (replace on update)
    UNIQUE(repository_id, analysis_type)
);

-- Educational content embeddings for contextual learning
CREATE TABLE IF NOT EXISTS rag_educational_content (
    id BIGSERIAL PRIMARY KEY,
    
    -- Content information
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'tutorial', 'example', 'best_practice', 'pattern'
    content TEXT NOT NULL,
    
    -- Targeting metadata
    programming_language VARCHAR(50),
    frameworks JSONB, -- applicable frameworks
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    topic_tags TEXT[], -- topical tags for filtering
    
    -- Context matching
    applicable_patterns TEXT[], -- code patterns this content applies to
    use_cases TEXT[], -- specific use cases
    
    -- Vector embedding
    content_embedding vector(1536),
    
    -- Quality and relevance
    quality_score FLOAT DEFAULT 0.5, -- 0-1, higher = better quality
    usage_count INTEGER DEFAULT 0, -- how often this content has been surfaced
    
    -- Source and versioning
    source_url VARCHAR(1000),
    source_type VARCHAR(50), -- 'internal', 'documentation', 'tutorial_site'
    version VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query patterns for learning and optimization
CREATE TABLE IF NOT EXISTS rag_query_patterns (
    id BIGSERIAL PRIMARY KEY,
    
    -- Query information
    query_text TEXT NOT NULL,
    query_type VARCHAR(50), -- 'code_search', 'documentation', 'example_request'
    query_embedding vector(1536),
    
    -- Context
    repository_id INTEGER REFERENCES rag_repositories(id),
    user_context JSONB, -- user skill level, preferences, etc.
    
    -- Results and feedback
    result_count INTEGER,
    was_successful BOOLEAN,
    user_feedback_score INTEGER, -- 1-5 rating
    
    -- Performance tracking
    search_duration_ms INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient vector similarity search
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_cosine 
    ON rag_document_embeddings 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_analysis_embeddings_cosine 
    ON rag_analysis_results 
    USING ivfflat (summary_embedding vector_cosine_ops) 
    WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_educational_embeddings_cosine 
    ON rag_educational_content 
    USING ivfflat (content_embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_query_embeddings_cosine 
    ON rag_query_patterns 
    USING ivfflat (query_embedding vector_cosine_ops) 
    WITH (lists = 50);

-- Indexes for metadata filtering
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_metadata_gin 
    ON rag_document_embeddings USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_content_type 
    ON rag_document_embeddings (content_type);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_language 
    ON rag_document_embeddings (content_language);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_importance 
    ON rag_document_embeddings (importance_score DESC);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_repo_path 
    ON rag_document_embeddings (repository_id, file_path);

CREATE INDEX IF NOT EXISTS idx_educational_content_language 
    ON rag_educational_content (programming_language);

CREATE INDEX IF NOT EXISTS idx_educational_content_difficulty 
    ON rag_educational_content (difficulty_level);

CREATE INDEX IF NOT EXISTS idx_educational_content_frameworks_gin 
    ON rag_educational_content USING gin (frameworks);

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_repo_type_lang 
    ON rag_document_embeddings (repository_id, content_type, content_language);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_importance_type 
    ON rag_document_embeddings (importance_score DESC, content_type);

-- Function for intelligent vector search with metadata filtering
CREATE OR REPLACE FUNCTION rag_search_documents(
    query_embedding vector(1536),
    repository_filter INTEGER DEFAULT NULL,
    content_type_filter VARCHAR(50) DEFAULT NULL,
    language_filter VARCHAR(50) DEFAULT NULL,
    min_importance FLOAT DEFAULT 0.0,
    framework_filter TEXT DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id BIGINT,
    repository_id INTEGER,
    file_path VARCHAR(1000),
    content_chunk TEXT,
    content_type VARCHAR(50),
    content_language VARCHAR(50),
    importance_score FLOAT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rde.id,
        rde.repository_id,
        rde.file_path,
        rde.content_chunk,
        rde.content_type,
        rde.content_language,
        rde.importance_score,
        rde.metadata,
        1 - (rde.embedding <=> query_embedding) as similarity
    FROM rag_document_embeddings rde
    WHERE
        -- Apply filters
        (repository_filter IS NULL OR rde.repository_id = repository_filter)
        AND (content_type_filter IS NULL OR rde.content_type = content_type_filter)
        AND (language_filter IS NULL OR rde.content_language = language_filter)
        AND rde.importance_score >= min_importance
        AND (framework_filter IS NULL OR framework_filter = ANY(rde.framework_references))
        AND (rde.expires_at IS NULL OR rde.expires_at > NOW())
        -- Vector similarity threshold
        AND 1 - (rde.embedding <=> query_embedding) > match_threshold
    ORDER BY
        -- Primary sort by similarity, secondary by importance
        similarity DESC,
        rde.importance_score DESC
    LIMIT match_count;
END;
$$;

-- Function for educational content search
CREATE OR REPLACE FUNCTION rag_search_educational_content(
    query_embedding vector(1536),
    language_filter VARCHAR(50) DEFAULT NULL,
    difficulty_filter VARCHAR(20) DEFAULT NULL,
    framework_filter TEXT DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    id BIGINT,
    title VARCHAR(500),
    content TEXT,
    content_type VARCHAR(50),
    programming_language VARCHAR(50),
    difficulty_level VARCHAR(20),
    frameworks JSONB,
    quality_score FLOAT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rec.id,
        rec.title,
        rec.content,
        rec.content_type,
        rec.programming_language,
        rec.difficulty_level,
        rec.frameworks,
        rec.quality_score,
        1 - (rec.content_embedding <=> query_embedding) as similarity
    FROM rag_educational_content rec
    WHERE
        -- Apply filters
        (language_filter IS NULL OR rec.programming_language = language_filter)
        AND (difficulty_filter IS NULL OR rec.difficulty_level = difficulty_filter)
        AND (framework_filter IS NULL OR rec.frameworks ? framework_filter)
        -- Vector similarity threshold
        AND 1 - (rec.content_embedding <=> query_embedding) > match_threshold
    ORDER BY
        -- Sort by similarity and quality
        similarity DESC,
        rec.quality_score DESC
    LIMIT match_count;
END;
$$;

-- Function for automatic cleanup of expired embeddings
CREATE OR REPLACE FUNCTION rag_cleanup_expired_embeddings()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired embeddings
    DELETE FROM rag_document_embeddings 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO rag_query_patterns (query_text, query_type, result_count, was_successful)
    VALUES (
        'Cleanup expired embeddings',
        'maintenance',
        deleted_count,
        TRUE
    );
    
    RETURN deleted_count;
END;
$$;

-- Function to maintain optimal vector count per repository
CREATE OR REPLACE FUNCTION rag_maintain_vector_limits()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    repo_record RECORD;
    deleted_count INTEGER := 0;
    temp_deleted INTEGER;
    max_vectors_per_repo INTEGER := 1000;
BEGIN
    -- For each repository, keep only the most important vectors
    FOR repo_record IN 
        SELECT repository_id, COUNT(*) as vector_count
        FROM rag_document_embeddings
        GROUP BY repository_id
        HAVING COUNT(*) > max_vectors_per_repo
    LOOP
        -- Delete least important vectors beyond the limit
        DELETE FROM rag_document_embeddings
        WHERE repository_id = repo_record.repository_id
        AND id NOT IN (
            SELECT id FROM rag_document_embeddings
            WHERE repository_id = repo_record.repository_id
            ORDER BY importance_score DESC, created_at DESC
            LIMIT max_vectors_per_repo
        );
        
        GET DIAGNOSTICS temp_deleted = ROW_COUNT;
        deleted_count := deleted_count + temp_deleted;
    END LOOP;
    
    RETURN deleted_count;
END;
$$;

-- Update trigger for maintaining updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_rag_repositories_updated_at
    BEFORE UPDATE ON rag_repositories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rag_document_embeddings_updated_at
    BEFORE UPDATE ON rag_document_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rag_educational_content_updated_at
    BEFORE UPDATE ON rag_educational_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;