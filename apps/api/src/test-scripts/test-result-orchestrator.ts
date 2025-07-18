import { config } from 'dotenv';
import { resolve } from 'path';
import type { AuthenticatedUser } from '../middleware/auth-middleware';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function testResultOrchestrator() {
  console.log('🧪 Testing Result Orchestrator (which uses DeepWiki)\n');
  
  try {
    // Import Result Orchestrator
    console.log('Importing Result Orchestrator...');
    const { ResultOrchestrator } = await import('../services/result-orchestrator.js');
    console.log('✅ Import successful');
    
    // Mock authenticated user
    const mockUser: AuthenticatedUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: ['read', 'write', 'analyze'],
      status: 'active',
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    };
    
    // Create orchestrator instance
    console.log('\nCreating Result Orchestrator...');
    const orchestrator = new ResultOrchestrator(mockUser);
    console.log('✅ Orchestrator created');
    
    // Test repository URL
    const testRepo = 'https://github.com/facebook/react';
    
    // Test options
    const options = {
      branch: 'main',
      includeDiff: false,
      skipCache: true // Force fresh analysis
    };
    
    console.log(`\nStarting analysis for ${testRepo}...`);
    console.log('This will test:');
    console.log('- Embedding service initialization');
    console.log('- DeepWiki manager initialization');
    console.log('- Vector DB connections');
    console.log('- Agent execution');
    
    // Create PR analysis request
    const request = {
      repositoryUrl: testRepo,
      prNumber: 123, // Mock PR number
      analysisMode: 'quick' as const,
      authenticatedUser: mockUser,
      ...options
    };
    
    // Start analysis
    const startTime = Date.now();
    const results = await orchestrator.analyzePR(request);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Analysis completed in ${(duration / 1000).toFixed(2)} seconds!`);
    
    // Check results
    console.log('\nResults summary:');
    console.log('- Repository:', results.repository?.url || 'N/A');
    console.log('- Status:', results.status || 'N/A');
    console.log('- Total Findings:', Object.values(results.findings).flat().length);
    console.log('- Security findings:', results.findings.security.length);
    console.log('- Architecture findings:', results.findings.architecture.length);
    console.log('- Performance findings:', results.findings.performance.length);
    console.log('- Code quality findings:', results.findings.codeQuality.length);
    if (results.findings.security.length > 0) {
      console.log('- First security finding:', results.findings.security[0].title);
    }
    
    console.log('\n✅ All systems working correctly!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    // Provide helpful error messages
    if (error.message.includes('OPENAI_API_KEY')) {
      console.error('\n💡 Solution: Set OPENAI_API_KEY in your .env file');
    }
    if (error.message.includes('embedding')) {
      console.error('\n💡 Solution: Check embedding service configuration and API keys');
    }
    if (error.message.includes('Vector')) {
      console.error('\n💡 Solution: Check Vector DB connection and required tables');
    }
    if (error.message.includes('DeepWiki')) {
      console.error('\n💡 Solution: Check DeepWiki service configuration');
    }
  }
}

// Run the test
testResultOrchestrator().catch(console.error);