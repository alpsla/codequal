#!/usr/bin/env npx ts-node

/**
 * Test for Repository Utilities (OptimizedRepoManager and SmartFileSelector)
 * Validates that the factory pattern implementation works correctly
 */

import { RepositoryUtilsFactory } from './src/two-branch/utils/repository-utils-factory';

async function testRepositoryUtils() {
  console.log('🧪 Testing Repository Utilities Factory...\n');
  
  try {
    // Test 1: Get OptimizedRepoManager singleton
    console.log('1️⃣ Testing OptimizedRepoManager creation...');
    const repoManager = RepositoryUtilsFactory.getRepoManager({
      cacheDir: '/tmp/test-cache',
      workspaceDir: '/tmp/test-workspace'
    });
    
    if (repoManager) {
      console.log('   ✅ OptimizedRepoManager created successfully');
      console.log(`   📁 Instance type: ${repoManager.constructor.name}`);
    } else {
      throw new Error('Failed to create OptimizedRepoManager');
    }
    
    // Test 2: Get SmartFileSelector singleton
    console.log('\n2️⃣ Testing SmartFileSelector creation...');
    const fileSelector = RepositoryUtilsFactory.getFileSelector();
    
    if (fileSelector) {
      console.log('   ✅ SmartFileSelector created successfully');
      console.log(`   📁 Instance type: ${fileSelector.constructor.name}`);
    } else {
      throw new Error('Failed to create SmartFileSelector');
    }
    
    // Test 3: Verify singleton behavior
    console.log('\n3️⃣ Testing singleton behavior...');
    const repoManager2 = RepositoryUtilsFactory.getRepoManager();
    const fileSelector2 = RepositoryUtilsFactory.getFileSelector();
    
    if (repoManager === repoManager2) {
      console.log('   ✅ RepoManager singleton working correctly');
    } else {
      throw new Error('RepoManager singleton not working');
    }
    
    if (fileSelector === fileSelector2) {
      console.log('   ✅ FileSelector singleton working correctly');
    } else {
      throw new Error('FileSelector singleton not working');
    }
    
    // Test 4: Test non-singleton creation
    console.log('\n4️⃣ Testing non-singleton creation...');
    const newRepoManager = RepositoryUtilsFactory.createRepoManager();
    const newFileSelector = RepositoryUtilsFactory.createFileSelector();
    
    if (newRepoManager !== repoManager) {
      console.log('   ✅ New RepoManager instance created');
    } else {
      throw new Error('createRepoManager returned singleton');
    }
    
    if (newFileSelector !== fileSelector) {
      console.log('   ✅ New FileSelector instance created');
    } else {
      throw new Error('createFileSelector returned singleton');
    }
    
    // Test 5: Test reset functionality
    console.log('\n5️⃣ Testing reset functionality...');
    RepositoryUtilsFactory.reset();
    const repoManager3 = RepositoryUtilsFactory.getRepoManager();
    
    if (repoManager3 !== repoManager) {
      console.log('   ✅ Reset created new singleton instances');
    } else {
      throw new Error('Reset did not clear singletons');
    }
    
    // Test 6: Test with actual repository methods (smoke test)
    console.log('\n6️⃣ Testing actual methods (smoke test)...');
    
    // Test RepoManager methods exist
    if (typeof repoManager3.setupRepo === 'function') {
      console.log('   ✅ RepoManager.setupRepo method exists');
    }
    
    if (typeof repoManager3.createPRWorkspace === 'function') {
      console.log('   ✅ RepoManager.createPRWorkspace method exists');
    }
    
    // Test FileSelector methods exist
    const fileSelector3 = RepositoryUtilsFactory.getFileSelector();
    if (typeof fileSelector3.selectFiles === 'function') {
      console.log('   ✅ FileSelector.selectFiles method exists');
    }
    
    // Cleanup
    await RepositoryUtilsFactory.getRepoManager().close();
    
    console.log('\n🎉 All tests passed successfully!');
    console.log('✅ Repository utilities factory is working correctly\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRepositoryUtils().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});