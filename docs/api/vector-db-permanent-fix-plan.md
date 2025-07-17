# Vector DB Embedding Permanent Fix Plan

## Current Issues Summary

### 1. Embedding Dimension Mismatch
- **Issue**: Different models produce different embedding dimensions (1536, 3072, 1024)
- **Current Workaround**: Hardcoded to specific dimensions, causing "All embeddings should be of the same size" errors
- **Impact**: DeepWiki integration fails, analysis gets stuck at 95%

### 2. Authentication & Permission Issues
- **Issue**: Vector DB operations fail due to authentication context
- **Current Workaround**: Falls back to in-memory storage or hardcoded configurations
- **Impact**: Reports stored temporarily, lost on restart

### 3. Missing Database Tables
- **Issue**: `analysis_reports`, `pr_analyses`, `analysis_results` tables don't exist
- **Current Workaround**: Store everything in Vector DB
- **Impact**: Inconsistent data storage, retrieval issues

### 4. Configuration Loading Failures
- **Issue**: Database configuration often unavailable during initialization
- **Current Workaround**: Hardcoded defaults in code
- **Impact**: Cannot dynamically adjust embedding models

## Permanent Solution Architecture

### Phase 1: Standardize Embedding Dimensions (Week 1)

#### 1.1 Create Embedding Adapter Layer
```typescript
// packages/core/src/services/vector-db/embedding-adapter.ts
export class EmbeddingAdapter {
  private targetDimension: number = 1536; // Standard dimension
  
  async adaptEmbedding(
    embedding: number[], 
    sourceDimension: number,
    method: 'truncate' | 'pad' | 'pca' = 'truncate'
  ): Promise<number[]> {
    if (embedding.length === this.targetDimension) {
      return embedding;
    }
    
    switch (method) {
      case 'truncate':
        return embedding.slice(0, this.targetDimension);
      case 'pad':
        return this.padEmbedding(embedding, this.targetDimension);
      case 'pca':
        return this.pcaReduction(embedding, this.targetDimension);
    }
  }
}
```

#### 1.2 Update Vector Storage Schema
```sql
-- Add embedding metadata to track original dimensions
ALTER TABLE vector_documents ADD COLUMN IF NOT EXISTS embedding_metadata JSONB;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_embedding_metadata ON vector_documents USING GIN (embedding_metadata);

-- Update existing embeddings with metadata
UPDATE vector_documents 
SET embedding_metadata = jsonb_build_object(
  'original_dimension', array_length(embedding, 1),
  'adapted_dimension', 1536,
  'adaptation_method', 'truncate',
  'model_used', 'text-embedding-3-large'
)
WHERE embedding_metadata IS NULL;
```

### Phase 2: Fix Authentication & Permissions (Week 1-2)

#### 2.1 Create Service Account for Vector Operations
```typescript
// packages/core/src/services/vector-db/vector-service-account.ts
export class VectorServiceAccount {
  private serviceClient: SupabaseClient;
  
  constructor() {
    // Use service role key for all vector operations
    this.serviceClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }
  
  async storeEmbedding(
    content: string,
    embedding: number[],
    metadata: any,
    userId?: string
  ) {
    // Store with service account, track user in metadata
    return this.serviceClient
      .from('vector_documents')
      .insert({
        content,
        embedding,
        metadata: {
          ...metadata,
          created_by: userId,
          created_at: new Date().toISOString()
        }
      });
  }
}
```

#### 2.2 Implement Proper Error Handling
```typescript
// packages/core/src/services/vector-db/vector-error-handler.ts
export class VectorErrorHandler {
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      logger.error(`Primary operation failed: ${context}`, error);
      
      // Log to monitoring
      await this.logToMonitoring(context, error);
      
      // Try fallback
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        logger.error(`Fallback also failed: ${context}`, fallbackError);
        throw new VectorDBError(
          `Both primary and fallback failed for ${context}`,
          error,
          fallbackError
        );
      }
    }
  }
}
```

### Phase 3: Create Missing Tables & Migration (Week 2)

#### 3.1 Database Migration Script
```sql
-- Create analysis storage tables
CREATE TABLE IF NOT EXISTS analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  repository_url TEXT NOT NULL,
  pr_number INTEGER,
  report_data JSONB NOT NULL,
  vector_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pr_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  analysis_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  results JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(repository_url, pr_number)
);

-- Create indexes
CREATE INDEX idx_analysis_reports_user_id ON analysis_reports(user_id);
CREATE INDEX idx_analysis_reports_analysis_id ON analysis_reports(analysis_id);
CREATE INDEX idx_pr_analyses_repo_pr ON pr_analyses(repository_url, pr_number);

-- Enable RLS
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own reports" ON analysis_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON analysis_reports
  FOR ALL USING (auth.role() = 'service_role');
```

