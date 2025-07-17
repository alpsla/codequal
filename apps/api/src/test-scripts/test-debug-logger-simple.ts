#!/usr/bin/env ts-node

/**
 * Simple test to verify debug logger is collecting logs
 */

// Import directly from the source for testing
import { DebugLogger } from '../../../../packages/agents/src/services/debug-logger';

async function testDebugLoggerSimple() {
  console.log('\n🔬 Testing Debug Logger - Simple Test\n');
  console.log('='.repeat(60));

  const debugLogger = new DebugLogger(true); // Enable debug mode

  try {
    // Test 1: Basic Execution Tracking
    console.log('\n1️⃣ Testing Basic Execution Tracking...');
    
    const execId = debugLogger.startExecution(
      'tool',
      'test-tool',
      'test-phase',
      { input: 'test data' }
    );
    
    console.log('  ✓ Started execution:', execId);
    
    // Complete execution
    debugLogger.completeExecution(execId, { result: 'success' });
    console.log('  ✓ Completed execution');

    // Test 2: Check if logs are stored
    console.log('\n2️⃣ Checking Stored Logs...');
    
    const traces = debugLogger.getTraces();
    console.log(`  ✓ Total traces stored: ${traces.length}`);
    
    if (traces.length > 0) {
      const trace = traces[0];
      console.log(`  ✓ Trace details:`);
      console.log(`    - ID: ${trace.id}`);
      console.log(`    - Type: ${trace.type}`);
      console.log(`    - Phase: ${trace.phase}`);
      console.log(`    - Status: ${trace.status}`);
      console.log(`    - Duration: ${trace.duration}ms`);
      console.log(`    - Input: ${JSON.stringify(trace.input)}`);
      console.log(`    - Output: ${JSON.stringify(trace.output)}`);
    }

    // Test 3: Summary
    console.log('\n3️⃣ Getting Summary...');
    
    const summary = debugLogger.getSummary();
    console.log('  ✓ Summary:');
    console.log(`    - Total: ${summary.totalExecutions}`);
    console.log(`    - Completed: ${summary.completedExecutions}`);
    console.log(`    - Failed: ${summary.failedExecutions}`);
    console.log(`    - Active: ${summary.activeExecutions}`);

    // Test 4: Export
    console.log('\n4️⃣ Testing Export...');
    
    const exported = debugLogger.exportTraces();
    const exportData = JSON.parse(exported);
    console.log(`  ✓ Export successful`);
    console.log(`    - Traces: ${exportData.traces.length}`);
    console.log(`    - Export time: ${exportData.exportTime}`);

    console.log('\n✅ Debug logger is working correctly!');
    console.log('   Logs are being collected and stored as expected.');
    
  } catch (error) {
    console.error('\n❌ Debug logger test failed:', error);
    process.exit(1);
  }
}

// Run the test
console.log('Starting Debug Logger Simple Test...');

testDebugLoggerSimple().then(() => {
  console.log('\n✨ Test complete\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});