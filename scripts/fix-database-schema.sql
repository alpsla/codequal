-- Fix database schema issues found during E2E testing

-- 1. Create vector_chunks table
CREATE TABLE IF NOT EXISTS public.vector_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id VARCHAR(255) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(3072),
  analysis_type VARCHAR(50),
  tool_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for vector_chunks
CREATE INDEX IF NOT EXISTS idx_vector_chunks_repository ON public.vector_chunks(repository_id);
CREATE INDEX IF NOT EXISTS idx_vector_chunks_source ON public.vector_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_vector_chunks_metadata ON public.vector_chunks USING gin(metadata);

-- 2. Add user_id column to vector_embeddings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vector_embeddings' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.vector_embeddings 
    ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Create repository_schedules table
CREATE TABLE IF NOT EXISTS public.repository_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url VARCHAR(500) UNIQUE NOT NULL,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'on-demand')),
  schedule_config JSONB DEFAULT '{}',
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  enabled BOOLEAN DEFAULT true,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for repository_schedules
CREATE INDEX IF NOT EXISTS idx_repository_schedules_url ON public.repository_schedules(repository_url);
CREATE INDEX IF NOT EXISTS idx_repository_schedules_next_run ON public.repository_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_repository_schedules_enabled ON public.repository_schedules(enabled);

-- 4. Grant permissions
GRANT ALL ON public.vector_chunks TO authenticated;
GRANT ALL ON public.repository_schedules TO authenticated;

-- 5. Enable RLS (Row Level Security)
ALTER TABLE public.vector_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to manage vector_chunks"
  ON public.vector_chunks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage repository_schedules"
  ON public.repository_schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Display confirmation
SELECT 'Database schema fixes applied successfully!' as status;