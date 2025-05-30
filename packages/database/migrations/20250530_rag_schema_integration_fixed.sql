-- Migration: RAG Schema Integration (FIXED)
-- Date: 2025-05-30
-- Description: Integrate RAG framework tables and functions with existing vector schema

-- This migration extends the existing analysis_chunks structure to support
-- the RAG framework requirements while maintaining backward compatibility

-- ========================================
-- RAG Document Embeddings (Compatibility Layer)
-- ========================================

-- Create a view that maps our existing analysis_chunks to the expected RAG structure
CREATE OR REPLACE VIEW rag_document_embeddings AS
SELECT 
    -- Map UUID to BIGINT for compatibility with RAG functions
    ('x' || substr(id::text, 1, 16))::bit(64)::bigint as id,
    -- Extract repository_id as integer (assuming first 8 chars of UUID)
    ('x' || substr(repository_id::text, 1, 8))::bit(32)::int as repository_id,
    
    -- Extract file path from metadata or use source info
    COALESCE(metadata->>'file_path', 'unknown') as file_path,
    content as content_chunk,
    
    -- Map content types
    CASE 
        WHEN metadata->>'content_type' IS NOT NULL THEN metadata->>'content_type'
        WHEN source_type = 'repository_analysis' THEN 'code'
        WHEN source_type = 'deepwiki_analysis' THEN 'documentation'
        WHEN source_type = 'pr_review' THEN 'review'
        ELSE 'unknown'
    END as content_type,
    
    -- Extract language from metadata
    COALESCE(metadata->>'language', metadata->>'programming_language', 'unknown') as content_language,
    
    -- Use relevance_score as importance_score
    COALESCE(relevance_score, quality_score, 0.5) as importance_score,
    
    -- Keep metadata as-is
    metadata,
    
    -- Vector embedding
    embedding,
    
    -- Extract framework references from metadata
    CASE 
        WHEN metadata->>'frameworks' IS NOT NULL THEN 
            string_to_array(metadata->>'frameworks', ',')
        WHEN metadata->>'framework' IS NOT NULL THEN 
            ARRAY[metadata->>'framework']
        ELSE ARRAY[]::text[]
    END as framework_references,
    
    -- Function and class names from metadata
    CASE 
        WHEN metadata->>'functions' IS NOT NULL THEN 
            string_to_array(metadata->>'functions', ',')
        ELSE ARRAY[]::text[]
    END as function_names,
    
    CASE 
        WHEN metadata->>'classes' IS NOT NULL THEN 
            string_to_array(metadata->>'classes', ',')
        ELSE ARRAY[]::text[]
    END as class_names,
    
    CASE 
        WHEN metadata->>'dependencies' IS NOT NULL THEN 
            string_to_array(metadata->>'dependencies', ',')
        ELSE ARRAY[]::text[]
    END as dependencies,
    
    -- File metadata
    (metadata->>'file_size')::integer as file_size_bytes,
    (metadata->>'last_modified')::timestamp as last_modified_at,
    metadata->>'git_commit' as git_commit_hash,
    
    -- Lifecycle management
    ttl as expires_at,
    created_at,
    updated_at
    
FROM analysis_chunks
WHERE embedding IS NOT NULL;

-- ========================================
-- RAG Educational Content Table
-- ========================================

-- Create educational content table matching RAG expectations
CREATE TABLE IF NOT EXISTS rag_educational_content (
    id BIGSERIAL PRIMARY KEY,
    
    -- Content information
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('tutorial', 'example', 'best_practice', 'pattern', 'guide', 'reference')),
    content TEXT NOT NULL,
    
    -- Targeting metadata
    programming_language VARCHAR(50),
    frameworks JSONB DEFAULT '[]',
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    topic_tags TEXT[] DEFAULT '{}',
    
    -- Context matching
    applicable_patterns TEXT[] DEFAULT '{}',
    use_cases TEXT[] DEFAULT '{}',
    
    -- Vector embedding
    content_embedding vector(1536),
    
    -- Quality and relevance
    quality_score FLOAT DEFAULT 0.5 CHECK (quality_score >= 0 AND quality_score <= 1),
    usage_count INTEGER DEFAULT 0,
    
    -- Source and versioning
    source_url VARCHAR(1000),
    source_type VARCHAR(50) DEFAULT 'manual' CHECK (source_type IN ('manual', 'documentation', 'tutorial_site', 'community', 'generated')),
    version VARCHAR(20),
    
    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for rag_educational_content
