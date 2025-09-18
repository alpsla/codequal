-- Fix model_configurations table schema
-- Add missing column if it doesn't exist

-- Check if column exists and add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 
                   FROM information_schema.columns 
                   WHERE table_name='model_configurations' 
                   AND column_name='updated_at') 
    THEN
        ALTER TABLE model_configurations 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Update existing rows to have updated_at if null
UPDATE model_configurations 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_model_configurations_updated_at 
ON model_configurations(updated_at DESC);

-- Show the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'model_configurations'
ORDER BY ordinal_position;