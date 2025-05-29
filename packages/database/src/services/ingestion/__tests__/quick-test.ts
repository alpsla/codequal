import { PreprocessingService } from './preprocessing.service';
import { HierarchicalChunker } from './chunking.service';
import { InputSource, DeepWikiReport, ArchitectureAnalysis, CodeQualityAnalysis, SecurityAnalysis, DependencyAnalysis, PerformanceAnalysis, AnalysisMetadata, SourceMetadata } from './types';

// Simple test data
const testInput: InputSource = {
  type: 'deepwiki_analysis',
  content: {
    repositoryUrl: 'https://github.com/test/repo',
    repositoryName: 'test-repo',
    analysisDate: new Date(),
    model: 'gpt-4',
    overallScore: 7.5,
    sections: {
      architecture: {
        score: 8,
        summary: 'Good architecture',
        findings: [{
          id: '1',
          title: 'Test Issue',
          description: 'Test description',
          severity: 'high' as const,
          category: 'Test',
          filePath: 'test.ts',
          recommendation: 'Fix it',
          tags: ['test']
        }],
        recommendations: ['Consider modularizing the codebase']
      } as ArchitectureAnalysis,
      codeQuality: {
        score: 7.5,
        summary: 'Good code quality overall',
        findings: [],
        metrics: {
          complexity: 15,
          maintainability: 75,
          testCoverage: 80
        }
      } as CodeQualityAnalysis,
      security: {
        score: 8.5,
        summary: 'Secure implementation',
        findings: [],
        vulnerabilities: []
      } as SecurityAnalysis,
      dependencies: {
        score: 7,
        summary: 'Dependencies are mostly up to date',
        directDependencies: 20,
        devDependencies: 10,
        outdated: 2,
        vulnerabilities: 0,
        findings: []
      } as DependencyAnalysis,
      performance: {
        score: 7.8,
        summary: 'Good performance characteristics',
        findings: [],
        metrics: {
          bundleSize: 500,
          loadTime: 1.2,
          memoryUsage: 128
        }
      } as PerformanceAnalysis
    },
    metadata: {
      primaryLanguage: 'typescript',
      languages: { typescript: 100 },
      frameworks: ['react'],
      totalFiles: 100,
      totalLines: 1000,
      analyzedFiles: 90,
      processingTime: 5000
    } as AnalysisMetadata
  } as DeepWikiReport,
  metadata: {
    sourceId: 'test-001',
    timestamp: new Date(),
    version: '1.0',
    tags: ['test']
  } as SourceMetadata,
  repositoryId: 'test-repo-id'
};

async function quickTest() {
  console.log('🧪 Quick Test of Preprocessing and Chunking\n');
  
  try {
    const preprocessor = new PreprocessingService();
    const chunker = new HierarchicalChunker();
    
    console.log('1. Preprocessing...');
    const preprocessed = await preprocessor.preprocess(testInput);
    console.log('✅ Preprocessing successful');
    console.log(`   - Sections: ${preprocessed.structure.sections.length}`);
    console.log(`   - Source type: ${preprocessed.sourceType}`);
    
    console.log('\n2. Chunking...');
    const chunks = await chunker.chunk(preprocessed);
    console.log('✅ Chunking successful');
    console.log(`   - Total chunks: ${chunks.length}`);
    console.log(`   - Overview: ${chunks.filter(c => c.type === 'overview').length}`);
    console.log(`   - Sections: ${chunks.filter(c => c.type === 'section').length}`);
    console.log(`   - Items: ${chunks.filter(c => c.type === 'item').length}`);
    
    console.log('\n✨ Services are working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickTest();
