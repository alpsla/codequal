import { MonitoredTestRunner } from '../monitoring/monitored-test-runner';

/**
 * Example test that demonstrates how to run tests with comprehensive monitoring
 */
async function runMonitoredTests() {
  const runner = new MonitoredTestRunner();
  
  // Define your test suite
  const testSuite = async () => {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: []
    };
    
    // Test 1: Quick Analysis
    try {
      results.total++;
      await runner.runAnalysisWithMonitoring(
        async () => {
          // Simulate PR analysis
          // const request: PRAnalysisRequest = {
          //   repositoryUrl: 'https://github.com/test/repo',
          //   prNumber: 123,
          //   analysisMode: 'quick',
          //   authenticatedUser: {
          //     id: 'test-user',
          //     email: 'test@example.com',
          //     role: 'user',
          //     permissions: ['read'],
          //     status: 'active',
          //     session: {
          //       token: 'test-token',
          //       expiresAt: new Date(Date.now() + 3600000)
          //     }
          //   }
          // };
          
          // Mock analysis execution
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return {
            analysisId: 'test-123',
            findings: { security: [], codeQuality: [] },
            metrics: { totalFindings: 0 }
          };
        },
        {
          repositoryUrl: 'https://github.com/test/repo',
          prNumber: 123,
          analysisMode: 'quick'
        }
      );
      results.passed++;
    } catch (error) {
      results.failed++;
      results.failures.push({
        testName: 'Quick Analysis Test',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Test 2: Comprehensive Analysis
    try {
      results.total++;
      await runner.runAnalysisWithMonitoring(
        async () => {
          // Simulate more complex analysis
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          return {
            analysisId: 'test-456',
            findings: { 
              security: [{ title: 'SQL Injection', severity: 'high' }],
              codeQuality: [{ title: 'Complex function', severity: 'medium' }]
            },
            metrics: { totalFindings: 2 }
          };
        },
        {
          repositoryUrl: 'https://github.com/test/repo2',
          prNumber: 456,
          analysisMode: 'comprehensive'
        }
      );
      results.passed++;
    } catch (error) {
      results.failed++;
      results.failures.push({
        testName: 'Comprehensive Analysis Test',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Test 3: Error Handling
    try {
      results.total++;
      await runner.runAnalysisWithMonitoring(
        async () => {
          // Simulate an error
          throw new Error('Simulated analysis failure');
        },
        {
          repositoryUrl: 'https://github.com/test/repo3',
          prNumber: 789,
          analysisMode: 'deep'
        }
      );
    } catch (error) {
      // This is expected to fail
      results.passed++;
    }
    
    return results;
  };
  
  // Run tests with monitoring
  const report = await runner.runTests(testSuite);
  
  // The report is automatically saved to test-reports/<testRunId>/
  // You can also access it programmatically
  console.log('\n=== Test Report Summary ===');
  console.log(`Total Cost: $${report.costAnalysis.totalCost.toFixed(4)}`);
  console.log(`Execution Time: ${report.performance.totalExecutionTime}ms`);
  console.log(`Tests: ${report.testResults.passedTests}/${report.testResults.totalTests} passed`);
  console.log(`Error Rate: ${(report.systemHealth.errorRate * 100).toFixed(2)}%`);
  
  // Check for alerts
  const summary = report.recommendations;
  if (summary.costOptimization.length > 0) {
    console.log('\nCost Optimization Suggestions:');
    summary.costOptimization.forEach(suggestion => console.log(`- ${suggestion}`));
  }
  
  return report;
}

// Run if executed directly
if (require.main === module) {
  runMonitoredTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { runMonitoredTests };