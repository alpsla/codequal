-- Migration to add embedding configuration storage
-- This allows dynamic management of embedding models without code changes

-- Table to store embedding model configurations
CREATE TABLE IF NOT EXISTS embedding_configurations (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'default', 'code', 'documentation'
    
    -- Model information
    provider VARCHAR(50) NOT NULL, -- 'openai', 'voyage', 'cohere', etc.
    model_name VARCHAR(100) NOT NULL, -- 'text-embedding-3-large', 'voyage-code-3', etc.
    dimensions INTEGER NOT NULL, -- 1536, 1024, 3072, etc.
    max_tokens INTEGER NOT NULL, -- Maximum tokens the model can handle
    
    -- API configuration
    api_key_env_var VARCHAR(50), -- Environment variable name for API key
    base_url VARCHAR(500), -- Optional custom base URL
    
    -- Model metadata
    description TEXT,
    cost_per_1k_tokens DECIMAL(10, 6), -- Cost in USD
    last_updated DATE NOT NULL,
    
    -- Performance characteristics
    avg_latency_ms INTEGER, -- Average response time in milliseconds
    quality_score DECIMAL(3, 2), -- 0.00 to 1.00
    
    -- Configuration status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    content_type_preference VARCHAR(50), -- 'code', 'documentation', 'general'
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    -- Constraints
    CONSTRAINT check_quality_score CHECK (quality_score >= 0 AND quality_score <= 1),
    CONSTRAINT check_dimensions CHECK (dimensions > 0),
    CONSTRAINT check_max_tokens CHECK (max_tokens > 0)
);

-- Create index for quick lookups
CREATE INDEX idx_embedding_config_active ON embedding_configurations(is_active, content_type_preference);
CREATE INDEX idx_embedding_config_default ON embedding_configurations(is_default) WHERE is_default = true;

-- Table to track embedding model performance over time
CREATE TABLE IF NOT EXISTS embedding_model_metrics (
    id BIGSERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES embedding_configurations(id) ON DELETE CASCADE,
    
    -- Performance metrics
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    requests_count INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms INTEGER,
    p95_latency_ms INTEGER,
    p99_latency_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    
    -- Quality metrics
    user_satisfaction_score DECIMAL(3, 2), -- 0.00 to 1.00
    relevance_score DECIMAL(3, 2), -- 0.00 to 1.00
    
    -- Cost tracking
    total_tokens_used BIGINT DEFAULT 0,
    total_cost_usd DECIMAL(10, 4) DEFAULT 0,
    
    -- Time window
    metric_window VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    
    CONSTRAINT check_satisfaction CHECK (user_satisfaction_score >= 0 AND user_satisfaction_score <= 1),
    CONSTRAINT check_relevance CHECK (relevance_score >= 0 AND relevance_score <= 1)
);

-- Create index for performance queries
CREATE INDEX idx_model_metrics_time ON embedding_model_metrics(config_id, timestamp DESC);
CREATE INDEX idx_model_metrics_window ON embedding_model_metrics(metric_window, window_start);

-- Function to ensure only one default configuration exists
CREATE OR REPLACE FUNCTION ensure_single_default_embedding_config()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE embedding_configurations 
        SET is_default = false 
        WHERE id != NEW.id AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single default
CREATE TRIGGER trg_single_default_embedding_config
BEFORE INSERT OR UPDATE ON embedding_configurations
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION ensure_single_default_embedding_config();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_embedding_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER trg_update_embedding_config_timestamp
BEFORE UPDATE ON embedding_configurations
FOR EACH ROW
EXECUTE FUNCTION update_embedding_config_timestamp();

-- Insert default configurations based on current implementation
INSERT INTO embedding_configurations (
    config_name, provider, model_name, dimensions, max_tokens,
    api_key_env_var, description, cost_per_1k_tokens, last_updated,
    is_active, is_default, content_type_preference
) VALUES 
    -- OpenAI text-embedding-3-large (default for documentation)
    ('openai-3-large', 'openai', 'text-embedding-3-large', 3072, 8191,
     'OPENAI_API_KEY', 'OpenAI''s large embedding model with configurable dimensions', 
     0.00013, '2024-01-25', true, true, 'documentation'),
    
    -- Voyage Code-3 (for code)
    ('voyage-code-3', 'voyage', 'voyage-code-3', 1024, 16000,
     'VOYAGE_API_KEY', 'Optimized for code embeddings with excellent performance',
     0.00012, '2024-10-01', true, false, 'code'),
    
    -- OpenAI text-embedding-3-small (cost-effective alternative)
    ('openai-3-small', 'openai', 'text-embedding-3-small', 1536, 8191,
     'OPENAI_API_KEY', 'OpenAI''s small, efficient embedding model',
     0.00002, '2024-01-25', true, false, 'general')
ON CONFLICT (config_name) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP;

-- View for easy access to active configurations with metrics
CREATE OR REPLACE VIEW v_embedding_config_with_metrics AS
SELECT 
    ec.*,
    COALESCE(metrics.avg_latency_last_24h, 0) as avg_latency_last_24h,
    COALESCE(metrics.total_requests_last_24h, 0) as total_requests_last_24h,
    COALESCE(metrics.error_rate_last_24h, 0) as error_rate_last_24h
FROM embedding_configurations ec
LEFT JOIN LATERAL (
    SELECT 
        AVG(avg_latency_ms) as avg_latency_last_24h,
        SUM(requests_count) as total_requests_last_24h,
        CASE 
            WHEN SUM(requests_count) > 0 
            THEN CAST(SUM(error_count) AS DECIMAL) / SUM(requests_count)
            ELSE 0 
        END as error_rate_last_24h
    FROM embedding_model_metrics
    WHERE config_id = ec.id
      AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
) metrics ON true
WHERE ec.is_active = true;