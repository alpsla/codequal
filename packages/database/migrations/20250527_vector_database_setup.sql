-- Migration: Vector Database Setup for CodeQual
-- Date: 2025-05-27
-- Description: Set up vector database infrastructure for repository analysis storage and retrieval

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- Core Vector Storage Tables
-- ========================================

-- Table: analysis_chunks
-- Purpose: Store chunked content from analyses with vector embeddings
CREATE TABLE IF NOT EXISTS analysis_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('repository_analysis', 'deepwiki_analysis', 'pr_review', 'manual')),
    source_id UUID, -- Reference to source table ID
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-large dimensions
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Scoring and quality metrics
    quality_score FLOAT CHECK (quality_score >= 0 AND quality_score <= 1),
    relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 1),
    
    -- Storage management
    storage_type TEXT NOT NULL DEFAULT 'permanent' CHECK (storage_type IN ('permanent', 'cached', 'temporary')),
    ttl TIMESTAMPTZ, -- Time to live for cached/temporary content
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    
    -- Indexes for performance
    CONSTRAINT analysis_chunks_repository_source_idx UNIQUE (repository_id, source_type, source_id, content)
);

-- Create indexes for analysis_chunks
CREATE INDEX idx_analysis_chunks_repository ON analysis_chunks(repository_id);
CREATE INDEX idx_analysis_chunks_source ON analysis_chunks(source_type, source_id);
CREATE INDEX idx_analysis_chunks_storage ON analysis_chunks(storage_type, ttl);
CREATE INDEX idx_analysis_chunks_metadata ON analysis_chunks USING GIN(metadata);
CREATE INDEX idx_analysis_chunks_quality ON analysis_chunks(quality_score DESC);
CREATE INDEX idx_analysis_chunks_relevance ON analysis_chunks(relevance_score DESC);

-- Vector similarity search index (IVFFlat)
CREATE INDEX idx_analysis_chunks_embedding ON analysis_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Table: chunk_relationships
-- Purpose: Track relationships between chunks for context preservation
CREATE TABLE IF NOT EXISTS chunk_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_chunk_id UUID NOT NULL REFERENCES analysis_chunks(id) ON DELETE CASCADE,
    child_chunk_id UUID NOT NULL REFERENCES analysis_chunks(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('sequential', 'hierarchical', 'reference', 'similar')),
    strength FLOAT CHECK (strength >= 0 AND strength <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chunk_relationships_unique UNIQUE (parent_chunk_id, child_chunk_id, relationship_type)
);

-- Create indexes for chunk_relationships
CREATE INDEX idx_chunk_relationships_parent ON chunk_relationships(parent_chunk_id);
CREATE INDEX idx_chunk_relationships_child ON chunk_relationships(child_chunk_id);
CREATE INDEX idx_chunk_relationships_type ON chunk_relationships(relationship_type);

-- ========================================
-- Educational and Knowledge Tables
-- ========================================

