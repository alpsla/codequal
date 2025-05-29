# Vector Database Ingestion Pipeline

The ingestion pipeline is responsible for processing, enhancing, and storing document content in the vector database for efficient similarity search and retrieval.

## Overview

The pipeline consists of several stages:

1. **Preprocessing** - Clean and normalize content
2. **Chunking** - Split content into manageable chunks
3. **Enhancement** - Add context and metadata to chunks
4. **Embedding** - Generate vector embeddings using OpenAI
5. **Storage** - Store chunks and embeddings in Supabase

## Components

### PreprocessingService
Cleans and normalizes content based on content type:
- Removes excess whitespace
- Normalizes markdown formatting
- Preserves code blocks
- Extracts metadata

### HierarchicalChunker
Intelligently splits content into chunks:
- Respects document structure (sections, subsections)
- Maintains semantic boundaries
- Creates parent-child relationships
- Optimizes chunk sizes for embedding

### ContentEnhancer
Enriches chunks with additional context:
- Adds sliding window context from adjacent chunks
- Injects metadata (repository, language, severity)
- Generates semantic tags
- Extracts code references
- Creates potential questions

### EmbeddingService
Generates vector embeddings:
- Uses OpenAI's text-embedding-3-large model
- Supports batch processing
- Implements caching for efficiency
- Handles rate limiting

### VectorStorageService
Manages storage in Supabase:
- Stores chunks with embeddings
- Supports different storage types (permanent, cached, temporary)
- Creates chunk relationships
- Provides similarity search

### DataProcessingPipeline
Orchestrates the entire process:
- Manages the flow through all stages
- Handles errors gracefully
- Provides progress updates
- Supports batch processing

## Usage

### Basic Example

```typescript
import { DataProcessingPipeline } from '@codequal/database/services/ingestion';

const pipeline = new DataProcessingPipeline();

const result = await pipeline.processDocument(
  documentContent,
  'deepwiki_analysis',
  {
    repositoryId: 'repo-123',
    sourceType: 'deepwiki_analysis',
    sourceId: 'analysis-456',
    storageType: 'permanent',
    enhancementContext: {
      repository: 'my-repo',
      language: 'typescript'
    }
  }
);

console.log(`Processed ${result.chunksStored} chunks`);
```

### Processing Multiple Documents

```typescript
const documents = [
  { content: 'Doc 1', contentType: 'repository_analysis' },
  { content: 'Doc 2', contentType: 'pr_analysis' }
];

const result = await pipeline.processDocuments(documents, {
  repositoryId: 'repo-123',
  sourceType: 'batch',
  sourceId: 'batch-123'
});
```

### With Progress Tracking

```typescript
const result = await pipeline.processDocument(content, 'deepwiki_analysis', {
  repositoryId: 'repo-123',
  sourceType: 'deepwiki_analysis',
  sourceId: 'analysis-456',
  onProgress: (progress) => {
    console.log(`[${progress.stage}] ${progress.current}/${progress.total}`);
  }
});
```

## Configuration

The pipeline uses environment variables for configuration:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-api-key
VECTOR_EMBEDDING_MODEL=text-embedding-3-large
VECTOR_EMBEDDING_DIMENSIONS=1536

# Chunking Configuration
VECTOR_CHUNK_SIZE=400
VECTOR_MAX_CHUNK_SIZE=600
VECTOR_MIN_CHUNK_SIZE=100
VECTOR_CHUNK_OVERLAP=50

# Enhancement Configuration
VECTOR_ENHANCEMENT_OVERLAP_SIZE=50
VECTOR_CONTEXT_WINDOW_BEFORE=100
VECTOR_CONTEXT_WINDOW_AFTER=100

# Processing Configuration
VECTOR_MAX_CONCURRENCY=5
```

## Content Types

The pipeline supports different content types:

- `repository_analysis` - General repository analysis
- `deepwiki_analysis` - DeepWiki generated analysis
- `pr_analysis` - Pull request analysis
- `documentation` - Technical documentation

Each content type has optimized preprocessing and chunking strategies.

## Storage Types

- `permanent` - Long-term storage, no expiration
- `cached` - Medium-term storage, 7-day TTL
- `temporary` - Short-term storage, 1-day TTL

## Testing

Run the test suite:

```bash
npm test -- ingestion
```

Run the example:

```bash
npx ts-node src/services/ingestion/examples/pipeline-example.ts
```

## Performance Considerations

1. **Batch Processing**: Process multiple chunks together for efficiency
2. **Caching**: Embeddings are cached to avoid redundant API calls
3. **Rate Limiting**: Automatic retry with backoff for API rate limits
4. **Concurrency**: Configurable parallel processing
5. **Memory Management**: Chunking prevents memory overflow

## Error Handling

The pipeline implements partial failure handling:
- Individual chunk failures don't stop the entire process
- Errors are collected and reported
- Failed chunks can be retried
- Progress is maintained even with failures

## Monitoring

Get pipeline statistics:

```typescript
const stats = await pipeline.getPipelineStats('repo-123');
console.log('Total chunks:', stats.storageStats.totalChunks);
console.log('Cache hit rate:', stats.embeddingCacheStats.hitRate);
```

## Best Practices

1. **Choose appropriate storage types**: Use `permanent` for important analyses, `cached` for regular updates
2. **Monitor token usage**: Track embedding costs with `tokenUsage` in results
3. **Clean up regularly**: Run `cleanupExpiredChunks()` periodically
4. **Optimize chunk sizes**: Balance between context and token costs
5. **Use batch processing**: Process multiple documents together when possible
