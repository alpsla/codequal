import { PreprocessingService } from '../preprocessing.service';
import { HierarchicalChunker } from '../chunking.service';
import { loadRealDeepWikiReport } from '../deepwiki-parser';
import { InputSource } from '../types';
import * as path from 'path';

describe('Real DeepWiki Report Processing', () => {
  let preprocessor: PreprocessingService;
  let chunker: HierarchicalChunker;
  
  const realReportPath = '/Users/alpinro/Code Prjects/codequal/archive/deepwiki_comprehensive_archive_20250523_210530/scripts/deepwiki-integration/analysis-results/express-google-gemini-2.5-flash-preview-05-20-thinking-20250523_124906/express_comprehensive_analysis.md';
  const gpt4ReportPath = '/Users/alpinro/Code Prjects/codequal/archive/deepwiki_comprehensive_archive_20250523_210530/scripts/deepwiki-integration/analysis-results/comprehensive-fallback-express-20250523_141551/attempt-4-openai-gpt-4-turbo/express_comprehensive_analysis.md';

  beforeEach(() => {
    preprocessor = new PreprocessingService();
    chunker = new HierarchicalChunker();
  });

  describe('Processing Real Express.js Analysis', () => {
    it('should successfully parse and process the real DeepWiki report', async () => {
      // Load and parse the real report
      const deepwikiReport = await loadRealDeepWikiReport(realReportPath);
      
      // Basic validation of parsed report
      expect(deepwikiReport).toBeDefined();
      expect(deepwikiReport.repositoryUrl).toBe('https://github.com/expressjs/express');
      expect(deepwikiReport.repositoryName).toBe('express');
      expect(deepwikiReport.overallScore).toBe(7);
      expect(deepwikiReport.model).toContain('gemini-2.5-flash');
      
      // Check sections
      expect(deepwikiReport.sections.architecture).toBeDefined();
      expect(deepwikiReport.sections.architecture.score).toBe(8);
      expect(deepwikiReport.sections.security.score).toBe(6);
      
      console.log('\n📊 Parsed DeepWiki Report:');
      console.log(`   Repository: ${deepwikiReport.repositoryName}`);
      console.log(`   Overall Score: ${deepwikiReport.overallScore}/10`);
      console.log(`   Model: ${deepwikiReport.model}`);
      console.log(`   Issues found: ${JSON.stringify(deepwikiReport.metadata.issues)}`);
    });

    it('should preprocess the real report correctly', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(realReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'express'
      };

      const preprocessed = await preprocessor.preprocess(input);
      
      expect(preprocessed).toBeDefined();
      expect(preprocessed.sourceType).toBe('deepwiki_analysis');
      expect(preprocessed.structure.sections).toHaveLength(5);
      
      // Check that real issues were extracted
      const totalItems = preprocessed.structure.sections.reduce(
        (sum, section) => sum + (section.items?.length || 0), 0
      );
      expect(totalItems).toBeGreaterThan(0);
      
      console.log('\n🔍 Preprocessing Results:');
      console.log(`   Sections: ${preprocessed.structure.sections.length}`);
      console.log(`   Total items: ${totalItems}`);
      console.log(`   Code blocks: ${preprocessed.codeBlocks.length}`);
      
      // Log section details
      preprocessed.structure.sections.forEach(section => {
        console.log(`   - ${section.title}: ${section.items?.length || 0} items`);
      });
    });

    it('should create appropriate chunks from the real report', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(realReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'express'
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);
      
      // Verify chunk creation (should have at least 5 sections + 1 overview + some items)
      expect(chunks.length).toBeGreaterThan(5);
      
      const overviewChunks = chunks.filter(c => c.type === 'overview');
      const sectionChunks = chunks.filter(c => c.type === 'section');
      const itemChunks = chunks.filter(c => c.type === 'item');
      const groupChunks = chunks.filter(c => c.type === 'group');
      
      expect(overviewChunks).toHaveLength(1);
      expect(sectionChunks).toHaveLength(5);
      expect(itemChunks.length + groupChunks.length).toBeGreaterThan(0);
      
      console.log('\n📦 Chunking Results:');
      console.log(`   Total chunks: ${chunks.length}`);
      console.log(`   Overview: ${overviewChunks.length}`);
      console.log(`   Sections: ${sectionChunks.length}`);
      console.log(`   Individual items: ${itemChunks.length}`);
      console.log(`   Grouped items: ${groupChunks.length}`);
      
      // Check security issues (should have high priority)
      const securityChunks = chunks.filter(c => 
        c.metadata.sectionName === 'Security' && c.type === 'item'
      );
      console.log(`   Security issues (individual chunks): ${securityChunks.length}`);
      
      // Verify specific content
      const inputValidationChunk = chunks.find(c => 
        c.content.includes('input validation')
      );
      expect(inputValidationChunk).toBeDefined();
      if (inputValidationChunk) {
        console.log('\n🔒 Sample Security Chunk:');
        console.log(`   Type: ${inputValidationChunk.type}`);
        console.log(`   Severity: ${inputValidationChunk.metadata.severity}`);
        console.log(`   Has code: ${inputValidationChunk.metadata.hasCode}`);
        console.log(`   File path: ${inputValidationChunk.metadata.filePaths?.[0]}`);
      }
    });

    it('should handle real code examples correctly', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(realReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'express'
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);
      
      // Find chunks with code examples
      const chunksWithCode = chunks.filter(c => c.metadata.hasCode);
      expect(chunksWithCode.length).toBeGreaterThan(0);
      
      console.log(`\n💻 Code Examples Found: ${chunksWithCode.length}`);
      
      // Check a specific code example
      const routerChunk = chunks.find(c => 
        c.content.includes('lib/router/index.js')
      );
      
      if (routerChunk) {
        console.log('\n📄 Sample Chunk with Code:');
        console.log(routerChunk.content.substring(0, 500) + '...');
      }
    });

    it('should properly categorize issues by severity', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(realReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'express'
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);
      
      // Count chunks by severity
      const severityCounts = {
        critical: chunks.filter(c => c.metadata.severity === 'critical').length,
        high: chunks.filter(c => c.metadata.severity === 'high').length,
        medium: chunks.filter(c => c.metadata.severity === 'medium').length,
        low: chunks.filter(c => c.metadata.severity === 'low').length
      };
      
      console.log('\n🎯 Issue Severity Distribution:');
      console.log(`   Critical: ${severityCounts.critical}`);
      console.log(`   High: ${severityCounts.high}`);
      console.log(`   Medium: ${severityCounts.medium}`);
      console.log(`   Low: ${severityCounts.low}`);
      
      // Verify that high priority issues get individual chunks
      const highPriorityItems = chunks.filter(c => 
        c.type === 'item' && 
        (c.metadata.severity === 'critical' || c.metadata.severity === 'high')
      );
      
      console.log(`   High priority individual chunks: ${highPriorityItems.length}`);
      
      // Check that lower priority items are grouped
      const groupedMediumLow = chunks.filter(c => 
        c.type === 'group' && 
        (c.metadata.severity === 'medium' || c.metadata.severity === 'low')
      );
      
      console.log(`   Medium/Low grouped chunks: ${groupedMediumLow.length}`);
    });

    it('should extract actionable recommendations', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(realReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'express'
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);
      
      // Find chunks with actionable recommendations
      const actionableChunks = chunks.filter(c => c.metadata.actionable);
      expect(actionableChunks.length).toBeGreaterThan(0);
      
      console.log(`\n✅ Actionable Items: ${actionableChunks.length}`);
      
      // Show a sample recommendation
      const recommendationChunk = actionableChunks[0];
      if (recommendationChunk) {
        const recommendationMatch = recommendationChunk.content.match(/### Recommendation\n(.+?)(?=\n|$)/);
        if (recommendationMatch) {
          console.log(`   Sample: "${recommendationMatch[1]}"`);
        }
      }
    });

    it('should maintain proper chunk relationships', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(realReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'express'
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);
      
      // Verify all relationships are valid
      let validRelationships = true;
      let relationshipCount = 0;
      
      chunks.forEach(chunk => {
        chunk.relationships.forEach(rel => {
          relationshipCount++;
          const targetExists = chunks.some(c => c.id === rel.targetChunkId);
          if (!targetExists) {
            validRelationships = false;
            console.error(`Invalid relationship: ${chunk.id} -> ${rel.targetChunkId}`);
          }
        });
      });
      
      expect(validRelationships).toBe(true);
      console.log(`\n🔗 Total relationships: ${relationshipCount}`);
      
      // Check hierarchy
      const overview = chunks.find(c => c.type === 'overview');
      const architectureSection = chunks.find(c => 
        c.type === 'section' && c.metadata.sectionName === 'Architecture'
      );
      
      expect(overview).toBeDefined();
      expect(architectureSection).toBeDefined();
      
      // Architecture section should have overview as parent
      const hasOverviewParent = architectureSection?.relationships.some(
        rel => rel.type === 'parent' && rel.targetChunkId === overview?.id
      );
      expect(hasOverviewParent).toBe(true);
    });
  });

  describe('Performance with Real Data', () => {
    it('should process the report within reasonable time', async () => {
      const startTime = Date.now();
      
      const deepwikiReport = await loadRealDeepWikiReport(realReportPath);
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'express'
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`\n⏱️  Processing time: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      // Calculate some metrics
      const avgChunkSize = chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;
      const totalTokens = chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0);
      
      console.log(`   Average chunk size: ${Math.round(avgChunkSize)} characters`);
      console.log(`   Total estimated tokens: ${totalTokens}`);
    });
  });

  describe('Processing GPT-4 Turbo Express.js Analysis', () => {
    it('should successfully parse and process the GPT-4 Turbo DeepWiki report', async () => {
      // Load and parse the GPT-4 Turbo report
      const deepwikiReport = await loadRealDeepWikiReport(gpt4ReportPath);
      
      // Basic validation of parsed report
      expect(deepwikiReport).toBeDefined();
      expect(deepwikiReport.repositoryUrl).toBe('https://github.com/expressjs/express');
      expect(deepwikiReport.repositoryName).toBe('express');
      expect(deepwikiReport.model).toContain('gpt-4-turbo');
      
      console.log('\n📊 GPT-4 Turbo Parsed DeepWiki Report:');
      console.log(`   Repository: ${deepwikiReport.repositoryName}`);
      console.log(`   Overall Score: ${deepwikiReport.overallScore}/10`);
      console.log(`   Model: ${deepwikiReport.model}`);
      console.log(`   Issues found: ${JSON.stringify(deepwikiReport.metadata.issues)}`);
    });

    it('should preprocess the GPT-4 Turbo report correctly', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(gpt4ReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'test-repo-id'
      };

      const preprocessed = await preprocessor.preprocess(input);
      
      console.log('\n🔍 GPT-4 Turbo Preprocessing Results:');
      console.log(`   Sections: ${preprocessed.structure.sections.length}`);
      console.log(`   Total items: ${preprocessed.structure.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)}`);
      console.log(`   Code blocks: ${preprocessed.codeBlocks.length}`);
      
      preprocessed.structure.sections.forEach(section => {
        console.log(`   - ${section.title}: ${section.items?.length || 0} items`);
      });
      
      expect(preprocessed.structure.sections).toHaveLength(5);
      expect(preprocessed.codeBlocks.length).toBeGreaterThan(0);
    });

    it('should create appropriate chunks from the GPT-4 Turbo report', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(gpt4ReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'test-repo-id'
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);
      
      console.log('\n📦 GPT-4 Turbo Chunking Results:');
      console.log(`   Total chunks: ${chunks.length}`);
      console.log(`   Overview: ${chunks.filter(c => c.type === 'overview').length}`);
      console.log(`   Sections: ${chunks.filter(c => c.type === 'section').length}`);
      console.log(`   Individual items: ${chunks.filter(c => c.type === 'item').length}`);
      console.log(`   Grouped items: ${chunks.filter(c => c.type === 'group').length}`);
      
      // Should have at least 5 sections + 1 overview + some items
      expect(chunks.length).toBeGreaterThan(5);
      expect(chunks.filter(c => c.type === 'overview')).toHaveLength(1);
      expect(chunks.filter(c => c.type === 'section')).toHaveLength(5);
    });

    it('should handle GPT-4 Turbo code examples correctly', async () => {
      const deepwikiReport = await loadRealDeepWikiReport(gpt4ReportPath);
      
      const input: InputSource = {
        type: 'deepwiki_analysis',
        content: deepwikiReport,
        metadata: {
          sourceId: 'deepwiki',
          timestamp: new Date()
        },
        repositoryId: 'test-repo-id'
      };

      const preprocessed = await preprocessor.preprocess(input);
      const chunks = await chunker.chunk(preprocessed);
      
      // Find chunks with code examples
      const chunksWithCode = chunks.filter(c => c.metadata.hasCode);
      
      console.log(`\n💻 GPT-4 Turbo Code Examples Found: ${chunksWithCode.length}`);
      
      if (chunksWithCode.length > 0) {
        console.log('\n📄 Sample GPT-4 Turbo Chunk with Code:');
        console.log(chunksWithCode[0].content.substring(0, 300) + '...');
      }
      
      expect(chunksWithCode.length).toBeGreaterThan(0);
    });
  });
});

// Create a demo script that can be run independently
export async function runRealDataDemo() {
  console.log('🚀 Running Real DeepWiki Report Processing Demo\n');
  
  const preprocessor = new PreprocessingService();
  const chunker = new HierarchicalChunker();
  
  const reportPath = '/Users/alpinro/Code Prjects/codequal/archive/deepwiki_comprehensive_archive_20250523_210530/scripts/deepwiki-integration/analysis-results/express-google-gemini-2.5-flash-preview-05-20-thinking-20250523_124906/express_comprehensive_analysis.md';
  
  try {
    // Load report
    console.log('📄 Loading DeepWiki report...');
    const deepwikiReport = await loadRealDeepWikiReport(reportPath);
    console.log(`✅ Loaded report for ${deepwikiReport.repositoryName}`);
    console.log(`   Model: ${deepwikiReport.model}`);
    console.log(`   Overall Score: ${deepwikiReport.overallScore}/10`);
    
    // Create input
    const input: InputSource = {
      type: 'deepwiki_analysis',
      content: deepwikiReport,
      metadata: {
        sourceId: 'deepwiki',
        timestamp: new Date()
      }
    };
    
    // Preprocess
    console.log('\n🔍 Preprocessing...');
    const preprocessed = await preprocessor.preprocess(input);
    console.log(`✅ Preprocessed ${preprocessed.structure.sections.length} sections`);
    
    // Chunk
    console.log('\n📦 Creating chunks...');
    const chunks = await chunker.chunk(preprocessed);
    console.log(`✅ Created ${chunks.length} chunks`);
    
    // Show summary
    console.log('\n📊 Chunk Summary:');
    console.log(`   Overview: ${chunks.filter(c => c.type === 'overview').length}`);
    console.log(`   Sections: ${chunks.filter(c => c.type === 'section').length}`);
    console.log(`   Items: ${chunks.filter(c => c.type === 'item').length}`);
    console.log(`   Groups: ${chunks.filter(c => c.type === 'group').length}`);
    
    // Show a sample chunk
    const securityChunk = chunks.find(c => 
      c.metadata.sectionName === 'Security' && c.type === 'item'
    );
    
    if (securityChunk) {
      console.log('\n🔒 Sample Security Chunk:');
      console.log('-'.repeat(60));
      console.log(securityChunk.content);
      console.log('-'.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Uncomment to run the demo
// runRealDataDemo().catch(console.error);
