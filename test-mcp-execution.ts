import { agentToolService } from './packages/mcp-hybrid/src';

async function testMCPExecution() {
  console.log('=== TESTING MCP TOOL EXECUTION ===\n');
  
  const analysisContext = {
    agentRole: 'security' as const,
    pr: {
      prNumber: 123,
      title: 'Test PR',
      description: 'Testing MCP tools',
      baseBranch: 'main',
      targetBranch: 'feature/test',
      author: 'test-user',
      files: [
        {
          path: 'test.js',
          content: `
            const password = "hardcoded-password"; // Security issue
            eval(userInput); // Code injection vulnerability
            const query = "SELECT * FROM users WHERE id = " + userId; // SQL injection
          `,
          changeType: 'modified' as const
        }
      ],
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
      permissions: ['read', 'write'] as ('read' | 'write')[]
    },
    vectorDBConfig: {}
  };
  
  try {
    console.log('Running tools for security agent...');
    
    const result = await agentToolService.runToolsForRole(
      'security',
      analysisContext,
      {
        strategy: 'parallel-by-role',
        maxParallel: 3,
        timeout: 30000
      }
    );
    
    console.log('\n=== RESULTS ===');
    console.log('Tools Executed:', result.toolsExecuted);
    console.log('Tools Failed:', result.toolsFailed);
    console.log('Findings:', result.findings.length);
    console.log('Execution Time:', result.executionTime, 'ms');
    
    if (result.findings.length > 0) {
      console.log('\n=== SAMPLE FINDINGS ===');
      result.findings.slice(0, 5).forEach((finding, i) => {
        console.log(`\n${i + 1}. ${finding.message}`);
        console.log(`   Tool: ${finding.toolId}`);
        console.log(`   Severity: ${finding.severity}`);
        if (finding.file) console.log(`   File: ${finding.file}:${finding.line || '?'}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('\n❌ FAILED:', error);
    throw error;
  }
}

// Check what tools are available
async function checkAvailableTools() {
  console.log('\n=== CHECKING AVAILABLE TOOLS ===');
  
  try {
    const { toolRegistry } = await import('./packages/mcp-hybrid/src');
    const tools = toolRegistry.getAllTools();
    
    console.log(`\nTotal tools registered: ${tools.length}`);
    
    // Group by agent role
    const toolsByRole: Record<string, string[]> = {};
    tools.forEach(tool => {
      const roles = Array.isArray(tool.supportedAgents) ? tool.supportedAgents : [tool.supportedAgents];
      roles.forEach(role => {
        if (!toolsByRole[role]) toolsByRole[role] = [];
        toolsByRole[role].push(tool.id);
      });
    });
    
    console.log('\nTools by agent role:');
    Object.entries(toolsByRole).forEach(([role, toolIds]) => {
      console.log(`\n${role}: ${toolIds.join(', ')}`);
    });
    
  } catch (error) {
    console.error('Failed to check tools:', error);
  }
}

// Run tests
async function runTests() {
  try {
    await checkAvailableTools();
    await testMCPExecution();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests();