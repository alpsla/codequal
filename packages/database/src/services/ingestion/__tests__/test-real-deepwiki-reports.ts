import { DataProcessingPipeline } from '../data-processing-pipeline.service';
import { EmbeddingService } from '../embedding.service';
import { UnifiedSearchService } from '../../search/unified-search.service';
import { EnhancedChunk } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test configuration
const TEST_CONFIG = {
  repositoryId: '550e8400-e29b-41d4-a716-446655440000', // Use a proper UUID format
  skipOpenAI: false, // Set to true to skip OpenAI calls
  skipSupabase: false, // Set to true to skip Supabase calls
  verboseLogging: true
};

// Logging utilities
function log(message: string, color: string = colors.reset) {
  if (TEST_CONFIG.verboseLogging) {
    console.log(`${color}${message}${colors.reset}`);
  }
}

function logSection(title: string) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message: string) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logInfo(message: string) {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

// Test data
const TEST_REPORTS = [
  {
    name: 'Express.js Analysis with Examples (Gemini)',
    path: '/Users/alpinro/Code Prjects/codequal/archive/deepwiki_comprehensive_archive_20250523_210530/scripts/deepwiki-integration/analysis-results/express-with-examples-20250523_105101/express_analysis_with_examples.md',
    type: 'deepwiki_analysis' as const,
    sourceId: '550e8400-e29b-41d4-a716-446655440001' // UUID format
  },
  {
    name: 'Express.js Comprehensive Analysis (GPT-4 Turbo)',
    path: '/Users/alpinro/Code Prjects/codequal/archive/deepwiki_comprehensive_archive_20250523_210530/scripts/deepwiki-integration/analysis-results/comprehensive-fallback-express-20250523_141551/attempt-4-openai-gpt-4-turbo/express_comprehensive_analysis.md',
    type: 'deepwiki_analysis' as const,
    sourceId: '550e8400-e29b-41d4-a716-446655440002' // UUID format
  }
];

// Test harness
class VectorDatabaseTestHarness {
  private pipeline?: DataProcessingPipeline;
  private embeddingService?: EmbeddingService;
  private searchService?: UnifiedSearchService;
  private testResults: {
    preprocessing: boolean;
    chunking: boolean;
    enhancement: boolean;
    embedding: boolean;
    storage: boolean;
    retrieval: boolean;
  } = {
    preprocessing: false,
    chunking: false,
    enhancement: false,
    embedding: false,
    storage: false,
    retrieval: false
  };

  constructor() {
    // Services will be initialized after environment check
  }

  async runAllTests() {
    logSection('Vector Database Ingestion Pipeline Test Suite');
    
    // Check environment
    this.checkEnvironment();
    
    // Run tests for each report
    for (const report of TEST_REPORTS) {
      await this.testReportIngestion(report);
    }
    
    // Test search functionality
    await this.testSearchFunctionality();
    
    // Test statistics
    await this.testPipelineStatistics();
    
    // Print summary
    this.printTestSummary();
  }

  private checkEnvironment() {
    logSection('Environment Check');
    
    // Check OpenAI
    if (!process.env.OPENAI_API_KEY) {
      logWarning('OPENAI_API_KEY not set - will skip embedding tests');
      TEST_CONFIG.skipOpenAI = true;
    } else {
      logSuccess('OpenAI API key found');
    }
    
    // Check Supabase
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!(process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
    
    if (!hasSupabaseUrl || !hasSupabaseKey) {
      logWarning('Supabase credentials not set - will skip storage tests');
      TEST_CONFIG.skipSupabase = true;
    } else {
      logSuccess('Supabase credentials found');
    }
    
    // Check if test files exist
    for (const report of TEST_REPORTS) {
      if (fs.existsSync(report.path)) {
        logSuccess(`Found test file: ${report.name}`);
      } else {
        logError(`Missing test file: ${report.path}`);
        throw new Error('Test file not found');
      }
    }
    
    // Initialize services based on available credentials
    this.initializeServices();
  }
  
  private initializeServices() {
    try {
      // Always try to initialize pipeline (it might work without all services)
      this.pipeline = new DataProcessingPipeline();
    } catch (error) {
      logWarning('Failed to initialize pipeline - will use mock services');
      // We'll create a mock pipeline if needed
    }
    
    if (!TEST_CONFIG.skipOpenAI) {
      try {
        this.embeddingService = new EmbeddingService();
      } catch (error) {
        logWarning('Failed to initialize embedding service');
        TEST_CONFIG.skipOpenAI = true;
      }
    }
    
    if (!TEST_CONFIG.skipSupabase) {
      try {
        this.searchService = new UnifiedSearchService();
      } catch (error) {
        logWarning('Failed to initialize search service');
        TEST_CONFIG.skipSupabase = true;
      }
    }
  }

  private async testReportIngestion(report: typeof TEST_REPORTS[0]) {
    logSection(`Testing: ${report.name}`);
    
    try {
      // Read the report
      const content = fs.readFileSync(report.path, 'utf-8');
      logInfo(`Report size: ${(content.length / 1024).toFixed(2)} KB`);
      
      // Process through pipeline
      if (!this.pipeline) {
        logWarning('Pipeline not available - skipping document processing');
        return;
      }
      
      const startTime = Date.now();
      const result = await this.pipeline.processDocument(
        content,
        report.type,
        {
          repositoryId: TEST_CONFIG.repositoryId,
          sourceType: report.type,
          sourceId: report.sourceId,
          storageType: 'cached',
          enhancementContext: {
            repository: 'express',
            analysisType: 'deepwiki_analysis',
            language: 'javascript'
          },
          onProgress: (progress) => {
            log(`[${progress.stage}] ${progress.message} (${progress.current}/${progress.total})`, colors.magenta);
          }
        }
      );
      
      const duration = Date.now() - startTime;
      
      // Validate results
      if (result.success) {
        logSuccess(`Processing completed in ${duration}ms`);
        logInfo(`Chunks processed: ${result.chunksProcessed}`);
        logInfo(`Chunks stored: ${result.chunksStored}`);
        logInfo(`Total tokens used: ${result.tokenUsage.total}`);
        
        // Update test results
        this.testResults.preprocessing = true;
        this.testResults.chunking = result.chunksProcessed > 0;
        this.testResults.enhancement = result.chunksProcessed > 0;
        
        if (!TEST_CONFIG.skipOpenAI) {
          this.testResults.embedding = result.tokenUsage.embedding > 0;
        }
        
        if (!TEST_CONFIG.skipSupabase) {
          this.testResults.storage = result.chunksStored > 0;
        }
      } else {
        logError(`Processing failed: ${result.errors.map(e => e.message).join(', ')}`);
      }
      
      // Test individual components
      await this.testChunkContent(report.sourceId);
      
    } catch (error) {
      logError(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error);
    }
  }

  private async testChunkContent(sourceId: string) {
    if (TEST_CONFIG.skipSupabase || !this.searchService) {
      logWarning('Skipping chunk content test (no Supabase)');
      return;
    }
    
    log('\nTesting chunk content retrieval...');
    
    try {
      // Use search service to find chunks for this source
      const searchResult = await this.searchService.search('deepwiki analysis express', {
        repositoryId: TEST_CONFIG.repositoryId,
        maxResults: 20,
        filters: {
          sourceType: 'deepwiki_analysis'
        }
      });
      
      const chunks = searchResult.results;
      
      if (chunks.length > 0) {
        logSuccess(`Retrieved ${chunks.length} chunks`);
        
        // Examine first chunk
        const firstChunk = chunks[0];
        log('\nFirst chunk analysis:');
        log(`- ID: ${firstChunk.id}`);
        log(`- Content length: ${firstChunk.content.length} chars`);
        log(`- Similarity: ${firstChunk.similarity?.toFixed(3) || 'N/A'}`);
        log(`- Metadata keys: ${Object.keys(firstChunk.metadata).join(', ')}`);
        
        // Check for enhanced content
        if (firstChunk.content.includes('[Context:')) {
          logSuccess('Enhanced content detected (metadata injection)');
        }
        
        // Check for questions
        if (firstChunk.metadata.potentialQuestions?.length > 0) {
          logSuccess(`Generated ${firstChunk.metadata.potentialQuestions.length} questions`);
          log('Sample questions:');
          firstChunk.metadata.potentialQuestions.slice(0, 3).forEach((q: string) => {
            log(`  - ${q}`);
          });
        }
        
        // Check for semantic tags
        if (firstChunk.metadata.semanticTags?.length > 0) {
          logSuccess(`Generated ${firstChunk.metadata.semanticTags.length} semantic tags`);
          log(`Tags: ${firstChunk.metadata.semanticTags.join(', ')}`);
        }
      } else {
        logWarning('No chunks retrieved');
      }
    } catch (error) {
      logError(`Chunk retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async testSearchFunctionality() {
    if (TEST_CONFIG.skipSupabase || TEST_CONFIG.skipOpenAI || !this.searchService) {
      logWarning('Skipping search test (missing Supabase or OpenAI)');
      return;
    }
    
    logSection('Testing Search Functionality');
    
    const testQueries = [
      'SQL injection vulnerability',
      'middleware pattern architecture', 
      'error handling improvements',
      'performance bottlenecks',
      'dependency updates'
    ];
    
    for (const query of testQueries) {
      log(`\nSearching for: "${query}"`);
      
      try {
        // Use the unified search service with automatic threshold selection
        const searchResult = await this.searchService.search(query, {
          repositoryId: TEST_CONFIG.repositoryId,
          maxResults: 5,
          similarityThreshold: 'auto' // Let it choose automatically
        });
        
        const results = searchResult.results;
        
        if (results.length > 0) {
          logSuccess(`Found ${results.length} similar chunks`);
          log(`Selected threshold: ${searchResult.selectedThreshold} (${searchResult.reasoning})`);
          log(`Top result (similarity: ${results[0].similarity.toFixed(3)}):`);
          log(`"${results[0].content.substring(0, 150)}..."`);
          this.testResults.retrieval = true;
        } else {
          logWarning('No similar chunks found');
          log(`Threshold used: ${searchResult.selectedThreshold} (${searchResult.reasoning})`);
        }
      } catch (error) {
        logError(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async testPipelineStatistics() {
    if (TEST_CONFIG.skipSupabase || !this.pipeline) {
      logWarning('Skipping statistics test (no Supabase or pipeline)');
      return;
    }
    
    logSection('Testing Pipeline Statistics');
    
    try {
      const stats = await this.pipeline.getPipelineStats(TEST_CONFIG.repositoryId);
      
      log('Storage Statistics:');
      log(`- Total chunks: ${stats.storageStats.totalChunks}`);
      log(`- By type: ${JSON.stringify(stats.storageStats.byType)}`);
      log(`- By source: ${JSON.stringify(stats.storageStats.bySource)}`);
      log(`- By storage: ${JSON.stringify(stats.storageStats.byStorage)}`);
      
      log('\nEmbedding Cache Statistics:');
      log(`- Cache size: ${stats.embeddingCacheStats.size}`);
      log(`- Max size: ${stats.embeddingCacheStats.maxSize}`);
      log(`- Hit rate: ${(stats.embeddingCacheStats.hitRate * 100).toFixed(2)}%`);
      
      logSuccess('Statistics retrieved successfully');
    } catch (error) {
      logError(`Statistics retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private printTestSummary() {
    logSection('Test Summary');
    
    const tests = [
      { name: 'Preprocessing', passed: this.testResults.preprocessing },
      { name: 'Chunking', passed: this.testResults.chunking },
      { name: 'Enhancement', passed: this.testResults.enhancement },
      { name: 'Embedding', passed: TEST_CONFIG.skipOpenAI ? null : this.testResults.embedding },
      { name: 'Storage', passed: TEST_CONFIG.skipSupabase ? null : this.testResults.storage },
      { name: 'Retrieval', passed: (TEST_CONFIG.skipSupabase || TEST_CONFIG.skipOpenAI) ? null : this.testResults.retrieval }
    ];
    
    tests.forEach(test => {
      if (test.passed === null) {
        logWarning(`${test.name}: SKIPPED`);
      } else if (test.passed) {
        logSuccess(`${test.name}: PASSED`);
      } else {
        logError(`${test.name}: FAILED`);
      }
    });
    
    const totalTests = tests.filter(t => t.passed !== null).length;
    const passedTests = tests.filter(t => t.passed === true).length;
    const skippedTests = tests.filter(t => t.passed === null).length;
    
    console.log(`\n${colors.bright}Overall: ${passedTests}/${totalTests} tests passed (${skippedTests} skipped)${colors.reset}`);
    
    if (passedTests === totalTests) {
      logSuccess('\n🎉 All tests passed! The Vector Database Ingestion Pipeline is working correctly.');
    } else {
      logWarning('\n⚠️  Some tests failed. Please check the logs above for details.');
    }
  }
}

// Run tests
async function main() {
  const harness = new VectorDatabaseTestHarness();
  
  try {
    await harness.runAllTests();
  } catch (error) {
    logError(`Test suite failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  }
}

// Execute
main().catch(console.error);
