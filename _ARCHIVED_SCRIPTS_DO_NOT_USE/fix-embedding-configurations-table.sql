-- Fix embedding_configurations table schema

-- 1. First, check what columns exist in the current table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'embedding_configurations'
ORDER BY ordinal_position;

-- 2. Drop the existing table if it has wrong schema (backup data first if needed)
-- Only run this if you've verified there's no important data
/*
DROP TABLE IF EXISTS embedding_configurations CASCADE;
*/

-- 3. Alternative: Rename existing table and create new one
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'embedding_configurations'
    ) THEN
        -- Check if it has the model_key column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'embedding_configurations' 
            AND column_name = 'model_key'
        ) THEN
            -- Rename old table
            ALTER TABLE embedding_configurations RENAME TO embedding_configurations_old;
            RAISE NOTICE 'Renamed existing table to embedding_configurations_old';
        END IF;
    END IF;
END $$;

-- 4. Create the table with correct schema
CREATE TABLE IF NOT EXISTS embedding_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_key TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    dimensions INTEGER NOT NULL,
    max_tokens INTEGER,
    cost_per_million DECIMAL(10, 4),
    embedding_type TEXT CHECK (embedding_type IN ('text', 'code', 'multimodal')),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert default configurations
INSERT INTO embedding_configurations (model_key, provider, model_name, dimensions, max_tokens, cost_per_million, embedding_type)
VALUES 
    ('openai/text-embedding-3-small', 'openai', 'text-embedding-3-small', 1536, 8191, 0.02, 'text'),
    ('openai/text-embedding-3-large', 'openai', 'text-embedding-3-large', 3072, 8191, 0.13, 'text'),
    ('voyage/voyage-code-3', 'voyage', 'voyage-code-3', 1024, 32000, 0.12, 'code'),
    ('default', 'openai', 'text-embedding-3-small', 1536, 8191, 0.02, 'text')
ON CONFLICT (model_key) DO UPDATE
SET 
    dimensions = EXCLUDED.dimensions,
    max_tokens = EXCLUDED.max_tokens,
    cost_per_million = EXCLUDED.cost_per_million,
    updated_at = NOW();

-- 6. If there was an old table, show what was in it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'embedding_configurations_old'
    ) THEN
        RAISE NOTICE 'Old embedding_configurations table exists. Check embedding_configurations_old for any data to migrate.';
    END IF;
END $$;

-- 7. Verify the new table structure
SELECT 
    'New table structure' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'embedding_configurations'
ORDER BY ordinal_position;

-- 8. Show the inserted configurations
SELECT * FROM embedding_configurations ORDER BY model_key;