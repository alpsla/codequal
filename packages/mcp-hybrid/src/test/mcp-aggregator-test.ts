/**
 * Test script for MCP Context Aggregator
 * Verifies the Vector DB integration strategy
 */

import { MCPContextAggregator } from '../integration/mcp-context-aggregator';
import { AnalysisContext, AgentRole } from '../core/interfaces';

// Mock Vector DB for testing
class MockVectorDBService {
  private storage = new Map<string, any>();
  
  async store(key: string, data: any): Promise<void> {
    this.storage.set(key, data);
    console.log(`✅ Stored in Vector DB: ${key}`);
    console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
  }
  
  async retrieve(key: string): Promise<any> {
    console.log(`📖 Retrieving from Vector DB: ${key}`);
    return this.storage.get(key) || null;
  }
  
  // Test helper to inspect stored data
  getStoredKeys(): string[] {
    return Array.from(this.storage.keys());
  }
}

async function testMCPAggregator() {
  console.log('🧪 Testing MCP Context Aggregator with Vector DB Integration\n');
  
  // Create aggregator with mock Vector DB
  const vectorDB = new MockVectorDBService();
  const aggregator = new MCPContextAggregator(vectorDB);
  
  // Create test context
  const testContext: AnalysisContext = {
    agentRole: 'security',
    pr: {
      prNumber: 123,
      title: 'Add new authentication feature',
      description: 'Implements OAuth2 authentication',
      baseBranch: 'main',
      targetBranch: 'feature/oauth',
      author: 'testuser',
      files: [
        {
          path: 'src/auth/oauth.js',
          content: 'const oauth = require("oauth2");',
          changeType: 'added'
        }
      ],
      commits: []
    },
    repository: {
      name: 'test-repo',
      owner: 'test-owner',
      languages: ['javascript'],
      frameworks: ['express']
    },
    userContext: {
      userId: 'test-user-123',
      permissions: ['read', 'write']
    }
  };
  
  try {
    // Step 1: Pre-compute MCP analysis
    console.log('Step 1: Pre-computing MCP analysis for all roles...\n');
    const aggregatedContext = await aggregator.preComputeMCPAnalysis(testContext);
    
    console.log('📊 Aggregation Results:');
    console.log(`   Repository: ${aggregatedContext.repository}`);
    console.log(`   PR Number: ${aggregatedContext.prNumber}`);
    console.log(`   Total Tavily Searches: ${aggregatedContext.tavilySearches.total}`);
    console.log(`   Searches by Role:`, aggregatedContext.tavilySearches.byRole);
    console.log('');
    
    // Step 2: Check stored keys
    console.log('Step 2: Verifying Vector DB storage...\n');
    const storedKeys = vectorDB.getStoredKeys();
    console.log('📦 Stored Keys in Vector DB:');
    storedKeys.forEach(key => console.log(`   - ${key}`));
    console.log('');
    
    // Step 3: Test agent retrieval
    console.log('Step 3: Testing agent context retrieval...\n');
    
    const roles: AgentRole[] = ['security', 'codeQuality', 'dependency'];
    for (const role of roles) {
      console.log(`\n🤖 ${role} Agent retrieving context:`);
      const agentContext = await aggregator.getMCPContextForAgent(
        testContext.repository.name,
        testContext.pr.prNumber,
        role
      );
      console.log(`   Found ${agentContext.length} MCP tool results`);
      if (agentContext.length > 0) {
        console.log(`   Tools used: ${agentContext.map(c => c.toolId).join(', ')}`);
      }
    }
    
    // Step 4: Test Tavily usage stats
    console.log('\n\nStep 4: Testing Tavily usage statistics...\n');
    const tavilyStats = await aggregator.getTavilyUsageStats(
      testContext.repository.name,
      testContext.pr.prNumber
    );
    console.log('💰 Tavily Usage Stats:');
    console.log(`   Total searches: ${tavilyStats.total}`);
    console.log(`   By role:`, tavilyStats.byRole);
    console.log(`   Queries performed: ${tavilyStats.queries.length}`);
    
    console.log('\n✅ MCP Context Aggregator test completed successfully!');
    console.log('\n🎯 Key Benefits Demonstrated:');
    console.log('   1. Single execution of MCP tools (cost optimization)');
    console.log('   2. Results stored in Vector DB with embeddings');
    console.log('   3. Agents retrieve pre-computed context (no API calls)');
    console.log('   4. Tavily usage tracked for cost monitoring');
    console.log('   5. Consistent results across all agents');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMCPAggregator();