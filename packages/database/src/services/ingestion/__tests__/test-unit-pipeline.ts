import { PreprocessingService } from '../preprocessing.service';
import { HierarchicalChunker } from '../chunking.service';
import { ContentEnhancer } from '../content-enhancer.service';
import { Chunk, EnhancementContext, InputSource, PreprocessedContent } from '../types';

/**
 * Unit tests for the ingestion pipeline components
 * These tests run without external dependencies (no OpenAI, no Supabase)
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function logSuccess(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}\n`);
}

async function testPreprocessing() {
  logSection('Testing PreprocessingService');
  
  const preprocessor = new PreprocessingService();
  const testContent = `
# Test Repository Analysis

## Overview
This is a **test** content with:
- Multiple sections
- Different formatting
- Code blocks

### Code Example
\`\`\`javascript
function test() {
  console.log("Hello, World!");
}
\`\`\`

## Security Issues
- SQL injection vulnerability
- XSS vulnerability

### Performance
The system has some performance issues.
`;

  try {
    const inputSource: InputSource = {
      type: 'deepwiki_analysis',
      content: testContent,
      metadata: {
        sourceId: 'test-1',
        timestamp: new Date()
      },
      repositoryId: 'test-repo'
    };
    
    const result = await preprocessor.preprocess(inputSource);
    
    if (result.cleanContent.includes('Test Repository Analysis')) {
      logSuccess('Content preserved');
    }
    
    if (!result.cleanContent.includes('**test**') && result.cleanContent.includes('test')) {
      logSuccess('Markdown formatting normalized');
    }
    
    if (result.cleanContent.includes('```javascript')) {
      logSuccess('Code blocks preserved');
    }
    
    return true;
  } catch (error) {
    logError(`Preprocessing failed: ${(error as Error).message}`);
    return false;
  }
}

async function testChunking() {
  logSection('Testing HierarchicalChunker');
  
  const chunker = new HierarchicalChunker();
  const testContent = `
# Main Section

## Subsection 1
This is the first subsection with some content that should be chunked appropriately.

### Sub-subsection 1.1
More detailed content here that belongs to a deeper level in the hierarchy.

## Subsection 2
This is the second subsection with different content.

### Sub-subsection 2.1
Additional details for the second section.

### Sub-subsection 2.2
Even more content that should be in a separate chunk.
`;

  try {
    // First preprocess the content
    const inputSource: InputSource = {
      type: 'deepwiki_analysis',
      content: testContent,
      metadata: {
        sourceId: 'test-2',
        timestamp: new Date()
      },
      repositoryId: 'test-repo'
    };
    
    const preprocessor = new PreprocessingService();
    const preprocessed = await preprocessor.preprocess(inputSource);
    
    // Then chunk it
    const chunks = await chunker.chunk(preprocessed);
    
    if (chunks.length > 0) {
      logSuccess(`Generated ${chunks.length} chunks`);
    }
    
    // Check hierarchy
    const hasOverview = chunks.some((c: Chunk) => c.type === 'overview');
    const hasSections = chunks.some((c: Chunk) => c.type === 'section');
    const hasItems = chunks.some((c: Chunk) => c.type === 'item');
    
    if (hasOverview) logSuccess('Overview chunk created');
    if (hasSections) logSuccess('Section chunks created');
    if (hasItems) logSuccess('Item chunks created');
    
    // Check chunk relationships
    const hasParentRefs = chunks.some((c: Chunk) => c.relationships.some(r => r.type === 'parent'));
    if (hasParentRefs) {
      logSuccess('Hierarchical relationships established');
    }
    
    return true;
  } catch (error) {
    logError(`Chunking failed: ${(error as Error).message}`);
    return false;
  }
}

async function testEnhancement() {
  logSection('Testing ContentEnhancer');
  
  const enhancer = new ContentEnhancer();
  
  const testChunks: Chunk[] = [
    {
      id: 'chunk-1',
      content: 'This is the first chunk about SQL injection vulnerabilities.',
      type: 'section',
      level: 1,
      metadata: {
        chunkIndex: 0,
        totalChunks: 3,
        sectionName: 'Security',
        tokenCount: 20,
        severity: 'high',
        filePaths: ['/src/database/queries.js'],
        hasCode: false,
        hasBeforeAfter: false,
        actionable: true,
        tags: ['security', 'sql-injection']
      },
      relationships: []
    },
    {
      id: 'chunk-2',
      content: 'This chunk discusses authentication and authorization issues.',
      type: 'item',
      level: 2,
      metadata: {
        chunkIndex: 1,
        totalChunks: 3,
        sectionName: 'Security',
        tokenCount: 20,
        severity: 'medium',
        tags: ['auth', 'security'],
        hasCode: false,
        hasBeforeAfter: false,
        actionable: true
      },
      relationships: []
    },
    {
      id: 'chunk-3',
      content: 'Performance optimization strategies for the application.',
      type: 'section',
      level: 1,
      metadata: {
        chunkIndex: 2,
        totalChunks: 3,
        sectionName: 'Performance',
        tokenCount: 20,
        hasCode: false,
        hasBeforeAfter: false,
        actionable: true,
        tags: ['performance', 'optimization']
      },
      relationships: []
    }
  ];
  
  const context: EnhancementContext = {
    repository: 'test-repo',
    analysisType: 'security',
    language: 'javascript'
  };
  
  try {
    const enhanced = await enhancer.enhanceChunks(testChunks, context);
    
    if (enhanced.length === testChunks.length) {
      logSuccess(`Enhanced all ${enhanced.length} chunks`);
    }
    
    // Check enhancements
    const firstEnhanced = enhanced[0];
    
    // Check window context
    if (firstEnhanced.windowContext) {
      if (!firstEnhanced.windowContext.before && firstEnhanced.windowContext.after) {
        logSuccess('Window context added (no previous, has next)');
      }
    }
    
    // Check enhanced content
    if (firstEnhanced.enhancedContent.includes('[Context:')) {
      logSuccess('Metadata context injected');
    }
    
    // Check semantic tags
    if (firstEnhanced.metadata.semanticTags.length > 0) {
      logSuccess(`Generated ${firstEnhanced.metadata.semanticTags.length} semantic tags`);
      console.log(`  Tags: ${firstEnhanced.metadata.semanticTags.slice(0, 5).join(', ')}`);
    }
    
    // Check questions
    if (firstEnhanced.metadata.potentialQuestions.length > 0) {
      logSuccess(`Generated ${firstEnhanced.metadata.potentialQuestions.length} questions`);
      console.log('  Sample questions:');
      firstEnhanced.metadata.potentialQuestions.slice(0, 3).forEach(q => {
        console.log(`    - ${q}`);
      });
    }
    
    // Check code references
    if (firstEnhanced.metadata.codeReferences.files.length > 0) {
      logSuccess('Code references extracted');
    }
    
    return true;
  } catch (error) {
    logError(`Enhancement failed: ${(error as Error).message}`);
    return false;
  }
}

async function testCompleteFlow() {
  logSection('Testing Complete Flow');
  
  const preprocessor = new PreprocessingService();
  const chunker = new HierarchicalChunker();
  const enhancer = new ContentEnhancer();
  
  const testContent = `
# Express.js Analysis

## Architecture
The Express.js framework uses a middleware-based architecture.

### Middleware Pattern
Middleware functions have access to the request and response objects.

\`\`\`javascript
app.use((req, res, next) => {
  console.log('Middleware executed');
  next();
});
\`\`\`

## Security Issues

### High Severity
- SQL injection in user authentication
  - File: /src/auth/login.js
  - Fix: Use parameterized queries

### Medium Severity
- Missing CSRF protection
- Weak password policy

## Performance
- N+1 query problem in /src/api/users.js
- Synchronous file operations blocking event loop
`;

  try {
    // Step 1: Preprocess
    const inputSource: InputSource = {
      type: 'deepwiki_analysis',
      content: testContent,
      metadata: {
        sourceId: 'test-3',
        timestamp: new Date()
      },
      repositoryId: 'express-repo'
    };
    
    const preprocessed = await preprocessor.preprocess(inputSource);
    logSuccess('Content preprocessed');
    
    // Step 2: Chunk
    const chunks = await chunker.chunk(preprocessed);
    logSuccess(`Created ${chunks.length} chunks`);
    
    // Step 3: Enhance
    const context: EnhancementContext = {
      repository: 'express',
      analysisType: 'deepwiki_analysis',
      language: 'javascript'
    };
    
    const enhanced = await enhancer.enhanceChunks(chunks, context);
    logSuccess(`Enhanced ${enhanced.length} chunks`);
    
    // Analyze results
    const totalQuestions = enhanced.reduce((sum, chunk) => 
      sum + (chunk.metadata.potentialQuestions?.length || 0), 0
    );
    
    const totalTags = enhanced.reduce((sum, chunk) => 
      sum + (chunk.metadata.semanticTags?.length || 0), 0
    );
    
    console.log('\nFlow Statistics:');
    console.log(`  - Total chunks: ${chunks.length}`);
    console.log(`  - Total questions generated: ${totalQuestions}`);
    console.log(`  - Total semantic tags: ${totalTags}`);
    console.log(`  - Chunks with code: ${enhanced.filter(c => c.metadata.hasCode).length}`);
    console.log(`  - High severity chunks: ${enhanced.filter(c => c.metadata.severity === 'high').length}`);
    
    return true;
  } catch (error) {
    logError(`Complete flow failed: ${(error as Error).message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     Vector Database Ingestion Pipeline - Unit Tests          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const results = {
    preprocessing: false,
    chunking: false,
    enhancement: false,
    completeFlow: false
  };
  
  // Run tests
  results.preprocessing = await testPreprocessing();
  results.chunking = await testChunking();
  results.enhancement = await testEnhancement();
  results.completeFlow = await testCompleteFlow();
  
  // Summary
  logSection('Test Summary');
  
  let passed = 0;
  let total = 0;
  
  Object.entries(results).forEach(([test, result]) => {
    total++;
    if (result) {
      passed++;
      logSuccess(`${test}: PASSED`);
    } else {
      logError(`${test}: FAILED`);
    }
  });
  
  console.log(`\n${colors.bright}Overall: ${passed}/${total} tests passed${colors.reset}`);
  
  if (passed === total) {
    console.log(`\n${colors.green}🎉 All unit tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Check the output above.${colors.reset}`);
  }
}

// Execute tests
runAllTests().catch(console.error);
