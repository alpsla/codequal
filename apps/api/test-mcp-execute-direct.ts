#!/usr/bin/env ts-node

async function testMCPDirect() {
  console.log('=== Direct MCP Tool Execution Test ===\n');
  
  try {
    // Import MCP tools
    const mcpHybrid = await import('@codequal/mcp-hybrid');
    await mcpHybrid.initializeTools();
    
    // Test with a simple JavaScript code that has issues
    const testCode = `
function badCode() {
  // SQL injection
  const query = "SELECT * FROM users WHERE id = " + userId;
  
  // eval usage
  eval(userInput);
  
  // Hardcoded secret
  const apiKey = "sk-1234567890abcdef";
}
    `;

    // Create a proper PR context for the tools
    const context = {
      agentRole: 'security' as const,
      pr: {
        prNumber: 1,
        title: 'Test PR',
        description: 'Testing tools',
        baseBranch: 'main',
        targetBranch: 'feature',
        author: 'test',
        files: [{
          filename: 'test.js',
          status: 'modified' as const,
          additions: 10,
          deletions: 0,
          changes: 10,
          patch: testCode
        }],
        commits: []
      },
      repository: {
        name: 'test-repo',
        owner: 'test-owner',
        languages: ['javascript'],
        frameworks: [],
        primaryLanguage: 'javascript'
      },
      userContext: {
        userId: 'test-user',
        organizationId: 'test-org',
        permissions: ['read', 'write']
      }
    };

    // Use the parallel executor to run tools
    console.log('Executing tools for security role...\n');
    const results = await mcpHybrid.parallelAgentExecutor.executeToolsForAgents(
      ['security'],
      context,
      {
        strategy: 'sequential',
        maxParallel: 1,
        timeout: 30000
      }
    );

    // Check results
    results.forEach((result, role) => {
      console.log(`\nResults for ${role}:`);
      console.log(`Tools executed: ${result.toolsExecuted.join(', ')}`);
      console.log(`Total findings: ${result.findings.length}`);
      
      if (result.findings.length > 0) {
        console.log('\nSample findings:');
        result.findings.slice(0, 5).forEach((finding: any, i: number) => {
          console.log(`\n${i + 1}. ${finding.message || finding.description || 'No message'}`);
          console.log(`   Tool: ${finding.tool || finding.ruleId || 'unknown'}`);
          console.log(`   Severity: ${finding.severity || 'unknown'}`);
          console.log(`   File: ${finding.file || finding.filename || 'unknown'}`);
          console.log(`   Line: ${finding.line || finding.startLine || 'unknown'}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testMCPDirect().catch(console.error);