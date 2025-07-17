#!/usr/bin/env ts-node

async function testMCPToolFindings() {
  console.log('=== Testing MCP Tools for Actual Findings ===\n');
  
  try {
    const { initializeTools, toolRegistry, toolExecutor } = await import('@codequal/mcp-hybrid');
    
    // Initialize tools
    await initializeTools();
    console.log('✓ Tools initialized\n');

    // Get all available tools
    const allTools = toolRegistry.getAllTools();
    console.log(`Total tools available: ${allTools.length}\n`);

    // Create a test file with known issues
    const testContext = {
      files: [{
        path: 'test.js',
        content: `
// This file has multiple issues for testing

function insecureFunction() {
  // SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userId;
  db.query(query);
  
  // Hardcoded password
  const password = "admin123";
  
  // eval usage (security issue)
  eval(userInput);
  
  // Unused variable
  const unusedVar = 42;
  
  // Complex function
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          if (e) {
            return "too complex";
          }
        }
      }
    }
  }
}

// Circular dependency simulation
const moduleA = require('./moduleA');
module.exports = { moduleA };
        `,
        changeType: 'modified' as const
      }],
      language: 'javascript',
      repository: {
        name: 'test-repo',
        owner: 'test-owner'
      }
    };

    // Test each tool individually
    const toolsToTest = ['eslint-direct', 'eslint-mcp', 'semgrep-mcp'];
    
    for (const toolId of toolsToTest) {
      const tool = allTools.find(t => t.id === toolId);
      if (!tool) {
        console.log(`❌ Tool ${toolId} not found`);
        continue;
      }

      console.log(`\nTesting ${tool.name} (${toolId})...`);
      console.log(`Description: ${tool.description}`);
      
      try {
        // Execute the tool
        const startTime = Date.now();
        const result = await toolExecutor.executeTool(tool, testContext);
        const executionTime = Date.now() - startTime;
        
        console.log(`✓ Execution completed in ${executionTime}ms`);
        console.log(`Status: ${result.status}`);
        
        if (result.findings && result.findings.length > 0) {
          console.log(`✅ Found ${result.findings.length} issues:`);
          result.findings.slice(0, 3).forEach((finding: any, i: number) => {
            console.log(`  ${i + 1}. ${finding.message || finding.description}`);
            console.log(`     - Severity: ${finding.severity}`);
            console.log(`     - Line: ${finding.line}`);
          });
          if (result.findings.length > 3) {
            console.log(`  ... and ${result.findings.length - 3} more`);
          }
        } else {
          console.log('⚠️  No findings returned');
          console.log('Result:', JSON.stringify(result, null, 2));
        }
        
      } catch (error) {
        console.log(`❌ Error executing tool: ${error}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMCPToolFindings().catch(console.error);