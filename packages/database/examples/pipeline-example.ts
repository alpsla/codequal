import { DataProcessingPipeline } from '../data-processing-pipeline.service';
import { ProcessingOptions } from '../data-processing-pipeline.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function example() {
  console.log('Starting Vector Database Pipeline Example...\n');
  
  // Initialize the pipeline
  const pipeline = new DataProcessingPipeline();
  
  // Example DeepWiki analysis content
  const deepWikiContent = `
# Repository Analysis: CodeQual

## Overview
This repository implements a multi-agent code quality analysis system. 
The system uses various AI models to analyze code quality, security, and architecture.

### Architecture Score: 8/10
**Strengths:**
- Clear separation of concerns with modular design
- Well-defined interfaces between components
- Effective use of dependency injection

**Issues:**
- Some circular dependencies detected in core module
- Inconsistent error handling patterns across services

### Code Quality Score: 7/10
The codebase generally follows good practices but has room for improvement.

**Key Findings:**
1. **Naming Conventions**: Most code follows consistent naming patterns
2. **Documentation**: Adequate inline documentation, but missing API docs
3. **Test Coverage**: Currently at 65%, should aim for 80%+

### Security Analysis
**High Severity Issues:**
- SQL injection vulnerability in user authentication module
  - File: /src/auth/login.ts
  - Line: 45-52
  - Fix: Use parameterized queries

**Medium Severity Issues:**
- Hardcoded API keys found in configuration files
- Missing rate limiting on public endpoints

### Performance Insights
- Average response time: 250ms
- Memory usage could be optimized in data processing pipeline
- Database queries need optimization (N+1 query problem detected)
`;

  // Example repository analysis content
  const repoAnalysisContent = `
## Dependencies Analysis

### Outdated Packages
- express: 4.17.1 → 4.18.2 (security patches available)
- lodash: 4.17.19 → 4.17.21 (prototype pollution fix)
- jsonwebtoken: 8.5.1 → 9.0.0 (breaking changes, security improvements)

### Security Vulnerabilities
Total: 5 vulnerabilities (2 high, 2 moderate, 1 low)

**High Priority:**
1. Prototype Pollution in lodash
   - Severity: High
   - CVSS: 7.4
   - Fix: Update to 4.17.21

2. ReDoS in express
   - Severity: High  
   - CVSS: 7.5
   - Fix: Update to 4.18.2

### License Compliance
All dependencies use MIT or Apache 2.0 licenses - no compliance issues detected.
`;

  // Processing options
  const options: ProcessingOptions = {
    repositoryId: 'demo-repo-123',
    sourceType: 'deepwiki_analysis',
    sourceId: 'analysis-' + Date.now(),
    storageType: 'permanent',
    enhancementContext: {
      repository: 'codequal',
      analysisType: 'deepwiki_analysis'
    },
    onProgress: (progress: any) => {
      console.log(`[${progress.stage}] ${progress.message} (${progress.current}/${progress.total})`);
    }
  };

  try {
    // Process DeepWiki analysis
    console.log('\n=== Processing DeepWiki Analysis ===');
    const deepWikiResult = await pipeline.processDocument(
      deepWikiContent,
      'deepwiki_analysis',
      options
    );
    
    console.log('\nDeepWiki Processing Result:');
    console.log(`- Success: ${deepWikiResult.success}`);
    console.log(`- Chunks processed: ${deepWikiResult.chunksProcessed}`);
    console.log(`- Chunks stored: ${deepWikiResult.chunksStored}`);
    console.log(`- Duration: ${deepWikiResult.duration}ms`);
    console.log(`- Tokens used: ${deepWikiResult.tokenUsage.total}`);
    
    if (deepWikiResult.errors.length > 0) {
      console.log('- Errors:', deepWikiResult.errors.map(e => e.message).join(', '));
    }

    // Process repository analysis
    console.log('\n\n=== Processing Repository Analysis ===');
    const repoResult = await pipeline.processDocument(
      repoAnalysisContent,
      'repository_analysis',
      {
        ...options,
        sourceType: 'repository_analysis',
        sourceId: 'repo-analysis-' + Date.now()
      }
    );
    
    console.log('\nRepository Analysis Result:');
    console.log(`- Success: ${repoResult.success}`);
    console.log(`- Chunks processed: ${repoResult.chunksProcessed}`);
    console.log(`- Chunks stored: ${repoResult.chunksStored}`);
    console.log(`- Duration: ${repoResult.duration}ms`);
    console.log(`- Tokens used: ${repoResult.tokenUsage.total}`);

    // Process multiple documents
    console.log('\n\n=== Processing Multiple Documents ===');
    const documents = [
      {
        content: 'PR Analysis: Fixed authentication bug by implementing proper input validation.',
        contentType: 'pr_analysis' as const,
        metadata: { prNumber: 123, author: 'developer1' }
      },
      {
        content: 'Documentation: Updated API documentation with new endpoints and examples.',
        contentType: 'documentation' as const,
        metadata: { section: 'api', version: '2.0' }
      }
    ];
    
    const batchResult = await pipeline.processDocuments(documents, {
      ...options,
      sourceType: 'batch_processing',
      sourceId: 'batch-' + Date.now()
    });
    
    console.log('\nBatch Processing Result:');
    console.log(`- Success: ${batchResult.success}`);
    console.log(`- Total chunks processed: ${batchResult.chunksProcessed}`);
    console.log(`- Total chunks stored: ${batchResult.chunksStored}`);
    console.log(`- Duration: ${batchResult.duration}ms`);
    console.log(`- Total tokens used: ${batchResult.tokenUsage.total}`);

    // Get pipeline statistics
    console.log('\n\n=== Pipeline Statistics ===');
    const stats = await pipeline.getPipelineStats('demo-repo-123');
    
    console.log('\nStorage Stats:');
    console.log(`- Total chunks: ${stats.storageStats.totalChunks}`);
    console.log('- By type:', JSON.stringify(stats.storageStats.byType, null, 2));
    console.log('- By source:', JSON.stringify(stats.storageStats.bySource, null, 2));
    console.log('- By storage:', JSON.stringify(stats.storageStats.byStorage, null, 2));
    
    console.log('\nEmbedding Cache Stats:');
    console.log(`- Cache size: ${stats.embeddingCacheStats.size}`);
    console.log(`- Max size: ${stats.embeddingCacheStats.maxSize}`);
    console.log(`- Hit rate: ${(stats.embeddingCacheStats.hitRate * 100).toFixed(2)}%`);

    // Clean up expired chunks (if any)
    console.log('\n\n=== Cleanup ===');
    const cleanedCount = await pipeline.cleanupExpiredChunks();
    console.log(`Cleaned up ${cleanedCount} expired chunks`);

  } catch (error) {
    console.error('Pipeline error:', error);
  }
}

// Run the example
example().catch(console.error);
