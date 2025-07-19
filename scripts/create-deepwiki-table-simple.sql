-- Create DeepWiki Configurations Table (Simple Version)

-- Drop table if it exists (for testing)
-- DROP TABLE IF EXISTS public.deepwiki_configurations;

-- Create the table
CREATE TABLE IF NOT EXISTS public.deepwiki_configurations (
    id TEXT PRIMARY KEY,
    config_type TEXT NOT NULL CHECK (config_type IN ('global', 'repository')),
    repository_url TEXT,
    primary_model TEXT NOT NULL,
    fallback_model TEXT NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deepwiki_config_type ON public.deepwiki_configurations(config_type);
CREATE INDEX IF NOT EXISTS idx_deepwiki_repo_url ON public.deepwiki_configurations(repository_url) WHERE repository_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deepwiki_expires ON public.deepwiki_configurations(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deepwiki_created ON public.deepwiki_configurations(created_at DESC);

-- Note: We cannot use NOW() in a unique index predicate as it's not immutable
-- Instead, we'll handle uniqueness of active global configs in the application layer

-- Enable RLS
ALTER TABLE public.deepwiki_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "deepwiki_configurations_authenticated_access" ON public.deepwiki_configurations
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "deepwiki_configurations_service_role_access" ON public.deepwiki_configurations
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.deepwiki_configurations TO authenticated;
GRANT ALL ON public.deepwiki_configurations TO service_role;

-- Add table comment
COMMENT ON TABLE public.deepwiki_configurations IS 'Stores DeepWiki model configurations and repository-specific selections';

-- Verify the table was created
SELECT 
    'Table Created' as status,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'deepwiki_configurations';