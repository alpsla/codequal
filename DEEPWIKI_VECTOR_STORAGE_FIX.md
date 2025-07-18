# DeepWiki Vector Storage Fix Plan

## Current Issue
DeepWiki is trying to store model configurations in Vector DB but the required table `deepwiki_configurations` doesn't exist in Supabase.

## Solution Steps

### 1. Create the DeepWiki Configurations Table
Run the following SQL in Supabase SQL Editor:

```sql
-- Create DeepWiki Configurations Table
CREATE TABLE IF NOT EXISTS public.deepwiki_configurations (
    id TEXT PRIMARY KEY,
    config_type TEXT NOT NULL CHECK (config_type IN ('global', 'repository')),
    repository_url TEXT,
    primary_model TEXT NOT NULL,
    fallback_model TEXT NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Add constraint for global configs
    CONSTRAINT unique_global_config UNIQUE (config_type) WHERE config_type = 'global'
);

-- Create indexes for performance
CREATE INDEX idx_deepwiki_config_type ON public.deepwiki_configurations(config_type);
CREATE INDEX idx_deepwiki_repo_url ON public.deepwiki_configurations(repository_url) WHERE repository_url IS NOT NULL;
CREATE INDEX idx_deepwiki_expires ON public.deepwiki_configurations(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_deepwiki_created ON public.deepwiki_configurations(created_at DESC);

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
```

### 2. Test the Storage
After creating the table, run:
```bash
cd apps/api
./src/test-scripts/test-deepwiki-vector-storage.ts
```

### 3. Verify Integration
The DeepWikiConfigStorage class in `@codequal/agents/src/deepwiki/deepwiki-config-storage.ts` will now be able to:
- Store global model configurations
- Store repository-specific model selections
- Retrieve configurations with automatic expiry handling
- Handle cases where the table doesn't exist gracefully

### 4. Benefits
- ✅ Persistent storage of DeepWiki model selections
- ✅ Repository-specific model optimization
- ✅ Automatic expiry of old configurations (7 days)
- ✅ RLS enabled for security
- ✅ Indexed for performance

## Files Involved
- `/packages/agents/src/deepwiki/deepwiki-config-storage.ts` - Storage implementation
- `/apps/api/src/services/deepwiki-manager.ts` - Uses the storage service
- `/scripts/create-deepwiki-table.sql` - SQL to create the table
- `/apps/api/src/test-scripts/test-deepwiki-vector-storage.ts` - Test script

## Next Steps
1. Run the SQL to create the table in Supabase
2. Test the integration with the test script
3. Monitor DeepWiki logs to ensure configurations are being stored/retrieved properly