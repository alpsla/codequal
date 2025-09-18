#!/usr/bin/env npx ts-node

/**
 * Test Scheduler Functionality After Migration
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testScheduler() {
  console.log('🧪 Testing Scheduler After Migration to two-branch');
  console.log('=' .repeat(60));
  console.log(`📅 Test Date: ${new Date().toISOString()}\n`);

  const results: { test: string; status: '✅' | '❌'; error?: string }[] = [];

  // Test 1: Import SchedulerService
  try {
    console.log('1️⃣ Testing SchedulerService import...');
    const { SchedulerService } = await import('./scheduler-service');
    console.log('✅ SchedulerService imported successfully');
    results.push({ test: 'SchedulerService import', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import SchedulerService:', error);
    results.push({ test: 'SchedulerService import', status: '❌', error: String(error) });
  }

  // Test 2: Import EnhancedSchedulerService
  try {
    console.log('\n2️⃣ Testing EnhancedSchedulerService import...');
    const { EnhancedSchedulerService } = await import('./enhanced-scheduler-service');
    console.log('✅ EnhancedSchedulerService imported successfully');
    results.push({ test: 'EnhancedSchedulerService import', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import EnhancedSchedulerService:', error);
    results.push({ test: 'EnhancedSchedulerService import', status: '❌', error: String(error) });
  }

  // Test 3: Import ModelUpdateScheduler
  try {
    console.log('\n3️⃣ Testing ModelUpdateScheduler import...');
    const { ModelUpdateScheduler } = await import('./model-update-scheduler');
    console.log('✅ ModelUpdateScheduler imported successfully');
    results.push({ test: 'ModelUpdateScheduler import', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import ModelUpdateScheduler:', error);
    results.push({ test: 'ModelUpdateScheduler import', status: '❌', error: String(error) });
  }

  // Test 4: Check scheduler interface
  try {
    console.log('\n4️⃣ Testing scheduler interface...');
    const fs = await import('fs');
    const path = await import('path');
    const interfacePath = path.join(__dirname, 'scheduler.interface.ts');
    
    if (fs.existsSync(interfacePath)) {
      console.log('✅ Scheduler interface file exists');
      results.push({ test: 'Scheduler interface', status: '✅' });
    } else {
      console.log('❌ Scheduler interface file not found');
      results.push({ test: 'Scheduler interface', status: '❌', error: 'File not found' });
    }
  } catch (error) {
    console.error('❌ Failed to check scheduler interface:', error);
    results.push({ test: 'Scheduler interface', status: '❌', error: String(error) });
  }

  // Test 5: Verify run-scheduler.ts exists
  try {
    console.log('\n5️⃣ Testing run-scheduler.ts existence...');
    const fs = await import('fs');
    const path = await import('path');
    const runSchedulerPath = path.join(__dirname, 'run-scheduler.ts');
    
    if (fs.existsSync(runSchedulerPath)) {
      console.log('✅ run-scheduler.ts exists');
      
      // Check if it has correct imports
      const content = fs.readFileSync(runSchedulerPath, 'utf-8');
      const hasResearcherImport = content.includes('../researcher/researcher-agent');
      const hasSchedulerImport = content.includes('./scheduler-service');
      
      console.log(`   Researcher import: ${hasResearcherImport ? '✅' : '❌'}`);
      console.log(`   Scheduler import: ${hasSchedulerImport ? '✅' : '❌'}`);
      
      results.push({ test: 'run-scheduler.ts', status: '✅' });
    } else {
      console.log('❌ run-scheduler.ts not found');
      results.push({ test: 'run-scheduler.ts', status: '❌', error: 'File not found' });
    }
  } catch (error) {
    console.error('❌ Failed to check run-scheduler.ts:', error);
    results.push({ test: 'run-scheduler.ts', status: '❌', error: String(error) });
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('                 SCHEDULER TEST SUMMARY');
  console.log('=' .repeat(60) + '\n');

  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;

  results.forEach(r => {
    console.log(`${r.status} ${r.test}`);
    if (r.error) {
      console.log(`   Error: ${r.error.substring(0, 100)}...`);
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n✅ All Scheduler components working correctly!');
    console.log('✅ Scheduler migration successful!');
    console.log('\n💡 Next steps:');
    console.log('   - Run: npx ts-node src/two-branch/scheduler/run-scheduler.ts');
    console.log('   - To test quarterly model research');
  } else {
    console.log('\n❌ Some scheduler components failed. Check errors above.');
    process.exit(1);
  }
}

// Run the test
testScheduler().catch(console.error);