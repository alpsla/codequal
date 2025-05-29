#!/usr/bin/env ts-node

import { PreprocessingService } from '../preprocessing.service';
import { HierarchicalChunker } from '../chunking.service';
import { ContentEnhancer } from '../content-enhancer.service';
import { DeepWikiMarkdownParser } from '../deepwiki-parser';
import * as fs from 'fs';
import * as path from 'path';

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

function logSection(title: string) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  ${title}${colors.reset}`);
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

async function testPipelineWithoutExternalServices() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Vector Database Pipeline Test (No External Services)       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const preprocessor = new PreprocessingService();
  const chunker = new HierarchicalChunker();
  const enhancer = new ContentEnhancer();
  const parser = new DeepWikiMarkdownParser();

  // Test with a sample report
  const testReportPath = '/Users/alpinro/Code Prjects/codequal/archive/deepwiki_comprehensive_archive_20250523_210530/scripts/deepwiki-integration/analysis-results/comprehensive-fallback-express-20250523_141551/attempt-4-openai-gpt-4-turbo/express_comprehensive_analysis.md';

  if (!fs.existsSync(testReportPath)) {
    logError(`Test report not found at: ${testReportPath}`);
    return;
  }

  try {
    // 1. Load and parse the report
    logSection('1. Loading and Parsing DeepWiki Report');
    const markdownContent = fs.readFileSync(testReportPath, 'utf-8');
    logInfo(`Report size: ${(markdownContent.length / 1024).toFixed(2)} KB`);

    const deepwikiReport = parser.parseMarkdownReport(markdownContent);
    logSuccess(`Parsed report: ${deepwikiReport.repositoryName}`);
    logInfo(`Model: ${deepwikiReport.model}`);
    logInfo(`Overall Score: ${deepwikiReport.overallScore}/10`);
    logInfo(`Total issues: ${deepwikiReport.metadata.issues?.total || 0}`);

    // 2. Preprocess the content
    logSection('2. Preprocessing Content');
    const preprocessed = await preprocessor.preprocess({
      content: deepwikiReport,
      type: 'deepwiki_analysis',
      metadata: {
        sourceId: 'test-report',
        timestamp: new Date()
      },
      repositoryId: 'test-repo'
    });

    logSuccess('Content preprocessed');
    logInfo(`Clean content length: ${preprocessed.cleanContent.length} chars`);
    logInfo(`Code blocks found: ${preprocessed.codeBlocks.length}`);
    logInfo(`Key elements: ${preprocessed.keyElements.length}`);
    
    // Show sample key elements
    if (preprocessed.keyElements.length > 0) {
      console.log('\nSample key elements:');
      preprocessed.keyElements.slice(0, 3).forEach(element => {
        console.log(`  - ${element.type}: ${element.content.substring(0, 50)}...`);
      });
    }

    // 3. Create chunks
    logSection('3. Creating Chunks');
    const chunks = await chunker.chunk(preprocessed);
    
    logSuccess(`Created ${chunks.length} chunks`);
    
    // Analyze chunk types
    const chunkTypes = chunks.reduce((acc, chunk) => {
      acc[chunk.type] = (acc[chunk.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nChunk distribution:');
    Object.entries(chunkTypes).forEach(([type, count]) => {
      console.log(`  ${colors.cyan}${type}${colors.reset}: ${count}`);
    });
    
    // Show sample chunks
    console.log('\nSample chunks:');
    chunks.slice(0, 3).forEach((chunk, i) => {
      console.log(`\n  Chunk ${i + 1}:`);
      console.log(`    Type: ${chunk.type}`);
      console.log(`    Level: ${chunk.level}`);
      console.log(`    Content: ${chunk.content.substring(0, 100)}...`);
      if (chunk.metadata.severity) {
        console.log(`    Severity: ${chunk.metadata.severity}`);
      }
    });

    // 4. Enhance chunks
    logSection('4. Enhancing Chunks');
    const enhancedChunks = await enhancer.enhanceChunks(chunks, {
      repository: 'express',
      analysisType: 'deepwiki_analysis',
      language: 'javascript'
    });
    
    logSuccess(`Enhanced ${enhancedChunks.length} chunks`);
    
    // Analyze enhancements
    let totalQuestions = 0;
    let totalTags = 0;
    let chunksWithCode = 0;
    
    enhancedChunks.forEach(chunk => {
      totalQuestions += chunk.metadata.potentialQuestions.length;
      totalTags += chunk.metadata.semanticTags.length;
      if (chunk.metadata.codeReferences.files.length > 0) {
        chunksWithCode++;
      }
    });
    
    logInfo(`Total questions generated: ${totalQuestions}`);
    logInfo(`Total semantic tags: ${totalTags}`);
    logInfo(`Chunks with code references: ${chunksWithCode}`);
    
    // Show sample enhanced content
    console.log('\nSample enhanced chunk:');
    const sampleChunk = enhancedChunks.find(c => c.metadata.severity === 'high') || enhancedChunks[0];
    if (sampleChunk) {
      console.log(`  Type: ${sampleChunk.type}`);
      console.log(`  Original length: ${sampleChunk.content.length} chars`);
      console.log(`  Enhanced length: ${sampleChunk.enhancedContent.length} chars`);
      console.log(`  Semantic tags: ${sampleChunk.metadata.semanticTags.slice(0, 5).join(', ')}`);
      console.log(`  Sample questions:`);
      sampleChunk.metadata.potentialQuestions.slice(0, 3).forEach(q => {
        console.log(`    - ${q}`);
      });
    }

    // 5. Summary
    logSection('Test Summary');
    logSuccess('All pipeline stages completed successfully!');
    
    console.log('\nPipeline Statistics:');
    console.log(`  📄 Input: ${deepwikiReport.repositoryName} analysis`);
    console.log(`  📊 Score: ${deepwikiReport.overallScore}/10`);
    console.log(`  📦 Chunks: ${chunks.length} created`);
    console.log(`  ✨ Enhancements: ${totalQuestions} questions, ${totalTags} tags`);
    console.log(`  💻 Code references: ${chunksWithCode} chunks`);
    
    console.log(`\n${colors.green}🎉 The ingestion pipeline is working correctly!${colors.reset}`);
    console.log(`${colors.cyan}Note: This test runs without OpenAI or Supabase dependencies.${colors.reset}`);

  } catch (error) {
    logError(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testPipelineWithoutExternalServices().catch(console.error);