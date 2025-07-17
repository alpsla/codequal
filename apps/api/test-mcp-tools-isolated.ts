#!/usr/bin/env ts-node

import { initializeTools, agentToolService, parallelAgentExecutor } from '@codequal/mcp-hybrid';

async function testMCPTools() {
  console.log('=== Testing MCP Tools Isolated ===\n');
  
  try {
    // Step 1: Initialize MCP tools
    console.log('Step 1: Initializing MCP-Hybrid tools...');
    await initializeTools();
    console.log('✓ Tools initialized\n');

    // Step 2: List available tools
    console.log('Step 2: Listing available tools...');
    const availableTools = agentToolService.getToolsForAgent('security');
    console.log('Security tools:', availableTools.map(t => t.id));
    console.log('');

    // Step 3: Create test context
    const testContext = {
      agentRole: 'security' as const,
      pr: {
        prNumber: 28000,
        title: 'Test PR',
        description: 'Testing MCP tools',
        baseBranch: 'main',
        targetBranch: 'feature',
        author: 'test-user',
        files: [{
          filename: 'test.js',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: `
@@ -1,5 +1,10 @@
 function test() {
-  const query = "SELECT * FROM users WHERE id = " + userId;
+  const query = "SELECT * FROM users WHERE id = ?";
   return db.query(query);
 }
+
+function insecure() {
+  eval(userInput); // This is insecure
+  const password = "hardcoded123"; // Hardcoded password
+}
          `
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

    // Step 4: Execute individual tools
    console.log('Step 4: Testing individual tools...\n');
    
    // Test ESLint
    console.log('Testing ESLint...');
    try {
      const eslintTool = availableTools.find(t => t.id.includes('eslint'));
      if (eslintTool) {
        const eslintResult = await eslintTool.execute(testContext);
        console.log('ESLint result:', JSON.stringify(eslintResult, null, 2));
      } else {
        console.log('ESLint tool not found');
      }
    } catch (error) {
      console.error('ESLint error:', error);
    }
    console.log('');

    // Test Semgrep
    console.log('Testing Semgrep...');
    try {
      const semgrepTool = availableTools.find(t => t.id.includes('semgrep'));
      if (semgrepTool) {
        const semgrepResult = await semgrepTool.execute(testContext);
        console.log('Semgrep result:', JSON.stringify(semgrepResult, null, 2));
      } else {
        console.log('Semgrep tool not found');
      }
    } catch (error) {
      console.error('Semgrep error:', error);
    }
    console.log('');

    // Step 5: Execute tools in parallel using executor
    console.log('Step 5: Testing parallel execution...');
    const executionResult = await parallelAgentExecutor.executeToolsForAgents(
      ['security'],
      testContext,
      {
        strategy: 'sequential',
        maxParallel: 1,
        timeout: 30000
      }
    );

    console.log('\n✅ Parallel Execution Results:');
    executionResult.forEach((results, role) => {
      console.log(`\nRole: ${role}`);
      console.log('Tools executed:', results.toolsExecuted);
      console.log('Total findings:', results.findings.length);
      console.log('Execution time:', results.executionTime + 'ms');
      if (results.findings.length > 0) {
        console.log('Sample findings:', JSON.stringify(results.findings.slice(0, 2), null, 2));
      }
    });

  } catch (error) {
    console.error('❌ MCP Tools test failed:', error);
  }
}

// Run the test
testMCPTools().catch(console.error);