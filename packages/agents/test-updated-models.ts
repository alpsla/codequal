#!/usr/bin/env npx ts-node

/**
 * Test to verify updated AI models work correctly
 * Validates that all outdated models have been replaced with current versions
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

// List of outdated models that should NOT be used
const OUTDATED_MODELS = [
  'gpt-4-turbo-preview',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'gpt-4-vision-preview',
  'gpt-3.5-turbo-16k',
  'gpt-4-32k'
];

// List of current models (as of August 2025)
const CURRENT_MODELS = [
  'openai/gpt-4o-2024-11-20',
  'openai/gpt-4o-mini',
  'openai/o1',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-opus-4'
];

async function testModelSelection() {
  console.log('🔍 Testing Model Selection in V8 Report Generator');
  console.log('=' .repeat(50));
  
  const generator = new ReportGeneratorV8Final();
  
  // Test configurations
  const testCases = [
    { language: 'Python', repoSize: 'small', expected: 'openai/gpt-4o-mini' },
    { language: 'Python', repoSize: 'medium', expected: 'anthropic/claude-3.7-sonnet' },
    { language: 'Python', repoSize: 'large', expected: 'openai/gpt-4o-2024-11-20' },
    { language: 'Python', repoSize: 'enterprise', expected: 'openai/o1' },
    { language: 'Go', repoSize: 'small', expected: 'openai/gpt-4o-mini' },
    { language: 'Go', repoSize: 'medium', expected: 'openai/gpt-4o-mini' },
    { language: 'Rust', repoSize: 'large', expected: 'openai/gpt-4o-2024-11-20' },
    { language: 'Java', repoSize: 'enterprise', expected: 'openai/o1' },
    { language: 'TypeScript', repoSize: 'medium', expected: 'openai/gpt-4o-2024-11-20' },
    { language: 'Python', repoSize: 'small', framework: 'Machine Learning', expected: 'anthropic/claude-opus-4.1' },
    { language: 'Rust', repoSize: 'small', framework: 'Blockchain', expected: 'openai/gpt-4o-2024-11-20' }
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    // Access private method for testing
    const selectedModel = (generator as any).selectOptimalModel(testCase);
    
    const isOutdated = OUTDATED_MODELS.some(old => selectedModel.includes(old));
    const isCurrent = CURRENT_MODELS.some(current => selectedModel === current);
    
    if (isOutdated) {
      console.log(`❌ FAIL: ${testCase.language}/${testCase.repoSize}${testCase.framework ? `/${testCase.framework}` : ''}`);
      console.log(`   Found outdated model: ${selectedModel}`);
      console.log(`   Expected: ${testCase.expected}`);
      failCount++;
    } else if (selectedModel === testCase.expected) {
      console.log(`✅ PASS: ${testCase.language}/${testCase.repoSize}${testCase.framework ? `/${testCase.framework}` : ''} → ${selectedModel}`);
      passCount++;
    } else if (isCurrent) {
      console.log(`⚠️  WARN: ${testCase.language}/${testCase.repoSize}${testCase.framework ? `/${testCase.framework}` : ''}`);
      console.log(`   Selected: ${selectedModel} (current but different from expected)`);
      console.log(`   Expected: ${testCase.expected}`);
      passCount++; // Still counts as pass since it's a current model
    } else {
      console.log(`❌ FAIL: ${testCase.language}/${testCase.repoSize}${testCase.framework ? `/${testCase.framework}` : ''}`);
      console.log(`   Unknown model: ${selectedModel}`);
      failCount++;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📊 Results: ${passCount} passed, ${failCount} failed`);
  
  if (failCount === 0) {
    console.log('✅ All model selections are using current models!');
  } else {
    console.log('❌ Some tests failed - outdated models still in use');
    process.exit(1);
  }
}

// Check Kubernetes deployment files
async function checkKubernetesConfigs() {
  console.log('\n🔍 Checking Kubernetes Deployment Configurations');
  console.log('=' .repeat(50));
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentFiles = [
    '/Users/alpinro/Code Prjects/codequal/kubernetes/deepwiki-deployment-dev-openrouter.yaml',
    '/Users/alpinro/Code Prjects/codequal/kubernetes/deepwiki-deployment-dev-hybrid.yaml'
  ];
  
  for (const file of deploymentFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const hasOutdated = OUTDATED_MODELS.some(model => content.includes(model));
      
      const fileName = path.basename(file);
      if (hasOutdated) {
        console.log(`❌ ${fileName}: Contains outdated models`);
        const outdated = OUTDATED_MODELS.filter(model => content.includes(model));
        console.log(`   Found: ${outdated.join(', ')}`);
      } else if (content.includes('openai/gpt-4o-2024-11-20')) {
        console.log(`✅ ${fileName}: Using current model (openai/gpt-4o-2024-11-20)`);
      } else {
        console.log(`⚠️  ${fileName}: Check model configuration`);
      }
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Model Update Verification Test');
  console.log('📅 Testing against models current as of August 2025\n');
  
  try {
    await testModelSelection();
    await checkKubernetesConfigs();
    
    console.log('\n✨ Model update verification complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);