-- Create a dedicated table for DeepWiki configurations
-- This avoids the RLS policy issues with analysis_chunks

CREATE TABLE IF NOT EXISTS public.deepwiki_configurations (
    id TEXT PRIMARY KEY,
    config_type TEXT NOT NULL, -- 'global' or 'repository'
    repository_url TEXT, -- NULL for global configs
    primary_model TEXT NOT NULL,
    fallback_model TEXT NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE -- For TTL management
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_deepwiki_config_type ON public.deepwiki_configurations(config_type);
CREATE INDEX IF NOT EXISTS idx_deepwiki_config_repo ON public.deepwiki_configurations(repository_url);
CREATE INDEX IF NOT EXISTS idx_deepwiki_config_expires ON public.deepwiki_configurations(expires_at);

-- Grant permissions (no RLS for now to avoid recursion)
GRANT ALL ON public.deepwiki_configurations TO service_role;
GRANT SELECT ON public.deepwiki_configurations TO authenticated;

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deepwiki_configurations_updated_at 
    BEFORE UPDATE ON public.deepwiki_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.deepwiki_configurations IS 'Stores DeepWiki model configurations for global and repository-specific settings';