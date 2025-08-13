#!/usr/bin/env npx ts-node
/**
 * Final test for dev-cycle-orchestrator with mock validation
 * Verifies the complete pre-commit validation workflow
 */

import { DevCycleOrchestrator } from './src/standard/orchestrator/dev-cycle-orchestrator';

async function testDevCycleOrchestrator() {
  console.log('🎯 Testing Dev-Cycle Orchestrator with Mock Validation\n');
  console.log('=' .repeat(60));
  
  // Initialize orchestrator with custom config
  const orchestrator = new DevCycleOrchestrator({
    enablePreCommitHooks: true,
    enableAutomaticRollback: false, // Disable for testing
    blockOnCriticalFailures: true,
    maxRegressionTime: 120000, // 2 minutes for testing
    notifyOnFailures: false, // Disable notifications for testing
    preserveLastGoodState: true
  });
  
  console.log('📊 Configuration:');
  console.log('   Pre-commit hooks: ENABLED');
  console.log('   Automatic rollback: DISABLED (for testing)');
  console.log('   Block on critical failures: ENABLED');
  console.log('   Max regression time: 2 minutes');
  console.log('   Mock validation: ENABLED (BUG-019 workaround)\n');
  
  try {
    // Run pre-commit regression validation
    console.log('🚀 Starting pre-commit validation...\n');
    const result = await orchestrator.runPreCommitRegression();
    
    // Display results
    console.log('\n' + '=' .repeat(60));
    console.log('📋 VALIDATION RESULTS:');
    console.log('=' .repeat(60));
    
    console.log(`\nOverall Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Action: ${result.action}`);
    console.log(`Core Tests: ${result.coreTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Feature Tests: ${result.featureTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Critical Failures: ${result.criticalFailureCount}`);
    console.log(`Execution Time: ${(result.executionTime / 1000).toFixed(2)}s`);
    
    if (result.failureDetails && result.failureDetails.length > 0) {
      console.log('\n❌ Failure Details:');
      result.failureDetails.forEach(detail => {
        console.log(`   - ${detail}`);
      });
    }
    
    if (result.recommendedActions && result.recommendedActions.length > 0) {
      console.log('\n💡 Recommended Actions:');
      result.recommendedActions.forEach(action => {
        console.log(`   ${action}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    
    if (result.success) {
      console.log('✨ SUCCESS: All validations passed!');
      console.log('✅ Ready to proceed with commit');
      
      // Show mock validation note
      console.log('\n⚠️  Note: Manual validation using mock mode (BUG-019)');
      console.log('   Real validation temporarily disabled for large repos');
      console.log('   Fix tracked in BUG-019 for timeout optimization');
    } else {
      console.log('⛔ FAILURE: Validation failed!');
      console.log('❌ Commit has been blocked');
      
      if (result.action === 'ROLLBACK_REQUIRED') {
        console.log('🔄 Rollback would be triggered (disabled for testing)');
      }
    }
    
    console.log('=' .repeat(60));
    
    // Return exit code based on success
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Fatal error during orchestration:', error);
    console.error('\nThis indicates a critical system failure.');
    console.error('Please check:');
    console.error('  1. All dependencies are installed');
    console.error('  2. Build completed successfully');
    console.error('  3. System resources are available');
    process.exit(1);
  }
}

// Display header
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     CodeQual Dev-Cycle Orchestrator - Final Test          ║');
console.log('║                                                            ║');
console.log('║  Validates code before commits with:                      ║');
console.log('║  • Unit regression tests                                  ║');
console.log('║  • Manual PR validation (mock mode due to BUG-019)        ║');
console.log('║  • Automatic rollback on failures (when enabled)          ║');
console.log('║  • State preservation for recovery                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Run the test
testDevCycleOrchestrator().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});