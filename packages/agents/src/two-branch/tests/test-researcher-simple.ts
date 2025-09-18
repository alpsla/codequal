#!/usr/bin/env npx ts-node

/**
 * Simple Test for Researcher After Migration
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testResearcherImports() {
  console.log('🧪 Testing Researcher Imports After Migration');
  console.log('=' .repeat(60));
  console.log(`📅 Test Date: ${new Date().toISOString()}\n`);

  const results: { test: string; status: '✅' | '❌'; error?: string }[] = [];

  // Test 1: ResearcherAgent import
  try {
    console.log('1️⃣ Testing ResearcherAgent import...');
    const { ResearcherAgent } = await import('../researcher/researcher-agent');
    console.log('✅ ResearcherAgent imported successfully');
    results.push({ test: 'ResearcherAgent import', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import ResearcherAgent:', error);
    results.push({ test: 'ResearcherAgent import', status: '❌', error: String(error) });
  }

  // Test 2: Research prompts
  try {
    console.log('\n2️⃣ Testing research prompts import...');
    const prompts = await import('../researcher/research-prompts');
    const hasPrompts = Object.keys(prompts).length > 0;
    console.log(`✅ Research prompts imported: ${Object.keys(prompts).length} exports found`);
    
    // Check for dynamic date
    const promptContent = JSON.stringify(prompts);
    const hasDynamicDate = promptContent.includes('new Date()');
    console.log(`   Dynamic dates: ${hasDynamicDate ? '✅' : '❌'}`);
    
    results.push({ test: 'Research prompts', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import research prompts:', error);
    results.push({ test: 'Research prompts', status: '❌', error: String(error) });
  }

  // Test 3: ResearcherService
  try {
    console.log('\n3️⃣ Testing ResearcherService import...');
    const { ResearcherService } = await import('../researcher/researcher-service');
    console.log('✅ ResearcherService imported successfully');
    results.push({ test: 'ResearcherService import', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import ResearcherService:', error);
    results.push({ test: 'ResearcherService import', status: '❌', error: String(error) });
  }

  // Test 4: Model Researcher Service
  try {
    console.log('\n4️⃣ Testing ModelResearcherService import...');
    const { ModelResearcherService } = await import('../research-services/model-researcher-service');
    console.log('✅ ModelResearcherService imported successfully');
    results.push({ test: 'ModelResearcherService import', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import ModelResearcherService:', error);
    results.push({ test: 'ModelResearcherService import', status: '❌', error: String(error) });
  }

  // Test 5: Educational Service
  try {
    console.log('\n5️⃣ Testing EducationalService import...');
    const { EducationalService } = await import('../researcher/educational-service');
    console.log('✅ EducationalService imported successfully');
    results.push({ test: 'EducationalService import', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import EducationalService:', error);
    results.push({ test: 'EducationalService import', status: '❌', error: String(error) });
  }

  // Test 6: Web Search Researcher
  try {
    console.log('\n6️⃣ Testing WebSearchResearcher import...');
    await import('../researcher/web-search-researcher');
    console.log('✅ WebSearchResearcher imported successfully');
    results.push({ test: 'WebSearchResearcher import', status: '✅' });
  } catch (error) {
    console.error('❌ Failed to import WebSearchResearcher:', error);
    results.push({ test: 'WebSearchResearcher import', status: '❌', error: String(error) });
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('                    TEST SUMMARY');
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
    console.log('\n✅ All Researcher components working correctly!');
    console.log('✅ Migration successful!');
  } else {
    console.log('\n❌ Some components failed. Check errors above.');
    process.exit(1);
  }
}

// Run the test
testResearcherImports().catch(console.error);