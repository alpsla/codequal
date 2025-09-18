#!/usr/bin/env ts-node

/**
 * Test improved agent-based fix suggestions with a subset of issues
 */

// Load environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { V9IntegratedAnalyzer } from './src/two-branch/analyzers/v9-integrated-analyzer';
import { RedisToolOutputManager } from './src/two-branch/utils/redis-tool-output-manager';
import * as fs from 'fs';

async function testImprovedAgents() {
  const analyzer = new V9IntegratedAnalyzer();
  const redisManager = new RedisToolOutputManager();
  const workspace = `test-agents-${Date.now()}`;

  console.log('🧪 Testing improved agent-based fix suggestions...\n');

  try {
    // Create a small set of diverse test issues
    const testIssues = [
      {
        tool: 'spotbugs',
        file: 'SecurityIssues.java',
        line: 101,
        severity: 'high',
        type: 'Security',
        message: 'SQL injection vulnerability',
        description: 'SQL injection vulnerability - user input directly concatenated to SQL query',
        codeSnippet: 'String query = "SELECT * FROM users WHERE id = " + userId;'
      },
      {
        tool: 'pmd',
        file: 'PerformanceIssues.java',
        line: 255,
        severity: 'medium',
        type: 'Performance',
        message: 'String concatenation in loop',
        description: 'String concatenation in loop causes O(n²) complexity',
        codeSnippet: 'for(int i = 0; i < items.length; i++) { result += items[i]; }'
      },
      {
        tool: 'checkstyle',
        file: 'CodeQuality.java',
        line: 45,
        severity: 'low',
        type: 'Quality',
        message: 'Empty catch block',
        description: 'Empty catch block swallows exceptions silently',
        codeSnippet: 'try { doSomething(); } catch(Exception e) { }'
      },
      {
        tool: 'semgrep',
        file: 'Architecture.java',
        line: 122,
        severity: 'medium',
        type: 'Architecture',
        message: 'Circular dependency detected',
        description: 'Circular dependency between Service and Repository layers',
        codeSnippet: '@Autowired private UserService userService; // In UserRepository'
      }
    ];

    // Store test issues in Redis
    const output = JSON.stringify({
      tool: 'test-suite',
      success: true,
      executionTime: 100,
      parsedIssues: testIssues,
      stdout: '',
      stderr: ''
    });
    await redisManager.storeToolOutput(workspace, 'pr', 'test-suite', output, 100, true);

    console.log('📊 Testing with', testIssues.length, 'diverse issues\n');

    // Test each issue individually to see agent responses
    for (const issue of testIssues) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing: ${issue.message}`);
      console.log(`Type: ${issue.type}, Severity: ${issue.severity}`);
      console.log(`${'='.repeat(60)}`);

      // Import and test the agent
      const { SpecializedAgentFactory } = await import('./src/two-branch/agents/specialized-agents');

      const startTime = Date.now();
      const fixSuggestion = await SpecializedAgentFactory.generateFixForIssue({
        title: issue.message,
        description: issue.description,
        type: issue.type,
        severity: issue.severity,
        file: issue.file,
        line: issue.line,
        codeSnippet: issue.codeSnippet,
        tool: issue.tool
      });
      const duration = Date.now() - startTime;

      console.log(`\n📝 Fix (generated in ${duration}ms):`);
      console.log(fixSuggestion.fix);
      console.log(`\n💻 Corrected Code:`);
      console.log(fixSuggestion.correctedCode);

      if (fixSuggestion.bestPractices?.length) {
        console.log(`\n✅ Best Practices:`);
        fixSuggestion.bestPractices.forEach(p => console.log(`  • ${p}`));
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Agent testing complete!');
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await redisManager.clearWorkspaceOutputs(workspace);
    await redisManager.disconnect();
  }
}

// Run the test
testImprovedAgents().catch(console.error);