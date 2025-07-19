-- Create DeepWiki Configurations Table for Vector DB Storage

-- Check if table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'deepwiki_configurations'
    ) THEN
        -- Create the table
        CREATE TABLE public.deepwiki_configurations (
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

        -- Create indexes for performance
        CREATE INDEX idx_deepwiki_config_type ON public.deepwiki_configurations(config_type);
        CREATE INDEX idx_deepwiki_repo_url ON public.deepwiki_configurations(repository_url) WHERE repository_url IS NOT NULL;
        CREATE INDEX idx_deepwiki_expires ON public.deepwiki_configurations(expires_at) WHERE expires_at IS NOT NULL;
        CREATE INDEX idx_deepwiki_created ON public.deepwiki_configurations(created_at DESC);
        
        -- Create partial unique index for global configs (only one active global config allowed)
        CREATE UNIQUE INDEX idx_unique_global_config ON public.deepwiki_configurations(config_type) 
        WHERE config_type = 'global' AND (expires_at IS NULL OR expires_at > NOW());

        -- Enable RLS
        ALTER TABLE public.deepwiki_configurations ENABLE ROW LEVEL SECURITY;

        -- Create policy for authenticated users
        CREATE POLICY "deepwiki_configurations_authenticated_access" ON public.deepwiki_configurations
            FOR ALL 
            TO authenticated
            USING (true)
            WITH CHECK (true);

        -- Create policy for service role
        CREATE POLICY "deepwiki_configurations_service_role_access" ON public.deepwiki_configurations
            FOR ALL 
            TO service_role
            USING (true)
            WITH CHECK (true);

        -- Grant permissions
        GRANT ALL ON public.deepwiki_configurations TO authenticated;
        GRANT ALL ON public.deepwiki_configurations TO service_role;

        -- Add helpful comment
        COMMENT ON TABLE public.deepwiki_configurations IS 'Stores DeepWiki model configurations and repository-specific selections';
        
        RAISE NOTICE '✅ Created deepwiki_configurations table with RLS and indexes';
    ELSE
        RAISE NOTICE 'ℹ️ Table deepwiki_configurations already exists';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'deepwiki_configurations'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 
    tablename,
    rowsecurity as "RLS Enabled",
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'deepwiki_configurations') as "Policy Count"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'deepwiki_configurations';