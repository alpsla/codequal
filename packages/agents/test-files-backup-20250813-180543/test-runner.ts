#!/usr/bin/env npx ts-node

/**
 * Simple Test Runner for Unit Tests
 */

import { AIImpactCategorizationTest } from './src/standard/tests/regression/ai-impact-categorization.test';
import { ReportGenerationTest } from './src/standard/tests/regression/report-generation.test';

async function runTests() {
  console.log('🧪 Running Unit Tests...\n');
  
  const results = [];
  
  // Test 1: AI Impact Categorization
  console.log('1. AI Impact Categorization Test');
  const aiTest = new AIImpactCategorizationTest();
  const aiResult = await aiTest.run();
  results.push({ name: 'AI Impact Categorization', ...aiResult });
  console.log(`   ${aiResult.success ? '✅' : '❌'} ${aiResult.message}\n`);
  
  // Test 2: Report Generation
  console.log('2. Report Generation Test');
  const reportTest = new ReportGenerationTest();
  const reportResult = await reportTest.run();
  results.push({ name: 'Report Generation', ...reportResult });
  console.log(`   ${reportResult.success ? '✅' : '❌'} ${reportResult.message}\n`);
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('═'.repeat(50));
  console.log(`Summary: ${passed}/${total} tests passed`);
  
  if (passed < total) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
      if (r.details) {
        console.log('    Details:', JSON.stringify(r.details, null, 2));
      }
    });
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});