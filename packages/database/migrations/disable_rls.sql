-- Disable Row Level Security for vector database tables
-- This allows the service role to insert/update/delete without restrictions

-- Disable RLS on analysis_chunks table
ALTER TABLE analysis_chunks DISABLE ROW LEVEL SECURITY;

-- Disable RLS on chunk_relationships table  
ALTER TABLE chunk_relationships DISABLE ROW LEVEL SECURITY;

-- Optional: If you want to keep RLS enabled but allow service role access, use this instead:
-- CREATE POLICY "Service role can manage analysis_chunks" ON analysis_chunks
-- FOR ALL USING (true) WITH CHECK (true);

-- CREATE POLICY "Service role can manage chunk_relationships" ON chunk_relationships  
-- FOR ALL USING (true) WITH CHECK (true);