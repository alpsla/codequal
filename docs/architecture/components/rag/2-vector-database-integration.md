# Vector Database Integration

**Last Updated: May 11, 2025**

## Overview

The system uses Supabase with the pgvector extension to efficiently store and query vector embeddings for repository analysis, educational content, and context-aware features.

## Database Structure

```sql
-- Enable vector extension in Supabase
CREATE EXTENSION vector;

-- Create embeddings table with vector column
CREATE TABLE document_embeddings (
    id SERIAL PRIMARY KEY,
    repository_url VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content TEXT,
    embedding vector(1536), -- OpenAI embedding size
    chunk_index INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vector similarity index
CREATE INDEX idx_embeddings_cosine ON document_embeddings 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Vector Search Operations

```typescript
// Find similar code patterns
async function findSimilarCodePatterns(
  queryCode: string,
  repoUrl: string,
  threshold: number = 0.75,
  maxResults: number = 10
): Promise<CodePattern[]> {
  // Generate embedding for query code
  const embedding = await generateEmbedding(queryCode);
  
  // Search for similar patterns
  const { data, error } = await supabaseClient.rpc('match_code_embeddings', {
    query_embedding: embedding,
    repository_url: repoUrl,
    match_threshold: threshold,
    match_count: maxResults
  });
  
  if (error) {
    console.error("Vector search failed:", error);
    return [];
  }
  
  return data;
}
```

## Storage Optimization Strategy

To optimize storage and ensure cost-effectiveness, the system implements selective vector storage:

```typescript
// Repository processing with efficient storage
class RepositoryProcessor {
  async processRepository(repoUrl: string) {
    // 1. Generate vectors for analysis (temporary)
    const embeddings = await this.generateEmbeddings(repoFiles);
    
    // 2. Create analysis summary (persistent)
    const analysis = await this.analyzeWithVectors(embeddings);
    
    // 3. Store only the analysis + key patterns
    const compactData = {
      architecture: analysis.architecture,
      keyPatterns: this.extractKeyPatterns(embeddings),
      dependencies: analysis.dependencies,
      metrics: analysis.metrics,
      topFiles: this.identifyTopFiles(embeddings, 50), // Keep top 50 files only
      // Don't store full embeddings!
    };
    
    // 4. Store compact analysis
    await this.storeAnalysis(repoUrl, compactData);
    
    // 5. Clean up temporary vectors
    await this.cleanupTempVectors(repoUrl);
  }
}
```

## Cache Management Strategy

The system uses a tiered caching approach to balance performance and storage costs:

```typescript
const cacheStrategy = {
  // Repository analysis results (compact)
  repositoryAnalysis: {
    retention: '30 days',
    maxSize: '500MB per repo',
    policy: 'replace_on_update'
  },
  
  // File-level vectors (selective)
  fileVectors: {
    retention: '7 days',
    maxCount: 1000, // per repository
    policy: 'importance_based'
  },
  
  // PR analysis results
  prAnalysis: {
    retention: '90 days',
    maxSize: '50MB per PR',
    policy: 'compress_after_30_days'
  }
};
```

## Cleanup Automation

```sql
-- Automatic cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_embeddings()
RETURNS void AS $$
BEGIN
    -- Delete expired embeddings
    DELETE FROM file_embeddings WHERE expires_at < NOW();
    
    -- Keep only top 1000 embeddings per repo by importance
    DELETE FROM file_embeddings
    WHERE id NOT IN (
        SELECT id FROM file_embeddings
        WHERE repository_url = ANY(
            SELECT DISTINCT repository_url FROM file_embeddings
        )
        ORDER BY importance_score DESC
        LIMIT 1000
    );
END;
$$ LANGUAGE plpgsql;
```

## Smart Retention Strategy

The system implements a dynamic retention strategy aligned with repository update frequency:

```typescript
// Dynamic retention based on repository analysis frequency
const retentionStrategy = {
  calculateRetention(repoSettings) {
    const baseRetention = repoSettings.autoAnalysisFrequency || '7 days';
    const bufferDays = 1;
    
    return {
      analysisRetention: `${this.parseDays(baseRetention) + bufferDays} days`,
      vectorRetention: `${this.parseDays(baseRetention) / 2} days`, // Cleanup halfway
      prAnalysisRetention: this.parseDays(baseRetention) * 3 // Keep PR data longer
    };
  }
};
```

## Vector Size Optimization

The system optimizes vector storage using several techniques:

1. **Selective Storage**: Only storing vectors for important files
2. **Chunking Strategy**: Optimizing chunk size based on content type
3. **Vector Compression**: Using dimensionality reduction for storage efficiency
4. **TTL-Based Cleanup**: Automatically removing old vectors based on retention policy

## Embedding Model Selection

The choice of embedding model affects the quality of semantic search and retrieval. The system supports multiple embedding models, with selection based on language and repository characteristics:

```typescript
const embeddingModelSelector = {
  selectEmbeddingModel(language: string, repositoryCharacteristics: RepoCharacteristics): string {
    // Check for specialized embedding needs
    if (repositoryCharacteristics.isMultilingual) {
      return 'cohere-embed-multilingual-v3';
    }
    
    // Select based on language
    for (const [model, languages] of Object.entries(STATIC_MODEL_MAPPINGS.embeddingModels)) {
      if (Array.isArray(languages) && languages.includes(language)) {
        return model;
      }
    }
    
    // Default fallback
    return 'text-embedding-3-large';
  }
};
```

## Database Schema for Educational Content

```sql
-- Traditional structured educational content
CREATE TABLE educational_content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    frameworks JSONB, -- Array of frameworks
    keywords JSONB,   -- Array of keywords
    difficulty_level VARCHAR(20), -- beginner, intermediate, advanced
    content_type VARCHAR(50), -- tutorial, example, explanation, best_practice
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector-enhanced educational content embeddings
CREATE TABLE educational_content_embeddings (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES educational_content(id),
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_educational_content(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id bigint,
    title text,
    content text,
    language text,
    frameworks jsonb,
    difficulty_level text,
    content_type text,
    similarity float
)
LANGUAGE plpgsql
AS $
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        ec.title,
        ec.content,
        ec.language,
        ec.frameworks,
        ec.difficulty_level,
        ec.content_type,
        1 - (ece.embedding <=> query_embedding) as similarity
    FROM
        educational_content ec
    JOIN
        educational_content_embeddings ece ON ec.id = ece.content_id
    WHERE
        1 - (ece.embedding <=> query_embedding) > match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        match_count;
END;
$;
```
