import { PreprocessingService } from '../preprocessing.service';
import { HierarchicalChunker } from '../chunking.service';
import { ContentEnhancer } from '../content-enhancer.service';
import { loadRealDeepWikiReport } from '../deepwiki-parser';
import { InputSource, EnhancementContext } from '../types';

/**
 * Standalone test script for DeepSeek Coder Express.js analysis report
 * Run with: npx ts-node test-deepseek-report.ts
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function logSubsection(title: string) {
  console.log(`\n${colors.cyan}--- ${title} ---${colors.reset}\n`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message: string, value?: any) {
  if (value !== undefined) {
    console.log(`${colors.yellow}📊 ${message}: ${colors.bright}${value}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}📊 ${message}${colors.reset}`);
  }
}

async function runDeepSeekReportTest() {
  logSection('DeepSeek Coder Express.js Report Ingestion Test');
  
  const preprocessor = new PreprocessingService();
  const chunker = new HierarchicalChunker();
  const enhancer = new ContentEnhancer();
  
  const reportPath = '/Users/alpinro/Code Prjects/codequal/archive/deepwiki_comprehensive_archive_20250523_210530/scripts/deepwiki-integration/analysis-results/comprehensive-fallback-express-20250523_141551/attempt-1-deepseek-deepseek-coder/express_comprehensive_analysis.md';
  
  try {
    // Step 1: Load the DeepSeek report
    logSubsection('Loading DeepSeek Coder Report');
    
    const deepwikiReport = await loadRealDeepWikiReport(reportPath);
    
    logSuccess('Report loaded successfully');
    logInfo('Repository', deepwikiReport.repositoryName);
    logInfo('Repository URL', deepwikiReport.repositoryUrl);
    logInfo('Overall Score', `${deepwikiReport.overallScore}/10`);
    logInfo('Model', deepwikiReport.model);
    logInfo('Analysis Date', deepwikiReport.analysisDate.toISOString());
    
    // Display section scores
    console.log('\n📈 Section Scores:');
    Object.entries(deepwikiReport.sections).forEach(([section, data]) => {
      console.log(`   ${colors.magenta}${section}${colors.reset}: ${data.score}/10`);
    });
    
    // Display issue counts
    if (deepwikiReport.metadata.issues) {
      console.log('\n🔍 Issues by Severity:');
      Object.entries(deepwikiReport.metadata.issues).forEach(([severity, count]) => {
        const color = severity === 'critical' ? colors.red : 
                     severity === 'high' ? colors.yellow :
                     severity === 'medium' ? colors.cyan : colors.green;
        console.log(`   ${color}${severity}${colors.reset}: ${count}`);
      });
    }
    
    // Step 2: Preprocess the content
    logSubsection('Preprocessing Content');
    
    const input: InputSource = {
      type: 'deepwiki_analysis',
      content: deepwikiReport,
      metadata: {
        sourceId: 'deepseek-test',
        timestamp: new Date()
      },
      repositoryId: 'express-deepseek'
    };
    
    const preprocessed = await preprocessor.preprocess(input);
    
    logSuccess('Content preprocessed');
    logInfo('Sections found', preprocessed.structure.sections.length);
    logInfo('Code blocks extracted', preprocessed.codeBlocks.length);
    
    // Show section details
    console.log('\n📑 Section Details:');
    preprocessed.structure.sections.forEach(section => {
      const itemCount = section.items?.length || 0;
      console.log(`   ${colors.magenta}${section.title}${colors.reset}: ${itemCount} items`);
    });
    
    // Step 3: Create chunks
    logSubsection('Creating Chunks');
    
    const chunks = await chunker.chunk(preprocessed);
    
    logSuccess(`Created ${chunks.length} chunks`);
    
    // Chunk type statistics
    const chunkTypes = {
      overview: chunks.filter(c => c.type === 'overview').length,
      section: chunks.filter(c => c.type === 'section').length,
      item: chunks.filter(c => c.type === 'item').length,
      group: chunks.filter(c => c.type === 'group').length
    };
    
    console.log('\n📦 Chunk Types:');
    Object.entries(chunkTypes).forEach(([type, count]) => {
      console.log(`   ${colors.cyan}${type}${colors.reset}: ${count}`);
    });
    
    // Severity distribution
    const severityCounts = {
      critical: chunks.filter(c => c.metadata.severity === 'critical').length,
      high: chunks.filter(c => c.metadata.severity === 'high').length,
      medium: chunks.filter(c => c.metadata.severity === 'medium').length,
      low: chunks.filter(c => c.metadata.severity === 'low').length
    };
    
    console.log('\n🎯 Chunk Severity Distribution:');
    Object.entries(severityCounts).forEach(([severity, count]) => {
      if (count > 0) {
        const color = severity === 'critical' ? colors.red : 
                     severity === 'high' ? colors.yellow :
                     severity === 'medium' ? colors.cyan : colors.green;
        console.log(`   ${color}${severity}${colors.reset}: ${count}`);
      }
    });
    
    // Code statistics
    const chunksWithCode = chunks.filter(c => c.metadata.hasCode);
    logInfo('\nChunks with code examples', chunksWithCode.length);
    
    // Step 4: Enhance chunks
    logSubsection('Enhancing Chunks');
    
    const context: EnhancementContext = {
      repository: 'express',
      analysisType: 'deepwiki_analysis',
      language: 'javascript'
    };
    
    const enhanced = await enhancer.enhanceChunks(chunks, context);
    
    logSuccess(`Enhanced ${enhanced.length} chunks`);
    
    // Enhancement statistics
    const totalQuestions = enhanced.reduce((sum, chunk) => 
      sum + (chunk.metadata.potentialQuestions?.length || 0), 0
    );
    
    const totalTags = enhanced.reduce((sum, chunk) => 
      sum + (chunk.metadata.semanticTags?.length || 0), 0
    );
    
    const chunksWithWindowContext = enhanced.filter(c => c.windowContext).length;
    
    logInfo('Total questions generated', totalQuestions);
    logInfo('Total semantic tags', totalTags);
    logInfo('Chunks with window context', chunksWithWindowContext);
    
    // Step 5: Show sample enhanced content
    logSubsection('Sample Enhanced Content');
    
    // Find a high-severity security chunk
    const securityChunk = enhanced.find(c => 
      c.metadata.sectionName === 'Security' && 
      c.metadata.severity === 'high' &&
      c.type === 'item'
    );
    
    if (securityChunk) {
      console.log(`\n${colors.bright}🔒 Sample Security Chunk:${colors.reset}`);
      console.log(`${colors.yellow}${'─'.repeat(60)}${colors.reset}`);
      console.log(`Type: ${securityChunk.type}`);
      console.log(`Section: ${securityChunk.metadata.sectionName}`);
      console.log(`Severity: ${colors.red}${securityChunk.metadata.severity}${colors.reset}`);
      console.log(`Has Code: ${securityChunk.metadata.hasCode ? 'Yes' : 'No'}`);
      
      if (securityChunk.metadata.filePaths?.length) {
        console.log(`Files: ${securityChunk.metadata.filePaths.join(', ')}`);
      }
      
      console.log(`\n${colors.bright}Original Content:${colors.reset}`);
      console.log(securityChunk.content.substring(0, 300) + '...');
      
      console.log(`\n${colors.bright}Enhanced Content Preview:${colors.reset}`);
      console.log(securityChunk.enhancedContent.substring(0, 400) + '...');
      
      if (securityChunk.metadata.semanticTags.length > 0) {
        console.log(`\n${colors.bright}Semantic Tags:${colors.reset}`);
        console.log(securityChunk.metadata.semanticTags.slice(0, 10).join(', '));
      }
      
      if (securityChunk.metadata.potentialQuestions.length > 0) {
        console.log(`\n${colors.bright}Potential Questions:${colors.reset}`);
        securityChunk.metadata.potentialQuestions.slice(0, 3).forEach((q, i) => {
          console.log(`${i + 1}. ${q}`);
        });
      }
    }
    
    // Find a chunk with code
    const codeChunk = enhanced.find(c => c.metadata.hasCode && c.content.includes('```'));
    
    if (codeChunk) {
      console.log(`\n${colors.bright}💻 Sample Chunk with Code:${colors.reset}`);
      console.log(`${colors.yellow}${'─'.repeat(60)}${colors.reset}`);
      console.log(`Section: ${codeChunk.metadata.sectionName}`);
      console.log(`Type: ${codeChunk.type}`);
      
      // Extract code block
      const codeMatch = codeChunk.content.match(/```[\w]*\n([\s\S]*?)```/);
      if (codeMatch) {
        console.log(`\n${colors.bright}Code Example:${colors.reset}`);
        console.log(`${colors.cyan}${codeMatch[1].trim()}${colors.reset}`);
      }
      
      if (codeChunk.metadata.codeReferences) {
        console.log(`\n${colors.bright}Code References:${colors.reset}`);
        if (codeChunk.metadata.codeReferences.files.length > 0) {
          console.log(`Files: ${codeChunk.metadata.codeReferences.files.join(', ')}`);
        }
        if (codeChunk.metadata.codeReferences.functions.length > 0) {
          console.log(`Functions: ${codeChunk.metadata.codeReferences.functions.join(', ')}`);
        }
      }
    }
    
    // Step 6: Final statistics
    logSubsection('Final Statistics');
    
    console.log(`\n${colors.bright}📊 Processing Summary:${colors.reset}`);
    console.log(`${colors.yellow}${'─'.repeat(60)}${colors.reset}`);
    console.log(`Repository: ${colors.bright}${deepwikiReport.repositoryName}${colors.reset}`);
    console.log(`Model: ${colors.bright}${deepwikiReport.model}${colors.reset}`);
    console.log(`Overall Score: ${colors.bright}${deepwikiReport.overallScore}/10${colors.reset}`);
    console.log('');
    console.log(`Preprocessing:`);
    console.log(`  • Sections: ${preprocessed.structure.sections.length}`);
    console.log(`  • Code blocks: ${preprocessed.codeBlocks.length}`);
    console.log('');
    console.log(`Chunking:`);
    console.log(`  • Total chunks: ${chunks.length}`);
    console.log(`  • Overview: ${chunkTypes.overview}`);
    console.log(`  • Sections: ${chunkTypes.section}`);
    console.log(`  • Items: ${chunkTypes.item}`);
    console.log(`  • Groups: ${chunkTypes.group}`);
    console.log('');
    console.log(`Enhancement:`);
    console.log(`  • Questions generated: ${totalQuestions}`);
    console.log(`  • Semantic tags: ${totalTags}`);
    console.log(`  • Avg questions/chunk: ${(totalQuestions / enhanced.length).toFixed(1)}`);
    console.log(`  • Avg tags/chunk: ${(totalTags / enhanced.length).toFixed(1)}`);
    
    // Memory estimation
    const totalSize = enhanced.reduce((sum, chunk) => 
      sum + chunk.content.length + chunk.enhancedContent.length, 0
    );
    console.log('');
    console.log(`Memory:`);
    console.log(`  • Total content size: ${(totalSize / 1024).toFixed(1)} KB`);
    console.log(`  • Avg chunk size: ${(totalSize / enhanced.length / 1024).toFixed(2)} KB`);
    
    logSuccess('\nDeepSeek report processing completed successfully! 🎉');
    
  } catch (error) {
    logError(`Error processing DeepSeek report: ${(error as Error).message}`);
    console.error(error);
  }
}

// Execute the test
console.log(`${colors.bright}${colors.blue}`);
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║        DeepSeek Coder Report Ingestion Test                  ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log(colors.reset);

runDeepSeekReportTest().catch(console.error);