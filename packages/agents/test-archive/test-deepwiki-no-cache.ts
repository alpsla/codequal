#!/usr/bin/env ts-node
/**
 * Test DeepWiki without cache to verify real analysis
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '.env.production') });
config({ path: path.resolve(__dirname, '../../.env') });

async function testDeepWikiDirectly() {
  console.log('🔬 Testing DeepWiki API directly (no cache)\n');
  
  try {
    // Import and create DeepWiki API Manager
    const { DeepWikiApiManager } = require('../../apps/api/src/services/deepwiki-api-manager');
    const deepWikiApiManager = new DeepWikiApiManager();
    
    const repositoryUrl = 'https://github.com/vercel/swr';
    const options = {
      branch: 'main',
      prId: '2950',
      skipCache: true // Force real analysis
    };
    
    console.log('🚀 Starting DeepWiki analysis...');
    console.log(`   Repository: ${repositoryUrl}`);
    console.log(`   Branch: ${options.branch}`);
    console.log(`   PR: #${options.prId}`);
    console.log(`   Skip Cache: ${options.skipCache}\n`);
    
    const startTime = Date.now();
    const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ DeepWiki Analysis Complete!');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('\n📊 Analysis Results:');
    console.log(`   Files Analyzed: ${result.metadata?.files_analyzed || 0}`);
    console.log(`   Total Lines: ${result.metadata?.total_lines || 0}`);
    console.log(`   Issues Found: ${result.issues?.length || 0}`);
    console.log(`   Overall Score: ${result.score || 0}/100`);
    
    if (result.issues && result.issues.length > 0) {
      console.log('\n🐛 Top Issues:');
      result.issues.slice(0, 5).forEach((issue: any, index: number) => {
        console.log(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
        console.log(`      Category: ${issue.category}`);
        console.log(`      Location: ${issue.location?.file}:${issue.location?.line}`);
      });
    }
    
    if (result.scores) {
      console.log('\n📈 Category Scores:');
      console.log(`   Security: ${result.scores.security}/100`);
      console.log(`   Performance: ${result.scores.performance}/100`);
      console.log(`   Maintainability: ${result.scores.maintainability}/100`);
      console.log(`   Testing: ${result.scores.testing || 0}/100`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the test
testDeepWikiDirectly()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });