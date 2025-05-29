// Quick test to verify our services work
console.log('Testing preprocessing and chunking services...\n');

try {
  // Test imports
  console.log('1. Testing imports...');
  const { PreprocessingService } = require('./dist/services/ingestion/preprocessing.service');
  const { HierarchicalChunker } = require('./dist/services/ingestion/chunking.service');
  console.log('✅ Imports successful\n');

  // Test instantiation
  console.log('2. Testing instantiation...');
  const preprocessor = new PreprocessingService();
  const chunker = new HierarchicalChunker();
  console.log('✅ Services instantiated\n');

  // Test basic functionality
  console.log('3. Testing basic preprocessing...');
  const mockInput = {
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
          summary: 'Test summary',
          findings: []
        }
      },
      metadata: {
        primaryLanguage: 'typescript',
        frameworks: ['react'],
        totalFiles: 100,
        totalLines: 1000,
        issues: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          total: 0
        }
      }
    },
    metadata: { source: 'deepwiki', timestamp: new Date() }
  };

  preprocessor.preprocess(mockInput).then(result => {
    console.log('✅ Preprocessing works!');
    console.log(`   - Source type: ${result.sourceType}`);
    console.log(`   - Sections: ${result.structure.sections.length}`);
    
    // Test chunking
    console.log('\n4. Testing chunking...');
    return chunker.chunk(result);
  }).then(chunks => {
    console.log('✅ Chunking works!');
    console.log(`   - Total chunks: ${chunks.length}`);
    console.log(`   - Chunk types: ${[...new Set(chunks.map(c => c.type))].join(', ')}`);
    console.log('\n🎉 All basic tests passed!');
  }).catch(error => {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  });

} catch (error) {
  console.error('❌ Failed to load services:', error.message);
  console.error('\nMake sure to run "npm run build" first!');
}
