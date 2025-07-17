#!/usr/bin/env ts-node

import * as chalk from 'chalk';
import { getDebugLogger } from '@codequal/agents/services/debug-logger';

/**
 * Test the debug logger implementation
 */
async function testDebugLogger() {
  console.log(chalk.cyan('\n🔬 Testing Debug Logger\n'));
  console.log('='.repeat(60));

  const debugLogger = getDebugLogger(true); // Enable debug mode

  try {
    // Test 1: Tool Execution Tracking
    console.log(chalk.blue('\n1️⃣ Testing Tool Execution Tracking...'));
    
    const toolExecId = debugLogger.startExecution(
      'tool',
      'eslint-mcp',
      'code-analysis',
      { files: ['src/index.ts', 'src/utils.ts'], rules: { 'no-console': 'warn' } }
    );
    
    console.log('  ✓ Started tool execution:', toolExecId);
    
    // Simulate tool progress
    debugLogger.updateExecution(toolExecId, {
      metadata: { filesProcessed: 1, currentFile: 'src/index.ts' }
    });
    
    console.log('  ✓ Updated tool progress');
    
    // Complete tool execution
    debugLogger.completeExecution(toolExecId, {
      findings: [
        { type: 'warning', message: 'Unexpected console statement', file: 'src/index.ts', line: 42 },
        { type: 'error', message: 'Missing semicolon', file: 'src/utils.ts', line: 15 }
      ],
      metrics: { filesAnalyzed: 2, warnings: 1, errors: 1 }
    }, { toolName: 'eslint', executionTime: 250 });
    
    console.log('  ✓ Completed tool execution');

    // Test 2: Agent Execution Tracking
    console.log(chalk.blue('\n2️⃣ Testing Agent Execution Tracking...'));
    
    const agentExecId = debugLogger.startExecution(
      'agent',
      'security-agent',
      'vulnerability-scan',
      { repository: 'test/repo', prNumber: 123 }
    );
    
    console.log('  ✓ Started agent execution:', agentExecId);
    
    // Log agent execution details
    debugLogger.logAgentExecution('security-agent', 'analyzing', {
      config: { model: 'claude-3', temperature: 0.7 },
      context: { filesChanged: 5, linesAdded: 100, linesRemoved: 50 }
    });
    
    // Complete agent execution
    debugLogger.completeExecution(agentExecId, {
      insights: [
        { type: 'security', severity: 'high', message: 'Potential SQL injection vulnerability' }
      ],
      suggestions: ['Use parameterized queries', 'Add input validation'],
      metadata: { scanDuration: 1500 }
    });
    
    console.log('  ✓ Completed agent execution');

    // Test 3: Failed Execution
    console.log(chalk.blue('\n3️⃣ Testing Failed Execution...'));
    
    const failedExecId = debugLogger.startExecution(
      'agent',
      'performance-agent',
      'benchmark-analysis',
      { testSuite: 'performance-tests' }
    );
    
    // Simulate failure
    debugLogger.failExecution(failedExecId, new Error('API rate limit exceeded'), {
      agentName: 'performance',
      errorType: 'rate-limit',
      retryable: true
    });
    
    console.log('  ✓ Recorded failed execution');

    // Test 4: Get Execution Summary
    console.log(chalk.blue('\n4️⃣ Getting Execution Summary...'));
    
    const summary = debugLogger.getSummary();
    console.log('\n  Execution Summary:');
    console.log(`    - Total Executions: ${summary.totalExecutions}`);
    console.log(`    - Completed: ${summary.completedExecutions}`);
    console.log(`    - Failed: ${summary.failedExecutions}`);
    console.log(`    - Active: ${summary.activeExecutions}`);
    console.log(`    - Average Duration: ${Math.round(summary.averageDuration)}ms`);
    console.log(`    - By Type:`, summary.byType);
    console.log(`    - By Phase:`, summary.byPhase);

    // Test 5: Get Traces
    console.log(chalk.blue('\n5️⃣ Getting Execution Traces...'));
    
    const allTraces = debugLogger.getTraces();
    console.log(`\n  Total Traces: ${allTraces.length}`);
    
    allTraces.forEach(trace => {
      console.log(`    - ${trace.type} [${trace.phase}]: ${trace.status} (${trace.duration || 0}ms)`);
    });

    // Test 6: Export Traces
    console.log(chalk.blue('\n6️⃣ Exporting Traces...'));
    
    const exported = debugLogger.exportTraces();
    const exportData = JSON.parse(exported);
    
    console.log('\n  Export Summary:');
    console.log(`    - Export Time: ${exportData.exportTime}`);
    console.log(`    - Total Traces: ${exportData.traces.length}`);
    console.log(`    - Active Executions: ${exportData.activeExecutions.length}`);

    // Test 7: Sensitive Data Sanitization
    console.log(chalk.blue('\n7️⃣ Testing Data Sanitization...'));
    
    const sensitiveExecId = debugLogger.startExecution(
      'system',
      'auth-service',
      'user-login',
      {
        username: 'test@example.com',
        password: 'super-secret-password',
        apiKey: 'sk-1234567890abcdef',
        token: 'jwt.token.here'
      }
    );
    
    const traces = debugLogger.getTraces('auth-service');
    const lastTrace = traces[traces.length - 1];
    
    console.log('\n  Sanitized Input:');
    console.log(`    - username: ${lastTrace.input.username}`);
    console.log(`    - password: ${lastTrace.input.password}`);
    console.log(`    - apiKey: ${lastTrace.input.apiKey}`);
    console.log(`    - token: ${lastTrace.input.token}`);
    
    console.log(chalk.green('\n✅ All debug logger tests passed!'));
    
    // Clean up
    debugLogger.clearTraces();
    console.log('\n  ✓ Cleared all traces');
    
  } catch (error) {
    console.error(chalk.red('\n❌ Debug logger test failed:'), error);
    process.exit(1);
  }
}

// Run the test
console.log(chalk.cyan('Starting Debug Logger test...'));

testDebugLogger().then(() => {
  console.log(chalk.cyan('\n✨ Debug Logger test complete\n'));
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});