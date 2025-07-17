import { DeepWikiManager } from './src/services/deepwiki-manager';

async function testDirectDeepWiki() {
  console.log('=== Testing Direct DeepWiki Clone ===\n');
  
  // Create test user
  const testUser = {
    id: 'test-user-123',
    email: 'test@codequal.dev',
    githubUsername: 'test',
    role: 'admin' as const,
    createdAt: new Date()
  };
  
  // Create DeepWiki manager
  const deepWikiManager = new DeepWikiManager(testUser);
  
  // Test repositories
  const tests = [
    {
      name: 'GitHub Feature Branch',
      repo: 'https://github.com/facebook/react',
      branch: 'feature/react-19-rc',
      desc: 'Should trigger local clone'
    },
    {
      name: 'GitLab Repository',
      repo: 'https://gitlab.com/gitlab-org/gitlab',
      branch: 'main',
      desc: 'Should trigger local clone (GitLab)'
    }
  ];
  
  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`Repo: ${test.repo}`);
    console.log(`Branch: ${test.branch}`);
    console.log(`Expected: ${test.desc}`);
    console.log('-'.repeat(50));
    
    try {
      const jobId = await deepWikiManager.triggerRepositoryAnalysis(test.repo, {
        branch: test.branch
      });
      
      console.log(`✓ Analysis triggered with job ID: ${jobId}`);
      console.log('  Waiting for completion...');
      
      // Wait a bit to see logs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get cached files to verify
      const cachedFiles = await deepWikiManager.getCachedRepositoryFiles(test.repo, test.branch);
      console.log(`✓ Cached files: ${cachedFiles.length} files`);
      
      if (cachedFiles.length > 0) {
        console.log('  Sample files:');
        cachedFiles.slice(0, 3).forEach(file => {
          console.log(`    - ${file.path}`);
        });
      }
      
    } catch (error) {
      console.error(`✗ Error: ${error.message}`);
    }
  }
  
  console.log('\n=== Test Complete ===');
  process.exit(0);
}

// Run test
testDirectDeepWiki().catch(console.error);