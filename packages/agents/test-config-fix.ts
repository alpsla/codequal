#!/usr/bin/env npx ts-node

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';

async function testConfigResolution() {
  console.log('🔧 Testing Model Configuration Resolution Fixes');
  console.log('=' .repeat(60));
  
  const resolver = new ModelConfigResolver();
  const testCases = [
    { role: 'security', language: 'java', size: 'medium' },
    { role: 'architecture', language: 'java', size: 'medium' },
    { role: 'performance', language: 'java', size: 'medium' },
    { role: 'code-quality', language: 'java', size: 'medium' },  // This was failing
    { role: 'dependency', language: 'java', size: 'medium' },
  ];
  
  console.log('\n📋 Testing role configurations for Java/medium:\n');
  
  for (const test of testCases) {
    try {
      const config = await resolver.getModelConfiguration(test.role, test.language, test.size);
      console.log(`✅ ${test.role.padEnd(15)} -> ${config.primary_model}`);
      console.log(`   Weights: quality=${config.weights.quality.toFixed(2)}, speed=${config.weights.speed.toFixed(2)}, cost=${config.weights.cost.toFixed(2)}`);
    } catch (error: any) {
      console.log(`❌ ${test.role.padEnd(15)} -> FAILED: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test completed!');
}

testConfigResolution().catch(console.error);