#### 3.2 Dual Storage Strategy
```typescript
// packages/core/src/services/storage/dual-storage-strategy.ts
export class DualStorageStrategy {
  async storeAnalysis(analysis: AnalysisResult) {
    // Store structured data in PostgreSQL
    const { data: reportRecord } = await supabase
      .from('analysis_reports')
      .insert({
        analysis_id: analysis.id,
        user_id: analysis.userId,
        repository_url: analysis.repositoryUrl,
        pr_number: analysis.prNumber,
        report_data: {
          summary: analysis.summary,
          score: analysis.score,
          issues: analysis.issues
        },
        status: 'processing'
      })
      .select()
      .single();
    
    // Store embeddings in Vector DB
    const vectorIds = [];
    for (const chunk of analysis.codeChunks) {
      const { data: vectorRecord } = await vectorService.store({
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: {
          analysis_id: analysis.id,
          report_id: reportRecord.id,
          chunk_type: chunk.type
        }
      });
      vectorIds.push(vectorRecord.id);
    }
    
    // Update report with vector references
    await supabase
      .from('analysis_reports')
      .update({ 
        vector_ids: vectorIds,
        status: 'complete'
      })
      .eq('id', reportRecord.id);
  }
}
```

### Phase 4: Dynamic Configuration System (Week 2-3)

#### 4.1 Configuration Service with Caching
```typescript
// packages/core/src/services/config/embedding-config-cache.ts
export class EmbeddingConfigCache {
  private cache: Map<string, EmbeddingConfig> = new Map();
  private lastRefresh: Date;
  private refreshInterval = 5 * 60 * 1000; // 5 minutes
  
  async getConfig(modelKey: string): Promise<EmbeddingConfig> {
    // Check cache first
    if (this.isCacheValid() && this.cache.has(modelKey)) {
      return this.cache.get(modelKey)!;
    }
    
    // Refresh from database
    await this.refreshCache();
    
    // Return config or default
    return this.cache.get(modelKey) || this.getDefaultConfig(modelKey);
  }
  
  private async refreshCache() {
    try {
      const { data: configs } = await supabase
        .from('embedding_configurations')
        .select('*');
      
      configs?.forEach(config => {
        this.cache.set(config.model_key, config);
      });
      
      this.lastRefresh = new Date();
    } catch (error) {
      logger.error('Failed to refresh config cache', error);
      // Continue with existing cache
    }
  }
}
```

### Phase 5: Monitoring & Observability (Week 3)

#### 5.1 Vector Operation Metrics
```typescript
// packages/core/src/services/monitoring/vector-metrics.ts
export class VectorMetrics {
  private metrics = {
    embeddingCreations: 0,
    embeddingFailures: 0,
    dimensionMismatches: 0,
    authFailures: 0,
    fallbackUsage: 0
  };
  
  async recordOperation(
    operation: string,
    success: boolean,
    metadata?: any
  ) {
    // Increment counters
    if (operation === 'embedding_creation') {
      success ? this.metrics.embeddingCreations++ : this.metrics.embeddingFailures++;
    }
    
    // Log to database for analysis
    await supabase
      .from('vector_operation_logs')
      .insert({
        operation,
        success,
        metadata,
        timestamp: new Date().toISOString()
      });
    
    // Alert on high failure rates
    if (this.getFailureRate() > 0.1) {
      await this.sendAlert('High vector operation failure rate detected');
    }
  }
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Implement embedding adapter layer
- [ ] Update vector storage schema
- [ ] Create service account system
- [ ] Deploy to staging

### Week 2: Storage & Migration
- [ ] Create missing database tables
- [ ] Implement dual storage strategy
- [ ] Migrate existing vector data
- [ ] Test with production data

### Week 3: Configuration & Monitoring
- [ ] Build configuration caching system
- [ ] Implement monitoring and metrics
- [ ] Create operational dashboard
- [ ] Performance optimization

### Week 4: Testing & Rollout
- [ ] Comprehensive integration tests
- [ ] Load testing with various embedding sizes
- [ ] Gradual rollout to production
- [ ] Monitor and tune

## Success Metrics

1. **Embedding Success Rate**: >99.5%
2. **Dimension Mismatch Errors**: 0
3. **Authentication Failures**: <0.1%
4. **Analysis Completion Rate**: >99%
5. **Vector Query Latency**: <100ms p95

## Rollback Plan

1. Keep existing workarounds in place during rollout
2. Feature flag for new vs old implementation
3. Automated rollback on error threshold
4. Data migration is reversible

## Future Enhancements

1. **Multi-Modal Embeddings**: Support for image/diagram embeddings
2. **Embedding Compression**: Reduce storage with quantization
3. **Semantic Caching**: Cache similar queries
4. **Cross-Repository Insights**: Aggregate embeddings across projects