-- Table: educational_patterns
-- Purpose: Store common patterns, best practices, and learning materials
CREATE TABLE IF NOT EXISTS educational_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('best_practice', 'anti_pattern', 'code_smell', 'refactoring', 'security_pattern')),
    language TEXT NOT NULL,
    framework TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Code examples
    before_code TEXT,
    after_code TEXT,
    explanation TEXT,
    
    -- Embedding for pattern search
    embedding vector(1536),
    
    -- Categorization
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    prerequisites TEXT[],
    
    -- Quality and usage
    quality_score FLOAT DEFAULT 0.8 CHECK (quality_score >= 0 AND quality_score <= 1),
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for educational_patterns
CREATE INDEX idx_educational_patterns_type ON educational_patterns(pattern_type);
CREATE INDEX idx_educational_patterns_language ON educational_patterns(language);
CREATE INDEX idx_educational_patterns_framework ON educational_patterns(framework);
CREATE INDEX idx_educational_patterns_tags ON educational_patterns USING GIN(tags);
CREATE INDEX idx_educational_patterns_embedding ON educational_patterns 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Table: knowledge_items
-- Purpose: Store accumulated knowledge from analyses
CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_type TEXT NOT NULL CHECK (item_type IN ('insight', 'recommendation', 'warning', 'explanation', 'example', 'reference', 'solution', 'problem-solution')),
    category TEXT NOT NULL,
    
    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    code_snippet TEXT,
    embedding vector(1536),
    
    -- Source tracking
    source_type TEXT CHECK (source_type IN ('analysis', 'manual', 'community', 'documentation')),
    source_reference TEXT,
    
    -- Quality and trust
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    verification_status TEXT CHECK (verification_status IN ('unverified', 'community_verified', 'expert_verified', 'automated_verified')),
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Retention policy
    retention_policy TEXT DEFAULT 'permanent' CHECK (retention_policy IN ('permanent', 'temporary', 'seasonal')),
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Create indexes for knowledge_items
CREATE INDEX idx_knowledge_items_type ON knowledge_items(item_type);
CREATE INDEX idx_knowledge_items_category ON knowledge_items(category);
CREATE INDEX idx_knowledge_items_tags ON knowledge_items USING GIN(tags);
CREATE INDEX idx_knowledge_items_quality ON knowledge_items(confidence_score DESC, helpful_count DESC);
CREATE INDEX idx_knowledge_items_embedding ON knowledge_items 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ========================================
-- Performance and Caching Tables
-- ========================================

-- Table: search_cache
-- Purpose: Cache frequent searches for performance
CREATE TABLE IF NOT EXISTS search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_hash TEXT NOT NULL UNIQUE,
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    result_ids UUID[] NOT NULL,
    result_scores FLOAT[] NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Cache management
    hit_count INTEGER DEFAULT 1,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for search_cache
CREATE INDEX idx_search_cache_hash ON search_cache(query_hash);
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);
CREATE INDEX idx_search_cache_hits ON search_cache(hit_count DESC);

-- ========================================
-- User Skill Tracking Table
-- ========================================

-- Table: user_skills
-- Purpose: Track user skill levels for adaptive content
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    domain TEXT NOT NULL,
    skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    confidence FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Progress tracking
    interactions INTEGER DEFAULT 0,
    successful_applications INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ,
    
    CONSTRAINT user_skills_unique UNIQUE (user_id, language, domain)
);

-- Create indexes for user_skills
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_language ON user_skills(language);
CREATE INDEX idx_user_skills_domain ON user_skills(domain);
CREATE INDEX idx_user_skills_level ON user_skills(skill_level);

-- ========================================
-- Helper Functions
-- ========================================

-- Function: search_similar_chunks
-- Purpose: Find similar chunks using vector similarity
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(1536),
    repo_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 10,
    min_score FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        ac.id,
        ac.content,
        ac.metadata,
        1 - (ac.embedding <=> query_embedding) as similarity
    FROM analysis_chunks ac
    WHERE 
        (repo_id IS NULL OR ac.repository_id = repo_id)
        AND ac.embedding IS NOT NULL
        AND 1 - (ac.embedding <=> query_embedding) >= min_score
    ORDER BY ac.embedding <=> query_embedding
    LIMIT limit_count;
END;
$ LANGUAGE plpgsql;

-- Function: clean_expired_content
-- Purpose: Remove expired cached/temporary content
CREATE OR REPLACE FUNCTION clean_expired_content()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analysis_chunks
    WHERE storage_type IN ('cached', 'temporary')
        AND ttl IS NOT NULL
        AND ttl < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM search_cache
    WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: update_updated_at_column
-- Purpose: Automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Triggers
-- ========================================

-- Create update triggers for all tables with updated_at columns
CREATE TRIGGER update_analysis_chunks_updated_at BEFORE UPDATE ON analysis_chunks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_educational_patterns_updated_at BEFORE UPDATE ON educational_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_items_updated_at BEFORE UPDATE ON knowledge_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE analysis_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunk_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be added based on authentication requirements

-- ========================================
-- Migration Complete
-- ========================================

-- Grant permissions to authenticated users (adjust based on your auth setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
