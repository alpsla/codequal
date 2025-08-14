#!/usr/bin/env npx ts-node

import { ReportGenerationTest } from './src/standard/tests/regression/report-generation.test';

async function debug() {
  const test = new ReportGenerationTest();
  const result = await test.run();
  
  console.log('Test result:', result);
  
  if (!result.success && result.details) {
    console.log('\nDetailed validation results:');
    result.details.sections.forEach((section: any) => {
      if (!section.passed) {
        console.log(`❌ ${section.section}: ${section.message}`);
      }
    });
  }
}

debug().catch(console.error);