# Testing the Vector Database Ingestion Pipeline

This directory contains comprehensive tests for the Vector Database ingestion pipeline.

## Test Files

1. **test-unit-pipeline.ts** - Unit tests that run without external dependencies
2. **test-real-deepwiki-reports.ts** - Integration tests using real DeepWiki analysis reports
3. **content-enhancer.test.ts** - Unit tests for ContentEnhancer
4. **embedding.test.ts** - Unit tests for EmbeddingService (mocked)
5. **vector-storage.test.ts** - Unit tests for VectorStorageService (mocked)
6. **data-processing-pipeline.test.ts** - Unit tests for DataProcessingPipeline

## Running Tests

### 1. Unit Tests (No External Dependencies)

Run the basic unit tests without needing OpenAI or Supabase credentials:

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/database
npx ts-node src/services/ingestion/__tests__/test-unit-pipeline.ts
```

This will test:
- ✅ Preprocessing
- ✅ Chunking
- ✅ Content Enhancement
- ✅ Complete flow integration

### 2. Jest Unit Tests

Run all Jest unit tests with mocked dependencies:

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/database
npm test -- ingestion
```

### 3. Integration Tests (Requires OpenAI & Supabase)

To run the full integration tests with real DeepWiki reports:

#### Prerequisites

1. Create a `.env` file in the database package directory with:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Vector Database Configuration (optional - has defaults)
VECTOR_EMBEDDING_MODEL=text-embedding-3-large
VECTOR_EMBEDDING_DIMENSIONS=1536
VECTOR_CHUNK_SIZE=400
VECTOR_MAX_CHUNK_SIZE=600
VECTOR_MIN_CHUNK_SIZE=100
VECTOR_CHUNK_OVERLAP=50
```

2. Ensure the vector database tables are created in Supabase (run the migration script)

#### Run Integration Tests

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/database

# Using the test script
./test-ingestion-pipeline.sh

# Or directly with ts-node
npx ts-node src/services/ingestion/__tests__/test-real-deepwiki-reports.ts
```

This will test:
- ✅ Full pipeline with real DeepWiki reports
- ✅ OpenAI embedding generation
- ✅ Supabase vector storage
- ✅ Similarity search functionality
- ✅ Pipeline statistics

## Test Configuration

You can modify test behavior by editing the `TEST_CONFIG` in `test-real-deepwiki-reports.ts`:

```typescript
const TEST_CONFIG = {
  repositoryId: 'express-test-repo',
  skipOpenAI: false,    // Set to true to skip embedding generation
  skipSupabase: false,  // Set to true to skip database operations
  verboseLogging: true  // Set to false for less output
};
```

## Expected Output

### Successful Unit Test Run
```
✅ preprocessing: PASSED
✅ chunking: PASSED
✅ enhancement: PASSED
✅ completeFlow: PASSED

Overall: 4/4 tests passed
🎉 All unit tests passed!
```

### Successful Integration Test Run
```
✅ OpenAI API key found
✅ Supabase credentials found
✅ Found test file: Express.js Analysis with Examples (Gemini)
✅ Found test file: Express.js Comprehensive Analysis (GPT-4 Turbo)
✅ Processing completed in 5234ms
✅ Enhanced content detected (metadata injection)
✅ Generated 15 questions
✅ Generated 8 semantic tags
✅ Found 3 similar chunks
✅ Statistics retrieved successfully

Overall: 6/6 tests passed
🎉 All tests passed! The Vector Database Ingestion Pipeline is working correctly.
```

## Troubleshooting

1. **Missing environment variables**: The tests will warn you and create a template .env file
2. **OpenAI rate limits**: The service includes automatic retry with backoff
3. **Supabase connection issues**: Check your Supabase URL and anon key
4. **TypeScript errors**: Run `npm install` to ensure all dependencies are installed

## Cost Estimates

Running the full integration tests will use:
- ~50-100 OpenAI API calls for embeddings
- Approximately $0.01-0.02 in OpenAI costs
- Minimal Supabase storage and compute
