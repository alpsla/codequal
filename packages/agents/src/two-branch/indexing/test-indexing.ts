import { RepositoryIndexer } from './RepositoryIndexer';
import { DualBranchIndexer } from './DualBranchIndexer';
import { AnalysisCacheService } from '../cache/AnalysisCacheService';
import * as fs from 'fs';
import * as path from 'path';

async function testIndexing() {
  console.log('🧪 Testing Two-Branch Indexing Implementation...\n');
  
  // Use the current repository as test data
  const testRepoPath = path.resolve(__dirname, '../../../..'); // packages/agents directory
  const testRepoUrl = 'https://github.com/test/codequal';
  
  // Test 1: Basic Repository Indexer
  console.log('1️⃣ Testing RepositoryIndexer...');
  const cacheService = new AnalysisCacheService({
    keyPrefix: 'test-indexing:'
  });
  const indexer = new RepositoryIndexer(cacheService);
  
  try {
    const index = await indexer.buildIndex(
      testRepoPath,
      testRepoUrl,
      'main',
      {
        includeContent: false,
        maxFileSize: 100000 // 100KB
      }
    );
    
    console.log('   Repository indexed:', index.stats.totalFiles > 0 ? '✅' : '❌');
    console.log(`   Files found: ${index.stats.totalFiles}`);
    console.log(`   Total lines: ${index.stats.totalLines}`);
    console.log(`   Languages: ${Array.from(index.stats.languages.keys()).slice(0, 5).join(', ')}`);
    
    // Test file lookup
    const testFile = Array.from(index.fileSet).find(f => f.endsWith('.ts'));
    if (testFile) {
      const exists = indexer.fileExists(index, testFile);
      const metadata = indexer.getFileMetadata(index, testFile);
      console.log('   File lookup:', exists && metadata ? '✅' : '❌');
      
      // Test line validation
      const validLine = indexer.isValidLineNumber(index, testFile, 1);
      const invalidLine = indexer.isValidLineNumber(index, testFile, 999999);
      console.log('   Line validation:', validLine && !invalidLine ? '✅' : '❌');
    }
    
    // Test language filtering
    const tsFiles = indexer.getFilesByLanguage(index, 'typescript');
    console.log(`   TypeScript files: ${tsFiles.length}`);
    
  } catch (error) {
    console.error('   Error indexing repository:', error);
  }
  
  // Test 2: Dual Branch Indexer
  console.log('\n2️⃣ Testing DualBranchIndexer...');
  const dualIndexer = new DualBranchIndexer(cacheService);
  
  // For testing, we'll use the same path for both "branches"
  // In real usage, these would be different checkouts
  try {
    const dualIndices = await dualIndexer.buildDualIndices(
      testRepoUrl,
      {
        main: testRepoPath,
        pr: testRepoPath
      },
      {
        main: 'main',
        pr: 'feature-branch'
      },
      {
        parallel: true,
        includeContent: false
      }
    );
    
    console.log('   Dual indexing completed:', dualIndices ? '✅' : '❌');
    console.log(`   Main branch: ${dualIndices.main.stats.totalFiles} files`);
    console.log(`   PR branch: ${dualIndices.pr.stats.totalFiles} files`);
    
    // Since we're using the same repo for both, everything should be unchanged
    console.log(`   Diff analysis:`);
    console.log(`     - Added: ${dualIndices.diff.added.size}`);
    console.log(`     - Removed: ${dualIndices.diff.removed.size}`);
    console.log(`     - Modified: ${dualIndices.diff.modified.size}`);
    console.log(`     - Unchanged: ${dualIndices.diff.unchanged.size}`);
    console.log(`     - Moved: ${dualIndices.diff.moved.size}`);
    
    // Test cross-reference
    const firstFile = Array.from(dualIndices.main.fileSet)[0];
    const mapping = dualIndices.crossReference.get(firstFile);
    console.log('   Cross-reference:', mapping ? '✅' : '❌');
    
    // Test impact score
    const impactScore = dualIndexer.calculateImpactScore(dualIndices);
    console.log(`   Impact score: ${impactScore.toFixed(2)}/100`);
    
    // Test changed files retrieval
    const changedFiles = dualIndexer.getChangedFiles(dualIndices);
    console.log(`   Changed files tracking: ${changedFiles.length === 0 ? '✅' : '❌'} (expecting 0 for same repo)`);
    
  } catch (error) {
    console.error('   Error in dual indexing:', error);
  }
  
  // Test 3: Cache Performance
  console.log('\n3️⃣ Testing Cache Performance...');
  const startTime = Date.now();
  
  // First call should build index
  await indexer.buildIndex(testRepoPath, testRepoUrl, 'main');
  const firstCallTime = Date.now() - startTime;
  
  // Second call should use cache
  const cacheStartTime = Date.now();
  await indexer.buildIndex(testRepoPath, testRepoUrl, 'main');
  const cacheCallTime = Date.now() - cacheStartTime;
  
  console.log(`   First indexing: ${firstCallTime}ms`);
  console.log(`   Cached retrieval: ${cacheCallTime}ms`);
  console.log(`   Cache speedup: ${(firstCallTime / Math.max(1, cacheCallTime)).toFixed(1)}x`);
  console.log('   Cache working:', cacheCallTime < firstCallTime / 2 ? '✅' : '❌');
  
  // Cleanup
  await cacheService.disconnect();
  
  console.log('\n✅ All indexing tests completed!');
}

// Run tests
testIndexing().catch(console.error);