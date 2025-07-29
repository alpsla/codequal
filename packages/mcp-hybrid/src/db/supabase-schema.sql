-- Supabase Vector Storage Schema
-- This table is used for storing tool results with embeddings

CREATE TABLE IF NOT EXISTS vector_storage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  embedding vector(1536), -- For OpenAI text-embedding-3-large
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster key lookups
CREATE INDEX idx_vector_storage_key ON vector_storage(key);

-- Index for vector similarity search
CREATE INDEX idx_vector_storage_embedding ON vector_storage 
USING ivfflat (embedding vector_cosine_ops);

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding vector(1536),
  base_key TEXT,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  key TEXT,
  data JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.key,
    v.data,
    1 - (v.embedding <=> query_embedding) as similarity
  FROM vector_storage v
  WHERE v.key LIKE base_key || '%'
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vector_storage_updated_at
BEFORE UPDATE ON vector_storage
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();