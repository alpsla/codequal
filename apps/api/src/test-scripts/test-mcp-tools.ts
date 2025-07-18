import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function testMCPTools() {
  console.log('🧪 Testing MCP Tools Execution\n');
  
  try {
    // Test 1: Import MCP hybrid package
    console.log('Test 1: Importing MCP hybrid package...');
    const mcpHybrid = await import('@codequal/mcp-hybrid');
    console.log('✅ Import successful');
    console.log('Available exports:', Object.keys(mcpHybrid).slice(0, 10).join(', ') + '...');
    
    // Test 2: Check if agentToolService exists
    console.log('\nTest 2: Checking agentToolService...');
    if (mcpHybrid.agentToolService) {
      console.log('✅ agentToolService is available');
      console.log('Type:', typeof mcpHybrid.agentToolService);
      console.log('Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(mcpHybrid.agentToolService)).slice(0, 5).join(', ') + '...');
    } else {
      console.error('❌ agentToolService not found in exports');
    }
    
    // Test 3: Test tool execution
    console.log('\nTest 3: Testing tool execution...');
    const { agentToolService } = mcpHybrid;
    
    // Create a minimal analysis context
    const analysisContext = {
      agentRole: 'security' as any,
      pr: {
        prNumber: 123,
        title: 'Test PR',
        description: 'Test description',
        baseBranch: 'main',
        targetBranch: 'feature/test',
        author: 'test-user',
        files: [{
          path: 'test.js',
          content: 'console.log("test");',
          changeType: 'modified' as const
        }],
        commits: []
      },
      repository: {
        name: 'test-repo',
        owner: 'test-owner',
        languages: ['javascript'],
        frameworks: []
      },
      userContext: {
        userId: 'test-user-id',
        permissions: ['read', 'write']
      },
      vectorDBConfig: {}
    };
    
    // Execute tools
    console.log('Executing tools for security agent...');
    const result = await agentToolService.runToolsForRole(
      'security',
      analysisContext,
      {
        strategy: 'parallel-by-role',
        maxParallel: 3,
        timeout: 10000 // 10 seconds timeout
      }
    );
    
    console.log('✅ Tool execution completed!');
    console.log('Tools executed:', result.toolsExecuted);
    console.log('Tools failed:', result.toolsFailed);
    console.log('Findings count:', result.findings.length);
    console.log('Execution time:', result.executionTime + 'ms');
    
    // Test 4: Check tool registry
    console.log('\nTest 4: Checking tool registry...');
    if (mcpHybrid.toolRegistry) {
      const availableTools = mcpHybrid.toolRegistry.getAllTools();
      console.log('✅ Tool registry available');
      console.log('Total tools registered:', availableTools.length);
      console.log('Tool names:', availableTools.map(t => t.id).slice(0, 5).join(', ') + '...');
    }
    
    console.log('\n✅ All MCP tools tests passed!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    // Provide helpful error messages
    if (error.message.includes('Cannot find module')) {
      console.error('\n💡 Solution: Build the mcp-hybrid package with: cd packages/mcp-hybrid && npm run build');
    }
    if (error.message.includes('tool')) {
      console.error('\n💡 Solution: Check tool configuration and ensure all required tools are installed');
    }
  }
}

// Run the test
testMCPTools().catch(console.error);