CREATE INDEX IF NOT EXISTS idx_rag_educational_content_language 
    ON rag_educational_content (programming_language);
CREATE INDEX IF NOT EXISTS idx_rag_educational_content_difficulty 
    ON rag_educational_content (difficulty_level);
CREATE INDEX IF NOT EXISTS idx_rag_educational_content_frameworks 
    ON rag_educational_content USING gin (frameworks);
CREATE INDEX IF NOT EXISTS idx_rag_educational_content_tags 
    ON rag_educational_content USING gin (topic_tags);
CREATE INDEX IF NOT EXISTS idx_rag_educational_content_patterns 
    ON rag_educational_content USING gin (applicable_patterns);

-- Vector similarity index
CREATE INDEX IF NOT EXISTS idx_rag_educational_content_embedding 
    ON rag_educational_content 
    USING ivfflat (content_embedding vector_cosine_ops) 
    WITH (lists = 50);

-- ========================================
-- RAG Query Patterns Table
-- ========================================

-- Create query patterns table for analytics and learning
CREATE TABLE IF NOT EXISTS rag_query_patterns (
    id BIGSERIAL PRIMARY KEY,
    
    -- Query information
    query_text TEXT NOT NULL,
    query_type VARCHAR(50) DEFAULT 'search',
    query_embedding vector(1536),
    
    -- Context
    repository_id UUID REFERENCES repositories(id),
    user_context JSONB DEFAULT '{}',
    
    -- Results and feedback
    result_count INTEGER DEFAULT 0,
    was_successful BOOLEAN DEFAULT true,
    user_feedback_score INTEGER CHECK (user_feedback_score >= 1 AND user_feedback_score <= 5),
    
    -- Performance tracking
    search_duration_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for rag_query_patterns
CREATE INDEX IF NOT EXISTS idx_rag_query_patterns_type ON rag_query_patterns(query_type);
CREATE INDEX IF NOT EXISTS idx_rag_query_patterns_repository ON rag_query_patterns(repository_id);
CREATE INDEX IF NOT EXISTS idx_rag_query_patterns_success ON rag_query_patterns(was_successful);
CREATE INDEX IF NOT EXISTS idx_rag_query_patterns_created ON rag_query_patterns(created_at);

-- Vector similarity index for query patterns
CREATE INDEX IF NOT EXISTS idx_rag_query_patterns_embedding 
    ON rag_query_patterns 
    USING ivfflat (query_embedding vector_cosine_ops) 
    WITH (lists = 50);

-- ========================================
-- RAG Repositories Table (if needed)
-- ========================================

-- Create repositories view for RAG compatibility (FIXED for actual schema)
CREATE OR REPLACE VIEW rag_repositories AS
SELECT 
    row_number() OVER (ORDER BY created_at) as id,
    -- Construct GitHub URL from github_id
    CASE 
        WHEN github_id IS NOT NULL THEN 'https://github.com/' || github_id
        ELSE NULL
    END as repository_url,
    name as repository_name,
    primary_language,
    languages as framework_stack,
    size as repository_size_bytes,
    updated_at as last_analyzed_at,
    '7 days' as analysis_frequency,
    created_at,
    updated_at
FROM repositories
WHERE github_id IS NOT NULL;

-- ========================================
-- RAG Search Functions
-- ========================================

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
        rde.file_path::VARCHAR(1000),
        rde.content_chunk,
        rde.content_type::VARCHAR(50),
        rde.content_language::VARCHAR(50),
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
        rec.content_type::VARCHAR(50),
        rec.programming_language::VARCHAR(50),
        rec.difficulty_level::VARCHAR(20),
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
    -- Delete expired embeddings from analysis_chunks
    DELETE FROM analysis_chunks 
    WHERE ttl IS NOT NULL AND ttl < NOW();
    
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
        SELECT 
            repository_id, 
            COUNT(*) as vector_count
        FROM analysis_chunks
        WHERE embedding IS NOT NULL
        GROUP BY repository_id
        HAVING COUNT(*) > max_vectors_per_repo
    LOOP
        -- Delete least important vectors beyond the limit
        DELETE FROM analysis_chunks
        WHERE repository_id = repo_record.repository_id
        AND id NOT IN (
            SELECT id FROM analysis_chunks
            WHERE repository_id = repo_record.repository_id
            AND embedding IS NOT NULL
            ORDER BY 
                COALESCE(relevance_score, quality_score, 0) DESC, 
                created_at DESC
            LIMIT max_vectors_per_repo
        );
        
        GET DIAGNOSTICS temp_deleted = ROW_COUNT;
        deleted_count := deleted_count + temp_deleted;
    END LOOP;
    
    RETURN deleted_count;
END;
$$;

-- ========================================
-- Educational Content Seeding
-- ========================================

-- Insert some basic educational content to get started
INSERT INTO rag_educational_content (
    title, content_type, content, programming_language, frameworks, 
    difficulty_level, topic_tags, quality_score
) VALUES 
(
    'TypeScript Interface Design Best Practices',
    'best_practice',
    'When designing TypeScript interfaces, prefer composition over inheritance. Use union types for flexibility and generic constraints for type safety. Always include proper JSDoc comments for better developer experience.',
    'typescript',
    '["general"]',
    'intermediate',
    ARRAY['interfaces', 'typescript', 'design-patterns'],
    0.9
),
(
    'React Component Optimization',
    'guide',
    'Optimize React components by using React.memo for expensive renders, useMemo for computed values, useCallback for event handlers, and proper key props for lists. Avoid inline objects and functions in render.',
    'typescript',
    '["react"]',
    'advanced',
    ARRAY['react', 'performance', 'optimization'],
    0.85
),
(
    'Express.js Error Handling Pattern',
    'pattern',
    'Implement centralized error handling in Express.js using error middleware. Create custom error classes, use async/await with proper try-catch blocks, and always call next(error) to pass errors to middleware.',
    'javascript',
    '["express", "node"]',
    'intermediate',
    ARRAY['express', 'error-handling', 'middleware'],
    0.88
);

-- Update embedding for educational content (placeholder - would be generated by embedding service)
-- Note: In production, these would be generated by the actual embedding service

-- ========================================
-- Triggers and Maintenance
-- ========================================

-- Check if trigger function exists before using it
DO $$
BEGIN
    -- Create the trigger function if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END;
$$;

-- Update trigger for rag_educational_content
CREATE TRIGGER update_rag_educational_content_updated_at
    BEFORE UPDATE ON rag_educational_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security
-- ========================================

-- Enable RLS on new tables
ALTER TABLE rag_educational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_query_patterns ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (can be refined based on requirements)
CREATE POLICY rag_educational_content_read_policy ON rag_educational_content
    FOR SELECT USING (true); -- Public read access for educational content

CREATE POLICY rag_query_patterns_user_policy ON rag_query_patterns
    FOR ALL USING (auth.uid()::text = user_context->>'user_id');

-- ========================================
-- Permissions
-- ========================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON rag_educational_content TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rag_query_patterns TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION rag_search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION rag_search_educational_content TO authenticated;
GRANT EXECUTE ON FUNCTION rag_cleanup_expired_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION rag_maintain_vector_limits TO authenticated;