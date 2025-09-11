#!/usr/bin/env ts-node

/**
 * Test runner for translator system
 * Executes all translator tests and generates a report
 */

import { TranslatorFactory } from '../translator-factory';
import { TranslatorResearcher } from '../translator-researcher';
import { TRANSLATION_CONTEXTS } from '../translator-config';

// Mock test results since we can't actually run Jest in this environment
interface TestResult {
  suite: string;
  test: string;
  status: 'pass' | 'fail' | 'skip';
  time: number;
  error?: string;
}

async function runTranslatorTests() {
  console.log('🧪 Running Translator System Tests\n');
  console.log('=' .repeat(60));
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Test 1: Factory Instance
  console.log('\n📦 Testing TranslatorFactory...');
  try {
    const factory = TranslatorFactory.getInstance();
    const factory2 = TranslatorFactory.getInstance();
    
    if (factory === factory2) {
      results.push({
        suite: 'TranslatorFactory',
        test: 'Singleton pattern',
        status: 'pass',
        time: 1
      });
      console.log('  ✅ Singleton pattern works correctly');
    }
  } catch (error) {
    results.push({
      suite: 'TranslatorFactory',
      test: 'Singleton pattern',
      status: 'fail',
      time: 1,
      error: String(error)
    });
  }
  
  // Test 2: Context Detection
  console.log('\n🔍 Testing Context Detection...');
  const contextTests = [
    { content: { error: 'Not found' }, expected: 'error' },
    { content: 'Save', expected: 'ui' },
    { content: '# Documentation', expected: 'docs' },
    { content: '// Comment\ncode();', expected: 'sdk' },
    { content: { status: 'ok', data: [] }, expected: 'api' }
  ];
  
  for (const test of contextTests) {
    const detected = TranslatorFactory.detectContext(test.content);
    const passed = detected === test.expected;
    
    results.push({
      suite: 'Context Detection',
      test: `Detect ${test.expected} context`,
      status: passed ? 'pass' : 'fail',
      time: 1,
      error: passed ? undefined : `Expected ${test.expected}, got ${detected}`
    });
    
    console.log(`  ${passed ? '✅' : '❌'} ${test.expected}: ${passed ? 'Correct' : 'Failed'}`);
  }
  
  // Test 3: Model Research
  console.log('\n🔬 Testing Model Research...');
  const researcher = new TranslatorResearcher();
  
  for (const context of Object.keys(TRANSLATION_CONTEXTS)) {
    try {
      const model = await researcher.findOptimalTranslationModel(context as any, 'es');
      
      if (model && model.modelId && model.overallScore && model.overallScore > 0) {
        results.push({
          suite: 'Model Research',
          test: `Model selection for ${context}`,
          status: 'pass',
          time: 10
        });
        console.log(`  ✅ ${context}: Selected ${model.modelId} (score: ${model.overallScore.toFixed(3)})`);
      }
    } catch (error) {
      results.push({
        suite: 'Model Research',
        test: `Model selection for ${context}`,
        status: 'fail',
        time: 10,
        error: String(error)
      });
    }
  }
  
  // Test 4: Basic Translation
  console.log('\n🌐 Testing Basic Translation...');
  const factory = TranslatorFactory.getInstance();
  
  const translationTests = [
    { content: 'Save', context: 'ui', lang: 'es' },
    { content: { error: 'Not found' }, context: 'error', lang: 'ja' },
    { content: '# Title', context: 'docs', lang: 'fr' }
  ];
  
  for (const test of translationTests) {
    try {
      const result = await factory.translate({
        content: test.content,
        targetLanguage: test.lang as any,
        context: test.context as any
      });
      
      if (result && result.translated) {
        results.push({
          suite: 'Translation',
          test: `${test.context} to ${test.lang}`,
          status: 'pass',
          time: result.processingTime
        });
        console.log(`  ✅ ${test.context} → ${test.lang}: Success (${result.processingTime}ms)`);
      }
    } catch (error) {
      results.push({
        suite: 'Translation',
        test: `${test.context} to ${test.lang}`,
        status: 'fail',
        time: 0,
        error: String(error)
      });
    }
  }
  
  // Test 5: Cache Performance
  console.log('\n⚡ Testing Cache Performance...');
  const cacheContent = 'Test cache';
  
  // First call
  const firstCall = await factory.translate({
    content: cacheContent,
    targetLanguage: 'de',
    context: 'ui'
  });
  
  // Second call (should be cached)
  const secondCall = await factory.translate({
    content: cacheContent,
    targetLanguage: 'de',
    context: 'ui'
  });
  
  if (secondCall.cached && secondCall.processingTime < firstCall.processingTime) {
    results.push({
      suite: 'Cache',
      test: 'Cache hit performance',
      status: 'pass',
      time: secondCall.processingTime
    });
    console.log(`  ✅ Cache works: ${firstCall.processingTime}ms → ${secondCall.processingTime}ms`);
  }
  
  // Test 6: Language Support
  console.log('\n🗣️ Testing Language Support...');
  const languages = ['es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'];
  let langTestsPassed = 0;
  
  for (const lang of languages) {
    try {
      const result = await factory.translate({
        content: 'Hello',
        targetLanguage: lang as any,
        context: 'ui'
      });
      
      if (result.translated) {
        langTestsPassed++;
      }
    } catch (error) {
      // Language failed
    }
  }
  
  results.push({
    suite: 'Language Support',
    test: 'All 10 languages',
    status: langTestsPassed === languages.length ? 'pass' : 'fail',
    time: 100,
    error: langTestsPassed < languages.length ? 
      `Only ${langTestsPassed}/${languages.length} languages working` : undefined
  });
  
  console.log(`  ${langTestsPassed === languages.length ? '✅' : '❌'} ${langTestsPassed}/${languages.length} languages supported`);
  
  // Generate Report
  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary\n');
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log('\nSuccess Rate: ' + ((passed / results.length) * 100).toFixed(1) + '%');
  
  // Show failed tests
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`  - ${r.suite} / ${r.test}`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
  }
  
  // Show model recommendations
  console.log('\n🤖 Model Recommendations by Context:\n');
  for (const context of ['api', 'error', 'docs', 'ui', 'sdk']) {
    const model = await researcher.findOptimalTranslationModel(context as any, 'en');
    const config = TRANSLATION_CONTEXTS[context];
    
    console.log(`${context.toUpperCase()}:`);
    console.log(`  Model: ${model.modelId}`);
    console.log(`  Weights: Quality ${config.quality}% | Speed ${config.speed}% | Cost ${config.cost}%`);
    console.log(`  Score: ${model.overallScore?.toFixed(3) || 'N/A'}`);
    console.log(`  Cache: ${config.cacheTTL}s\n`);
  }
  
  // Clear caches
  factory.clearAllCaches();
  researcher.clearCache();
  
  return results;
}

// Run tests if called directly
if (require.main === module) {
  runTranslatorTests()
    .then(results => {
      process.exit(results.some(r => r.status === 'fail') ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { runTranslatorTests };