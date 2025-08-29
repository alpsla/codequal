#!/usr/bin/env ts-node

/**
 * Test Cloud Analysis Integration
 * Tests the complete flow from agent to cloud service
 */

import { CloudAnalysisClient } from './src/two-branch/services/CloudAnalysisClient';

async function testCloudIntegration() {
  console.log('🚀 Testing Cloud Analysis Integration');
  console.log('=====================================\n');

  const client = new CloudAnalysisClient();
  
  // Test health check
  console.log('📋 Checking service health...');
  const isHealthy = await client.healthCheck();
  console.log(`   Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  
  if (!isHealthy) {
    console.error('❌ Cloud service is not healthy. Exiting.');
    process.exit(1);
  }

  // Test ESLint analysis
  console.log('\n📊 Testing ESLint analysis...');
  try {
    const eslintResult = await client.analyze({
      tool: 'eslint',
      repository: 'https://github.com/sindresorhus/ky',
      branch: 'main'
    });
    console.log('   Status:', eslintResult.status);
    console.log('   Cached:', eslintResult.cached || false);
    console.log('   Execution time:', eslintResult.executionTime, 'ms');
  } catch (error) {
    console.error('   ❌ ESLint analysis failed:', error);
  }

  // Test Semgrep analysis
  console.log('\n🔍 Testing Semgrep analysis...');
  try {
    const semgrepResult = await client.analyze({
      tool: 'semgrep',
      repository: 'https://github.com/sindresorhus/ky',
      branch: 'main'
    });
    console.log('   Status:', semgrepResult.status);
    console.log('   Issues found:', semgrepResult.results?.results?.length || 0);
    console.log('   Cached:', semgrepResult.cached || false);
  } catch (error) {
    console.error('   ❌ Semgrep analysis failed:', error);
  }

  // Test TypeScript analysis
  console.log('\n📝 Testing TypeScript analysis...');
  try {
    const tscResult = await client.analyze({
      tool: 'tsc',
      repository: 'https://github.com/sindresorhus/ky',
      branch: 'main'
    });
    console.log('   Status:', tscResult.status);
    console.log('   Errors found:', tscResult.results?.count || 0);
  } catch (error) {
    console.error('   ❌ TypeScript analysis failed:', error);
  }

  // Test batch analysis
  console.log('\n🔄 Testing batch analysis...');
  try {
    const batchResults = await client.batchAnalyze(
      'https://github.com/sindresorhus/ky',
      ['eslint', 'semgrep', 'npm-audit'],
      { branch: 'main' }
    );
    
    console.log('   Tools analyzed:', batchResults.size);
    for (const [tool, result] of batchResults) {
      console.log(`   ${tool}: ${result.status}`);
    }
  } catch (error) {
    console.error('   ❌ Batch analysis failed:', error);
  }

  // Test repository info
  console.log('\n📁 Testing repository info...');
  try {
    const repoInfo = await client.getRepositoryInfo('https://github.com/sindresorhus/ky');
    console.log('   Files:', repoInfo.files);
    console.log('   Lines:', repoInfo.lines);
    console.log('   Top languages:');
    repoInfo.languages?.slice(0, 3).forEach((lang: any) => {
      console.log(`     - ${lang.extension}: ${lang.count} files`);
    });
  } catch (error) {
    console.error('   ❌ Repository info failed:', error);
  }

  console.log('\n✅ Cloud integration test complete!');
}

// Run tests
testCloudIntegration().catch(console.error);