-- Safe Supabase Performance Fix
-- Handles existing policies gracefully

BEGIN;

-- 1. Create indexes (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_model_config_role ON model_configurations(role);
CREATE INDEX IF NOT EXISTS idx_model_config_language ON model_configurations(language);
CREATE INDEX IF NOT EXISTS idx_model_config_size ON model_configurations(size_category);
CREATE INDEX IF NOT EXISTS idx_model_config_lookup ON model_configurations(role, language, size_category);

-- 2. Enable RLS (safe if already enabled)
ALTER TABLE model_configurations ENABLE ROW LEVEL SECURITY;

-- 3. Drop and recreate policy (handles existing policy)
DROP POLICY IF EXISTS "Allow service role full access" ON model_configurations;
CREATE POLICY "Allow service role full access" ON model_configurations
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Optimize table
ANALYZE model_configurations;

COMMIT;

-- Verify indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'model_configurations';






