/**
 * E2E Test Suite Entry Point
 * 
 * This file provides a centralized way to run all E2E tests
 * for the CodeQual system.
 */

export * from './pr-comprehensive-scenarios';
export * from './pr-basic-scenarios';
export * from './test-scenarios';
export { E2ETestRunner } from './e2e-test-runner';
export { RealDataTestRunner } from './real-data-test';
export { performanceMonitor } from './performance-monitor';

// Test execution helpers
export async function runAllTests(options: { useRealData?: boolean } = {}) {
  console.log('🚀 Running CodeQual E2E Test Suite\n');
  
  const tests = [
    {
      name: 'PR Content Analysis',
      runner: () => import('./pr-analyzer-test.js')
    },
    {
      name: 'Deduplication Tests',
      runner: () => import('./deduplication-test.js')
    },
    {
      name: 'Comprehensive E2E Tests',
      runner: async () => {
        const module = await import('./e2e-test-runner.js');
        const runner = new module.E2ETestRunner({ useRealData: options.useRealData });
        await runner.runAllTests();
      }
    }
  ];
  
  // Add real data tests if requested
  if (options.useRealData) {
    tests.push({
      name: 'Real Data API Tests',
      runner: async () => {
        const { RealDataTestRunner } = await import('./real-data-test.js');
        const runner = new RealDataTestRunner();
        await runner.runAllScenarios();
      }
    });
  }

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${test.name}`);
    console.log('='.repeat(60));
    
    try {
      await test.runner();
      console.log(`✅ ${test.name} completed successfully`);
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error);
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const useRealData = args.includes('--real-data') || process.env.USE_REAL_DATA === 'true';
  
  runAllTests({ useRealData })
    .then(() => {
      console.log('\n✨ All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}