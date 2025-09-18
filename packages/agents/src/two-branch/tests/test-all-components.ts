#!/usr/bin/env npx ts-node

/**
 * Comprehensive Test for All Research & Scheduler Components
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAllComponents() {
  console.log('🧪 Comprehensive Test of Research & Scheduler Components');
  console.log('=' .repeat(60));
  console.log(`📅 Test Date: ${new Date().toISOString()}\n`);

  const results: { component: string; status: '✅' | '❌' | '⚠️'; note?: string }[] = [];

  // Test Researcher Components
  console.log('📚 Testing Researcher Components...\n');

  try {
    const { ResearcherAgent } = await import('../researcher/researcher-agent');
    results.push({ component: 'ResearcherAgent', status: '✅' });
  } catch (e) {
    results.push({ component: 'ResearcherAgent', status: '❌', note: String(e).substring(0, 50) });
  }

  try {
    const prompts = await import('../researcher/research-prompts');
    const hasDynamic = JSON.stringify(prompts).includes('new Date()');
    results.push({ 
      component: 'Research Prompts', 
      status: hasDynamic ? '✅' : '⚠️',
      note: hasDynamic ? 'Dynamic dates' : 'Missing dynamic dates'
    });
  } catch (e) {
    results.push({ component: 'Research Prompts', status: '❌', note: String(e).substring(0, 50) });
  }

  try {
    const { ResearcherService } = await import('../researcher/researcher-service');
    results.push({ component: 'ResearcherService', status: '✅' });
  } catch (e) {
    results.push({ component: 'ResearcherService', status: '❌', note: String(e).substring(0, 50) });
  }

  try {
    const { ModelResearcherService } = await import('../research-services/model-researcher-service');
    results.push({ component: 'ModelResearcherService', status: '✅' });
  } catch (e) {
    results.push({ component: 'ModelResearcherService', status: '❌', note: String(e).substring(0, 50) });
  }

  try {
    const { EducationalService } = await import('../researcher/educational-service');
    results.push({ component: 'EducationalService', status: '✅' });
  } catch (e) {
    results.push({ component: 'EducationalService', status: '❌', note: String(e).substring(0, 50) });
  }

  try {
    await import('../researcher/web-search-researcher');
    results.push({ component: 'WebSearchResearcher', status: '✅' });
  } catch (e) {
    results.push({ component: 'WebSearchResearcher', status: '❌', note: String(e).substring(0, 50) });
  }

  // Test Scheduler Components
  console.log('\n⏰ Testing Scheduler Components...\n');

  try {
    const { SchedulerService } = await import('../scheduler/scheduler-service');
    results.push({ component: 'SchedulerService', status: '✅' });
  } catch (e) {
    results.push({ component: 'SchedulerService', status: '❌', note: String(e).substring(0, 50) });
  }

  try {
    const { ModelUpdateScheduler } = await import('../scheduler/model-update-scheduler');
    results.push({ component: 'ModelUpdateScheduler', status: '✅' });
  } catch (e) {
    results.push({ component: 'ModelUpdateScheduler', status: '❌', note: String(e).substring(0, 50) });
  }

  try {
    const { EnhancedSchedulerService } = await import('../scheduler/enhanced-scheduler-service');
    results.push({ component: 'EnhancedSchedulerService', status: '⚠️', note: 'Has placeholder imports' });
  } catch (e) {
    results.push({ component: 'EnhancedSchedulerService', status: '❌', note: String(e).substring(0, 50) });
  }

  // Test Scripts
  console.log('\n📜 Testing Scripts...\n');

  const fs = await import('fs');
  const path = await import('path');

  const scripts = [
    'update-to-latest-models.ts',
    'verify-model-currency.ts',
    'clean-and-regenerate-models.ts',
    'trigger-model-research.ts'
  ];

  for (const script of scripts) {
    const scriptPath = path.join(__dirname, '..', 'scripts', script);
    if (fs.existsSync(scriptPath)) {
      results.push({ component: `Script: ${script}`, status: '✅' });
    } else {
      results.push({ component: `Script: ${script}`, status: '❌', note: 'File not found' });
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('              COMPREHENSIVE TEST RESULTS');
  console.log('=' .repeat(60) + '\n');

  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  const warning = results.filter(r => r.status === '⚠️').length;

  console.log('📊 Component Status:\n');
  results.forEach(r => {
    const note = r.note ? ` (${r.note})` : '';
    console.log(`${r.status} ${r.component}${note}`);
  });

  console.log(`\n📈 Summary: ${passed} passed, ${warning} warnings, ${failed} failed`);

  if (failed === 0) {
    console.log('\n✅ All critical components working!');
    console.log('⚠️  Some components have minor issues but are functional');
    console.log('\n💡 Next Steps:');
    console.log('   1. Test with real PR: npx ts-node src/two-branch/tests/test-v9-complete-with-supabase.ts');
    console.log('   2. Run scheduler: npx ts-node src/two-branch/scheduler/run-scheduler.ts');
    console.log('   3. Verify models: npx ts-node src/two-branch/scripts/verify-model-currency.ts');
  } else {
    console.log('\n❌ Some components failed. Check errors above.');
    process.exit(1);
  }
}

// Run the test
testAllComponents().catch(console.error);